import { useEffect, useState, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, getDossierById, getTransporteurs, signOut } from '../../lib/supabase';
import StoreNav from '../../components/StoreNav';
import type { Dossier, Transporteur, StatutDossier } from '../../types';

const C = { primary:'#1B4F72', accent:'#E67E22', bg:'#f5f7fa', white:'#fff',
            border:'#dde3ea', error:'#c0392b', success:'#155724' };

const STATUT_LABEL: Record<StatutDossier,string> = {
  brouillon:'Brouillon', en_attente:'En attente', devis_envoye:'Devis envoyé',
  devis_attente_validation:'À valider', valide:'Validé', paye:'Payé',
  en_transit:'En transit', livre:'Livré', facture_generee:'Facturé', annule:'Annulé',
};
const STATUT_COLOR: Record<StatutDossier,{color:string;bg:string}> = {
  brouillon:{color:'#666',bg:'#f0f0f0'},en_attente:{color:'#7B4F00',bg:'#FFF3CD'},
  devis_envoye:{color:'#004085',bg:'#CCE5FF'},devis_attente_validation:{color:'#155724',bg:'#D4EDDA'},
  valide:{color:'#0c5460',bg:'#d1ecf1'},paye:{color:'#155724',bg:'#c3e6cb'},
  en_transit:{color:'#533F03',bg:'#FFEEBA'},livre:{color:'#155724',bg:'#b8dabe'},
  facture_generee:{color:'#4a235a',bg:'#e8d5f5'},annule:{color:'#721c24',bg:'#F8D7DA'},
};

