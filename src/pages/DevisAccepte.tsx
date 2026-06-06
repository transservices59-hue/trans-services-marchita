import { useSearchParams, Link } from 'react-router-dom';

const C = { primary: '#1B4F72', accent: '#E67E22', bg: '#f5f7fa' };

export default function DevisAccepte() {
  const [params] = useSearchParams();
  const numero = params.get('numero');
  const deja   = params.get('deja') === '1';

  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
    }}>
      <div style={{
        background: '#fff', borderRadius: 14, padding: '48px 40px',
        boxShadow: '0 4px 32px rgba(0,0,0,.1)', width: '100%', maxWidth: 480,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.primary, marginBottom: 12 }}>
          {deja ? 'Devis déjà accepté' : 'Devis accepté !'}
        </h1>

        {numero && (
          <div style={{
            background: '#d4edda', borderRadius: 8, padding: '12px 20px',
            margin: '20px 0', fontSize: 15, fontWeight: 600, color: '#155724',
          }}>
            Dossier {numero} créé
          </div>
        )}

        <p style={{ color: '#555', fontSize: 15, lineHeight: 1.6, marginBottom: 28 }}>
          {deja
            ? 'Ce devis a déjà été accepté. Votre dossier est en cours de traitement.'
            : 'Votre dossier a été créé. Vous allez recevoir un email pour créer votre mot de passe et accéder à votre espace client.'}
        </p>

        <Link
          to="/login"
          style={{
            display: 'inline-block', background: C.primary, color: '#fff',
            padding: '12px 28px', borderRadius: 8, fontWeight: 700, fontSize: 15,
            textDecoration: 'none',
          }}
        >
          Accéder à mon espace →
        </Link>

        <div style={{ marginTop: 20 }}>
          <Link to="/" style={{ fontSize: 13, color: '#aaa' }}>Retour à l'accueil</Link>
        </div>
      </div>
    </div>
  );
}
