import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase, getDossierById } from '../../lib/supabase';
import StatusTimeline from '../../components/StatusTimeline';
import type { Dossier } from '../../types';

const C = { primary: '#1B4F72', accent: '#E67E22', bg: '#f5f7fa', white: '#fff', border: '#dde3ea' };

interface GpsPoint { latitude: number; longitude: number; created_at: string }

export default function ClientSuivi() {
  const { id }    = useParams<{ id: string }>();
  const mapRef    = useRef<HTMLDivElement>(null);
  const leaflet   = useRef<L.Map | null>(null);

  const [dossier,   setDossier]   = useState<Dossier | null>(null);
  const [positions, setPositions] = useState<GpsPoint[]>([]);
  const [loading,   setLoading]   = useState(true);

  // Chargement dossier
  useEffect(() => {
    if (!id) return;
    getDossierById(id).then(({ data }) => {
      setDossier(data as Dossier ?? null);
      setLoading(false);
    });
  }, [id]);

  // Chargement historique GPS
  useEffect(() => {
    if (!dossier?.transporteur_id) return;
    supabase
      .from('positions_gps')
      .select('latitude,longitude,created_at')
      .eq('transporteur_id', dossier.transporteur_id)
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data }) => setPositions((data ?? []) as GpsPoint[]));
  }, [dossier?.transporteur_id]);

  // Carte Leaflet
  useEffect(() => {
    if (!mapRef.current || positions.length === 0) return;
    if (leaflet.current) { leaflet.current.remove(); leaflet.current = null; }

    const map = L.map(mapRef.current, { center: [34, -5], zoom: 5 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(map);

    // Polyline historique
    const latlngs = positions.map(p => [p.latitude, p.longitude] as L.LatLngTuple);
    L.polyline(latlngs, { color: C.primary, weight: 3, opacity: 0.7 }).addTo(map);

    // Marqueur position actuelle
    const last = positions[positions.length - 1];
    L.marker([last.latitude, last.longitude], {
      icon: L.divIcon({
        html: '<div style="font-size:26px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.4));">🚛</div>',
        className: '', iconSize: [34, 34], iconAnchor: [17, 17],
      }),
    }).addTo(map).bindPopup(`Dernière position<br>${new Date(last.created_at).toLocaleString('fr-FR')}`);

    map.fitBounds(L.latLngBounds(latlngs), { padding: [30, 30] });
    leaflet.current = map;

    return () => { map.remove(); leaflet.current = null; };
  }, [positions]);

  const downloadPDF = async (type: 'devis' | 'facture') => {
    if (!dossier) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch(`/api/pdf/${type}/${dossier.id}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${type}-${dossier.numero}.pdf`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <Loader />;
  if (!dossier) return <div style={{ padding: '2rem', color: '#c0392b' }}>Dossier introuvable.</div>;

  const hasFacture = (dossier.factures?.length ?? 0) > 0;
  const hasDevis   = dossier.montant_devis !== null;
  const hasGPS     = positions.length > 0;

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <header style={{
        background: C.primary, color: '#fff', height: 60, padding: '0 2rem',
        display: 'flex', alignItems: 'center', gap: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,.2)',
      }}>
        <Link to="/client/dashboard" style={{ color: 'rgba(255,255,255,.8)', fontSize: 14 }}>
          ← Tableau de bord
        </Link>
        <span style={{ opacity: .4 }}>|</span>
        <span style={{ fontWeight: 600 }}>Suivi — Dossier #{dossier.numero}</span>
      </header>

      <main style={{ maxWidth: 860, margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

          {/* Colonne gauche : Timeline */}
          <div>
            <Card title="Suivi de votre expédition">
              <StatusTimeline dossier={dossier} />
            </Card>

            {/* Transporteur */}
            {dossier.transporteur && (
              <Card title="Votre transporteur">
                <InfoRow label="Nom"  value={`${dossier.transporteur.type === 'camion' ? '🚛' : '🤝'} ${dossier.transporteur.nom}`} />
                <InfoRow label="Code" value={dossier.transporteur.code} />
                <InfoRow label="Tél"  value={dossier.transporteur.telephone} />
              </Card>
            )}

            {/* Documents */}
            <Card title="Documents">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {hasDevis && (
                  <button
                    onClick={() => downloadPDF('devis')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: '#f0f4f8', border: `1px solid ${C.border}`,
                      padding: '10px 16px', borderRadius: 7, fontSize: 14,
                      cursor: 'pointer', color: C.primary, fontWeight: 600,
                    }}
                  >
                    📄 Télécharger le devis (PDF)
                  </button>
                )}
                {hasFacture && (
                  <button
                    onClick={() => downloadPDF('facture')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: '#d4edda', border: '1px solid #c3e6cb',
                      padding: '10px 16px', borderRadius: 7, fontSize: 14,
                      cursor: 'pointer', color: '#155724', fontWeight: 600,
                    }}
                  >
                    🧾 Télécharger la facture (PDF)
                  </button>
                )}
                {!hasDevis && !hasFacture && (
                  <p style={{ color: '#aaa', fontSize: 13 }}>Aucun document disponible pour l'instant.</p>
                )}
              </div>
            </Card>
          </div>

          {/* Colonne droite : Carte GPS */}
          <div>
            <div style={{
              background: C.white, border: `1px solid ${C.border}`, borderRadius: 10,
              overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,.05)',
            }}>
              <div style={{
                padding: '14px 20px', borderBottom: `1px solid ${C.border}`,
                fontWeight: 700, fontSize: 14, color: C.primary,
              }}>
                📍 Localisation GPS
              </div>
              {hasGPS ? (
                <div ref={mapRef} style={{ height: 380 }} />
              ) : (
                <div style={{
                  height: 380, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', color: '#aaa',
                }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🗺️</div>
                  <p style={{ fontSize: 13 }}>
                    {dossier.transporteur_id
                      ? 'Aucune position GPS enregistrée pour ce trajet.'
                      : 'La localisation sera disponible une fois un transporteur affecté.'}
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #dde3ea', borderRadius: 10,
      overflow: 'hidden', marginBottom: 16, boxShadow: '0 1px 6px rgba(0,0,0,.05)',
    }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #eee', fontWeight: 700, fontSize: 14, color: '#1B4F72' }}>
        {title}
      </div>
      <div style={{ padding: '16px 20px' }}>{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13, borderBottom: '1px solid #f5f5f5' }}>
      <span style={{ color: '#666' }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function Loader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p style={{ color: '#888' }}>Chargement…</p>
    </div>
  );
}
