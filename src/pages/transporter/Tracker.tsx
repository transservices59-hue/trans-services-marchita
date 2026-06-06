import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useGPSTracker } from '../../hooks/useGPSTracker';
import { supabase } from '../../lib/supabase';
import type { Transporteur } from '../../types';

export default function Tracker() {
  const { user, loading: authLoading } = useAuth();
  const [transporteur, setTransporteur] = useState<Transporteur | null>(null);
  const [loadingTransporteur, setLoadingTransporteur] = useState(true);
  const { isTracking, position, lastSent, error, start, stop } = useGPSTracker();

  useEffect(() => {
    if (!user) return;
    supabase
      .from('transporteurs')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        setTransporteur((data as Transporteur) ?? null);
        setLoadingTransporteur(false);
      });
  }, [user]);

  useEffect(() => () => stop(), [stop]);

  if (authLoading || loadingTransporteur) {
    return (
      <div style={s.container}>
        <p style={s.muted}>Chargement…</p>
      </div>
    );
  }

  if (!transporteur) {
    return (
      <div style={s.container}>
        <p style={s.errorText}>Aucun profil transporteur associé à ce compte.</p>
      </div>
    );
  }

  const handleToggle = () => {
    if (isTracking) {
      stop();
    } else {
      start(transporteur.id);
    }
  };

  return (
    <div style={s.container}>
      <h1 style={s.title}>GPS Tracker</h1>

      <div style={s.card}>
        <div style={s.row}>
          <span style={s.label}>Code</span>
          <span style={s.value}>{transporteur.code}</span>
        </div>
        <div style={s.row}>
          <span style={s.label}>Nom</span>
          <span style={s.value}>{transporteur.nom}</span>
        </div>
        <div style={{ ...s.row, borderBottom: 'none' }}>
          <span style={s.label}>Statut</span>
          <span style={isTracking ? s.statusOn : s.statusOff}>
            {isTracking ? '● Transmission active' : '○ Transmission arrêtée'}
          </span>
        </div>
      </div>

      <button
        style={isTracking ? s.btnStop : s.btnStart}
        onClick={handleToggle}
      >
        {isTracking ? 'Arrêter la transmission' : 'Démarrer la transmission'}
      </button>

      {error && (
        <div style={s.errorBox}>
          <strong>Erreur :</strong> {error}
        </div>
      )}

      {(isTracking || position.latitude !== null) && (
        <div style={s.card}>
          <h2 style={s.subtitle}>Position en temps réel</h2>
          <div style={s.row}>
            <span style={s.label}>Latitude</span>
            <span style={s.value}>
              {position.latitude !== null ? position.latitude.toFixed(6) : '—'}
            </span>
          </div>
          <div style={s.row}>
            <span style={s.label}>Longitude</span>
            <span style={s.value}>
              {position.longitude !== null ? position.longitude.toFixed(6) : '—'}
            </span>
          </div>
          <div style={s.row}>
            <span style={s.label}>Précision</span>
            <span style={s.value}>
              {position.accuracy !== null ? `${Math.round(position.accuracy)} m` : '—'}
            </span>
          </div>
          <div style={s.row}>
            <span style={s.label}>Vitesse</span>
            <span style={s.value}>
              {position.speed !== null ? `${position.speed} km/h` : '—'}
            </span>
          </div>
          <div style={{ ...s.row, borderBottom: 'none' }}>
            <span style={s.label}>Dernier envoi</span>
            <span style={s.value}>
              {lastSent ? lastSent.toLocaleTimeString('fr-FR') : 'En attente…'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

const s: Record<string, CSSProperties> = {
  container: {
    maxWidth: 480,
    margin: '0 auto',
    padding: '1.5rem 1rem',
    fontFamily: 'system-ui, sans-serif',
    minHeight: '100dvh',
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    marginBottom: '1.5rem',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: '1rem',
    fontWeight: 600,
    marginBottom: '0.75rem',
    color: '#334155',
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: '1rem',
    marginBottom: '1rem',
    boxShadow: '0 1px 4px rgba(0,0,0,.08)',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.4rem 0',
    borderBottom: '1px solid #f1f5f9',
  },
  label: { color: '#64748b', fontSize: '0.875rem' },
  value: { fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' },
  statusOn: { color: '#16a34a', fontWeight: 600, fontSize: '0.875rem' },
  statusOff: { color: '#94a3b8', fontWeight: 600, fontSize: '0.875rem' },
  btnStart: {
    width: '100%',
    padding: '0.875rem',
    borderRadius: 10,
    border: 'none',
    background: '#2563eb',
    color: '#fff',
    fontWeight: 700,
    fontSize: '1rem',
    cursor: 'pointer',
    marginBottom: '1rem',
  },
  btnStop: {
    width: '100%',
    padding: '0.875rem',
    borderRadius: 10,
    border: 'none',
    background: '#dc2626',
    color: '#fff',
    fontWeight: 700,
    fontSize: '1rem',
    cursor: 'pointer',
    marginBottom: '1rem',
  },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 8,
    padding: '0.875rem',
    color: '#dc2626',
    fontSize: '0.875rem',
    marginBottom: '1rem',
  },
  errorText: { color: '#dc2626' },
  muted: { color: '#94a3b8' },
};
