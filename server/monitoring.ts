import { createClient } from '@supabase/supabase-js';
import { sendEmail } from './emails.js';
import { logger } from './logger.js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPA_SERVICE_KEY ?? '';
const APP_URL      = process.env.APP_URL ?? 'https://trans-services-marchita.vercel.app';
const STORE_EMAIL  = process.env.STORE_ALERT_EMAIL ?? 'store@marchita-transport.fr';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GPSAlert {
  dossierId:       string;
  dossierNumero:   string;
  transporteurId:  string;
  transporteurNom: string;
  transporteurCode:string;
  lastSeenISO:     string | null;
  minutesSinceLastPos: number;
}

export interface GPSCheckResult {
  checked:  number;
  alerts:   GPSAlert[];
  emailSent: boolean;
}

// ── Vérification GPS ──────────────────────────────────────────────────────────

export async function checkGPSAlerts(): Promise<GPSCheckResult> {
  logger.info('[monitoring] GPS check started');

  // Dossiers en transit avec transporteur affecté
  const { data: dossiers, error } = await supabase
    .from('dossiers')
    .select('id, numero, transporteur_id, transporteur:transporteurs(id,code,nom)')
    .eq('statut', 'en_transit')
    .not('transporteur_id', 'is', null);

  if (error) {
    logger.error('[monitoring] Fetch dossiers failed', { error: error.message });
    return { checked: 0, alerts: [], emailSent: false };
  }

  interface DossierRow {
    id: string; numero: string; transporteur_id: string;
    transporteur: { id: string; code: string; nom: string }[];
  }
  const rows = (dossiers ?? []) as unknown as DossierRow[];

  const alerts: GPSAlert[] = [];

  for (const row of rows) {
    const t = Array.isArray(row.transporteur) ? row.transporteur[0] : row.transporteur;
    if (!t) continue;

    // Dernière position GPS
    const { data: lastPos } = await supabase
      .from('positions_gps')
      .select('created_at')
      .eq('transporteur_id', t.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastSeenISO = lastPos?.created_at ?? null;
    const minutesSince = lastSeenISO
      ? (Date.now() - new Date(lastSeenISO).getTime()) / 60_000
      : Infinity;

    if (minutesSince > 30) {
      alerts.push({
        dossierId:            row.id,
        dossierNumero:        row.numero,
        transporteurId:       t.id,
        transporteurNom:      t.nom,
        transporteurCode:     t.code,
        lastSeenISO,
        minutesSinceLastPos:  Math.round(minutesSince),
      });
    }
  }

  logger.info(`[monitoring] GPS check done`, { checked: rows.length, alerts: alerts.length });

  // Envoyer email d'alerte si nécessaire
  let emailSent = false;
  if (alerts.length > 0) {
    const alertRows = alerts.map(a => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${a.transporteurCode} — ${a.transporteurNom}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${a.dossierNumero}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#c0392b;font-weight:600;">
          ${a.lastSeenISO
            ? `${a.minutesSinceLastPos} min sans position`
            : 'Aucune position GPS'}
        </td>
      </tr>`).join('');

    const html = `
      <h2 style="color:#1B4F72;margin-bottom:16px;">⚠️ Alerte GPS — Transporteurs inactifs</h2>
      <p style="color:#555;margin-bottom:20px;">
        ${alerts.length} transporteur(s) en transit n'ont pas envoyé de position GPS depuis plus de 30 minutes.
      </p>
      <table width="100%" style="border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#1B4F72;color:#fff;">
            <th style="padding:10px 12px;text-align:left;">Transporteur</th>
            <th style="padding:10px 12px;text-align:left;">Dossier</th>
            <th style="padding:10px 12px;text-align:left;">Statut GPS</th>
          </tr>
        </thead>
        <tbody>${alertRows}</tbody>
      </table>
      <p style="margin-top:20px;">
        <a href="${APP_URL}/store/map" style="color:#1B4F72;font-weight:600;">
          → Ouvrir la carte GPS
        </a>
      </p>`;

    try {
      await sendEmail({
        to:      STORE_EMAIL,
        subject: `⚠️ Alerte GPS : ${alerts.length} transporteur(s) inactif(s)`,
        html,
      });
      emailSent = true;
    } catch (e) {
      logger.error('[monitoring] Alert email failed', { error: e instanceof Error ? e.message : e });
    }
  }

  return { checked: rows.length, alerts, emailSent };
}

// ── Health check basique ──────────────────────────────────────────────────────

export async function healthCheck(): Promise<{ db: boolean; latencyMs: number }> {
  const start = Date.now();
  const { error } = await supabase.from('profiles').select('id').limit(1);
  return { db: !error, latencyMs: Date.now() - start };
}
