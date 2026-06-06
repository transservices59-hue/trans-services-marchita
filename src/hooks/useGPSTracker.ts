import { useState, useRef, useCallback } from 'react';
import { pushPosition } from '../lib/supabase';

export interface GPSPosition {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  speed: number | null;
}

export interface UseGPSTrackerResult {
  isTracking: boolean;
  position: GPSPosition;
  lastSent: Date | null;
  error: string | null;
  start: (transporteurId: string) => void;
  stop: () => void;
}

export function useGPSTracker(): UseGPSTrackerResult {
  const [isTracking, setIsTracking] = useState(false);
  const [position, setPosition] = useState<GPSPosition>({
    latitude: null, longitude: null, accuracy: null, speed: null,
  });
  const [lastSent, setLastSent] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPositionRef = useRef<GeolocationPosition | null>(null);

  const stop = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsTracking(false);
  }, []);

  const start = useCallback((transporteurId: string) => {
    if (!navigator.geolocation) {
      setError("La géolocalisation n'est pas supportée par ce navigateur.");
      return;
    }

    setError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        lastPositionRef.current = pos;
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed !== null ? Math.round(pos.coords.speed * 3.6) : null,
        });
      },
      (err) => {
        let message = 'Erreur de géolocalisation.';
        if (err.code === 1)
          message = 'Permission refusée. Activez la géolocalisation dans les paramètres du navigateur.';
        else if (err.code === 2)
          message = 'Position GPS indisponible.';
        else if (err.code === 3)
          message = 'Délai de géolocalisation dépassé.';
        setError(message);
        stop();
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 5_000 },
    );

    intervalRef.current = setInterval(() => {
      const pos = lastPositionRef.current;
      if (!pos) return;

      void pushPosition({
        transporteur_id: transporteurId,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        precision_m: Math.round(pos.coords.accuracy),
        vitesse_kmh: pos.coords.speed !== null ? Math.round(pos.coords.speed * 3.6) : null,
      }).then(({ error: pushErr }) => {
        if (!pushErr) setLastSent(new Date());
      });
    }, 10_000);

    setIsTracking(true);
  }, [stop]);

  return { isTracking, position, lastSent, error, start, stop };
}
