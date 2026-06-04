import { useEffect, useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getTransporteurs, addTransporteur, toggleTransporteur, signOut } from '../../lib/supabase';
import type { Transporteur, TypeTransporteur } from '../../types';

const C = { primary: '#1B4F72', accent: '#E67E22', success: '#155724', bg: '#f5f7fa', white: '#fff', border: '#dde3ea', error: '#c0392b' };

const StoreNav = () => (
  <nav style={{ display: 'flex', gap: 4 }}>
    {[
      { label: 'Dossiers',      to: '/store/dossiers'      },
      { label: 'Transporteurs', to: '/store/transporteurs' },
      { label: 'Carte GPS',     to: '/store/map'           },
    ].map(l => (
      <Link key={l.to} to={l.to} style={{
        color: 'rgba(255,255,255,.85)', fontSize: 14, padding: '6px 12px', borderRadius: 6,
        background: l.to === '/store/transporteurs' ? 'rgba(255,255,255,.18)' : 'transparent',
      }}>
        {l.label}
      </Link>
    ))}
  </nav>
);

const EMPTY_FORM = { code: '', nom: '', type: 'camion' as TypeTransporteur, telephone: '' };

export default function StoreTransporteurs() {
  const navigate = useNavigate();
  const [transporteurs, setTransporteurs] = useState<Transporteur[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const load = async () => {
    const { data } = await getTransporteurs();
    setTransporteurs((data as Transporteur[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const set = (k: keyof typeof EMPTY_FORM, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { error: err } = await addTransporteur(form);
    setSaving(false);
    if (err) { setError(err.message); return; }
    setForm(EMPTY_FORM);
    setShowForm(false);
    load();
  };

  const handleToggle = async (t: Transporteur) => {
    await toggleTransporteur(t.id, !t.actif);
    load();
  };

  const handleLogout = async () => { await signOut(); navigate('/login'); };

  const actifs   = transporteurs.filter(t => t.actif);
  const inactifs = transporteurs.filter(t => !t.actif);

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      {/* Header */}
      <header style={{
        background: C.primary, color: '#fff', height: 60, padding: '0 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <span style={{ fontWeight: 700, fontSize: 17 }}>🚚 Marchita — Store</span>
          <StoreNav />
        </div>
        <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,.15)', color: '#fff', padding: '6px 14px', borderRadius: 6, fontSize: 13 }}>
          Déconnexion
        </button>
      </header>

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '2rem' }}>
        {/* Titre + bouton ajouter */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.primary }}>
            Transporteurs &amp; courtiers
          </h1>
          <button
            onClick={() => setShowForm(s => !s)}
            style={{
              background: showForm ? '#888' : C.accent, color: '#fff',
              padding: '9px 20px', borderRadius: 7, fontSize: 14, fontWeight: 600,
            }}
          >
            {showForm ? '✕ Annuler' : '+ Ajouter'}
          </button>
        </div>

        {/* Formulaire d'ajout */}
        {showForm && (
          <div style={{
            background: C.white, border: `1px solid ${C.border}`, borderRadius: 10,
            padding: '24px', marginBottom: 24, boxShadow: '0 1px 8px rgba(0,0,0,.07)',
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: C.primary, marginBottom: 20 }}>
              Nouveau transporteur / courtier
            </h2>
            <form onSubmit={handleAdd}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px 20px', marginBottom: 20 }}>
                {(['code', 'nom', 'telephone'] as const).map(field => (
                  <div key={field}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5, textTransform: 'capitalize' }}>
                      {field === 'telephone' ? 'Téléphone' : field.charAt(0).toUpperCase() + field.slice(1)}
                    </label>
                    <input
                      required value={form[field]}
                      onChange={e => set(field, e.target.value)}
                      placeholder={field === 'code' ? 'ex. TRK-001' : field === 'telephone' ? '+33 6 …' : ''}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 7, border: `1.5px solid ${C.border}`, fontSize: 13 }}
                    />
                  </div>
                ))}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>Type</label>
                  <select
                    value={form.type} onChange={e => set('type', e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 7, border: `1.5px solid ${C.border}`, fontSize: 13, background: C.white }}
                  >
                    <option value="camion">🚛 Camion</option>
                    <option value="courtier">🤝 Courtier</option>
                  </select>
                </div>
              </div>
              {error && (
                <div style={{ background: '#fdecea', border: `1px solid ${C.error}`, color: C.error, padding: '9px 14px', borderRadius: 7, fontSize: 13, marginBottom: 16 }}>
                  {error}
                </div>
              )}
              <button
                type="submit" disabled={saving}
                style={{ background: C.success, color: '#fff', padding: '10px 24px', borderRadius: 7, fontWeight: 700, fontSize: 14, opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Enregistrement…' : '✅ Enregistrer'}
              </button>
            </form>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Actifs',    value: actifs.length,         color: '#155724', bg: '#d4edda' },
            { label: 'Inactifs',  value: inactifs.length,       color: '#856404', bg: '#fff3cd' },
            { label: 'Total',     value: transporteurs.length,  color: C.primary,  bg: '#cfe2ff' },
            { label: 'Camions',   value: transporteurs.filter(t => t.type === 'camion').length,  color: '#495057', bg: '#e9ecef' },
            { label: 'Courtiers', value: transporteurs.filter(t => t.type === 'courtier').length, color: '#495057', bg: '#e9ecef' },
          ].map(s => (
            <div key={s.label} style={{
              background: C.white, border: `1px solid ${C.border}`, borderRadius: 8,
              padding: '12px 18px', textAlign: 'center', flex: 1, minWidth: 80,
            }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Liste */}
        {loading ? (
          <p style={{ textAlign: 'center', color: '#888', padding: '3rem 0' }}>Chargement…</p>
        ) : (
          <>
            <TransporteurSection title="Actifs" list={actifs} onToggle={handleToggle} />
            {inactifs.length > 0 && (
              <TransporteurSection title="Inactifs" list={inactifs} onToggle={handleToggle} dimmed />
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TransporteurSection({
  title, list, onToggle, dimmed = false,
}: {
  title: string;
  list: Transporteur[];
  onToggle: (t: Transporteur) => void;
  dimmed?: boolean;
}) {
  if (list.length === 0) return null;
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: '#555', marginBottom: 12, textTransform: 'uppercase', letterSpacing: .5 }}>
        {title} ({list.length})
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {list.map(t => (
          <div key={t.id} style={{
            background: '#fff', border: `1px solid #dde3ea`, borderRadius: 10,
            padding: '18px 20px', opacity: dimmed ? 0.65 : 1,
            boxShadow: '0 1px 6px rgba(0,0,0,.05)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#1B4F72' }}>
                  {t.type === 'camion' ? '🚛' : '🤝'} {t.code}
                </div>
                <div style={{ fontSize: 13, color: '#555', marginTop: 2 }}>{t.nom}</div>
              </div>
              <span style={{
                padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: t.actif ? '#d4edda' : '#f8d7da',
                color: t.actif ? '#155724' : '#721c24',
              }}>
                {t.actif ? 'Actif' : 'Inactif'}
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 14 }}>
              <div>📞 {t.telephone}</div>
              <div style={{ marginTop: 3 }}>
                {t.type === 'camion' ? 'Transporteur camion' : 'Courtier / affréteur'}
              </div>
            </div>
            <button
              onClick={() => onToggle(t)}
              style={{
                width: '100%', padding: '7px', borderRadius: 7, fontSize: 13, fontWeight: 600,
                background: t.actif ? '#fff3cd' : '#d4edda',
                color: t.actif ? '#856404' : '#155724',
                border: `1px solid ${t.actif ? '#ffc107' : '#28a745'}`,
              }}
            >
              {t.actif ? 'Désactiver' : 'Activer'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
