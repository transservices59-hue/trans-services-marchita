import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signIn, getProfile } from '../lib/supabase';
import type { Role } from '../types';

const ROLE_REDIRECT: Record<Role, string> = {
  client:      '/client/dashboard',
  store:       '/store/dossiers',
  transporter: '/tracker',
  broker:      '/tracker',
};

const C = {
  primary: '#1B4F72',
  accent:  '#E67E22',
  error:   '#c0392b',
  border:  '#d0d7de',
  bg:      '#f5f7fa',
  white:   '#fff',
};

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: authErr } = await signIn(email, password);

    if (authErr || !data.user) {
      setError(authErr?.message ?? 'Erreur de connexion');
      setLoading(false);
      return;
    }

    const { data: profile, error: profileErr } = await getProfile(data.user.id);

    if (profileErr || !profile) {
      setError('Profil introuvable. Contactez l\'administrateur.');
      setLoading(false);
      return;
    }

    navigate(ROLE_REDIRECT[profile.role as Role] ?? '/');
  };

  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{
        background: C.white, borderRadius: 12, padding: '48px 40px',
        boxShadow: '0 4px 32px rgba(0,0,0,.1)', width: '100%', maxWidth: 420,
      }}>

        {/* Logo / titre */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🚚</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.primary }}>Trans Services Marchita</h1>
          <p style={{ color: '#888', fontSize: 14, marginTop: 4 }}>Connectez-vous à votre espace</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 14, marginBottom: 6, color: '#333' }}>
              Adresse e-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                border: `1.5px solid ${C.border}`, fontSize: 15, outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 14, marginBottom: 6, color: '#333' }}>
              Mot de passe
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                border: `1.5px solid ${C.border}`, fontSize: 15, outline: 'none',
              }}
            />
          </div>

          {error && (
            <div style={{
              background: '#fdecea', border: `1px solid ${C.error}`,
              color: C.error, padding: '10px 14px', borderRadius: 8,
              fontSize: 14, marginBottom: 20,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', background: loading ? '#aaa' : C.primary,
              color: C.white, padding: '12px', borderRadius: 8,
              fontSize: 16, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: '#666' }}>
          Première demande ?{' '}
          <Link to="/demande" style={{ color: C.accent, fontWeight: 600 }}>
            Cliquer ici
          </Link>
        </div>

        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <Link to="/" style={{ fontSize: 13, color: '#aaa' }}>← Retour à l'accueil</Link>
        </div>

      </div>
    </div>
  );
}