export default function StoreDossierDetail() {
  const { id }   = useParams<{ id:string }>();
  const navigate = useNavigate();

  const [dossier,        setDossier]        = useState<Dossier | null>(null);
  const [transporteurs,  setTransporteurs]  = useState<Transporteur[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [montantDevis,   setMontantDevis]   = useState('');
  const [selectedTrk,    setSelectedTrk]    = useState('');
  const [saving,         setSaving]         = useState(false);
  const [assigning,      setAssigning]      = useState(false);
  const [flash,          setFlash]          = useState<{type:'ok'|'err';msg:string}|null>(null);

  const load = async () => {
    if (!id) return;
    const [{ data: d }, { data: trks }] = await Promise.all([
      getDossierById(id),
      getTransporteurs(),
    ]);
    setDossier(d as Dossier ?? null);
    setTransporteurs((trks as Transporteur[]) ?? []);
    if (d) setMontantDevis(String(d.montant_devis ?? ''));
    setLoading(false);
  };

  useEffect(() => { void load(); }, [id]);

  const showFlash = (type:'ok'|'err', msg:string) => {
    setFlash({ type, msg });
    setTimeout(() => setFlash(null), 4000);
  };

  // ── Envoyer / mettre à jour le devis ─────────────────────────────────────

  const handleSendDevis = async (e: FormEvent) => {
    e.preventDefault();
    if (!dossier) return;
    setSaving(true);

    const montant = parseFloat(montantDevis);
    if (isNaN(montant) || montant <= 0) {
      showFlash('err', 'Montant invalide');
      setSaving(false); return;
    }

    const { error } = await supabase
      .from('dossiers')
      .update({
        montant_devis: montant,
        statut:        'devis_attente_validation',
        updated_at:    new Date().toISOString(),
      })
      .eq('id', dossier.id);

    if (error) { showFlash('err', error.message); setSaving(false); return; }

    // Notifier le client via l'API (qui déclenche l'email)
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch('/api/notify/devis-envoye', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${session?.access_token}` },
        body: JSON.stringify({ dossierId: dossier.id }),
      });
    } catch {/* silent */}

    showFlash('ok', 'Devis envoyé au client ✅');
    void load();
    setSaving(false);
  };

  // ── Affecter un transporteur + SMS ────────────────────────────────────────

  const handleAssign = async () => {
    if (!dossier || !selectedTrk) return;
    setAssigning(true);

    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/store/dossiers/${dossier.id}/assign`, {
      method:  'POST',
      headers: { 'Content-Type':'application/json', Authorization:`Bearer ${session?.access_token}` },
      body: JSON.stringify({ transporteurId: selectedTrk }),
    });

    const data = await res.json() as { ok?: boolean; error?: string; smsSent?: boolean };

    if (!res.ok || !data.ok) {
      showFlash('err', data.error ?? 'Erreur affectation');
    } else {
      const smsInfo = data.smsSent ? ' · SMS envoyé au transporteur' : '';
      showFlash('ok', `Transporteur affecté${smsInfo} ✅`);
      void load();
    }
    setAssigning(false);
  };

  // ── Changer le statut ─────────────────────────────────────────────────────

  const updateStatut = async (statut: StatutDossier) => {
    if (!dossier) return;
    await supabase.from('dossiers')
      .update({ statut, updated_at: new Date().toISOString() })
      .eq('id', dossier.id);
    showFlash('ok', `Statut → ${STATUT_LABEL[statut]}`);
    void load();
  };

  const handleLogout = async () => { await signOut(); navigate('/login'); };

  if (loading) return <p style={{padding:'2rem',color:'#888'}}>Chargement…</p>;
  if (!dossier) return <p style={{padding:'2rem',color:C.error}}>Dossier introuvable.</p>;

  const sc = STATUT_COLOR[dossier.statut] ?? {color:'#333',bg:'#eee'};
  const facture = dossier.factures?.[0];
  const canAssign  = ['valide','paye','facture_generee'].includes(dossier.statut);
  const hasTrk     = !!dossier.transporteur_id;

  const downloadCMR = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch(`/api/pdf/cmr/${dossier.id}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `cmr-${dossier.numero}.pdf`; a.click();
    URL.revokeObjectURL(url);
  };
  const canSendDevis = ['en_attente','devis_envoye','devis_attente_validation','brouillon'].includes(dossier.statut);
  const canMarkLivré = dossier.statut === 'en_transit';

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
        {/* Flash */}
        {flash && (
          <div style={{
            padding:'12px 18px',borderRadius:8,marginBottom:20,fontWeight:600,fontSize:14,
            background: flash.type==='ok' ? '#d4edda' : '#fdecea',
            color:      flash.type==='ok' ? C.success   : C.error,
            border:`1px solid ${flash.type==='ok'?'#c3e6cb':'#f5c6cb'}`,
          }}>
            {flash.msg}
          </div>
        )}

        {/* Titre */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
          <div>
            <button onClick={()=>navigate('/store/dossiers')}
              style={{background:'none',color:C.primary,fontSize:14,cursor:'pointer',padding:0}}>
              ← Tous les dossiers
            </button>
            <h1 style={{fontSize:22,fontWeight:700,color:C.primary,margin:'4px 0 0'}}>
              Dossier #{dossier.numero}
            </h1>
          </div>
          <span style={{padding:'6px 16px',borderRadius:20,fontWeight:600,fontSize:13,color:sc.color,background:sc.bg}}>
            {STATUT_LABEL[dossier.statut]}
          </span>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>

          {/* Colonne gauche */}
          <div>
            <Card title="Client">
              {dossier.client ? <>
                <Row label="Nom"    value={`${dossier.client.prenom} ${dossier.client.nom}`}/>
                <Row label="Email"  value={dossier.client.email}/>
                <Row label="Tél"    value={dossier.client.telephone}/>
              </> : <p style={{color:'#aaa',fontSize:13}}>Client inconnu</p>}
            </Card>

            <Card title="Expédition">
              <Row label="Type"    value={dossier.type_colis}/>
              {dossier.poids_kg  && <Row label="Poids"   value={`${dossier.poids_kg} kg`}/>}
              {dossier.volume_m3 && <Row label="Volume"  value={`${dossier.volume_m3} m³`}/>}
              <Row label="Départ"  value={dossier.adresse_depart}/>
              <Row label="Arrivée" value={dossier.adresse_arrivee}/>
              {dossier.description && <Row label="Description" value={dossier.description}/>}
            </Card>

            {facture && (
              <Card title="Facture">
                <Row label="Numéro"     value={facture.numero}/>
                <Row label="HT"         value={`${facture.montant_ht} €`}/>
                <Row label="TVA 20%"    value={`${facture.tva} €`}/>
                <Row label="TTC"        value={`${facture.montant_ttc} €`}/>
              </Card>
            )}
          </div>

          {/* Colonne droite */}
          <div>
            {/* Devis */}
            {canSendDevis && (
              <Card title="Envoyer / mettre à jour le devis">
                <form onSubmit={handleSendDevis}>
                  <div style={{marginBottom:14}}>
                    <label style={{display:'block',fontSize:13,fontWeight:600,marginBottom:5}}>
                      Montant TTC (€)
                    </label>
                    <input
                      type="number" step="0.01" min="0" required
                      value={montantDevis}
                      onChange={e=>setMontantDevis(e.target.value)}
                      placeholder="ex. 150.00"
                      style={{width:'100%',padding:'9px 12px',borderRadius:7,border:`1.5px solid ${C.border}`,fontSize:14}}
                    />
                  </div>
                  <button type="submit" disabled={saving}
                    style={{width:'100%',background:saving?'#aaa':C.primary,color:'#fff',
                      padding:10,borderRadius:7,fontWeight:600,fontSize:14}}>
                    {saving ? 'Envoi…' : '📄 Envoyer le devis au client'}
                  </button>
                </form>
              </Card>
            )}

            {/* Affectation transporteur */}
            {canAssign && (
              <Card title="Affecter un transporteur (→ SMS)">
                <div style={{marginBottom:14}}>
                  <label style={{display:'block',fontSize:13,fontWeight:600,marginBottom:5}}>
                    Transporteur
                  </label>
                  <select
                    value={selectedTrk}
                    onChange={e=>setSelectedTrk(e.target.value)}
                    style={{width:'100%',padding:'9px 12px',borderRadius:7,border:`1.5px solid ${C.border}`,fontSize:14,background:C.white}}
                  >
                    <option value="">— Sélectionner —</option>
                    {transporteurs.filter(t=>t.actif).map(t=>(
                      <option key={t.id} value={t.id}>
                        {t.type==='camion'?'🚛':'🤝'} {t.code} — {t.nom} ({t.telephone})
                      </option>
                    ))}
                  </select>
                </div>
                {dossier.transporteur_id && (
                  <div style={{fontSize:12,color:'#666',marginBottom:12,padding:'8px 12px',background:'#f0f4f8',borderRadius:6}}>
                    Actuellement affecté : <strong>{dossier.transporteur?.nom ?? dossier.transporteur_id}</strong>
                  </div>
                )}
                <button
                  onClick={handleAssign}
                  disabled={assigning || !selectedTrk}
                  style={{
                    width:'100%',padding:10,borderRadius:7,fontWeight:600,fontSize:14,
                    background: assigning||!selectedTrk ? '#aaa' : '#E67E22',
                    color:'#fff',cursor:assigning||!selectedTrk?'not-allowed':'pointer',
                  }}
                >
                  {assigning ? 'Affectation…' : '📱 Affecter et notifier par SMS'}
                </button>
                <p style={{fontSize:11,color:'#aaa',marginTop:8}}>
                  Un SMS est envoyé au transporteur. Le client reçoit un email.
                </p>
              </Card>
            )}

            {/* Lettre de voiture CMR */}
            {hasTrk && (
              <Card title="Documents légaux">
                <button onClick={downloadCMR}
                  style={{ width:'100%', background:'#004085', color:'#fff',
                    padding:10, borderRadius:7, fontWeight:600, fontSize:14 }}>
                  📋 Télécharger lettre de voiture CMR
                </button>
                <p style={{ fontSize:11, color:'#aaa', marginTop:6 }}>
                  Générée selon la Convention CMR de Genève (1956).
                  Obligatoire pour tout transport international.
                </p>
              </Card>
            )}

            {/* Actions statut */}
            <Card title="Actions">
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {canMarkLivré && (
                  <button onClick={()=>updateStatut('livre')}
                    style={{background:'#155724',color:'#fff',padding:'10px',borderRadius:7,fontWeight:600,fontSize:14}}>
                    ✅ Marquer comme livré
                  </button>
                )}
                {dossier.statut==='en_attente' && (
                  <button onClick={()=>updateStatut('devis_envoye')}
                    style={{background:C.primary,color:'#fff',padding:'10px',borderRadius:7,fontWeight:600,fontSize:14}}>
                    📄 Passer en "Devis envoyé"
                  </button>
                )}
                {!['annule','livre'].includes(dossier.statut) && (
                  <button onClick={()=>updateStatut('annule')}
                    style={{background:'#fff',color:C.error,border:`1px solid ${C.error}`,padding:'10px',borderRadius:7,fontWeight:600,fontSize:14}}>
                    ✕ Annuler le dossier
                  </button>
                )}
              </div>
            </Card>
          </div>

        </div>
      </main>
    </div>
  );
}

function Card({title,children}:{title:string;children:React.ReactNode}) {
  return (
    <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:10,
      marginBottom:16,boxShadow:'0 1px 6px rgba(0,0,0,.05)',overflow:'hidden'}}>
      <div style={{padding:'12px 18px',borderBottom:`1px solid #eee`,fontWeight:700,fontSize:14,color:C.primary}}>
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
