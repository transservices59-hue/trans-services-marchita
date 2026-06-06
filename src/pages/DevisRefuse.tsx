import { useSearchParams, Link } from 'react-router-dom';

const C = { primary: '#1B4F72', bg: '#f5f7fa' };

const MESSAGES: Record<string, string> = {
  'lien-invalide': 'Ce lien est invalide ou a déjà été utilisé.',
  'devis-expire':  'Ce devis a expiré. Contactez-nous pour obtenir un nouveau devis.',
  'devis-annule':  'Ce devis n\'est plus disponible.',
};

export default function DevisRefuse() {
  const [params] = useSearchParams();
  const erreur = params.get('erreur');
  const deja   = params.get('deja') === '1';

  const message = erreur
    ? (MESSAGES[erreur] ?? 'Une erreur est survenue.')
    : deja
      ? 'Vous avez déjà refusé ce devis.'
      : 'Notre équipe va vous contacter pour trouver une solution adaptée à votre besoin.';

  const title = erreur
    ? 'Lien invalide'
    : deja
      ? 'Devis déjà refusé'
      : 'Devis refusé';

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
        <div style={{ fontSize: 56, marginBottom: 16 }}>{erreur ? '🔗' : '❌'}</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#721c24', marginBottom: 12 }}>
          {title}
        </h1>

        <p style={{ color: '#555', fontSize: 15, lineHeight: 1.6, marginBottom: 28 }}>
          {message}
        </p>

        <p style={{ color: '#777', fontSize: 14, marginBottom: 28 }}>
          Vous pouvez nous contacter directement :{' '}
          <a href="mailto:trans.services59@gmail.com" style={{ color: C.primary, fontWeight: 600 }}>
            trans.services59@gmail.com
          </a>
        </p>

        <Link
          to="/"
          style={{
            display: 'inline-block', background: C.primary, color: '#fff',
            padding: '12px 28px', borderRadius: 8, fontWeight: 700, fontSize: 15,
            textDecoration: 'none',
          }}
        >
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}
