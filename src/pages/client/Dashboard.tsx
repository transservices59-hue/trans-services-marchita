import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useClientDossiers } from '../../hooks/useDossiers';
import { signOut } from '../../lib/supabase';
import type { StatutDossier, Dossier } from '../../types';

const C = { primary: '#1B4F72', accent: '#E67E22', bg: '#f5f7fa', white: '#fff', border: '#dde3ea' };

const STATUT_CONFIG: Record<StatutDossier, { label: string; color: string; bg: string }> = {
  brouillon:               { label: 'Brouillon',              color: '#666',    bg: '#f0f0f0' },
  en_attente:              { label: 'En attente',              color: '#7B4F00', bg: '#FFF3CD' },
  devis_envoye:            { label: 'Devis envoyé',            color: '#004085', bg: '#CCE5FF' },
  devis_attente_validation:{ label: 'Devis à valider',         color: '#155724', bg: '#D4EDDA' },
  valide:                  { label: 'Validé',                  color: '#0c5460', bg: '#d1ecf1' },
  paye:                    { label: 'Payé ✓',                  color: '#155724', bg: '#c3e6cb' },
  en_transit:              { label: 'En transit',              color: '#533F03', bg: '#FFEEBA' },
  livre:                   { label: 'Livré ✓',                 color: '#155724', bg: '#b8dabe' },
  facture_generee:         { label: 'Facturé',                 color: '#4a235a', bg: '#e8d5f5' },
  annule:                  { label: 'Annulé',                  color: '#721c24', bg: '#F8D7DA' },
  en_attente_paiement:     { label: 'En attente de paiement',  color: '#7B4F00', bg: '#FFF3CD' },
  en_preparation:          { label: 'En préparation',          color: '#004085', bg: '#CCE5FF' },
  recu_store:              { label: 'Reçu au store',           color: '#0c5460', bg: '#d1ecf1' },
  arrive_maroc:            { label: 'Arrivé au Maroc 🇲🇦',     color: '#155724', bg: '#D4EDDA' },
  disponible_retrait:      { label: 'Disponible au retrait',   color: '#533F03', bg: '#FFEEBA' },
  litige:                  { label: 'Litige ⚠️',              color: '#721c24', bg: '#F8D7DA' },
};

function Badge({ statut }: { statut: StatutDossier }) {
  const cfg = STATUT_CONFIG[statut] ?? { label: statut, color: '#333', bg: '#eee' };
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
      color: cfg.color, background: cfg.bg,
    }}>
      {cfg.label}
    </span>
  );
}

function DossierCard({ d }: { d: Dossier }) {
  const navigate = useNavigate();
  return (
    <div style={{
      background: C.white, border: `1px solid ${C.border}`, borderRadius: 10,
      padding: '20px 24px', cursor: 'pointer',
      boxShadow: '0 1px 6px rgba(0,0,0,.06)',
      transition: 'box-shadow .15s',
    }}
      onClick={() => navigate(`/client/dossier/${d.id}`)}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.12)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 6px rgba(0,0,0,.06)')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: C.primary }}>#{d.numero}</div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
            {new Date(d.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
        <Badge statut={d.statut} />
      </div>

      <div style={{ fontSize: 14, color: '#444', marginBottom: 12 }}>
        <div>📦 {d.type_colis.charAt(0).toUpperCase() + d.type_colis.slice(1)}{d.poids_kg ? ` — ${d.poids_kg} kg` : ''}</div>
        <div style={{ marginTop: 4 }}>📍 {d.adresse_depart} → {d.adresse_arrivee}</div>
      </div>

      {d.montant_devis && (
        <div style={{ fontSize: 15, fontWeight: 600, color: C.accent, marginBottom: 12 }}>
          Devis : {d.montant_devis.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {d.statut === 'en_attente_paiement' && (
          <button
            onClick={e => { e.stopPropagation(); navigate(`/client/paiement/${d.id}`); }}
            style={{
              background: '#635BFF', color: C.white, padding: '7px 16px',
              borderRadius: 6, fontSize: 13, fontWeight: 600,
            }}
          >
            💳 Payer maintenant
          </button>
        )}
        {d.statut === 'devis_attente_validation' && (
          <button
            onClick={e => { e.stopPropagation(); navigate(`/client/dossier/${d.id}`); }}
            style={{
              background: '#155724', color: C.white, padding: '7px 16px',
              borderRadius: 6, fontSize: 13, fontWeight: 600,
            }}
          >
            ✅ Valider et payer
          </button>
        )}
        {d.transporteur && (
          <button
            onClick={e => { e.stopPropagation(); navigate(`/client/suivi/${d.id}`); }}
            style={{
              background: C.primary, color: C.white, padding: '7px 16px',
              borderRadius: 6, fontSize: 13, fontWeight: 600,
            }}
          >
            📍 Suivre mon colis
          </button>
        )}
      </div>
    </div>
  );
}

export default function ClientDashboard() {
  const navigate  = useNavigate();
  const { profile } = useAuth();
  const { dossiers, loading, error } = useClientDossiers(profile?.id);

  const handleLogout = async () => { await signOut(); navigate('/login'); };

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      {/* Header */}
      <header style={{
        background: C.primary, color: C.white,
        padding: '0 2rem', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,.2)',
      }}>
        <span style={{ fontWeight: 700, fontSize: 18 }}>🚚 Trans Services Marchita</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 14, opacity: 0.85 }}>
            Bonjour, {profile?.prenom ?? '…'}
          </span>
          <button
            onClick={handleLogout}
            style={{ background: 'rgba(255,255,255,.15)', color: C.white, padding: '6px 14px', borderRadius: 6, fontSize: 13 }}
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* Body */}
      <main style={{ maxWidth: 860, margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.primary }}>Mes dossiers</h1>
          <button
            onClick={() => navigate('/demande')}
            style={{ background: C.accent, color: C.white, padding: '9px 20px', borderRadius: 7, fontSize: 14, fontWeight: 600 }}
          >
            + Nouvelle demande
          </button>
        </div>

        {loading && <p style={{ color: '#888', textAlign: 'center', padding: '3rem 0' }}>Chargement…</p>}
        {error   && <p style={{ color: '#c0392b' }}>Erreur : {error}</p>}

        {!loading && dossiers.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: '#999' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <p>Vous n'avez pas encore de dossier.</p>
            <button
              onClick={() => navigate('/demande')}
              style={{ marginTop: 20, background: C.accent, color: C.white, padding: '10px 24px', borderRadius: 7, fontWeight: 600 }}
            >
              Faire une demande
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {dossiers.map(d => <DossierCard key={d.id} d={d} />)}
        </div>
      </main>
    </div>
  );
}
