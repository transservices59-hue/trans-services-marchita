import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, signOut } from '../../lib/supabase';

const C = { primary: '#1B4F72', accent: '#E67E22', bg: '#f5f7fa', white: '#fff', border: '#dde3ea' };

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  ressource: string;
  ressource_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

const ACTION_COLORS: Record<string, { color: string; bg: string }> = {
  INSERT:           { color:'#155724', bg:'#d4edda' },
  UPDATE:           { color:'#004085', bg:'#cce5ff' },
  DELETE:           { color:'#721c24', bg:'#f8d7da' },
  LOGIN_SUCCESS:    { color:'#155724', bg:'#d4edda' },
  LOGIN_FAILED:     { color:'#721c24', bg:'#f8d7da' },
  RATE_LIMIT:       { color:'#856404', bg:'#fff3cd' },
  CHECKOUT_CREATED: { color:'#004085', bg:'#cce5ff' },
  WEBHOOK_RECEIVED: { color:'#4a235a', bg:'#e8d5f5' },
};

const PAGE_SIZE = 30;

const StoreNav = ({ active }: { active: string }) => (
  <nav style={{ display:'flex', gap: 4 }}>
    {[
      { label:'Dossiers',      to:'/store/dossiers'      },
      { label:'Transporteurs', to:'/store/transporteurs' },
      { label:'Carte GPS',     to:'/store/map'           },
      { label:'Audit',         to:'/store/audit'         },
    ].map(l => (
      <Link key={l.to} to={l.to} style={{
        color:'rgba(255,255,255,.85)', fontSize:14, padding:'6px 12px', borderRadius:6,
        background: l.to === active ? 'rgba(255,255,255,.18)' : 'transparent',
      }}>
        {l.label}
      </Link>
    ))}
  </nav>
);

