import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, signOut } from '../../lib/supabase';
import StoreNav from '../../components/StoreNav';
import type { StatutDossier, TypeColis, Dossier } from '../../types';

interface DemandePublique {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  type_colis: string;
  description: string;
  adresse_depart: string;
  adresse_arrivee: string;
  poids_kg: number | null;
  traitee: boolean;
  created_at: string;
}

const C = { primary:'#1B4F72', accent:'#E67E22', bg:'#f5f7fa', white:'#fff', border:'#dde3ea' };
const PAGE_SIZE = 20;

const STATUTS: StatutDossier[] = [
  'brouillon','en_attente','devis_envoye','devis_attente_validation',
  'valide','paye','en_transit','livre','facture_generee','annule',
];
const STATUT_LABEL: Record<StatutDossier,string> = {
  brouillon:'Brouillon', en_attente:'En attente', devis_envoye:'Devis envoyé',
  devis_attente_validation:'À valider', valide:'Validé', paye:'Payé',
  en_transit:'En transit', livre:'Livré', facture_generee:'Facturé', annule:'Annulé',
};
const STATUT_COLOR: Record<StatutDossier,{color:string;bg:string}> = {
  brouillon:{color:'#666',bg:'#f0f0f0'}, en_attente:{color:'#7B4F00',bg:'#FFF3CD'},
  devis_envoye:{color:'#004085',bg:'#CCE5FF'}, devis_attente_validation:{color:'#155724',bg:'#D4EDDA'},
  valide:{color:'#0c5460',bg:'#d1ecf1'}, paye:{color:'#155724',bg:'#c3e6cb'},
  en_transit:{color:'#533F03',bg:'#FFEEBA'}, livre:{color:'#155724',bg:'#b8dabe'},
  facture_generee:{color:'#4a235a',bg:'#e8d5f5'}, annule:{color:'#721c24',bg:'#F8D7DA'},
};

