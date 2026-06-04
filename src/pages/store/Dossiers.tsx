import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAllDossiers } from '../../hooks/useDossiers';
import { signOut } from '../../lib/supabase';
import type { StatutDossier, TypeColis, Dossier } from '../../types';

const C = { primary: '#1B4F72', accent: '#E67E22', bg: '#f5f7fa', white: '#fff', border: '#dde3ea' };

const STATUTS: StatutDossier[] = [
  'brouillon','en_attente','devis_envoye','devis_attente_validation',
  'valide','paye','en_transit','livre','facture_generee','annule',
];
const STATUT_LABEL: Record<StatutDossier, string> = {
  brouillon:'Brouillon', en_attente:'En attente', devis_envoye:'Devis envoyé',
  devis_attente_validation:'À valider', valide:'Validé', paye:'Payé',
  en_transit:'En transit', livre:'Livré', facture_generee:'Facturé', annule:'Annulé',
};
const STATUT_COLOR: Record<StatutDossier, { color: string; bg: string }> = {
  brouillon:{color:'#666',bg:'#f0f0f0'}, en_attente:{color:'#7B4F00',bg:'#FFF3CD'},
  devis_envoye:{color:'#004085',bg:'#CCE5FF'}, devis_attente_validation:{color:'#155724',bg:'#D4EDDA'},
  valide:{color:'#0c5460',bg:'#d1ecf1'}, paye:{color:'#155724',bg:'#c3e6cb'},
  en_transit:{color:'#533F03',bg:'#FFEEBA'}, livre:{color:'#155724',bg:'#b8dabe'},
  facture_generee:{color:'#4a235a',bg:'#e8d5f5'}, annule:{color:'#721c24',bg:'#F8D7DA'},
};

const PAGE_SIZE = 20;

export default function StoreDossiers() {
  const navigate = useNavigate();
  const [statut, setStatut]   = useState('');
  const [typeColis, setType]  = useState('');
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);

  const { dossiers, total, loading } = useAllDossiers({
    statut: statut || undefined,
    typeColis: typeColis || undefined,
    search: search || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const handleLogout = async () => { await signOut(); navigate('/login'); };

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
          <nav style={{ display: 'flex', gap: 4 }}>
            {[
              { label: 'Dossiers',      to: '/store/dossiers'     },
              { label: 'Transporteurs', to: '/store/transporteurs'},
              { label: 'Carte GPS',     to: '/store/map'          },
            ].map(l => (
              <Link key={l.to} to={l.to} style={{
                color: 'rgba(255,255,255,.85)', fontSize: 14, padding: '6px 12px', borderRadius: 6,
                background: l.to === '/store/dossiers' ? 'rgba(255,255,255,.18)' : 'transparent',
              }}>
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,.15)', color: '#fff', padding: '6px 14px', borderRadius: 6, fontSize: 13 }}>
          Déconnexion
        </button>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.primary, marginBottom: 20 }}>
          Tous les dossiers{total > 0 ? ` (${total})` : ''}
        </h1>

        {/* Filtres */}
        <div style={{
          background: C.white, border: `1px solid ${C.border}`, borderRadius: 10,
          padding: '16px 20px', marginBottom: 20,
          display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end',
        }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>Statut</label>
            <select
              value={statut} onChange={e => { setStatut(e.target.value); setPage(1); }}
              style={{ padding: '7px 12px', borderRadius: 7, border: `1.5px solid ${C.border}`, fontSize: 13, background: C.white, minWidth: 160 }}
            >
              <option value="">Tous les statuts</option>
              {STATUTS.map(s => <option key={s} value={s}>{STATUT_LABEL[s]}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>Type de colis</label>
            <select
              value={typeColis} onChange={e => { setType(e.target.value); setPage(1); }}
              style={{ padding: '7px 12px', borderRadius: 7, border: `1.5px solid ${C.border}`, fontSize: 13, background: C.white }}
            >
              <option value="">Tous les types</option>
              {(['colis','electromenager','vehicule','autre'] as TypeColis[]).map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>
              Recherche (n° dossier)
            </label>
            <input
              type="text" value={search} placeholder="ex. DOS-2024-001"
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '7px 12px', borderRadius: 7, border: `1.5px solid ${C.border}`, fontSize: 13 }}
            />
          </div>
          {(statut || typeColis || search) && (
            <button
              onClick={() => { setStatut(''); setType(''); setSearch(''); setPage(1); }}
              style={{ background: '#f0f0f0', color: '#555', padding: '7px 14px', borderRadius: 7, fontSize: 13 }}
            >
              Réinitialiser
            </button>
          )}
        </div>

        {/* Tableau */}
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>Chargement…</div>
          ) : dossiers.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>Aucun dossier trouvé.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8f9fb', borderBottom: `2px solid ${C.border}` }}>
                  {['Numéro','Client','Type','Adresses','Montant','Statut','Date','Action'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#444', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dossiers.map((d: Dossier, i) => {
                  const sc = STATUT_COLOR[d.statut] ?? { color: '#333', bg: '#eee' };
                  return (
                    <tr key={d.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? C.white : '#fafbfc' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: C.primary }}>{d.numero}</td>
                      <td style={{ padding: '10px 14px' }}>
                        {d.client ? `${d.client.prenom} ${d.client.nom}` : '—'}
                        <div style={{ fontSize: 11, color: '#999' }}>{d.client?.telephone}</div>
                      </td>
                      <td style={{ padding: '10px 14px', textTransform: 'capitalize' }}>{d.type_colis}</td>
                      <td style={{ padding: '10px 14px', maxWidth: 200 }}>
                        <div style={{ fontSize: 12, color: '#555' }}>DE : {d.adresse_depart}</div>
                        <div style={{ fontSize: 12, color: '#555' }}>À : {d.adresse_arrivee}</div>
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: C.accent }}>
                        {d.montant_devis ? `${d.montant_devis} €` : '—'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: sc.color, background: sc.bg }}>
                          {STATUT_LABEL[d.statut]}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#777', whiteSpace: 'nowrap' }}>
                        {new Date(d.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <button
                          onClick={() => navigate(`/store/dossier/${d.id}`)}
                          style={{ background: C.primary, color: '#fff', padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}
                        >
                          Voir →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20 }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ padding: '6px 14px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.white, cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}
            >
              ←
            </button>
            <span style={{ fontSize: 14, color: '#555' }}>Page {page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{ padding: '6px 14px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.white, cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1 }}
            >
              →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
