import { createClient } from '@supabase/supabase-js';
import { sendEmail, tplRelanceDevis } from './emails.js';
import { logger } from './logger.js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPA_SERVICE_KEY ?? '';
const APP_URL      = process.env.APP_URL ?? 'https://trans-services-marchita.vercel.app';
const STORE_EMAIL  = process.env.STORE_ALERT_EMAIL ?? 'store@marchita-transport.fr';
const SMS_SENDER   = process.env.BREVO_SMS_SENDER ?? 'TSMarchita';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

// ── 4.1 Rappels devis en attente ──────────────────────────────────────────────

export async function sendReminders(): Promise<{ sent: number; errors: number; total: number }> {
  const cutoff48h = new Date(Date.now() - 48 * 3600_000).toISOString();

  const { data: dossiers, error } = await supabase
    .from('dossiers')
    .select('id, numero, montant_devis, client:profiles(email,prenom)')
    .eq('statut', 'devis_attente_validation')
    .eq('rappel_envoye', false)
    .lt('updated_at', cutoff48h);

  if (error) {
    logger.error('[reminders] Fetch failed', { error: error.message });
    return { sent: 0, errors: 1, total: 0 };
  }

  type ReminderRow = {
    id: string; numero: string; montant_devis: number | null;
    client: { email: string; prenom: string }[] | { email: string; prenom: string } | null;
  };
  const rows = (dossiers ?? []) as unknown as ReminderRow[];

  logger.info(`[reminders] ${rows.length} dossiers éligibles au rappel`);

  let sent = 0, errors = 0;

  for (const d of rows) {
    const client = Array.isArray(d.client) ? d.client[0] : d.client;
    if (!client?.email) { errors++; continue; }

    try {
      await sendEmail({
        to:     client.email,
        toName: client.prenom,
        subject: `⏰ Votre devis TSM vous attend — Dossier ${d.numero}`,
        html: tplRelanceDevis({
          prenom:  client.prenom,
          numero:  d.numero,
          montant: d.montant_devis ?? 0,
          appUrl:  APP_URL,
        }),
      });

      await supabase.from('dossiers').update({
        rappel_envoye:    true,
        rappel_envoye_le: new Date().toISOString(),
      }).eq('id', d.id);

      sent++;
      logger.info(`[reminders] ✅ Rappel envoyé → ${client.email} (${d.numero})`);
    } catch (err) {
      errors++;
      logger.error(`[reminders] ❌ Échec ${d.numero}`, { error: err instanceof Error ? err.message : err });
    }
  }

  return { sent, errors, total: rows.length };
}

// ── 4.2 Rapport hebdomadaire store ────────────────────────────────────────────

interface WeekStats {
  weekStr:            string;
  totalDossiers:      number;
  paidDossiers:       number;
  caTotal:            number;
  blockedDossiers:    Array<{ numero: string; statut: string }>;
  activeTransporteurs:number;
}

