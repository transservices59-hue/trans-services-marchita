import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import StoreNav from '../../components/StoreNav';
import type { StatutDevis, DevisOfficiel } from '../../types';
import { signOut } from '../../lib/supabase';

const C = { primary:'#1B4F72', accent:'#E67E22', bg:'#f5f7fa', white:'#fff', border:'#dde3ea', error:'#c0392b' };

const DEVIS_LABEL: Record<StatutDevis, string> = {
  brouillon: 'Brouillon', envoye: 'Envoyé', accepte: 'Accepté',
  refuse: 'Refusé', expire: 'Expiré', modifie: 'Modifié',
};
const DEVIS_COLOR: Record<StatutDevis, {color:string;bg:string}> = {
  brouillon: {color:'#666',bg:'#f0f0f0'},
  envoye:    {color:'#004085',bg:'#CCE5FF'},
  accepte:   {color:'#155724',bg:'#D4EDDA'},
  refuse:    {color:'#721c24',bg:'#F8D7DA'},
  expire:    {color:'#856404',bg:'#FFF3CD'},
  modifie:   {color:'#0c5460',bg:'#d1ecf1'},
};

interface Demande {
  id: string; nom: string; prenom: string; email: string; telephone: string;
  type_colis: string; description: string; adresse_depart: string;
  adresse_arrivee: string; poids_kg: number | null; statut: string; created_at: string;
}