export default function StoreAudit() {
  const navigate = useNavigate();
  const [logs,       setLogs]       = useState<AuditLog[]>([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [filterAct,  setFilterAct]  = useState('');
  const [filterRes,  setFilterRes]  = useState('');
  const [expanded,   setExpanded]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    const to   = from + PAGE_SIZE - 1;

    let q = supabase
      .from('audit_logs')
      .select('*', { count:'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (filterAct) q = q.eq('action', filterAct);
    if (filterRes) q = q.eq('ressource', filterRes);
    if (search)    q = q.or(`action.ilike.%${search}%,ip_address.ilike.%${search}%`);

    const { data, count, error } = await q;
    if (!error) {
      setLogs((data as AuditLog[]) ?? []);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [page, filterAct, filterRes, search]);

  useEffect(() => { void load(); }, [load]);

  const handleLogout = async () => { await signOut(); navigate('/login'); };
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString('fr-FR', { dateStyle:'short', timeStyle:'medium' });

  return (
    <div style={{ minHeight:'100vh', background: C.bg }}>
      <header style={{
        background: C.primary, color:'#fff', height:60, padding:'0 2rem',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        boxShadow:'0 2px 8px rgba(0,0,0,.2)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:24 }}>
          <span style={{ fontWeight:700, fontSize:17 }}>🚚 Marchita — Store</span>
          <StoreNav active="/store/audit" />
        </div>
        <button onClick={handleLogout} style={{ background:'rgba(255,255,255,.15)', color:'#fff', padding:'6px 14px', borderRadius:6, fontSize:13 }}>
          Déconnexion
        </button>
      </header>

      <main style={{ maxWidth:1200, margin:'0 auto', padding:'2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h1 style={{ fontSize:22, fontWeight:700, color: C.primary }}>
            Logs d'audit{total > 0 ? ` (${total})` : ''}
          </h1>
          <span style={{ fontSize:12, color:'#aaa' }}>Rétention 90 jours</span>
        </div>

        {/* Filtres */}
        <div style={{
          background: C.white, border:`1px solid ${C.border}`, borderRadius:10,
          padding:'14px 20px', marginBottom:20,
          display:'flex', gap:14, flexWrap:'wrap', alignItems:'flex-end',
        }}>
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#555', marginBottom:4 }}>Action</label>
            <select value={filterAct} onChange={e => { setFilterAct(e.target.value); setPage(1); }}
              style={{ padding:'7px 12px', borderRadius:7, border:`1.5px solid ${C.border}`, fontSize:13, background: C.white, minWidth:180 }}>
              <option value="">Toutes les actions</option>
              {['INSERT','UPDATE','DELETE','LOGIN_SUCCESS','LOGIN_FAILED','RATE_LIMIT','CHECKOUT_CREATED','WEBHOOK_RECEIVED'].map(a =>
                <option key={a} value={a}>{a}</option>
              )}
            </select>
          </div>
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#555', marginBottom:4 }}>Ressource</label>
            <select value={filterRes} onChange={e => { setFilterRes(e.target.value); setPage(1); }}
              style={{ padding:'7px 12px', borderRadius:7, border:`1.5px solid ${C.border}`, fontSize:13, background: C.white }}>
              <option value="">Toutes</option>
              {['dossiers','transporteurs','auth','checkout','webhook','audit_logs'].map(r =>
                <option key={r} value={r}>{r}</option>
              )}
            </select>
          </div>
          <div style={{ flex:1, minWidth:200 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#555', marginBottom:4 }}>Recherche (IP, action…)</label>
            <input type="text" value={search} placeholder="ex. 192.168"
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ width:'100%', padding:'7px 12px', borderRadius:7, border:`1.5px solid ${C.border}`, fontSize:13 }} />
          </div>
          {(filterAct || filterRes || search) && (
            <button onClick={() => { setFilterAct(''); setFilterRes(''); setSearch(''); setPage(1); }}
              style={{ background:'#f0f0f0', color:'#555', padding:'7px 14px', borderRadius:7, fontSize:13 }}>
              Réinitialiser
            </button>
          )}
        </div>

        {/* Tableau */}
        <div style={{ background: C.white, border:`1px solid ${C.border}`, borderRadius:10, overflow:'hidden' }}>
          {loading ? (
            <div style={{ padding:'3rem', textAlign:'center', color:'#888' }}>Chargement…</div>
          ) : logs.length === 0 ? (
            <div style={{ padding:'3rem', textAlign:'center', color:'#888' }}>Aucun log trouvé.</div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:'#f8f9fb', borderBottom:`2px solid ${C.border}` }}>
                  {['Date','Action','Ressource','IP','Détails'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontWeight:600, color:'#444', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => {
                  const ac = ACTION_COLORS[log.action] ?? { color:'#333', bg:'#eee' };
                  const isExp = expanded === log.id;
                  return (
                    <>
                      <tr key={log.id} style={{ borderBottom:`1px solid ${C.border}`, background: i % 2 === 0 ? C.white : '#fafbfc' }}>
                        <td style={{ padding:'9px 14px', whiteSpace:'nowrap', color:'#555' }}>{fmtDate(log.created_at)}</td>
                        <td style={{ padding:'9px 14px' }}>
                          <span style={{ padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600, color: ac.color, background: ac.bg }}>
                            {log.action}
                          </span>
                        </td>
                        <td style={{ padding:'9px 14px', color:'#555' }}>
                          {log.ressource}
                          {log.ressource_id && (
                            <span style={{ display:'block', fontSize:10, color:'#aaa', fontFamily:'monospace' }}>
                              {log.ressource_id.slice(0, 8)}…
                            </span>
                          )}
                        </td>
                        <td style={{ padding:'9px 14px', fontFamily:'monospace', color:'#666', fontSize:11 }}>
                          {log.ip_address ?? '—'}
                        </td>
                        <td style={{ padding:'9px 14px' }}>
                          {log.details && (
                            <button onClick={() => setExpanded(isExp ? null : log.id)}
                              style={{ background:'#f0f4f8', border:`1px solid ${C.border}`,
                                padding:'3px 10px', borderRadius:6, fontSize:11, cursor:'pointer', color: C.primary }}>
                              {isExp ? 'Fermer ▲' : 'Voir ▼'}
                            </button>
                          )}
                        </td>
                      </tr>
                      {isExp && log.details && (
                        <tr key={`${log.id}-detail`} style={{ background:'#f8faff' }}>
                          <td colSpan={5} style={{ padding:'12px 20px' }}>
                            <pre style={{ fontSize:11, color:'#444', margin:0, fontFamily:'monospace',
                              whiteSpace:'pre-wrap', wordBreak:'break-all' }}>
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:8, marginTop:20 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding:'6px 14px', borderRadius:6, border:`1px solid ${C.border}`, background: C.white,
                cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}>←</button>
            <span style={{ fontSize:14, color:'#555' }}>Page {page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding:'6px 14px', borderRadius:6, border:`1px solid ${C.border}`, background: C.white,
                cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1 }}>→</button>
          </div>
        )}
      </main>
    </div>
  );
}
