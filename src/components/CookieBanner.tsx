import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'tsm_cookie_consent';
type Consent = 'accepted' | 'refused' | null;

export default function CookieBanner() {
  const [consent, setConsent] = useState<Consent | 'loading'>('loading');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Consent | null;
    setConsent(stored);
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    setConsent('accepted');
  };

  const refuse = () => {
    localStorage.setItem(STORAGE_KEY, 'refused');
    setConsent('refused');
  };

  // Pas encore chargé ou déjà décidé → ne rien afficher
  if (consent !== null) return null;

  return (
    <div
      role="dialog"
      aria-label="Consentement cookies"
      style={{
        position:   'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
        background: '#1B4F72',
        color:      '#fff',
        padding:    '16px 24px',
        display:    'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap:   'wrap',
        gap:        12,
        boxShadow:  '0 -4px 24px rgba(0,0,0,.25)',
      }}
    >
      <p style={{ margin: 0, fontSize: 14, flex: 1, minWidth: 220, lineHeight: 1.5 }}>
        🍪 Nous utilisons des <strong>cookies essentiels</strong> pour le fonctionnement du service
        (session, préférences).{' '}
        <Link to="/privacy" style={{ color: '#E67E22', fontWeight: 600 }}>
          En savoir plus
        </Link>
      </p>

      <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
        <button
          onClick={refuse}
          style={{
            padding:    '9px 20px',
            borderRadius: 7,
            fontSize:   13,
            fontWeight: 600,
            background: 'transparent',
            border:     '1.5px solid rgba(255,255,255,.55)',
            color:      '#fff',
            cursor:     'pointer',
          }}
        >
          Refuser
        </button>
        <button
          onClick={accept}
          style={{
            padding:    '9px 20px',
            borderRadius: 7,
            fontSize:   13,
            fontWeight: 700,
            background: '#E67E22',
            border:     'none',
            color:      '#fff',
            cursor:     'pointer',
          }}
        >
          Accepter
        </button>
      </div>
    </div>
  );
}

// Hook utilitaire pour vérifier le consentement depuis n'importe quel composant
export function useCookieConsent(): Consent {
  const stored = localStorage.getItem(STORAGE_KEY) as Consent | null;
  return stored;
}