export default function StoreDemande() {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();

  const [demande,   setDemande]   = useState<Demande | null>(null);
  const [devisList, setDevisList] = useState<DevisOfficiel[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [flash,     setFlash]     = useState<{type:'ok'|'err';msg:string}|null>(null);

  // Formulaire devis
  const [montantHT,     setMontantHT]     = useState('');
  const [tvaPct,        setTvaPct]        = useState('20');
  const [notes,         setNotes]         = useState('');
  const [validiteJours, setValiditeJours] = useState('7');
  const [creating,      setCreating]      = useState(false);
  const [sending,       setSending]       = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: dem }, { data: devs }] = await Promise.all([
      supabase.from('demandes_publiques').select('*').eq('id', id).single(),
      supabase.from('devis_officiels').select('*').eq('demande_id', id).order('created_at', { ascending: false }),
    ]);
    setDemande(dem as Demande ?? null);
    setDevisList((devs ?? []) as DevisOfficiel[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [id]);

  const showFlash = (type:'ok'|'err', msg:string) => {
    setFlash({ type, msg });
    setTimeout(() => setFlash(null), 4000);
  };

  const montantTTC = montantHT
    ? Math.round(parseFloat(montantHT) * (1 + parseFloat(tvaPct) / 100) * 100) / 100
    : 0;

  const handleCreateDevis = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setCreating(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await window.fetch('/api/store/devis/create', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body:    JSON.stringify({ demandeId: id, montantHT: parseFloat(montantHT), tvaPct: parseFloat(tvaPct), notes, validiteJours: parseInt(validiteJours) }),
    });
    const json = await res.json() as { ok?: boolean; error?: string };
    if (json.ok) {
      showFlash('ok', 'Devis créé ✅');
      setMontantHT(''); setNotes('');
      await load();
    } else {
      showFlash('err', json.error ?? 'Erreur');
    }
    setCreating(false);
  };

  const handleEnvoyer = async (devisId: string) => {
    setSending(devisId);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await window.fetch(`/api/store/devis/${devisId}/envoyer`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    const json = await res.json() as { ok?: boolean; error?: string };
    if (json.ok) {
      showFlash('ok', 'Devis envoyé au client ✅');
      await load();
    } else {
      showFlash('err', json.error ?? 'Erreur envoi');
    }
    setSending(null);
  };

  const handleLogout = async () => { await signOut(); navigate('/login'); };

  if (loading) return <div style={{padding:'2rem',color:'#888'}}>Chargement…</div>;
  if (!demande) return <div style={{padding:'2rem',color:C.error}}>Demande introuvable.</div>;

  const devisActif = devisList.find(d => d.statut === 'envoye');
  const canCreate  = !devisActif;

  return (
    <div style={{minHeight:'100vh',background:C.bg}}>
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

      <main style={{maxWidth:960,margin:'0 auto',padding:'2rem'}}>
        {flash && (
          <div style={{
            padding:'12px 18px',borderRadius:8,marginBottom:20,fontWeight:600,fontSize:14,
            background:flash.type==='ok'?'#d4edda':'#fdecea',
            color:flash.type==='ok'?'#155724':C.error,
            border:`1px solid ${flash.type==='ok'?'#c3e6cb':'#f5c6cb'}`,
          }}>
            {flash.msg}
          </div>
        )}

        <div style={{marginBottom:20}}>
          <button onClick={()=>navigate('/store/dossiers')}
            style={{background:'none',color:C.primary,fontSize:14,cursor:'pointer',padding:0}}>
            ← Toutes les demandes
          </button>
          <h1 style={{fontSize:22,fontWeight:700,color:C.primary,margin:'4px 0 0'}}>
            Demande de {demande.prenom} {demande.nom}
          </h1>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
          {/* Colonne gauche — infos demande */}
          <div>
            <Card title="Client">
              <Row label="Nom"     value={`${demande.prenom} ${demande.nom}`}/>
              <Row label="Email"   value={demande.email}/>
              <Row label="Tél"     value={demande.telephone}/>
              <Row label="Statut"  value={demande.statut}/>
              <Row label="Reçue"   value={new Date(demande.created_at).toLocaleDateString('fr-FR')}/>
            </Card>
            <Card title="Expédition">
              <Row label="Type"    value={demande.type_colis}/>
              {demande.poids_kg && <Row label="Poids" value={`${demande.poids_kg} kg`}/>}
              <Row label="Départ"  value={demande.adresse_depart || '—'}/>
              <Row label="Arrivée" value={demande.adresse_arrivee || '—'}/>
              {demande.description && <Row label="Description" value={demande.description}/>}
            </Card>
          </div>

          {/* Colonne droite — gestion devis */}
          <div>
            {/* Historique devis */}
            {devisList.length > 0 && (
              <Card title="Devis">
                {devisList.map(dv => {
                  const sc = DEVIS_COLOR[dv.statut] ?? {color:'#333',bg:'#eee'};
                  return (
                    <div key={dv.id} style={{
                      padding:'12px 0',borderBottom:`1px solid ${C.border}`,
                    }}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <div>
                          <span style={{fontWeight:700,fontSize:14,color:C.primary}}>{dv.numero}</span>
                          <span style={{
                            marginLeft:8,padding:'2px 8px',borderRadius:20,fontSize:11,
                            fontWeight:600,color:sc.color,background:sc.bg,
                          }}>
                            {DEVIS_LABEL[dv.statut]}
                          </span>
                        </div>
                        <span style={{fontWeight:700,color:C.accent,fontSize:14}}>
                          {dv.montant_ttc.toFixed(2)} €
                        </span>
                      </div>
                      <div style={{fontSize:12,color:'#777',marginTop:4}}>
                        HT : {dv.montant_ht.toFixed(2)} € · TVA {dv.tva_pct}% · Validité : {dv.validite_jours} j
                      </div>
                      {dv.notes && <div style={{fontSize:12,color:'#555',marginTop:4,fontStyle:'italic'}}>{dv.notes}</div>}
                      {dv.statut === 'brouillon' && (
                        <button
                          onClick={() => void handleEnvoyer(dv.id)}
                          disabled={sending === dv.id}
                          style={{
                            marginTop:10,width:'100%',background:sending===dv.id?'#aaa':C.primary,
                            color:'#fff',padding:'8px',borderRadius:6,fontWeight:600,fontSize:13,
                            border:'none',cursor:sending===dv.id?'not-allowed':'pointer',
                          }}
                        >
                          {sending === dv.id ? 'Envoi…' : '📧 Envoyer ce devis au client'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </Card>
            )}

            {/* Formulaire création devis */}
            {canCreate && (
              <Card title="Créer un devis">
                {devisActif && (
                  <p style={{fontSize:13,color:'#856404',background:'#FFF3CD',padding:'8px 12px',borderRadius:6,marginBottom:12}}>
                    ⚠️ Un devis envoyé est déjà en attente.
                  </p>
                )}
                <form onSubmit={e => void handleCreateDevis(e)}>
                  <div style={{marginBottom:12}}>
                    <label style={{display:'block',fontSize:12,fontWeight:600,marginBottom:4}}>Montant HT (€) *</label>
                    <input type="number" step="0.01" min="1" required value={montantHT}
                      onChange={e=>setMontantHT(e.target.value)}
                      placeholder="ex. 250.00"
                      style={{width:'100%',padding:'8px 10px',borderRadius:6,border:`1.5px solid ${C.border}`,fontSize:14}}/>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
                    <div>
                      <label style={{display:'block',fontSize:12,fontWeight:600,marginBottom:4}}>TVA (%)</label>
                      <input type="number" step="0.5" min="0" max="30" value={tvaPct}
                        onChange={e=>setTvaPct(e.target.value)}
                        style={{width:'100%',padding:'8px 10px',borderRadius:6,border:`1.5px solid ${C.border}`,fontSize:14}}/>
                    </div>
                    <div>
                      <label style={{display:'block',fontSize:12,fontWeight:600,marginBottom:4}}>Validité (jours)</label>
                      <input type="number" min="1" max="30" value={validiteJours}
                        onChange={e=>setValiditeJours(e.target.value)}
                        style={{width:'100%',padding:'8px 10px',borderRadius:6,border:`1.5px solid ${C.border}`,fontSize:14}}/>
                    </div>
                  </div>
                  {montantHT && (
                    <div style={{fontSize:13,color:C.primary,fontWeight:600,marginBottom:12,
                      background:'#f0f4f8',padding:'8px 12px',borderRadius:6}}>
                      Total TTC : {montantTTC.toFixed(2)} €
                    </div>
                  )}
                  <div style={{marginBottom:14}}>
                    <label style={{display:'block',fontSize:12,fontWeight:600,marginBottom:4}}>Notes internes</label>
                    <textarea value={notes} onChange={e=>setNotes(e.target.value)}
                      rows={3} placeholder="Commentaires pour le client (optionnel)"
                      style={{width:'100%',padding:'8px 10px',borderRadius:6,border:`1.5px solid ${C.border}`,fontSize:13,resize:'vertical'}}/>
                  </div>
                  <button type="submit" disabled={creating}
                    style={{width:'100%',background:creating?'#aaa':C.accent,color:'#fff',
                      padding:'10px',borderRadius:7,fontWeight:700,fontSize:14,border:'none',
                      cursor:creating?'not-allowed':'pointer'}}>
                    {creating ? 'Création…' : '📋 Créer le devis'}
                  </button>
                </form>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function Card({title,children}:{title:string;children:React.ReactNode}) {
  const C = { primary:'#1B4F72', white:'#fff', border:'#dde3ea' };
  return (
    <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:10,
      marginBottom:16,boxShadow:'0 1px 6px rgba(0,0,0,.05)',overflow:'hidden'}}>
      <div style={{padding:'12px 18px',borderBottom:'1px solid #eee',fontWeight:700,fontSize:14,color:C.primary}}>
        {title}
      </div>
      <div style={{padding:'14px 18px'}}>{children}</div>
    </div>
  );
}

function Row({label,value}:{label:string;value:string}) {
  return (
    <div style={{display:'flex',justifyContent:'space-between',padding:'5px 0',fontSize:13,borderBottom:'1px solid #f5f5f5'}}>
      <span style={{color:'#666'}}>{label}</span>
      <span style={{fontWeight:500,maxWidth:'60%',textAlign:'right'}}>{value}</span>
    </div>
  );
}
