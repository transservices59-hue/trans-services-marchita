import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getDossierById } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import type { Dossier } from '../../types';

const C = { primary: '#1B4F72', accent: '#E67E22', bg: '#f5f7fa', white: '#fff', error: '#c0392b' };

export default function Paiement() {
  const { dossierId } = useParams<{ dossierId: string }>();
  const navigate      = useNavigate();
  const { user }      = useAuth();

  const [dossier,     setDossier]     = useState<Dossier | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [paying,      setPaying]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [cgvAccepted, setCgvAccepted] = useState(false);

  useEffect(() => {
    if (!dossierId) return;
    getDossierById(dossierId).then(({ data, error: err }) => {
      if (err) setError(err.message);
      else setDossier(data as Dossier);
      setLoading(false);
    });
  }, [dossierId]);

  const handlePay = async () => {
    if (!dossier || !user) return;
    setPaying(true);
    setError(null);

    const successUrl = `${window.location.origin}/client/paiement/success?dossier=${dossier.id}`;
    const cancelUrl  = `${window.location.origin}/client/dossier/${dossier.id}`;

    try {
      const res = await fetch('/api/create-checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dossierId: dossier.id,
          montant:   dossier.montant_devis,
          email:     user.email,
          successUrl,
          cancelUrl,
        }),
      });

      const data = await res.json() as { url?: string; error?: string };

      if (!res.ok || !data.url) {
        throw new Error(data.error ?? 'Impossible de créer la session de paiement.');
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du paiement.');
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: C.bg }}>
        <p style={{ color: '#888' }}>Préparation du paiement…</p>
      </div>
    );
  }

  if (!dossier) {
    return <div style={{ padding: '2rem', color: C.error }}>{error ?? 'Dossier introuvable.'}</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{
        background: C.white, borderRadius: 12, padding: '48px 40px',
        boxShadow: '0 4px 32px rgba(0,0,0,.1)', width: '100%', maxWidth: 480,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>💳</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.primary, marginBottom: 8 }}>
          Paiement sécurisé
        </h1>
        <p style={{ color: '#666', fontSize: 15, marginBottom: 32 }}>
          Vous allez être redirigé vers la page de paiement Stripe.
        </p>

        {/* Récapitulatif */}
        <div style={{
          background: '#f8f9fb', borderRadius: 8, padding: '20px 24px',
          marginBottom: 28, textAlign: 'left', border: '1px solid #e8edf2',
        }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.primary, marginBottom: 12 }}>
            Récapitulatif de la commande
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8 }}>
            <span style={{ color: '#555' }}>Dossier</span>
            <span style={{ fontWeight: 600 }}>#{dossier.numero}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8 }}>
            <span style={{ color: '#555' }}>Type</span>
            <span style={{ fontWeight: 600 }}>{dossier.type_colis}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8 }}>
            <span style={{ color: '#555' }}>Trajet</span>
            <span style={{ fontWeight: 600, maxWidth: '55%', textAlign: 'right', fontSize: 12 }}>
              {dossier.adresse_depart} → {dossier.adresse_arrivee}
            </span>
          </div>
          <div style={{ borderTop: '1px solid #dde3ea', marginTop: 12, paddingTop: 12, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>Total</span>
            <span style={{ fontWeight: 700, fontSize: 18, color: C.accent }}>
              {(dossier.montant_devis ?? 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </span>
          </div>
        </div>

        {/* Checkbox CGV obligatoire */}
        <label style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          cursor: 'pointer', fontSize: 13, color: '#555', marginBottom: 20, lineHeight: 1.5,
        }}>
          <input
            type="checkbox"
            checked={cgvAccepted}
            onChange={e => setCgvAccepted(e.target.checked)}
            style={{ marginTop: 2, flexShrink: 0, width: 16, height: 16, accentColor: C.primary }}
          />
          <span>
            J'ai lu et j'accepte les{' '}
            <a href="/legal" target="_blank" rel="noopener noreferrer"
               style={{ color: C.primary, fontWeight: 600 }}>
              Conditions Générales de Vente
            </a>
            {' '}de Trans Services Marchita, ainsi que la{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer"
               style={{ color: C.primary, fontWeight: 600 }}>
              politique de confidentialité
            </a>.
          </span>
        </label>

        {error && (
          <div style={{
            background: '#fdecea', border: `1px solid ${C.error}`, color: C.error,
            padding: '10px 14px', borderRadius: 8, fontSize: 14, marginBottom: 20,
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handlePay}
          disabled={paying || !cgvAccepted}
          style={{
            width: '100%', background: paying || !cgvAccepted ? '#aaa' : '#635BFF',
            color: C.white, padding: '14px', borderRadius: 8,
            fontSize: 16, fontWeight: 700,
            cursor: paying ? 'not-allowed' : 'pointer',
          }}
        >
          {paying ? 'Redirection vers Stripe…' : '🔒 Payer maintenant'}
        </button>

        <div style={{ marginTop: 16 }}>
          <Link
            to={`/client/dossier/${dossier.id}`}
            style={{ fontSize: 13, color: '#aaa' }}
          >
            ← Retour au dossier
          </Link>
        </div>

        <p style={{ marginTop: 20, fontSize: 12, color: '#bbb' }}>
          Paiement sécurisé par Stripe. Vos données bancaires ne transitent pas par nos serveurs.
        </p>
      </div>
    </div>
  );
}
