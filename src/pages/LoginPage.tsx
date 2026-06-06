import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signIn, getProfile, supabase } from '../lib/supabase';
import type { Role } from '../types';

const ROLE_REDIRECT: Record<Role, string> = {
  client:      '/client/dashboard',
  store:       '/store/dossiers',
  transporter: '/tracker',
  broker:      '/tracker',
};

const C = { primary:'#1B4F72', accent:'#E67E22', error:'#c0392b', border:'#d0d7de', bg:'#f5f7fa', white:'#fff' };

type Step = 'credentials' | 'mfa';

// ── Lecture du fragment hash Supabase (#access_token=...&type=recovery) ────────
function parseRecoveryHash(): { accessToken: string; refreshToken: string } | null {
  const params = new URLSearchParams(window.location.hash.substring(1));
  const type    = params.get('type');
  const access  = params.get('access_token');
  const refresh = params.get('refresh_token') ?? '';
  if (type === 'recovery' && access) return { accessToken: access, refreshToken: refresh };
  return null;
}

export default function LoginPage() {
  const navigate = useNavigate();

  // ── Détection du mode recovery ────────────────────────────────────────────────
  const [recoveryTokens] = useState(parseRecoveryHash);
  const isRecovery = !!recoveryTokens;

  // ── État création de mot de passe ─────────────────────────────────────────────
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSet,     setPasswordSet]     = useState(false);

  // ── État connexion normale ────────────────────────────────────────────────────
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');

  // ── État MFA ──────────────────────────────────────────────────────────────────
  const [factorId,    setFactorId]    = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [totpCode,    setTotpCode]    = useState('');
  const [step,        setStep]        = useState<Step>('credentials');

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // ── Établir la session Supabase depuis le token recovery ──────────────────────
  useEffect(() => {
    if (!recoveryTokens) return;
    supabase.auth
      .setSession({ access_token: recoveryTokens.accessToken, refresh_token: recoveryTokens.refreshToken })
      .then(({ error: err }) => {
        if (err) setError('Lien invalide ou expiré. Demandez un nouveau lien.');
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Soumission : définir le mot de passe ─────────────────────────────────────
  const handleSetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });

    if (updateErr) {
      setError(updateErr.message);
      setLoading(false);
      return;
    }

    setPasswordSet(true);

    // Rediriger vers l'espace approprié selon le rôle
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await getProfile(user.id);
      const dest = ROLE_REDIRECT[(profile?.role as Role) ?? 'client'] ?? '/client/dashboard';
      setTimeout(() => navigate(dest, { replace: true }), 2000);
    } else {
      setTimeout(() => navigate('/client/dashboard', { replace: true }), 2000);
    }
    setLoading(false);
  };

  // ── Soumission : connexion normale ───────────────────────────────────────────
  const handleCredentials = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: authErr } = await signIn(email, password);

    if (authErr || !data.user) {
      setError(authErr?.message ?? 'Identifiants incorrects');
      setLoading(false);
      return;
    }

    const { data: profile, error: profileErr } = await getProfile(data.user.id);

    if (profileErr || !profile) {
      setError("Profil introuvable. Contactez l'administrateur.");
      setLoading(false);
      return;
    }

    if (profile.role === 'store') {
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aalData?.nextLevel === 'aal2') {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const totpFactors = factors?.totp ?? [];

        if (totpFactors.length === 0) {
          setLoading(false);
          navigate('/mfa/enroll');
          return;
        }

        const factor = totpFactors[0];
        const { data: challenge, error: challErr } = await supabase.auth.mfa.challenge({ factorId: factor.id });

        if (challErr || !challenge) {
          setError('Erreur MFA. Réessayez.');
          setLoading(false);
          return;
        }

        setFactorId(factor.id);
        setChallengeId(challenge.id);
        setStep('mfa');
        setLoading(false);
        return;
      }
    }

    navigate(ROLE_REDIRECT[profile.role as Role] ?? '/');
    setLoading(false);
  };

  // ── Soumission : code TOTP ───────────────────────────────────────────────────
  const handleMFA = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: verifyErr } = await supabase.auth.mfa.verify({ factorId, challengeId, code: totpCode });

    if (verifyErr) {
      setError('Code incorrect ou expiré. Réessayez.');
      setLoading(false);
      return;
    }

    navigate('/store/dossiers', { replace: true });
  };

  // ── Rendu : MFA ──────────────────────────────────────────────────────────────
  if (step === 'mfa') {
    return (
      <div style={{ minHeight:'100vh', background: C.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem' }}>
        <div style={{ background: C.white, borderRadius:12, padding:'48px 40px',
          boxShadow:'0 4px 32px rgba(0,0,0,.1)', width:'100%', maxWidth:400, textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🔐</div>
          <h1 style={{ fontSize:20, fontWeight:700, color: C.primary, marginBottom:6 }}>Vérification 2FA</h1>
          <p style={{ color:'#666', fontSize:14, marginBottom:28 }}>
            Entrez le code à 6 chiffres de votre application d'authentification.
          </p>
          {error && <ErrorBox msg={error} />}
          <form onSubmit={e => void handleMFA(e)}>
            <input
              type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
              value={totpCode} onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000" autoFocus
              style={{
                width:'100%', padding:'14px', borderRadius:8,
                border:`2px solid ${totpCode.length === 6 ? C.primary : C.border}`,
                fontSize:28, textAlign:'center', letterSpacing:10, fontWeight:700,
                outline:'none', marginBottom:20,
              }}
            />
            <button type="submit" disabled={loading || totpCode.length !== 6}
              style={{ width:'100%', background: loading || totpCode.length !== 6 ? '#aaa' : C.primary,
                color: C.white, padding:12, borderRadius:8, fontSize:15, fontWeight:700,
                cursor: loading || totpCode.length !== 6 ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Vérification…' : 'Valider →'}
            </button>
          </form>
          <button onClick={() => { setStep('credentials'); setTotpCode(''); setError(null); }}
            style={{ marginTop:16, background:'none', color:'#aaa', fontSize:13, cursor:'pointer' }}>
            ← Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  // ── Rendu : création de mot de passe (lien recovery) ─────────────────────────
  if (isRecovery) {
    return (
      <div style={{ minHeight:'100vh', background: C.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem' }}>
        <div style={{ background: C.white, borderRadius:12, padding:'48px 40px',
          boxShadow:'0 4px 32px rgba(0,0,0,.1)', width:'100%', maxWidth:420 }}>

          {passwordSet ? (
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:56, marginBottom:16 }}>✅</div>
              <h2 style={{ color: C.primary, marginBottom:8 }}>Mot de passe créé !</h2>
              <p style={{ color:'#555', fontSize:15 }}>
                Vous allez être redirigé vers votre espace…
              </p>
            </div>
          ) : (
            <>
              <div style={{ textAlign:'center', marginBottom:32 }}>
                <div style={{ fontSize:40, marginBottom:8 }}>🔑</div>
                <h1 style={{ fontSize:22, fontWeight:700, color: C.primary }}>Créer votre mot de passe</h1>
                <p style={{ color:'#888', fontSize:14, marginTop:4 }}>
                  Choisissez un mot de passe sécurisé pour accéder à votre espace.
                </p>
              </div>

              {error && <ErrorBox msg={error} />}

              <form onSubmit={e => void handleSetPassword(e)}>
                <PasswordField
                  label="Nouveau mot de passe"
                  value={newPassword}
                  onChange={setNewPassword}
                  placeholder="Au moins 8 caractères"
                  border={C.border}
                />
                <PasswordField
                  label="Confirmer le mot de passe"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Répétez le mot de passe"
                  border={newPassword && confirmPassword && newPassword !== confirmPassword
                    ? C.error : C.border}
                />
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p style={{ color: C.error, fontSize:13, marginTop:-12, marginBottom:16 }}>
                    Les mots de passe ne correspondent pas.
                  </p>
                )}

                <button type="submit" disabled={loading}
                  style={{ width:'100%', background: loading ? '#aaa' : C.primary,
                    color: C.white, padding:12, borderRadius:8, fontSize:16, fontWeight:700,
                    cursor: loading ? 'not-allowed' : 'pointer', marginTop:8 }}>
                  {loading ? 'Enregistrement…' : 'Définir mon mot de passe →'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Rendu : connexion normale ─────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background: C.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem' }}>
      <div style={{ background: C.white, borderRadius:12, padding:'48px 40px',
        boxShadow:'0 4px 32px rgba(0,0,0,.1)', width:'100%', maxWidth:420 }}>

        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{ fontSize:40, marginBottom:8 }}>🚚</div>
          <h1 style={{ fontSize:22, fontWeight:700, color: C.primary }}>Trans Services Marchita</h1>
          <p style={{ color:'#888', fontSize:14, marginTop:4 }}>Connectez-vous à votre espace</p>
        </div>

        {error && <ErrorBox msg={error} />}

        <form onSubmit={e => void handleCredentials(e)}>
          <div style={{ marginBottom:20 }}>
            <label style={{ display:'block', fontWeight:600, fontSize:14, marginBottom:6, color:'#333' }}>
              Adresse e-mail
            </label>
            <input type="email" required value={email}
              onChange={e => setEmail(e.target.value)} placeholder="vous@exemple.com"
              style={{ width:'100%', padding:'10px 14px', borderRadius:8,
                border:`1.5px solid ${C.border}`, fontSize:15, outline:'none' }}
            />
          </div>

          <div style={{ marginBottom:28 }}>
            <label style={{ display:'block', fontWeight:600, fontSize:14, marginBottom:6, color:'#333' }}>
              Mot de passe
            </label>
            <input type="password" required value={password}
              onChange={e => setPassword(e.target.value)} placeholder="••••••••"
              style={{ width:'100%', padding:'10px 14px', borderRadius:8,
                border:`1.5px solid ${C.border}`, fontSize:15, outline:'none' }}
            />
          </div>

          <button type="submit" disabled={loading}
            style={{ width:'100%', background: loading ? '#aaa' : C.primary,
              color: C.white, padding:12, borderRadius:8, fontSize:16, fontWeight:700,
              cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <div style={{ textAlign:'center', marginTop:24, fontSize:14, color:'#666' }}>
          Première demande ?{' '}
          <Link to="/demande" style={{ color: C.accent, fontWeight:600 }}>Cliquer ici</Link>
        </div>
        <div style={{ textAlign:'center', marginTop:12 }}>
          <Link to="/" style={{ fontSize:13, color:'#aaa' }}>← Retour à l'accueil</Link>
        </div>
      </div>
    </div>
  );
}

// ── Sous-composants ───────────────────────────────────────────────────────────

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{ background:'#fdecea', border:`1px solid #c0392b`, color:'#c0392b',
      padding:'10px 14px', borderRadius:8, fontSize:14, marginBottom:20 }}>
      {msg}
    </div>
  );
}

function PasswordField({ label, value, onChange, placeholder, border }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; border: string;
}) {
  return (
    <div style={{ marginBottom:20 }}>
      <label style={{ display:'block', fontWeight:600, fontSize:14, marginBottom:6, color:'#333' }}>
        {label}
      </label>
      <input type="password" required value={value}
        onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width:'100%', padding:'10px 14px', borderRadius:8,
          border:`1.5px solid ${border}`, fontSize:15, outline:'none' }}
      />
    </div>
  );
}
