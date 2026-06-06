// Emails transactionnels via Brevo (REST API — pas de SDK requis)

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';
const FROM = { name: 'Trans Services Marchita', email: 'trans.services59@gmail.com' };
const LOGO_COLOR = '#1B4F72';
const ACCENT     = '#E67E22';

// ── Template HTML de base ─────────────────────────────────────────────────────

function wrapHtml(content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trans Services Marchita</title>
</head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:24px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1);max-width:580px;">
        <!-- Header -->
        <tr>
          <td style="background:${LOGO_COLOR};padding:24px 32px;">
            <p style="margin:0;font-size:20px;font-weight:bold;color:#ffffff;">
              &#x1F69A; Trans Services Marchita
            </p>
            <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,.8);">
              Transport France &#x2192; Maroc
            </p>
          </td>
        </tr>
        <!-- Corps -->
        <tr>
          <td style="padding:32px;">
            ${content}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f5f7fa;padding:16px 32px;border-top:1px solid #e0e0e0;">
            <p style="margin:0;font-size:11px;color:#888888;text-align:center;">
              Trans Services Marchita &bull; 12 rue des Transports, 93200 Saint-Denis<br>
              T&#xe9;l : +33 1 23 45 67 89 &bull; contact@marchita-transport.fr
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function btn(label: string, url: string): string {
  return `<a href="${url}"
    style="display:inline-block;margin-top:20px;padding:12px 28px;
           background:${ACCENT};color:#ffffff;font-size:15px;font-weight:bold;
           text-decoration:none;border-radius:6px;">
    ${label}
  </a>`;
}

function badge(label: string, color = LOGO_COLOR): string {
  return `<span style="display:inline-block;padding:4px 12px;background:${color};
    color:#fff;font-size:12px;font-weight:bold;border-radius:20px;">${label}</span>`;
}

// ── Templates par événement ───────────────────────────────────────────────────

export function tplDemandeRecue(params: {
  prenom: string;
  numero: string;
  montant: number;
  appUrl: string;
}): string {
  return wrapHtml(`
    <h2 style="margin:0 0 8px;color:${LOGO_COLOR};font-size:20px;">Bonjour ${params.prenom},</h2>
    <p style="color:#555;font-size:15px;line-height:1.6;">
      Votre demande d'expédition a bien été re&#xe7;ue.<br>
      Notre &#xe9;quipe examine votre dossier et vous enverra un devis personnalis&#xe9; sous <strong>24 h ouvr&#xe9;es</strong>.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#f0f4f8;border-radius:6px;padding:16px;margin:20px 0;">
      <tr>
        <td style="font-size:13px;color:#555;">Num&#xe9;ro de dossier</td>
        <td style="font-size:13px;font-weight:bold;color:${LOGO_COLOR};text-align:right;">${params.numero}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#555;padding-top:8px;">Devis estimatif</td>
        <td style="font-size:13px;font-weight:bold;color:${ACCENT};text-align:right;padding-top:8px;">
          ${params.montant > 0 ? params.montant.toFixed(2) + ' &euro;' : 'En cours de calcul'}
        </td>
      </tr>
    </table>
    ${btn('&#x1F4C2; Suivre mon dossier', `${params.appUrl}/client/dashboard`)}
  `);
}

