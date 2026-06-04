import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase, getDernieresPositions, signOut } from '../../lib/supabase';
import type { DernierePosition, TypeTransporteur } from '../../types';

const C = { primary: '#1B4F72', bg: '#f5f7fa', white: '#fff', border: '#dde3ea' };

const PANEL_W = 300; // largeur panneau latéral

function createVehicleIcon(type: TypeTransporteur) {
  const emoji = type === 'camion' ? '🚛' : '🤝';
  return L.divIcon({
    html: `<div style="font-size:28px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,.4));">${emoji}</div>`,
    className: '',
    iconSize:   [36, 36],
    iconAnchor: [18, 18],
    popupAnchor:[0, -20],
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function StoreMap() {
  const navigate   = useNavigate();
  const mapRef     = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markers    = useRef<Record<string, L.Marker>>({});

  const [positions,  setPositions]  = useState<DernierePosition[]>([]);
  const [selected,   setSelected]   = useState<string | null>(null);
  const [loading,    setLoading]    = useState(true);

  // ── Initialiser la carte ────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    const map = L.map(mapRef.current, {
      center: [34.0, -5.0],   // centré Maroc
      zoom: 5,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    leafletMap.current = map;

    return () => {
      map.remove();
      leafletMap.current = null;
    };
  }, []);

  // ── Charger les positions initiales ────────────────────────────────────────
  useEffect(() => {
    getDernieresPositions().then(({ data }) => {
      const positions = (data as DernierePosition[]) ?? [];
      setPositions(positions);
      setLoading(false);
      if (!leafletMap.current) return;

      positions.forEach(pos => addOrUpdateMarker(pos));

      // Centrer la vue sur tous les marqueurs si possible
      const validPositions = positions.filter(p => p.latitude && p.longitude);
      if (validPositions.length > 0 && leafletMap.current) {
        const bounds = L.latLngBounds(validPositions.map(p => [p.latitude, p.longitude]));
        leafletMap.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Abonnement Realtime aux nouvelles positions GPS ────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('realtime-positions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'positions_gps' },
        (payload) => {
          // On reconstruit la DernierePosition depuis le payload enrichi
          const raw = payload.new as {
            transporteur_id: string;
            latitude: number;
            longitude: number;
            vitesse_kmh: number | null;
            created_at: string;
          };

          setPositions(prev => {
            const idx = prev.findIndex(p => p.transporteur_id === raw.transporteur_id);
            if (idx === -1) return prev;

            const updated: DernierePosition = {
              ...prev[idx],
              latitude:    raw.latitude,
              longitude:   raw.longitude,
              vitesse_kmh: raw.vitesse_kmh,
              derniere_maj: raw.created_at,
            };

            addOrUpdateMarker(updated);

            const next = [...prev];
            next[idx] = updated;
            return next;
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Ajouter ou mettre à jour un marqueur ───────────────────────────────────
  function addOrUpdateMarker(pos: DernierePosition) {
    const map = leafletMap.current;
    if (!map) return;

    const latlng: L.LatLngExpression = [pos.latitude, pos.longitude];
    const popupContent = buildPopup(pos);

    if (markers.current[pos.transporteur_id]) {
      markers.current[pos.transporteur_id].setLatLng(latlng);
      markers.current[pos.transporteur_id].setPopupContent(popupContent);
    } else {
      const marker = L.marker(latlng, { icon: createVehicleIcon(pos.type) })
        .addTo(map)
        .bindPopup(popupContent);

      marker.on('click', () => setSelected(pos.transporteur_id));
      markers.current[pos.transporteur_id] = marker;
    }
  }

  function buildPopup(pos: DernierePosition): string {
    return `
      <div style="font-family:sans-serif;min-width:180px;">
        <div style="font-weight:700;font-size:15px;color:#1B4F72;margin-bottom:6px;">
          ${pos.type === 'camion' ? '🚛' : '🤝'} ${pos.code} — ${pos.nom}
        </div>
        <div style="font-size:13px;color:#555;line-height:1.8;">
          <div>📍 ${pos.latitude.toFixed(4)}, ${pos.longitude.toFixed(4)}</div>
          ${pos.vitesse_kmh !== null ? `<div>🚀 ${pos.vitesse_kmh} km/h</div>` : ''}
          <div>🕒 ${formatDate(pos.derniere_maj)}</div>
          <div>Statut : <b style="color:${pos.actif ? '#155724' : '#721c24'}">${pos.actif ? 'Actif' : 'Inactif'}</b></div>
        </div>
      </div>
    `;
  }

  function panToMarker(pos: DernierePosition) {
    const map = leafletMap.current;
    if (!map) return;
    map.flyTo([pos.latitude, pos.longitude], 10, { animate: true, duration: 1 });
    markers.current[pos.transporteur_id]?.openPopup();
    setSelected(pos.transporteur_id);
  }

  const handleLogout = async () => { await signOut(); navigate('/login'); };

  const actifCount   = positions.filter(p => p.actif).length;
  const camionCount  = positions.filter(p => p.type === 'camion').length;
  const courtierCount= positions.filter(p => p.type === 'courtier').length;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        background: C.primary, color: '#fff', height: 60, padding: '0 2rem', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,.3)', zIndex: 1000,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <span style={{ fontWeight: 700, fontSize: 17 }}>🚚 Marchita — Store</span>
          <nav style={{ display: 'flex', gap: 4 }}>
            {[
              { label: 'Dossiers',      to: '/store/dossiers'      },
              { label: 'Transporteurs', to: '/store/transporteurs' },
              { label: 'Carte GPS',     to: '/store/map'           },
            ].map(l => (
              <Link key={l.to} to={l.to} style={{
                color: 'rgba(255,255,255,.85)', fontSize: 14, padding: '6px 12px', borderRadius: 6,
                background: l.to === '/store/map' ? 'rgba(255,255,255,.18)' : 'transparent',
              }}>
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,.15)', color: '#fff', padding: '6px 14px', borderRadius: 6, fontSize: 13 }}>
          Déconnexion
        </button>
      </header>

      {/* Corps = panneau latéral + carte */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Panneau latéral ── */}
        <aside style={{
          width: PANEL_W, flexShrink: 0, background: C.white,
          borderRight: `1px solid ${C.border}`, overflow: 'auto',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Stats */}
          <div style={{ padding: '16px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.primary, marginBottom: 10 }}>
              📡 Flotte en temps réel
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { label: 'Actifs',   v: actifCount,    color: '#155724', bg: '#d4edda' },
                { label: 'Camions',  v: camionCount,   color: '#003366', bg: '#cce5ff' },
                { label: 'Courtiers',v: courtierCount, color: '#533F03', bg: '#fff3cd' },
              ].map(s => (
                <div key={s.label} style={{
                  flex: 1, textAlign: 'center', padding: '6px 4px', borderRadius: 7,
                  background: s.bg, color: s.color,
                }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{s.v}</div>
                  <div style={{ fontSize: 10, fontWeight: 600 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Liste véhicules */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {loading && <p style={{ padding: '1rem', color: '#888', fontSize: 13 }}>Chargement…</p>}
            {!loading && positions.length === 0 && (
              <p style={{ padding: '1rem', color: '#aaa', fontSize: 13 }}>Aucun véhicule positionné.</p>
            )}
            {positions.map(pos => (
              <div
                key={pos.transporteur_id}
                onClick={() => panToMarker(pos)}
                style={{
                  padding: '12px 16px', cursor: 'pointer',
                  borderBottom: `1px solid ${C.border}`,
                  background: selected === pos.transporteur_id ? '#e8f0fe' : 'transparent',
                  transition: 'background .15s',
                }}
                onMouseEnter={e => { if (selected !== pos.transporteur_id) e.currentTarget.style.background = '#f5f7fa'; }}
                onMouseLeave={e => { e.currentTarget.style.background = selected === pos.transporteur_id ? '#e8f0fe' : 'transparent'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: C.primary }}>
                    {pos.type === 'camion' ? '🚛' : '🤝'} {pos.code}
                  </div>
                  <span style={{
                    padding: '2px 7px', borderRadius: 20, fontSize: 10, fontWeight: 600,
                    background: pos.actif ? '#d4edda' : '#f8d7da',
                    color: pos.actif ? '#155724' : '#721c24',
                  }}>
                    {pos.actif ? 'Actif' : 'Inactif'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#555', marginTop: 3 }}>{pos.nom}</div>
                <div style={{ fontSize: 11, color: '#999', marginTop: 4, lineHeight: 1.6 }}>
                  📍 {pos.latitude.toFixed(4)}, {pos.longitude.toFixed(4)}<br />
                  {pos.vitesse_kmh !== null && `🚀 ${pos.vitesse_kmh} km/h · `}
                  🕒 {formatDate(pos.derniere_maj)}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* ── Carte Leaflet ── */}
        <div ref={mapRef} style={{ flex: 1 }} />
      </div>
    </div>
  );
}
