import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getDossierById, validerDevis } from '../../lib/supabase';
import type { Dossier, Facture, DevisItem } from '../../types';

const C = { primary: '#1B4F72', accent: '#E67E22', success: '#155724', bg: '#f5f7fa', white: '#fff', border: '#dde3ea', error: '#c0392b' };

const STATUT_LABEL: Record<string, string> = {
  brouillon: 'Brouillon', en_attente: 'En attente', devis_envoye: 'Devis envoyé',
  devis_attente_validation: 'Devis à valider', valide: 'Validé', paye: 'Payé',
  en_transit: 'En transit', livre: 'Livré', facture_generee: 'Facturé', annule: 'Annulé',
};

export default function ClientDossier() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getDossierById(id).then(({ data, error: err }) => {
      if (err) setError(err.message);
      else setDossier(data as Dossier);
      setLoading(false);
    });
  }, [id]);

  const handleValiderDevis = async () => {
    if (!dossier) return;
    setValidating(true);
    const { error: err } = await validerDevis(dossier.id);
    if (err) { setError(err.message); setValidating(false); return; }
    navigate(`/client/paiement/${dossier.id}`);
  };

  if (loading) return <Loader />;
  if (!dossier) return <div style={{ padding: '2rem', color: C.error }}>{error ?? 'Dossier introuvable'}</div>;

  const facture: Facture | undefined = dossier.factures?.[0];
  const items: DevisItem[] = dossier.devis_items ?? [];

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <header style={{
        background: C.primary, color: '#fff', padding: '0 2rem', height: 60,
        display: 'flex', alignItems: 'center', gap: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,.2)',
      }}>
        <Link to="/client/dashboard" style={{ color: 'rgba(255,255,255,.8)', fontSize: 14 }}>← Tableau de bord</Link>
        <span style={{ opacity: 0.4 }}>|</span>
        <span style={{ fontWeight: 600 }}>Dossier #{dossier.numero}</span>
      </header>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '2rem' }}>
        {error && <div style={{ background: '#fdecea', border: `1px solid ${C.error}`, color: C.error, padding: '12px 16px', borderRadius: 8, marginBottom: 20 }}>{error}</div>}

        {/* Statut */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.primary }}>Dossier #{dossier.numero}</h1>
          <span style={{
            padding: '5px 14px', borderRadius: 20, fontWeight: 600, fontSize: 13,
            background: '#e8f5e9', color: '#1b5e20',
          }}>
            {STATUT_LABEL[dossier.statut] ?? dossier.statut}
          </span>
        </div>

        {/* Informations */}
        <Card title="Informations d'expédition">
          <Row label="Type de colis" value={dossier.type_colis} />
          {dossier.poids_kg  && <Row label="Poids"    value={`${dossier.poids_kg} kg`} />}
          {dossier.volume_m3 && <Row label="Volume"   value={`${dossier.volume_m3} m³`} />}
          <Row label="Départ"  value={dossier.adresse_depart}  />
          <Row label="Arrivée" value={dossier.adresse_arrivee} />
          <Row label="Description" value={dossier.description} />
          <Row label="Date de création" value={new Date(dossier.created_at).toLocaleDateString('fr-FR', { dateStyle: 'long' })} />
        </Card>

        {/* Transporteur affecté */}
        {dossier.transporteur && (
          <Card title="Transporteur affecté">
            <Row label="Code"      value={dossier.transporteur.code} />
            <Row label="Nom"       value={dossier.transporteur.nom}  />
            <Row label="Type"      value={dossier.transporteur.type === 'camion' ? '🚛 Camion' : '🤝 Courtier'} />
            <Row label="Téléphone" value={dossier.transporteur.telephone} />
          </Card>
        )}

        {/* Devis */}
        {dossier.montant_devis !== null && (
          <Card title="Devis">
            {items.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16, fontSize: 14 }}>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '8px 0', color: '#444' }}>{item.label}</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600 }}>
                        {item.montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 18, color: C.accent }}>
                Total : {dossier.montant_devis.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </span>
              {(dossier.statut === 'devis_attente_validation' || dossier.statut === 'devis_envoye') && (
                <button
                  onClick={handleValiderDevis}
                  disabled={validating}
                  style={{
                    background: C.success, color: '#fff',
                    padding: '10px 24px', borderRadius: 7, fontWeight: 700, fontSize: 15,
                    opacity: validating ? 0.7 : 1,
                  }}
                >
                  {validating ? 'Validation…' : '✅ Valider le devis'}
                </button>
              )}
            </div>
          </Card>
        )}

        {/* Paiement */}
        {dossier.paye_le && (
          <Card title="Paiement">
            <Row label="Statut"     value="✅ Payé" />
            <Row label="Date"       value={new Date(dossier.paye_le).toLocaleDateString('fr-FR', { dateStyle: 'long' })} />
            {dossier.stripe_payment_intent_id && (
              <Row label="Référence" value={dossier.stripe_payment_intent_id} />
            )}
          </Card>
        )}

        {/* Facture */}
        {facture && (
          <Card title="Facture">
            <Row label="Numéro"      value={facture.numero} />
            <Row label="Montant HT"  value={facture.montant_ht.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} />
            <Row label="TVA (20 %)"  value={facture.tva.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} />
            <Row label="Montant TTC" value={facture.montant_ttc.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} />
            {facture.pdf_url && (
              <div style={{ marginTop: 12 }}>
                <a
                  href={facture.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block', background: C.primary, color: '#fff',
                    padding: '9px 20px', borderRadius: 7, fontSize: 14, fontWeight: 600,
                  }}
                >
                  📄 Télécharger la facture PDF
                </a>
              </div>
            )}
          </Card>
        )}
      </main>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#fff', border: `1px solid #dde3ea`, borderRadius: 10,
      padding: '20px 24px', marginBottom: 20, boxShadow: '0 1px 6px rgba(0,0,0,.05)',
    }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1B4F72', marginBottom: 14, borderBottom: '1px solid #eee', paddingBottom: 10 }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14, borderBottom: '1px solid #f5f5f5' }}>
      <span style={{ color: '#666' }}>{label}</span>
      <span style={{ fontWeight: 500, color: '#222', maxWidth: '60%', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function Loader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p style={{ color: '#888' }}>Chargement du dossier…</p>
    </div>
  );
}
