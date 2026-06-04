import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { createDemandePublique } from '../lib/supabase';

const C = { primary: '#1B4F72', accent: '#E67E22', border: '#d0d7de', white: '#fff', bg: '#f5f7fa', error: '#c0392b' };

const TYPES = ['colis', 'electromenager', 'vehicule', 'autre'];

export default function DemandePage() {
  const [form, setForm] = useState({
    nom: '', prenom: '', email: '', telephone: '',
    type_colis: 'colis', description: '', adresse_depart: '', adresse_arrivee: '', poids_kg: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await createDemandePublique({
      ...form,
      poids_kg: form.poids_kg ? parseFloat(form.poids_kg) : undefined,
    });
    setLoading(false);
    if (err) setError(err.message);
    else setSuccess(true);
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
        <div style={{ background: C.white, borderRadius: 12, padding: '48px 40px', textAlign: 'center', maxWidth: 440 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
          <h2 style={{ color: C.primary, marginBottom: 12 }}>Demande envoyée !</h2>
          <p style={{ color: '#666', marginBottom: 24 }}>Nous vous contactons sous 24 h avec votre devis.</p>
          <Link to="/" style={{ color: C.accent, fontWeight: 600 }}>← Retour à l'accueil</Link>
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
          <p style={{ color: '#666', fontSize: 14, marginBottom: 32 }}>Remplissez ce formulaire, nous vous répondons sous 24 h.</p>

          <form onSubmit={handleSubmit}>
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

            {field('Poids estimé (kg)', 'poids_kg', 'number', 'ex. 15')}
            {field('Adresse de départ (France)', 'adresse_depart', 'text', 'ex. 12 rue de Paris, 75001 Paris')}
            {field('Adresse d\'arrivée (Maroc)', 'adresse_arrivee', 'text', 'ex. Av. Mohammed V, Casablanca')}

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Description</label>
              <textarea
                required value={form.description} onChange={e => set('description', e.target.value)}
                rows={3} placeholder="Décrivez le contenu de votre envoi…"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 7, border: `1.5px solid ${C.border}`, fontSize: 14, resize: 'vertical' }}
              />
            </div>

            {error && (
              <div style={{ background: '#fdecea', border: `1px solid ${C.error}`, color: C.error, padding: '10px 14px', borderRadius: 8, fontSize: 14, marginBottom: 20 }}>
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', background: loading ? '#aaa' : C.accent, color: C.white,
                padding: 12, borderRadius: 8, fontSize: 16, fontWeight: 700,
              }}
            >
              {loading ? 'Envoi…' : 'Envoyer ma demande →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