function buildWeeklyReportHtml(s: WeekStats): string {
  const eur = (n: number) => n.toLocaleString('fr-FR', { style:'currency', currency:'EUR', maximumFractionDigits:0 });

  const blockedRows = s.blockedDossiers.map(d =>
    `<tr>
      <td style="padding:7px 12px;border-bottom:1px solid #eee;">${d.numero}</td>
      <td style="padding:7px 12px;border-bottom:1px solid #eee;color:#c0392b;font-size:12px;">${d.statut}</td>
    </tr>`
  ).join('');

  const blockedSection = s.blockedDossiers.length > 0 ? `
    <div style="background:#fdecea;border:1px solid #f5c6cb;border-radius:6px;padding:16px;margin-bottom:20px;">
      <h3 style="color:#721c24;font-size:14px;margin:0 0 10px;">
        ⚠️ ${s.blockedDossiers.length} dossier(s) bloqué(s) depuis plus de 7 jours
      </h3>
      <table width="100%" style="border-collapse:collapse;font-size:13px;">
        <thead><tr style="background:#f8d7da;">
          <th style="padding:7px 12px;text-align:left;">Dossier</th>
          <th style="padding:7px 12px;text-align:left;">Statut</th>
        </tr></thead>
        <tbody>${blockedRows}</tbody>
      </table>
    </div>` : `<p style="color:#155724;margin-bottom:20px;">✅ Aucun dossier bloqué.</p>`;

  // Inline wrap to avoid circular import
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:24px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0"
             style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1);max-width:580px;">
        <tr>
          <td style="background:#1B4F72;padding:24px 32px;">
            <p style="margin:0;font-size:20px;font-weight:bold;color:#fff;">&#x1F69A; Trans Services Marchita</p>
          </td>
        </tr>
        <tr><td style="padding:32px;">
          <h2 style="color:#1B4F72;margin:0 0 4px;">&#x1F4CA; Rapport hebdomadaire</h2>
          <p style="color:#888;font-size:13px;margin:0 0 24px;">${s.weekStr}</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr>
              <td style="padding:12px;background:#f0f4f8;border-radius:6px;text-align:center;width:22%;">
                <div style="font-size:28px;font-weight:700;color:#1B4F72;">${s.totalDossiers}</div>
                <div style="font-size:11px;color:#666;">Dossiers créés</div>
              </td>
              <td width="8px"></td>
              <td style="padding:12px;background:#d4edda;border-radius:6px;text-align:center;width:22%;">
                <div style="font-size:28px;font-weight:700;color:#155724;">${s.paidDossiers}</div>
                <div style="font-size:11px;color:#155724;">Payés</div>
              </td>
              <td width="8px"></td>
              <td style="padding:12px;background:#fff3cd;border-radius:6px;text-align:center;width:30%;">
                <div style="font-size:24px;font-weight:700;color:#E67E22;">${eur(s.caTotal)}</div>
                <div style="font-size:11px;color:#856404;">CA semaine</div>
              </td>
              <td width="8px"></td>
              <td style="padding:12px;background:#cce5ff;border-radius:6px;text-align:center;width:22%;">
                <div style="font-size:28px;font-weight:700;color:#004085;">${s.activeTransporteurs}</div>
                <div style="font-size:11px;color:#004085;">Transporteurs</div>
              </td>
            </tr>
          </table>

          ${blockedSection}

          <a href="${APP_URL}/store/dossiers"
             style="display:inline-block;padding:10px 22px;background:#1B4F72;color:#fff;
                    text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">
            &#x2192; Ouvrir le tableau de bord
          </a>
        </td></tr>
        <tr>
          <td style="background:#f5f7fa;padding:16px 32px;border-top:1px solid #e0e0e0;">
            <p style="margin:0;font-size:11px;color:#888;text-align:center;">
              Trans Services Marchita &bull; Rapport généré automatiquement
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function sendWeeklyReport(): Promise<void> {
  // Semaine précédente : lundi→dimanche
  const now       = new Date();
  const dow       = now.getDay(); // 0=dim
  const lastMon   = new Date(now);
  lastMon.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1) - 7);
  lastMon.setHours(0, 0, 0, 0);
  const lastSun   = new Date(lastMon);
  lastSun.setDate(lastMon.getDate() + 6);
  lastSun.setHours(23, 59, 59, 999);

  const [dossiersRes, blockedRes, trksRes] = await Promise.all([
    supabase.from('dossiers')
      .select('statut,montant_devis')
      .gte('created_at', lastMon.toISOString())
      .lte('created_at', lastSun.toISOString()),

    supabase.from('dossiers')
      .select('numero,statut')
      .in('statut', ['en_attente','devis_envoye','devis_attente_validation'])
      .lt('updated_at', new Date(Date.now() - 7 * 86_400_000).toISOString()),

    supabase.from('transporteurs').select('id', { count:'exact' }).eq('actif', true),
  ]);

  const dossiers = dossiersRes.data ?? [];
  const paid     = dossiers.filter(d => ['paye','facture_generee'].includes(d.statut as string));
  const caTotal  = paid.reduce((s, d) => s + ((d.montant_devis as number) ?? 0), 0);

  const weekStr = `${lastMon.toLocaleDateString('fr-FR')} – ${lastSun.toLocaleDateString('fr-FR')}`;

  const stats: WeekStats = {
    weekStr,
    totalDossiers:       dossiers.length,
    paidDossiers:        paid.length,
    caTotal,
    blockedDossiers:     (blockedRes.data ?? []) as { numero: string; statut: string }[],
    activeTransporteurs: trksRes.count ?? 0,
  };

  await sendEmail({
    to:      STORE_EMAIL,
    subject: `📊 Rapport hebdo TSM — ${weekStr}`,
    html:    buildWeeklyReportHtml(stats),
  });

  logger.info('[weekly-report] ✅ Rapport envoyé', { weekStr, caTotal, blocked: stats.blockedDossiers.length });
}

