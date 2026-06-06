import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';

const C = { primary: '#1B4F72', accent: '#E67E22', border: '#d0d7de', white: '#fff', bg: '#f5f7fa', error: '#c0392b' };

const TYPES = ['colis', 'electromenager', 'vehicule', 'autre'];

export default function DemandePage() {
  const [form, setForm] = useState({
    nom: '', prenom: '', email: '', telephone: '',
    type_colis: 'colis', description: '', adresse_depart: '', adresse_arrivee: '', poids_kg: '',
  });
  const [loading,   setLoading]   = useState(false);
  const [success,   setSuccess]   = useState(false);
  const [devisAuto, setDevisAuto] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/demandes', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          poids_kg: form.poids_kg ? parseFloat(form.poids_kg) : null,
        }),
      });
      const data = await res.json() as { ok?: boolean; error?: string; devisAuto?: boolean };
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Erreur réseau');
      setDevisAuto(data.devisAuto ?? false);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    }
    setLoading(false);
  };

  const field = (label: string, key: string, type = 'text', placeholder = '') => (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{label}</label>
      <input
        type={type} required value={(form as Record<string, string>)[key]}
        onChange={e => set(key, e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '9px 12px', borderRadius: 7, border: `1.5px solid ${C.border}`, fontSize: 14 }}
      />
    </div>
  );

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
        <div style={{ background: C.white, borderRadius: 12, padding: '48px 40px', textAlign: 'center', maxWidth: 480 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
          <h2 style={{ color: C.primary, marginBottom: 12 }}>Demande enregistrée !</h2>

          {devisAuto ? (
            <>
              <p style={{ color: '#555', fontSize: 15, lineHeight: 1.7, marginBottom: 8 }}>
                Votre devis a été envoyé sur <strong>{form.email}</strong>.
              </p>
              <p style={{ color: '#555', fontSize: 15, lineHeight: 1.7, marginBottom: 24 }}>
                Consultez votre boîte mail pour <strong>accepter ou refuser</strong> le devis.
              </p>
              <div style={{
                background: '#d4edda', borderRadius: 8, padding: '12px 16px',
                fontSize: 13, color: '#155724', marginBottom: 24,
              }}>
                📧 Vérifiez vos spams si vous ne trouvez pas l'email.
              </div>
            </>
          ) : (
            <p style={{ color: '#555', fontSize: 15, lineHeight: 1.7, marginBottom: 24 }}>
              Notre équipe vous contactera sous <strong>24 heures</strong> avec un devis personnalisé.
            </p>
          )}

          <Link to="/" style={{ color: C.accent, fontWeight: 600, fontSize: 14 }}>← Retour à l'accueil</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '2rem' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <Link to="/" style={{ fontSize: 14, color: C.primary }}>← Retour à l'accueil</Link>
        <div style={{ background: C.white, borderRadius: 12, padding: '40px', marginTop: 20, boxShadow: '0 2px 16px rgba(0,0,0,.08)' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.primary, marginBottom: 8 }}>Faire une demande</h1>
          <p style={{ color: '#666', fontSize: 14, marginBottom: 32 }}>
            Remplissez ce formulaire. Pour les colis et électroménagers, votre devis est envoyé instantanément par email.
          </p>

          <form onSubmit={e => void handleSubmit(e)}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
              <div>{field('Prénom', 'prenom', 'text', 'Votre prénom')}</div>
              <div>{field('Nom', 'nom', 'text', 'Votre nom')}</div>
            </div>
            {field('E-mail', 'email', 'email', 'vous@exemple.com')}
            {field('Téléphone', 'telephone', 'tel', '+33 6 …')}

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Type de colis</label>
              <select
                value={form.type_colis} onChange={e => set('type_colis', e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 7, border: `1.5px solid ${C.border}`, fontSize: 14, background: C.white }}
              >
                {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>

            {(form.type_colis === 'colis') && field('Poids estimé (kg)', 'poids_kg', 'number', 'ex. 15')}

            {field('Adresse de départ (France)', 'adresse_depart', 'text', 'ex. 12 rue de Paris, 75001 Paris')}
            {field("Adresse d'arrivée (Maroc)", 'adresse_arrivee', 'text', 'ex. Av. Mohammed V, Casablanca')}

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Description</label>
              <textarea
                required value={form.description} onChange={e => set('description', e.target.value)}
                rows={3}
                placeholder={form.type_colis === 'electromenager'
                  ? 'Ex. : réfrigérateur Samsung, machine à laver Bosch…'
                  : 'Décrivez le contenu de votre envoi…'}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 7, border: `1.5px solid ${C.border}`, fontSize: 14, resize: 'vertical' }}
              />
            </div>

            {(form.type_colis === 'colis' || form.type_colis === 'electromenager') && (
              <div style={{
                background: '#f0f4f8', borderRadius: 8, padding: '10px 14px',
                fontSize: 13, color: '#555', marginBottom: 20,
              }}>
                ⚡ Votre devis sera calculé automatiquement et envoyé par email.
              </div>
            )}

            {error && (
              <div style={{ background: '#fdecea', border: `1px solid ${C.error}`, color: C.error, padding: '10px 14px', borderRadius: 8, fontSize: 14, marginBottom: 20 }}>
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', background: loading ? '#aaa' : C.accent, color: C.white,
                padding: 12, borderRadius: 8, fontSize: 16, fontWeight: 700, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Envoi en cours…' : 'Envoyer ma demande →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
