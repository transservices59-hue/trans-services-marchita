import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
  BarChart, Bar,
} from 'recharts';
import { supabase, signOut } from '../../lib/supabase';
import StoreNav from '../../components/StoreNav';
import type { StatutDossier } from '../../types';

const C = { primary: '#1B4F72', accent: '#E67E22', bg: '#f5f7fa', white: '#fff', border: '#dde3ea' };

// ── Types ─────────────────────────────────────────────────────────────────────

interface DossierRow {
  id:           string;
  statut:       StatutDossier;
  montant_devis: number | null;
  created_at:   string;
  paye_le:      string | null;
}

type Period = '7j' | '30j' | '90j';

// ── Couleurs statuts ──────────────────────────────────────────────────────────

const STATUT_COLORS: Partial<Record<StatutDossier, string>> = {
  brouillon:               '#cccccc',
  en_attente:              '#ffc107',
  devis_envoye:            '#17a2b8',
  devis_attente_validation:'#28a745',
  valide:                  '#20c997',
  paye:                    '#007bff',
  en_transit:              '#fd7e14',
  livre:                   '#155724',
  facture_generee:         '#6f42c1',
  annule:                  '#dc3545',
};

const STATUT_LABELS: Partial<Record<StatutDossier, string>> = {
  brouillon:'Brouillon', en_attente:'En attente', devis_envoye:'Devis envoyé',
  devis_attente_validation:'À valider', valide:'Validé', paye:'Payé',
  en_transit:'En transit', livre:'Livré', facture_generee:'Facturé', annule:'Annulé',
};

// ── Utilitaires ───────────────────────────────────────────────────────────────

const eur = (n: number) => n.toLocaleString('fr-FR', { style:'currency', currency:'EUR', maximumFractionDigits: 0 });

function getWeekStart(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); // Monday
  return d.toISOString().split('T')[0];
}

function periodStart(period: Period): Date {
  const d = new Date();
  if (period === '7j')  d.setDate(d.getDate() - 7);
  if (period === '30j') d.setDate(d.getDate() - 30);
  if (period === '90j') d.setDate(d.getDate() - 90);
  return d;
}