export default function StoreDossiers() {
  const navigate          = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Filtres ──────────────────────────────────────────────────────────────
  const [statut,    setStatut]    = useState('');
  const [typeColis, setType]      = useState('');
  const [search,    setSearch]    = useState('');

  // ── Demandes publiques ────────────────────────────────────────────────────
  const [demandes,        setDemandes]        = useState<DemandePublique[]>([]);
  const [demandesLoading, setDemandesLoading] = useState(true);
  const [converting,      setConverting]      = useState<string | null>(null);

  const fetchDemandes = useCallback(async () => {
    setDemandesLoading(true);
    const { data } = await supabase
      .from('demandes_publiques')
      .select('*')
      .eq('traitee', false)
      .order('created_at', { ascending: false });
    setDemandes((data ?? []) as DemandePublique[]);
    setDemandesLoading(false);
  }, []);

  useEffect(() => { void fetchDemandes(); }, [fetchDemandes]);

  const handleConvert = async (demandeId: string) => {
    setConverting(demandeId);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await window.fetch('/api/store/convert-demande', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body:    JSON.stringify({ demandeId }),
    });
    const json = await res.json() as { ok?: boolean; dossierId?: string; error?: string };
    if (json.ok && json.dossierId) {
      navigate(`/store/dossier/${json.dossierId}`);
    } else {
      alert(json.error ?? 'Erreur lors de la conversion');
      setConverting(null);
    }
  };

  // ── Cursor pagination ─────────────────────────────────────────────────────
  const [dossiers,    setDossiers]    = useState<Dossier[]>([]);
  const [hasMore,     setHasMore]     = useState(false);
  const [loading,     setLoading]     = useState(true);
  // cursor = created_at du DERNIER item affiché (pour la page suivante)
  const [cursor,      setCursor]      = useState<string | null>(
    searchParams.get('cursor')
  );
  // Stack de curseurs précédents pour navigation arrière
  const [prevCursors, setPrevCursors] = useState<(string|null)[]>([]);

  // Réinitialiser la pagination quand les filtres changent
  const resetPagination = () => {
    setCursor(null);
    setPrevCursors([]);
    setSearchParams({}, { replace:true });
  };

  const fetch = useCallback(async () => {
    setLoading(true);

    let q = supabase
      .from('dossiers')
      .select('*, client:profiles(*), transporteur:transporteurs(*)')
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE + 1);   // +1 pour détecter s'il y a une suite

    if (cursor)    q = q.lt('created_at', cursor);
    if (statut)    q = q.eq('statut', statut);
    if (typeColis) q = q.eq('type_colis', typeColis);
    if (search)    q = q.or(`numero.ilike.%${search}%`);

    const { data } = await q;
    const rows = (data ?? []) as Dossier[];

    setHasMore(rows.length > PAGE_SIZE);
    setDossiers(rows.slice(0, PAGE_SIZE));
    setLoading(false);
  }, [cursor, statut, typeColis, search]);

  useEffect(() => { void fetch(); }, [fetch]);

  // ── Navigation curseur ────────────────────────────────────────────────────
  const nextPage = () => {
    if (!hasMore || dossiers.length === 0) return;
    const lastCursor = dossiers[dossiers.length - 1].created_at;
    setPrevCursors(prev => [...prev, cursor]);
    setCursor(lastCursor);
    setSearchParams({ cursor: lastCursor }, { replace:true });
  };

  const prevPage = () => {
    if (prevCursors.length === 0) return;
    const stack = [...prevCursors];
    const pc    = stack.pop() ?? null;
    setPrevCursors(stack);
    setCursor(pc);
    setSearchParams(pc ? { cursor: pc } : {}, { replace:true });
  };

  const isFirstPage = prevCursors.length === 0;

  const handleLogout = async () => { await signOut(); navigate('/login'); };

  return (
    <div style={{minHeight:'100vh',background:C.bg}}>
      {/* Header */}
      <header style={{
        background:C.primary,color:'#fff',height:60,padding:'0 2rem',
        display:'flex',alignItems:'center',justifyContent:'space-between',
        boxShadow:'0 2px 8px rgba(0,0,0,.2)',
      }}>
        <div style={{display:'flex',alignItems:'center',gap:24}}>
          <span style={{fontWeight:700,fontSize:17}}>🚚 Marchita — Store</span>
          <StoreNav active="/store/dossiers" />
        </div>
        <button onClick={handleLogout} style={{background:'rgba(255,255,255,.15)',color:'#fff',padding:'6px 14px',borderRadius:6,fontSize:13}}>
          Déconnexion
        </button>
      </header>

      <main style={{maxWidth:1200,margin:'0 auto',padding:'2rem'}}>

        {/* ── Section Nouvelles demandes ───────────────────────────────────── */}
        <div style={{marginBottom:32}}>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
            <h2 style={{fontSize:18,fontWeight:700,color:C.primary,margin:0}}>
              Nouvelles demandes
            </h2>
            {!demandesLoading && demandes.length > 0 && (
              <span style={{
                background:'#dc2626',color:'#fff',borderRadius:20,
                padding:'2px 10px',fontSize:12,fontWeight:700,
              }}>
                {demandes.length}
              </span>
            )}
          </div>

          {demandesLoading ? (
            <p style={{color:'#888',fontSize:13}}>Chargement des demandes…</p>
          ) : demandes.length === 0 ? (
            <p style={{color:'#aaa',fontSize:13,fontStyle:'italic'}}>Aucune nouvelle demande.</p>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {demandes.map(d => (
                <div key={d.id} style={{
                  background:C.white,border:`1px solid ${C.border}`,borderRadius:10,
                  padding:'14px 18px',boxShadow:'0 1px 4px rgba(0,0,0,.06)',
                  display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:12,alignItems:'start',
                }}>
                  {/* Identité */}
                  <div>
                    <div style={{fontWeight:700,fontSize:14,color:C.primary}}>
                      {d.prenom} {d.nom}
                    </div>
                    <div style={{fontSize:12,color:'#555',marginTop:2}}>{d.email}</div>
                    <div style={{fontSize:12,color:'#555'}}>{d.telephone}</div>
                    <div style={{fontSize:11,color:'#aaa',marginTop:4}}>
                      {new Date(d.created_at).toLocaleDateString('fr-FR', {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                    </div>
                  </div>

                  {/* Colis */}
                  <div>
                    <div style={{fontSize:12,fontWeight:600,color:'#555',textTransform:'capitalize'}}>{d.type_colis}{d.poids_kg ? ` — ${d.poids_kg} kg` : ''}</div>
                    <div style={{fontSize:12,color:'#777',marginTop:4,whiteSpace:'pre-wrap',maxHeight:48,overflow:'hidden'}}>
                      {d.description || '—'}
                    </div>
                  </div>

                  {/* Adresses */}
                  <div style={{fontSize:12,color:'#555'}}>
                    <div><span style={{color:'#aaa'}}>De :</span> {d.adresse_depart || '—'}</div>
                    <div style={{marginTop:4}}><span style={{color:'#aaa'}}>À :</span> {d.adresse_arrivee || '—'}</div>
                  </div>

                  {/* Bouton */}
                  <button
                    disabled={converting === d.id}
                    onClick={() => void handleConvert(d.id)}
                    style={{
                      background: converting === d.id ? '#aaa' : C.accent,
                      color:'#fff',padding:'8px 16px',borderRadius:7,
                      fontWeight:700,fontSize:13,border:'none',
                      cursor: converting === d.id ? 'not-allowed' : 'pointer',
                      whiteSpace:'nowrap',alignSelf:'center',
                    }}
                  >
                    {converting === d.id ? 'Conversion…' : 'Convertir en dossier →'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h1 style={{fontSize:22,fontWeight:700,color:C.primary}}>Tous les dossiers</h1>
          <span style={{fontSize:12,color:'#aaa'}}>Pagination cursor-based (performant sur grande table)</span>
        </div>

        {/* Filtres */}
        <div style={{
          background:C.white,border:`1px solid ${C.border}`,borderRadius:10,
          padding:'16px 20px',marginBottom:20,
          display:'flex',gap:16,flexWrap:'wrap',alignItems:'flex-end',
        }}>
          <div>
            <label style={{display:'block',fontSize:12,fontWeight:600,color:'#555',marginBottom:4}}>Statut</label>
            <select value={statut} onChange={e=>{setStatut(e.target.value);resetPagination();}}
              style={{padding:'7px 12px',borderRadius:7,border:`1.5px solid ${C.border}`,fontSize:13,background:C.white,minWidth:160}}>
              <option value="">Tous les statuts</option>
              {STATUTS.map(s=><option key={s} value={s}>{STATUT_LABEL[s]}</option>)}
            </select>
          </div>
          <div>
            <label style={{display:'block',fontSize:12,fontWeight:600,color:'#555',marginBottom:4}}>Type</label>
            <select value={typeColis} onChange={e=>{setType(e.target.value);resetPagination();}}
              style={{padding:'7px 12px',borderRadius:7,border:`1.5px solid ${C.border}`,fontSize:13,background:C.white}}>
              <option value="">Tous</option>
              {(['colis','electromenager','vehicule','autre'] as TypeColis[]).map(t=>(
                <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div style={{flex:1,minWidth:200}}>
            <label style={{display:'block',fontSize:12,fontWeight:600,color:'#555',marginBottom:4}}>Recherche (n° dossier)</label>
            <input type="text" value={search} placeholder="ex. DOS-2026-001"
              onChange={e=>{setSearch(e.target.value);resetPagination();}}
              style={{width:'100%',padding:'7px 12px',borderRadius:7,border:`1.5px solid ${C.border}`,fontSize:13}}/>
          </div>
          {(statut||typeColis||search) && (
            <button onClick={()=>{setStatut('');setType('');setSearch('');resetPagination();}}
              style={{background:'#f0f0f0',color:'#555',padding:'7px 14px',borderRadius:7,fontSize:13}}>
              Réinitialiser
            </button>
          )}
        </div>

        {/* Tableau */}
        <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:10,overflow:'hidden'}}>
          {loading ? (
            <div style={{padding:'3rem',textAlign:'center',color:'#888'}}>Chargement…</div>
          ) : dossiers.length === 0 ? (
            <div style={{padding:'3rem',textAlign:'center',color:'#888'}}>Aucun dossier trouvé.</div>
          ) : (
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead>
                <tr style={{background:'#f8f9fb',borderBottom:`2px solid ${C.border}`}}>
                  {['Numéro','Client','Type','Adresses','Montant','Statut','Date','Action'].map(h=>(
                    <th key={h} style={{padding:'10px 14px',textAlign:'left',fontWeight:600,color:'#444',whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dossiers.map((d,i)=>{
                  const sc = STATUT_COLOR[d.statut] ?? {color:'#333',bg:'#eee'};
                  return (
                    <tr key={d.id} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?C.white:'#fafbfc'}}>
                      <td style={{padding:'10px 14px',fontWeight:600,color:C.primary}}>{d.numero}</td>
                      <td style={{padding:'10px 14px'}}>
                        {d.client ? `${d.client.prenom} ${d.client.nom}` : '—'}
                        <div style={{fontSize:11,color:'#999'}}>{d.client?.telephone}</div>
                      </td>
                      <td style={{padding:'10px 14px',textTransform:'capitalize'}}>{d.type_colis}</td>
                      <td style={{padding:'10px 14px',maxWidth:200}}>
                        <div style={{fontSize:12,color:'#555'}}>DE : {d.adresse_depart}</div>
                        <div style={{fontSize:12,color:'#555'}}>À : {d.adresse_arrivee}</div>
                      </td>
                      <td style={{padding:'10px 14px',fontWeight:600,color:C.accent}}>
                        {d.montant_devis ? `${d.montant_devis} €` : '—'}
                      </td>
                      <td style={{padding:'10px 14px'}}>
                        <span style={{padding:'3px 9px',borderRadius:20,fontSize:11,fontWeight:600,color:sc.color,background:sc.bg}}>
                          {STATUT_LABEL[d.statut]}
                        </span>
                      </td>
                      <td style={{padding:'10px 14px',color:'#777',whiteSpace:'nowrap'}}>
                        {new Date(d.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td style={{padding:'10px 14px'}}>
                        <button onClick={()=>navigate(`/store/dossier/${d.id}`)}
                          style={{background:C.primary,color:'#fff',padding:'5px 12px',borderRadius:6,fontSize:12,fontWeight:600}}>
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

        {/* Navigation cursor */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:20}}>
          <button
            onClick={prevPage}
            disabled={isFirstPage}
            style={{
              padding:'8px 20px',borderRadius:7,border:`1px solid ${C.border}`,
              background: isFirstPage?'#f0f0f0':C.white,
              color: isFirstPage?'#aaa':C.primary,
              fontWeight:600,fontSize:13,
              cursor: isFirstPage?'not-allowed':'pointer',
            }}
          >
            ← Page précédente
          </button>

          <div style={{fontSize:13,color:'#666'}}>
            {dossiers.length} résultat{dossiers.length>1?'s':''} sur cette page
            {hasMore ? ' · suite disponible' : ''}
          </div>

          <button
            onClick={nextPage}
            disabled={!hasMore}
            style={{
              padding:'8px 20px',borderRadius:7,border:`1px solid ${C.border}`,
              background: !hasMore?'#f0f0f0':C.primary,
              color: !hasMore?'#aaa':'#fff',
              fontWeight:600,fontSize:13,
              cursor: !hasMore?'not-allowed':'pointer',
            }}
          >
            Page suivante →
          </button>
        </div>
      </main>
    </div>
  );
}