export function tplPaiementConfirme(params: {
  prenom: string;
  numero: string;
  montant: number;
  factureNumero: string;
  appUrl: string;
}): string {
  return wrapHtml(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:48px;">&#x2705;</div>
      <h2 style="margin:8px 0;color:${LOGO_COLOR};">Paiement confirm&#xe9; !</h2>
    </div>
    <p style="color:#555;font-size:15px;line-height:1.6;">
      Bonjour <strong>${params.prenom}</strong>,<br>
      votre paiement de <strong>${params.montant.toFixed(2)} &euro;</strong> a bien &#xe9;t&#xe9; re&#xe7;u.
      Votre envoi est maintenant pris en charge en priorit&#xe9;.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#f0f4f8;border-radius:6px;padding:16px;margin:20px 0;">
      <tr>
        <td style="font-size:13px;color:#555;">Dossier</td>
        <td style="font-size:13px;font-weight:bold;text-align:right;">${params.numero}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#555;padding-top:8px;">Facture</td>
        <td style="font-size:13px;font-weight:bold;text-align:right;padding-top:8px;">${params.factureNumero}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#555;padding-top:8px;">Montant pay&#xe9;</td>
        <td style="font-size:13px;font-weight:bold;color:${ACCENT};text-align:right;padding-top:8px;">
          ${params.montant.toFixed(2)} &euro;
        </td>
      </tr>
    </table>
    <p style="font-size:13px;color:#555;">
      Votre facture est disponible dans votre espace client (PDF t&#xe9;l&#xe9;chargeable).
    </p>
    ${btn('&#x1F4C4; T&#xe9;l&#xe9;charger ma facture', `${params.appUrl}/client/dossier`)}
  `);
}

export function tplTransporteurAffecte(params: {
  prenom: string;
  numero: string;
  transporteurNom: string;
  transporteurTel: string;
  appUrl: string;
}): string {
  return wrapHtml(`
    <h2 style="margin:0 0 12px;color:${LOGO_COLOR};">&#x1F69B; Votre colis est pris en charge !</h2>
    <p style="color:#555;font-size:15px;line-height:1.6;">
      Bonjour <strong>${params.prenom}</strong>,<br>
      un transporteur a &#xe9;t&#xe9; affect&#xe9; &#xe0; votre dossier <strong>${params.numero}</strong>.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#f0f4f8;border-radius:6px;padding:16px;margin:20px 0;">
      <tr>
        <td style="font-size:13px;color:#555;">Transporteur</td>
        <td style="font-size:13px;font-weight:bold;text-align:right;">${params.transporteurNom}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#555;padding-top:8px;">Contact</td>
        <td style="font-size:13px;font-weight:bold;text-align:right;padding-top:8px;">${params.transporteurTel}</td>
      </tr>
    </table>
    <p style="font-size:13px;color:#555;">
      Vous pouvez d&#xe9;sormais suivre votre colis en temps r&#xe9;el sur la carte GPS.
    </p>
    ${btn('&#x1F4CD; Suivre mon colis en temps r&#xe9;el', `${params.appUrl}/client/dashboard`)}
  `);
}

export function tplLivre(params: {
  prenom: string;
  numero: string;
  appUrl: string;
}): string {
  return wrapHtml(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:48px;">&#x1F4E6;</div>
      <h2 style="margin:8px 0;color:#155724;">Livraison effectu&#xe9;e !</h2>
    </div>
    <p style="color:#555;font-size:15px;line-height:1.6;">
      Bonjour <strong>${params.prenom}</strong>,<br>
      votre colis (dossier <strong>${params.numero}</strong>) a bien &#xe9;t&#xe9; livr&#xe9;.
      Merci de votre confiance !
    </p>
    <p style="font-size:13px;color:#555;">
      Nous esp&#xe9;rons que tout s'est d&#xe9;roul&#xe9; &#xe0; votre satisfaction.
      N'h&#xe9;sitez pas &#xe0; nous confier vos prochains envois.
    </p>
    ${btn('&#x1F9FE; Faire un nouvel envoi', `${params.appUrl}/demande`)}
  `);
}

export function tplRelanceDevis(params: {
  prenom: string;
  numero: string;
  montant: number;
  appUrl: string;
}): string {
  return wrapHtml(`
    <h2 style="margin:0 0 12px;color:${LOGO_COLOR};">&#x23F0; Votre devis vous attend</h2>
    <p style="color:#555;font-size:15px;line-height:1.6;">
      Bonjour <strong>${params.prenom}</strong>,<br>
      votre devis pour le dossier <strong>${params.numero}</strong> est toujours en attente de validation.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#fff3cd;border:1px solid #ffc107;border-radius:6px;padding:16px;margin:20px 0;">
      <tr>
        <td style="font-size:13px;color:#533F03;">
          <strong>Montant du devis :</strong> ${params.montant.toFixed(2)} &euro;
        </td>
      </tr>
    </table>
    <p style="font-size:13px;color:#555;">
      Ce devis est valable 30 jours. Ne manquez pas votre expédition !
    </p>
    ${btn('&#x2705; Valider et payer maintenant', `${params.appUrl}/client/dashboard`)}
  `);
}

// ── Fonction d'envoi centralisée ──────────────────────────────────────────────

export interface EmailPayload {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  attachments?: Array<{ name: string; content: string }>;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn('[email] ⚠️  BREVO_API_KEY absent — email non envoyé (mode dev)');
    console.log(`[email]    → À : ${payload.to} | Sujet : ${payload.subject}`);
    return;
  }

  console.log(`[email] → Envoi à ${payload.to} | "${payload.subject}" | clé: ${apiKey.slice(0, 20)}…`);

  const body: Record<string, unknown> = {
    sender: FROM,
    to: [{ email: payload.to, name: payload.toName ?? payload.to }],
    subject: payload.subject,
    htmlContent: payload.html,
  };

  if (payload.attachments?.length) {
    body.attachment = payload.attachments.map(a => ({
      name:    a.name,
      content: a.content, // base64
    }));
  }

  const doFetch = async (): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    try {
      return await fetch(BREVO_URL, {
        method:  'POST',
        signal:  controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'api-key':      apiKey,
          'Connection':   'keep-alive',
        },
        body: JSON.stringify(body),
      });
    } finally {
      clearTimeout(timer);
    }
  };

  let res: Response;
  try {
    res = await doFetch();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[email] ⚠️  Tentative 1 échouée (${msg}) — retry dans 1 s…`);
    await new Promise(r => setTimeout(r, 1_000));
    try {
      res = await doFetch();
    } catch (err2) {
      const msg2 = err2 instanceof Error ? err2.message : String(err2);
      console.error(`[email] ❌ Échec définitif après retry (${msg2}) → ${payload.to}`);
      return;
    }
  }

  const responseText = await res.text();
  if (!res.ok) {
    console.error(`[email] ❌ Brevo ${res.status} → ${payload.to} | body: ${responseText}`);
    return;
  }

  console.log(`[email] ✅ Envoyé → ${payload.to} | "${payload.subject}" | Brevo: ${responseText}`);
}

// ── Helpers métier ────────────────────────────────────────────────────────────

const APP_URL = process.env.APP_URL ?? 'https://trans-services-marchita.vercel.app';

export async function notifyStatutChange(params: {
  statut: string;
  clientEmail: string;
  clientPrenom: string;
  dossierNumero: string;
  montantDevis?: number;
  factureNumero?: string;
  transporteurNom?: string;
  transporteurTel?: string;
}): Promise<void> {
  const { statut, clientEmail, clientPrenom, dossierNumero } = params;

  try {
    switch (statut) {
      case 'devis_envoye':
      case 'devis_attente_validation':
        await sendEmail({
          to:      clientEmail,
          toName:  clientPrenom,
          subject: `Votre devis TSM — Dossier ${dossierNumero}`,
          html:    tplDemandeRecue({
            prenom: clientPrenom, numero: dossierNumero,
            montant: params.montantDevis ?? 0, appUrl: APP_URL,
          }),
        });
        break;

      case 'facture_generee':
        await sendEmail({
          to:      clientEmail,
          toName:  clientPrenom,
          subject: `Paiement confirmé — Facture ${params.factureNumero ?? dossierNumero}`,
          html:    tplPaiementConfirme({
            prenom: clientPrenom, numero: dossierNumero,
            montant: params.montantDevis ?? 0,
            factureNumero: params.factureNumero ?? '—', appUrl: APP_URL,
          }),
        });
        break;

      case 'en_transit':
        if (params.transporteurNom) {
          await sendEmail({
            to:      clientEmail,
            toName:  clientPrenom,
            subject: `Votre colis est pris en charge — ${dossierNumero}`,
            html:    tplTransporteurAffecte({
              prenom: clientPrenom, numero: dossierNumero,
              transporteurNom: params.transporteurNom,
              transporteurTel: params.transporteurTel ?? '',
              appUrl: APP_URL,
            }),
          });
        }
        break;

      case 'livre':
        await sendEmail({
          to:      clientEmail,
          toName:  clientPrenom,
          subject: `Livraison effectuée — ${dossierNumero}`,
          html:    tplLivre({ prenom: clientPrenom, numero: dossierNumero, appUrl: APP_URL }),
        });
        break;
    }
  } catch (err) {
    console.error('[email] Erreur notification :', err);
  }
}