function exportCSV(rows: DossierRow[]) {
  const headers = ['Numéro (id)', 'Statut', 'Montant (€)', 'Créé le', 'Payé le'];
  const data = rows.map(d => [
    d.id.slice(0, 8),
    d.statut,
    d.montant_devis ?? 0,
    new Date(d.created_at).toLocaleDateString('fr-FR'),
    d.paye_le ? new Date(d.paye_le).toLocaleDateString('fr-FR') : '',
  ]);
  const csv = [headers, ...data].map(r => r.join(';')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ── Composants UI ─────────────────────────────────────────────────────────────

function KPICard({ label, value, sub, color = C.primary }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div style={{
      background: C.white, border:`1px solid ${C.border}`, borderRadius: 10,
      padding:'20px 24px', boxShadow:'0 1px 6px rgba(0,0,0,.05)',
    }}>
      <div style={{ fontSize: 13, color:'#666', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color:'#aaa', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function StoreAnalytics() {
  const navigate = useNavigate();
  const [period,   setPeriod]   = useState<Period>('30j');
  const [dossiers, setDossiers] = useState<DossierRow[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    setLoading(true);
    const start = periodStart(period);

    supabase
      .from('dossiers')
      .select('id,statut,montant_devis,created_at,paye_le')
      .gte('created_at', start.toISOString())
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setDossiers((data as DossierRow[]) ?? []);
        setLoading(false);
      });
  }, [period]);

  // ── KPIs calculés ──────────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const paid = dossiers.filter(d => ['paye','facture_generee'].includes(d.statut));
    const total = dossiers.length;

    const caTotal = paid.reduce((s, d) => s + (d.montant_devis ?? 0), 0);

    // Taux de conversion
    const convRate = total > 0 ? (paid.length / total) * 100 : 0;

    // Délai moyen devis → paiement (en heures)
    const delaisPay = paid
      .filter(d => d.paye_le)
      .map(d => (new Date(d.paye_le!).getTime() - new Date(d.created_at).getTime()) / 3_600_000);
    const avgDelai = delaisPay.length > 0
      ? delaisPay.reduce((s, h) => s + h, 0) / delaisPay.length
      : 0;

    return { caTotal, convRate, avgDelai, total, paidCount: paid.length };
  }, [dossiers]);

  // ── Données graphiques ─────────────────────────────────────────────────────

  const weeklyCA = useMemo(() => {
    const map = new Map<string, number>();
    dossiers
      .filter(d => ['paye','facture_generee'].includes(d.statut) && d.paye_le)
      .forEach(d => {
        const w = getWeekStart(new Date(d.paye_le!));
        map.set(w, (map.get(w) ?? 0) + (d.montant_devis ?? 0));
      });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, ca]) => ({
        week: new Date(week).toLocaleDateString('fr-FR', { day:'numeric', month:'short' }),
        ca: Math.round(ca),
      }));
  }, [dossiers]);

  const byStatut = useMemo(() => {
    const map = new Map<string, number>();
    dossiers.forEach(d => map.set(d.statut, (map.get(d.statut) ?? 0) + 1));
    return Array.from(map.entries())
      .map(([statut, value]) => ({
        name:  STATUT_LABELS[statut as StatutDossier] ?? statut,
        value,
        color: STATUT_COLORS[statut as StatutDossier] ?? '#888',
      }))
      .sort((a, b) => b.value - a.value);
  }, [dossiers]);

  const conversionData = [
    { name: 'Payés',    value: kpis.paidCount,            fill: '#155724' },
    { name: 'Non payés', value: kpis.total - kpis.paidCount, fill: '#e0e0e0' },
  ];

  const handleLogout = async () => { await signOut(); navigate('/login'); };

  return (
    <div style={{ minHeight:'100vh', background: C.bg }}>
      <header style={{
        background: C.primary, color:'#fff', height:60, padding:'0 2rem',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        boxShadow:'0 2px 8px rgba(0,0,0,.2)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:24 }}>
          <span style={{ fontWeight:700, fontSize:17 }}>🚚 Marchita — Store</span>
          <StoreNav active="/store/analytics" />
        </div>
        <button onClick={handleLogout} style={{ background:'rgba(255,255,255,.15)', color:'#fff', padding:'6px 14px', borderRadius:6, fontSize:13 }}>
          Déconnexion
        </button>
      </header>

      <main style={{ maxWidth:1200, margin:'0 auto', padding:'2rem' }}>
        {/* Titre + filtres + export */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24, flexWrap:'wrap', gap:12 }}>
          <h1 style={{ fontSize:22, fontWeight:700, color: C.primary, margin:0 }}>Analytics</h1>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <div style={{ display:'flex', background:'#e8edf2', borderRadius:8, padding:3, gap:2 }}>
              {(['7j','30j','90j'] as Period[]).map(p => (
                <button key={p} onClick={() => setPeriod(p)} style={{
                  padding:'5px 14px', borderRadius:6, fontSize:13, fontWeight:600,
                  background: period === p ? C.primary : 'transparent',
                  color:      period === p ? '#fff'     : '#555',
                  border:     'none', cursor:'pointer',
                }}>
                  {p}
                </button>
              ))}
            </div>
            <button
              onClick={() => exportCSV(dossiers)}
              style={{ background: C.accent, color:'#fff', padding:'7px 16px', borderRadius:7, fontSize:13, fontWeight:600 }}
            >
              ⬇️ Export CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:'4rem', color:'#888' }}>Chargement des données…</div>
        ) : (
          <>
            {/* KPI Cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:16, marginBottom:28 }}>
              <KPICard label="Chiffre d'affaires" value={eur(kpis.caTotal)} sub={`${period} • dossiers payés`} color={C.accent} />
              <KPICard label="Dossiers total"     value={String(kpis.total)} sub={`Dont ${kpis.paidCount} payés`} />
              <KPICard label="Taux de conversion" value={`${kpis.convRate.toFixed(1)} %`} sub="Demandes → paiement" />
              <KPICard label="Délai moyen paiement" value={
                kpis.avgDelai < 48
                  ? `${Math.round(kpis.avgDelai)} h`
                  : `${(kpis.avgDelai / 24).toFixed(1)} j`
              } sub="Création → paiement" color={kpis.avgDelai < 48 ? '#155724' : C.accent} />
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, marginBottom:24 }}>
              {/* CA Hebdomadaire */}
              <div style={{ background: C.white, border:`1px solid ${C.border}`, borderRadius:10, padding:'20px 16px', boxShadow:'0 1px 6px rgba(0,0,0,.05)' }}>
                <div style={{ fontWeight:700, fontSize:15, color: C.primary, marginBottom:16 }}>
                  📈 CA hebdomadaire (€)
                </div>
                {weeklyCA.length === 0 ? (
                  <div style={{ textAlign:'center', color:'#aaa', padding:'3rem 0' }}>Aucune donnée</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={weeklyCA} margin={{ top:5, right:20, bottom:5, left:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="week" tick={{ fontSize:11 }} />
                      <YAxis tick={{ fontSize:11 }} tickFormatter={v => `${v}€`} />
                      <Tooltip formatter={(v) => [`${Number(v).toLocaleString('fr-FR')} €`, 'CA']} />
                      <Line type="monotone" dataKey="ca" stroke={C.accent} strokeWidth={2.5} dot={{ fill: C.accent, r:4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Répartition statuts */}
              <div style={{ background: C.white, border:`1px solid ${C.border}`, borderRadius:10, padding:'20px 16px', boxShadow:'0 1px 6px rgba(0,0,0,.05)' }}>
                <div style={{ fontWeight:700, fontSize:15, color: C.primary, marginBottom:16 }}>
                  🥧 Dossiers par statut
                </div>
                {byStatut.length === 0 ? (
                  <div style={{ textAlign:'center', color:'#aaa', padding:'3rem 0' }}>Aucune donnée</div>
                ) : (
                  <div style={{ display:'flex', gap:16, alignItems:'center' }}>
                    <ResponsiveContainer width={180} height={180}>
                      <PieChart>
                        <Pie data={byStatut} cx="50%" cy="50%" outerRadius={80}
                          dataKey="value" nameKey="name">
                          {byStatut.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v, n) => [v, n]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ flex:1 }}>
                      {byStatut.slice(0,6).map(s => (
                        <div key={s.name} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, fontSize:12 }}>
                          <div style={{ width:10, height:10, borderRadius:'50%', background:s.color, flexShrink:0 }} />
                          <span style={{ color:'#444', flex:1 }}>{s.name}</span>
                          <span style={{ fontWeight:600, color: C.primary }}>{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Conversion */}
            <div style={{ background: C.white, border:`1px solid ${C.border}`, borderRadius:10, padding:'20px 24px', boxShadow:'0 1px 6px rgba(0,0,0,.05)' }}>
              <div style={{ fontWeight:700, fontSize:15, color: C.primary, marginBottom:16 }}>
                🎯 Taux de conversion (demandes → paiements)
              </div>
              <ResponsiveContainer width="100%" height={80}>
                <BarChart data={conversionData} layout="vertical" margin={{ top:0, right:20, left:80, bottom:0 }}>
                  <XAxis type="number" tick={{ fontSize:11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize:12 }} width={72} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4,4,4,4]}>
                    {conversionData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ marginTop:12, fontSize:13, color:'#666' }}>
                {kpis.paidCount} dossier(s) payé(s) sur {kpis.total} au total —{' '}
                <strong style={{ color: kpis.convRate >= 50 ? '#155724' : C.accent }}>
                  {kpis.convRate.toFixed(1)} %
                </strong>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
