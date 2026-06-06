import { useState, FormEvent } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const C = { primary: '#1B4F72', accent: '#E67E22', border: '#d0d7de', white: '#fff', bg: '#f5f7fa', error: '#c0392b' };

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const navigate        = useNavigate();

  const email         = searchParams.get('email')   ?? '';
  const dossierNumero = searchParams.get('dossier') ?? '';

  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [alreadyExists, setAlreadyExists] = useState(false);

  const pwMatch  = password === confirm;
  const pwLength = password.length >= 8;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!pwLength) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return; }
    if (!pwMatch)  { setError('Les mots de passe ne correspondent pas.');               return; }

    setLoading(true);
    setError(null);

    // 1. Créer le compte
    const { error: signUpErr } = await supabase.auth.signUp({ email, password });

    if (signUpErr) {
      const msg = signUpErr.message.toLowerCase();
      if (msg.includes('already') || msg.includes('registered') || msg.includes('exist')) {
        setAlreadyExists(true);
        setLoading(false);
        return;
      }
      setError(signUpErr.message);
      setLoading(false);
      return;
    }

    // 2. Connexion immédiate
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signInErr) {
      setError(signInErr.message);
      setLoading(false);
      return;
    }

    // 3. Lier le dossier au profil (via API server → service_role pour bypass RLS)
    if (dossierNumero) {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch('/api/link-dossier', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body:    JSON.stringify({ dossierNumero }),
      });
    }

    navigate('/client', { replace: true });
  };

  // ── Compte déjà existant ──────────────────────────────────────────────────────
  if (alreadyExists) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ background: C.white, borderRadius: 12, padding: '48px 40px', maxWidth: 420, width: '100%', textAlign: 'center', boxShadow: '0 4px 32px rgba(0,0,0,.1)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>👤</div>
          <h2 style={{ color: C.primary, marginBottom: 12 }}>Vous avez déjà un compte</h2>
          <p style={{ color: '#555', fontSize: 15, marginBottom: 28 }}>
            L'adresse <strong>{email}</strong> est déjà associée à un compte.
            Connectez-vous pour accéder à votre espace et voir votre dossier.
          </p>
          <Link
            to={`/login`}
            style={{
              display: 'inline-block', background: C.primary, color: C.white,
              padding: '12px 28px', borderRadius: 8, fontWeight: 700, fontSize: 15,
              textDecoration: 'none',
            }}
          >
            Se connecter →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ background: C.white, borderRadius: 12, padding: '48px 40px', maxWidth: 440, width: '100%', boxShadow: '0 4px 32px rgba(0,0,0,.1)' }}>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔑</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.primary }}>Créer mon espace client</h1>
          {dossierNumero && (
            <p style={{ color: '#888', fontSize: 14, marginTop: 4 }}>
              Dossier <strong style={{ color: C.primary }}>{dossierNumero}</strong>
            </p>
          )}
        </div>

        <form onSubmit={e => void handleSubmit(e)}>
          {/* Email — lecture seule */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 14, marginBottom: 6, color: '#333' }}>
              Adresse e-mail
            </label>
            <input
              type="email" value={email} disabled readOnly
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                border: `1.5px solid ${C.border}`, fontSize: 15,
                background: '#f8f9fb', color: '#666', cursor: 'not-allowed',
              }}
            />
          </div>

          {/* Mot de passe */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 14, marginBottom: 6, color: '#333' }}>
              Mot de passe <span style={{ fontWeight: 400, color: '#aaa', fontSize: 12 }}>(min 8 caractères)</span>
            </label>
            <input
              type="password" required value={password}
              onChange={e => setPassword(e.target.value)} placeholder="••••••••"
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                border: `1.5px solid ${password && !pwLength ? C.error : C.border}`,
                fontSize: 15, outline: 'none',
              }}
            />
          </div>

          {/* Confirmation */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 14, marginBottom: 6, color: '#333' }}>
              Confirmer le mot de passe
            </label>
            <input
              type="password" required value={confirm}
              onChange={e => setConfirm(e.target.value)} placeholder="••••••••"
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                border: `1.5px solid ${confirm && !pwMatch ? C.error : C.border}`,
                fontSize: 15, outline: 'none',
              }}
            />
            {confirm && !pwMatch && (
              <p style={{ color: C.error, fontSize: 12, marginTop: 4 }}>
                Les mots de passe ne correspondent pas.
              </p>
            )}
          </div>

          {error && (
            <div style={{
              background: '#fdecea', border: `1px solid ${C.error}`, color: C.error,
              padding: '10px 14px', borderRadius: 8, fontSize: 14, marginBottom: 20,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', background: loading ? '#aaa' : C.accent,
              color: C.white, padding: 12, borderRadius: 8, fontSize: 16, fontWeight: 700,
              border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Création en cours…' : 'Créer mon compte →'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link to="/" style={{ fontSize: 13, color: '#aaa' }}>← Retour à l'accueil</Link>
        </div>
      </div>
    </div>
  );
}
