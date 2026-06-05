import { useEffect, useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const C = { primary: '#1B4F72', accent: '#E67E22', bg: '#f5f7fa', white: '#fff',
            border: '#d0d7de', error: '#c0392b', success: '#155724' };

export default function MFAEnroll() {
  const navigate = useNavigate();

  const [factorId,  setFactorId]  = useState('');
  const [totpUri,   setTotpUri]   = useState('');
  const [secret,    setSecret]    = useState('');
  const [code,      setCode]      = useState('');
  const [loading,   setLoading]   = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  // Enrôlement TOTP au montage
  useEffect(() => {
    supabase.auth.mfa.enroll({ factorType: 'totp' }).then(({ data, error: err }) => {
      if (err || !data) {
        setError(err?.message ?? 'Erreur d\'enrôlement');
        setLoading(false);
        return;
      }
      setFactorId(data.id);
      setTotpUri(data.totp.uri);
      setSecret(data.totp.secret);
      setLoading(false);
    });
  }, []);

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    if (!factorId || code.length !== 6) return;
    setVerifying(true);
    setError(null);

    const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });

    if (err) {
      setError('Code incorrect. Vérifiez votre application et réessayez.');
      setVerifying(false);
      return;
    }

    navigate('/store/dossiers', { replace: true });
  };

  if (loading) {
    return (
      <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background: C.bg }}>
        <p style={{ color:'#888' }}>Génération du QR code…</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight:'100vh', background: C.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem' }}>
      <div style={{
        background: C.white, borderRadius: 12, padding:'48px 40px',
        boxShadow:'0 4px 32px rgba(0,0,0,.1)', width:'100%', maxWidth: 480,
      }}>
        <div style={{ textAlign:'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🔐</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.primary }}>
            Activer la double authentification
          </h1>
          <p style={{ color:'#666', fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>
            Obligatoire pour les comptes Store. Scannez le QR code avec Google Authenticator,
            Authy ou une application compatible TOTP.
          </p>
        </div>

        {error && (
          <div style={{ background:'#fdecea', border:`1px solid ${C.error}`, color: C.error,
            padding:'10px 14px', borderRadius: 8, fontSize:14, marginBottom: 20 }}>
            {error}
          </div>
        )}

        {/* QR Code via Google Charts */}
        {totpUri && (
          <div style={{ textAlign:'center', marginBottom: 24 }}>
            <img
              src={`https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(totpUri)}`}
              alt="QR code TOTP"
              width={200}
              height={200}
              style={{ border:`1px solid ${C.border}`, borderRadius: 8 }}
            />
            <div style={{ marginTop: 12 }}>
              <details style={{ textAlign:'left', fontSize: 12, color:'#888' }}>
                <summary style={{ cursor:'pointer', marginBottom: 6 }}>
                  Pas de scanner ? Clé manuelle
                </summary>
                <code style={{
                  display:'block', background:'#f5f5f5', padding:'8px 12px',
                  borderRadius: 6, wordBreak:'break-all', fontSize: 11,
                  fontFamily:'monospace', color: C.primary,
                }}>
                  {secret}
                </code>
              </details>
            </div>
          </div>
        )}

        <form onSubmit={handleVerify}>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display:'block', fontWeight:600, fontSize:14, marginBottom:8, color:'#333' }}>
              Code à 6 chiffres (de votre application)
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              style={{
                width:'100%', padding:'12px 16px', borderRadius: 8,
                border:`2px solid ${code.length === 6 ? C.primary : C.border}`,
                fontSize: 24, textAlign:'center', letterSpacing: 8,
                fontWeight: 700, outline:'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={verifying || code.length !== 6}
            style={{
              width:'100%', background: verifying || code.length !== 6 ? '#aaa' : C.primary,
              color: C.white, padding: 14, borderRadius: 8,
              fontSize: 15, fontWeight: 700,
              cursor: verifying || code.length !== 6 ? 'not-allowed' : 'pointer',
            }}
          >
            {verifying ? 'Vérification…' : '✅ Activer la 2FA'}
          </button>
        </form>

        <div style={{ marginTop: 20, padding:'12px 16px', background:'#fff3cd',
          borderRadius: 8, fontSize: 12, color:'#856404' }}>
          ⚠️ Conservez votre clé secrète en lieu sûr. En cas de perte de votre téléphone,
          elle sera nécessaire pour récupérer l'accès.
        </div>
      </div>
    </div>
  );
}