// ── 4.3 SMS transporteur ──────────────────────────────────────────────────────

function normalizePhone(phone: string): string {
  const digits = phone.replace(/[\s\-().]/g, '');
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  if (digits.startsWith('0')) return `+33${digits.slice(1)}`;  // France par défaut
  return `+${digits}`;
}

export async function sendSMS(phone: string, content: string): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    logger.warn('[sms] BREVO_API_KEY absent — SMS non envoyé');
    return false;
  }

  const recipient = normalizePhone(phone);

  const res = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
    method:  'POST',
    headers: { 'Content-Type':'application/json', 'api-key': apiKey },
    body: JSON.stringify({ sender: SMS_SENDER, recipient, content, type:'transactional' }),
  });

  if (!res.ok) {
    const err = await res.text();
    logger.error('[sms] Échec envoi', { recipient, status: res.status, err });
    return false;
  }

  logger.info(`[sms] ✅ Envoyé → ${recipient}`);
  return true;
}

export async function notifySMSAssignment(params: {
  telephone:      string;
  dossierNumero:  string;
  adresseDepart:  string;
}): Promise<boolean> {
  const ville   = params.adresseDepart.split(',')[0].trim();
  const content = `TSM: Dossier ${params.dossierNumero} vous a été affecté. Départ: ${ville}. Connectez-vous: ${APP_URL}/tracker`;
  return sendSMS(params.telephone, content);
}

// ── 4.4 Nettoyage automatique ─────────────────────────────────────────────────

export async function runCleanup(): Promise<{ deletedAudit: number; deletedGPS: number }> {
  try {
    // Appel de la fonction SQL (migration 004)
    const { data, error } = await supabase.rpc('run_nightly_cleanup') as {
      data: { deleted_audit_logs: number; deleted_gps_positions: number } | null;
      error: { message: string } | null;
    };

    if (error) throw new Error(error.message);

    const result = {
      deletedAudit: data?.deleted_audit_logs ?? 0,
      deletedGPS:   data?.deleted_gps_positions ?? 0,
    };
    logger.info('[cleanup] ✅ Nettoyage terminé', result);
    return result;
  } catch (err) {
    // Fallback : suppressions directes si la fonction SQL n'existe pas encore
    logger.warn('[cleanup] RPC échouée, fallback direct', { error: err instanceof Error ? err.message : err });

    const cutoffAudit = new Date(Date.now() - 90 * 86_400_000).toISOString();
    const { count: deletedAudit } = await supabase
      .from('audit_logs')
      .delete({ count:'exact' })
      .lt('created_at', cutoffAudit);

    logger.info('[cleanup] Fallback terminé', { deletedAudit });
    return { deletedAudit: deletedAudit ?? 0, deletedGPS: 0 };
  }
}
