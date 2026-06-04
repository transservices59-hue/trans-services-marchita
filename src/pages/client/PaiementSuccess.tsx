import { useSearchParams, Link } from 'react-router-dom';

const C = { primary: '#1B4F72', accent: '#E67E22', success: '#155724', bg: '#f5f7fa', white: '#fff' };

export default function PaiementSuccess() {
  const [searchParams] = useSearchParams();
  const dossierId = searchParams.get('dossier');

  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
    }}>
      <div style={{
        background: C.white, borderRadius: 12, padding: '56px 48px',
        boxShadow: '0 4px 32px rgba(0,0,0,.1)', width: '100%', maxWidth: 480, textAlign: 'center',
      }}>
        {/* Icône succès */}
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: '#d4edda', display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', fontSize: 40,
        }}>
          ✅
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 700, color: C.success, marginBottom: 12 }}>
          Paiement confirmé !
        </h1>
        <p style={{ color: '#555', fontSize: 15, lineHeight: 1.6, marginBottom: 32 }}>
          Votre paiement a bien été reçu. Votre dossier est maintenant traité en priorité.
          Vous recevrez un e-mail de confirmation ainsi que votre facture.
        </p>

        <div style={{
          background: '#f0fdf4', border: '1px solid #86efac',
          borderRadius: 8, padding: '16px', marginBottom: 32, fontSize: 14, color: '#166534',
        }}>
          <strong>Prochaine étape :</strong> Notre équipe va affecter un transporteur à votre dossier.
          Vous pourrez ensuite suivre votre colis en temps réel sur la carte.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {dossierId && (
            <Link
              to={`/client/dossier/${dossierId}`}
              style={{
                display: 'block', background: C.primary, color: C.white,
                padding: '12px 24px', borderRadius: 8, fontWeight: 700, fontSize: 15,
              }}
            >
              📁 Voir mon dossier
            </Link>
          )}
          <Link
            to="/client/dashboard"
            style={{
              display: 'block', background: '#f0f4f8', color: C.primary,
              padding: '12px 24px', borderRadius: 8, fontWeight: 600, fontSize: 15,
            }}
          >
            🏠 Retour au tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
}
