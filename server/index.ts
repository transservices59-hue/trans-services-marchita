// ─── Chargement des variables d'environnement ────────────────────────────────
import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

// ─── Sentry (doit être initialisé AVANT tout le reste) ───────────────────────
import * as Sentry from '@sentry/node';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn:              process.env.SENTRY_DSN,
    environment:      process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0.1,
  });
}

import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { logger, requestLogger } from './logger.js';

// ── Résolution des variables (noms alternatifs tolérés) ───────────────────────
const STRIPE_SECRET_KEY     = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const SUPABASE_URL          = process.env.SUPABASE_URL          ?? process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY          = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPA_SERVICE_KEY;

// ── Vérification au démarrage (masquée) ───────────────────────────────────────
console.log('\n[server] ── ENV check ──────────────────────────────────');
console.log('  STRIPE_SECRET_KEY      :', STRIPE_SECRET_KEY
  ? `${STRIPE_SECRET_KEY.slice(0, 12)}… ✅`  : '❌ MANQUANT');
console.log('  STRIPE_WEBHOOK_SECRET  :', STRIPE_WEBHOOK_SECRET
  ? `${STRIPE_WEBHOOK_SECRET.slice(0, 14)}… ✅` : '❌ MANQUANT — webhook inopérant');
console.log('  SUPABASE_URL           :', SUPABASE_URL    ? `${SUPABASE_URL} ✅`              : '❌ MANQUANT');
console.log('  SUPABASE_SERVICE_KEY   :', SUPABASE_KEY
  ? `${SUPABASE_KEY.slice(0, 10)}… ✅`   : '❌ MANQUANT');
console.log('  BREVO_API_KEY          :', process.env.BREVO_API_KEY
  ? `${process.env.BREVO_API_KEY.slice(0, 20)}… ✅` : '❌ MANQUANT — emails inopérants');
console.log('[server] ─────────────────────────────────────────────────\n');

if (!STRIPE_SECRET_KEY)  throw new Error('STRIPE_SECRET_KEY manquant dans .env');
if (!SUPABASE_URL)       throw new Error('SUPABASE_URL (ou VITE_SUPABASE_URL) manquant dans .env');
if (!SUPABASE_KEY)       throw new Error('SUPABASE_SERVICE_ROLE_KEY (ou SUPA_SERVICE_KEY) manquant dans .env');

// ── Clients ───────────────────────────────────────────────────────────────────

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// service_role → contourne les RLS pour les opérations serveur
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

// ── Application ───────────────────────────────────────────────────────────────

const app = express();

app.use(
  cors({
    origin: ['http://localhost:3000', 'http://localhost:5173', /\.vercel\.app$/],
    credentials: true,
  })
);
app.use(requestLogger);

import type { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { buildDevisPDF, buildFacturePDF, buildCMRPDF } from './pdf.js';
import { createHash, randomUUID } from 'crypto';
import { notifyStatutChange, sendEmail } from './emails.js';
import { checkGPSAlerts, healthCheck } from './monitoring.js';
import { sendReminders, sendWeeklyReport, runCleanup, notifySMSAssignment } from './automation.js';
import { logAudit } from './audit.js';

// ── Trust proxy (Vercel / reverse proxy) ──────────────────────────────────────
app.set('trust proxy', 1);

// ── Rate limiters ─────────────────────────────────────────────────────────────

const checkoutLimiter = rateLimit({
  windowMs: 60_000, limit: 10,
  standardHeaders: 'draft-7', legacyHeaders: false,
  handler: (req, res) => {
    void logAudit({ action:'RATE_LIMIT', ressource:'create-checkout', req,
      details:{ ip: req.ip } });
    res.status(429).json({ error:'Trop de requêtes. Réessayez dans une minute.', code:'RATE_LIMIT' });
  },
});

const publicLimiter = rateLimit({
  windowMs: 60_000, limit: 5,
  standardHeaders: 'draft-7', legacyHeaders: false,
  handler: (req, res) => {
    void logAudit({ action:'RATE_LIMIT', ressource:'public', req, details:{ path: req.path } });
    res.status(429).json({ error:'Trop de requêtes. Réessayez dans une minute.', code:'RATE_LIMIT' });
  },
});

// ── Schémas Zod ───────────────────────────────────────────────────────────────

const checkoutSchema = z.object({
  dossierId:  z.string().uuid(),
  montant:    z.number().positive().max(100_000),
  email:      z.string().email().optional().or(z.literal('')),
  successUrl: z.string().url(),
  cancelUrl:  z.string().url(),
});

// ── Middleware : vérification JWT Supabase ────────────────────────────────────

const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) { res.status(401).json({ error: 'Non authentifié' }); return; }
  const { data: { user }, error } = await supabase.auth.getUser(auth.slice(7));
  if (error || !user) { res.status(401).json({ error: 'Token invalide' }); return; }
  (req as Request & { user: typeof user }).user = user;
  next();
};

// ── GET /api/pdf/devis/:dossierId ─────────────────────────────────────────────

app.get('/api/pdf/devis/:dossierId', requireAuth, async (req, res) => {
  const { dossierId } = req.params;
  const user = (req as Request & { user: { id: string } }).user;

  try {
    // Vérification accès : client ne voit que ses dossiers
    const { data: profile } = await supabase
      .from('profiles').select('role,id').eq('user_id', user.id).single();

    if (!profile) { res.status(403).json({ error: 'Profil introuvable' }); return; }

    if (profile.role !== 'store') {
      const { data: dossier } = await supabase
        .from('dossiers').select('client_id').eq('id', dossierId).single();
      if (!dossier || dossier.client_id !== profile.id) {
        res.status(403).json({ error: 'Accès refusé' }); return;
      }
    }

    const buffer = await buildDevisPDF(dossierId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="devis-${dossierId}.pdf"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(buffer);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur PDF';
    console.error('[pdf/devis]', msg);
    res.status(500).json({ error: msg });
  }
});

// ── GET /api/pdf/facture/:dossierId ───────────────────────────────────────────

app.get('/api/pdf/facture/:dossierId', requireAuth, async (req, res) => {
  const { dossierId } = req.params;
  const user = (req as Request & { user: { id: string } }).user;

  try {
    const { data: profile } = await supabase
      .from('profiles').select('role,id').eq('user_id', user.id).single();

    if (!profile) { res.status(403).json({ error: 'Profil introuvable' }); return; }

    if (profile.role !== 'store') {
      const { data: dossier } = await supabase
        .from('dossiers').select('client_id').eq('id', dossierId).single();
      if (!dossier || dossier.client_id !== profile.id) {
        res.status(403).json({ error: 'Accès refusé' }); return;
      }
    }

    const buffer = await buildFacturePDF(dossierId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="facture-${dossierId}.pdf"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(buffer);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur PDF';
    console.error('[pdf/facture]', msg);
    res.status(500).json({ error: msg });
  }
});

// ── GET /api/create-checkout — 405 Method Not Allowed ────────────────────────

app.get('/api/create-checkout', (_req, res) => {
  res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
});

// ── POST /api/create-checkout ─────────────────────────────────────────────────

app.post('/api/create-checkout', checkoutLimiter, express.json(), async (req, res) => {
  console.log('[create-checkout] 📥 Requête reçue');
  try {
    // ── Validation Zod ──────────────────────────────────────────────────────
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue  = parsed.error.issues?.[0] ?? (parsed.error as unknown as { issues: { path: unknown[]; message: string }[] }).issues?.[0];
      const field   = issue?.path?.[0] as string | undefined;
      const message = issue?.message ?? 'Données invalides';
      res.status(400).json({ error: message, field });
      return;
    }

    const { dossierId, montant, email, successUrl, cancelUrl } = parsed.data;

    // ── Anti-tampering : vérifier le montant en base ────────────────────────
    const { data: dbDossier } = await supabase
      .from('dossiers')
      .select('montant_devis, statut')
      .eq('id', dossierId)
      .single();

    if (!dbDossier) {
      res.status(404).json({ error: 'Dossier introuvable', field: 'dossierId' });
      return;
    }

    if (['paye','facture_generee'].includes(dbDossier.statut as string)) {
      res.status(400).json({ error: 'Ce dossier est déjà payé' });
      return;
    }

    const dbMontant = dbDossier.montant_devis as number ?? 0;
    if (Math.abs(dbMontant - montant) > 0.01) {
      console.error(`[checkout] TAMPERING détecté : client=${montant}, DB=${dbMontant}, dossier=${dossierId}`);
      void logAudit({ action:'TAMPERING_ATTEMPT', ressource:'create-checkout', req,
        details:{ dossierId, montantClient: montant, montantDB: dbMontant } });
      res.status(400).json({ error: 'Montant invalide', field: 'montant' });
      return;
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      ...(email ? { customer_email: email } : {}),
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name:        `Transport — Dossier ${dossierId}`,
            description: 'Trans Services Marchita · Livraison France → Maroc',
          },
          unit_amount: Math.round(montant * 100),
        },
        quantity: 1,
      }],
      metadata:    { dossierId },
      success_url: successUrl,
      cancel_url:  cancelUrl,
    });

    console.log(`[create-checkout] ✅ Session créée : ${session.id}`);
    void logAudit({ action:'CHECKOUT_CREATED', ressource:'checkout', req,
      ressourceId: dossierId,
      details:{ sessionId: session.id, montant, email } });
    res.json({ url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue';
    console.error('[create-checkout] ❌', msg);
    res.status(500).json({ error: msg });
  }
});

// ── POST /api/stripe-webhook ──────────────────────────────────────────────────
// CRITIQUE : express.raw() DOIT être utilisé ici, PAS express.json().
// Stripe vérifie la signature sur le payload brut (Buffer).
// Si le body est parsé en JSON avant, la vérification échoue toujours.

app.post('/api/stripe-webhook', express.raw({ type: '*/*' }), async (req, res) => {
  const bodySize = Buffer.isBuffer(req.body) ? req.body.length : '?';
  console.log(`[webhook] 📥 Requête reçue (${bodySize} octets)`);

  // ── 1. Vérification du secret ─────────────────────────────────────────────
  if (!STRIPE_WEBHOOK_SECRET) {
    console.error('[webhook] ❌ STRIPE_WEBHOOK_SECRET manquant — impossible de vérifier la signature');
    res.status(400).send('STRIPE_WEBHOOK_SECRET non configuré');
    return;
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    console.error('[webhook] ❌ Header stripe-signature absent');
    res.status(400).send('Header stripe-signature manquant');
    return;
  }

  // ── 2. Vérification de la signature ──────────────────────────────────────
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      sig,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[webhook] ❌ Signature invalide :', msg);
    res.status(400).send(`Webhook signature error: ${msg}`);
    return;
  }

  console.log(`[webhook] ✅ Signature valide — event : ${event.type}`);

  // ── 3. Traitement de l'événement ─────────────────────────────────────────
  void logAudit({ action:'WEBHOOK_RECEIVED', ressource:'webhook',
    details:{ type: event.type, id: event.id } });

  if (event.type === 'checkout.session.completed') {
    const session   = event.data.object as Stripe.Checkout.Session;
    const dossierId = session.metadata?.dossierId;

    console.log(`[webhook] 📋 Session ${session.id} | payment_intent : ${session.payment_intent} | dossierId : ${dossierId}`);

    if (!dossierId) {
      // On répond 200 pour éviter que Stripe réessaie indéfiniment.
      // Un event sans dossierId est un event de test ou mal formé — on le logue et on passe.
      console.warn('[webhook] ⚠️  dossierId absent des metadata — event ignoré (200 quand même)');
      res.json({ received: true, warning: 'dossierId absent, event ignoré' });
      return;
    }

    const now = new Date();

    // ── 3a. Marquer le dossier comme payé ──────────────────────────────────
    console.log(`[webhook] 🗄️  UPDATE dossiers SET statut='paye' WHERE id='${dossierId}'`);

    const { error: updateErr, data: updateData } = await supabase
      .from('dossiers')
      .update({
        statut:                   'paye',
        stripe_payment_intent_id: session.payment_intent as string,
        stripe_session_id:        session.id,
        paye_le:                  now.toISOString(),
        updated_at:               now.toISOString(),
      })
      .eq('id', dossierId)
      .select('id, statut');    // select pour confirmer que la ligne a été trouvée

    if (updateErr) {
      console.error('[webhook] ❌ UPDATE dossier échoué :', updateErr.message, updateErr.code ?? '');
      res.status(500).json({ error: updateErr.message });
      return;
    }

    if (!updateData || updateData.length === 0) {
      console.error(`[webhook] ⚠️  Aucune ligne mise à jour — dossierId '${dossierId}' introuvable en base`);
      // On ne bloque pas Stripe : on répond 200 quand même
    } else {
      console.log(`[webhook] ✅ Dossier mis à jour :`, updateData[0]);
    }

    // ── 3b. Récupérer le montant pour la facture ────────────────────────────
    const { data: dossier, error: fetchErr } = await supabase
      .from('dossiers')
      .select('montant_devis')
      .eq('id', dossierId)
      .single();

    if (fetchErr) {
      console.error('[webhook] ❌ SELECT dossier échoué :', fetchErr.message);
    }

    if (dossier) {
      // ── 3c. Générer et insérer la facture ──────────────────────────────────
      const year    = now.getFullYear();
      const seq     = String(Math.floor(Math.random() * 999_999) + 1).padStart(6, '0');
      const numero  = `FAC-${year}-${seq}`;

      const montantHt  = (dossier.montant_devis as number) ?? (session.amount_total! / 100);
      const tva        = Math.round(montantHt * 0.2 * 100) / 100;
      const montantTtc = Math.round((montantHt + tva) * 100) / 100;

      console.log(`[webhook] 🧾 INSERT facture ${numero} — HT:${montantHt} TVA:${tva} TTC:${montantTtc}`);

      const { error: factureErr } = await supabase.from('factures').insert({
        dossier_id:  dossierId,
        numero,
        montant_ht:  montantHt,
        tva,
        montant_ttc: montantTtc,
      });

      if (factureErr) {
        console.error('[webhook] ❌ INSERT facture échoué :', factureErr.message, factureErr.code ?? '');
      } else {
        // ── 3d. Passer le statut à facture_generee ────────────────────────────
        const { error: finalErr } = await supabase
          .from('dossiers')
          .update({ statut: 'facture_generee', updated_at: new Date().toISOString() })
          .eq('id', dossierId);

        if (finalErr) {
          console.error('[webhook] ❌ UPDATE facture_generee échoué :', finalErr.message);
        } else {
          console.log(`[webhook] 🎉 Terminé — dossier ${dossierId} → facture_generee | facture ${numero}`);

          // Notification email client
          const { data: fullDossier } = await supabase
            .from('dossiers')
            .select('client:profiles(email,prenom,nom), numero, montant_devis')
            .eq('id', dossierId)
            .single();

          type FD = { client: { email: string; prenom: string }[]; numero: string; montant_devis: number } | null;
          const fd = fullDossier as FD;
          const clientRow = fd?.client?.[0] ?? null;

          if (clientRow?.email) {
            await notifyStatutChange({
              statut:        'facture_generee',
              clientEmail:   clientRow.email,
              clientPrenom:  clientRow.prenom,
              dossierNumero: fd?.numero ?? dossierId,
              montantDevis:  fd?.montant_devis ?? 0,
              factureNumero: numero,
            });
          }
        }
      }
    }
  }

  // Répondre 200 à Stripe dans tous les cas pour éviter les retentatives
  res.json({ received: true });
});

// ── POST /api/store/dossiers/:id/assign — affecter transporteur + SMS ────────

app.post('/api/store/dossiers/:id/assign', requireAuth, express.json(), async (req, res) => {
  const { id }           = req.params;
  const { transporteurId } = req.body as { transporteurId: string };
  const user = (req as Request & { user: { id: string } }).user;

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('user_id', user.id).single();
  if (!profile || profile.role !== 'store') {
    res.status(403).json({ error: 'Accès réservé au store' }); return;
  }
  if (!transporteurId) {
    res.status(400).json({ error: 'transporteurId requis' }); return;
  }

  // Mettre à jour le dossier
  const { error: upErr } = await supabase
    .from('dossiers')
    .update({ transporteur_id: transporteurId, statut:'en_transit', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (upErr) { res.status(500).json({ error: upErr.message }); return; }

  // Récupérer les infos pour SMS + email
  const { data: dossier } = await supabase
    .from('dossiers')
    .select('*, client:profiles(*), transporteur:transporteurs(*)')
    .eq('id', id).single();

  let smsSent = false;
  if (dossier) {
    const trk = Array.isArray(dossier.transporteur) ? dossier.transporteur[0] : dossier.transporteur;
    const cli = Array.isArray(dossier.client) ? dossier.client[0] : dossier.client;

    if (trk?.telephone) {
      smsSent = await notifySMSAssignment({
        telephone:     trk.telephone,
        dossierNumero: dossier.numero as string,
        adresseDepart: dossier.adresse_depart as string,
      });
    } else if (cli?.email && trk?.nom) {
      // Fallback email si pas de téléphone
      await notifyStatutChange({
        statut:          'en_transit',
        clientEmail:     cli.email,
        clientPrenom:    cli.prenom,
        dossierNumero:   dossier.numero as string,
        transporteurNom: trk.nom,
        transporteurTel: trk.telephone ?? '',
      });
    }

    if (cli?.email) {
      await notifyStatutChange({
        statut:          'en_transit',
        clientEmail:     cli.email,
        clientPrenom:    cli.prenom,
        dossierNumero:   dossier.numero as string,
        transporteurNom: trk?.nom ?? '',
        transporteurTel: trk?.telephone ?? '',
      });
    }

    void logAudit({ action:'TRANSPORTEUR_ASSIGNED', ressource:'dossiers', ressourceId: id,
      details:{ transporteurId, smsSent } });
  }

  logger.info(`[assign] Transporteur ${transporteurId} affecté au dossier ${id}`, { smsSent });
  res.json({ ok: true, smsSent });
});

// ── POST /api/store/convert-demande — convertit une demande publique en dossier

app.post('/api/store/convert-demande', requireAuth, express.json(), async (req, res) => {
  const { demandeId } = req.body as { demandeId: string };
  const user = (req as Request & { user: { id: string } }).user;

  const { data: storeProfile } = await supabase
    .from('profiles').select('role').eq('user_id', user.id).single();
  if (!storeProfile || storeProfile.role !== 'store') {
    res.status(403).json({ error: 'Accès réservé au store' }); return;
  }
  if (!demandeId) {
    res.status(400).json({ error: 'demandeId requis' }); return;
  }

  // 1. Récupérer la demande
  const { data: demande } = await supabase
    .from('demandes_publiques')
    .select('*')
    .eq('id', demandeId)
    .eq('traitee', false)
    .single();

  if (!demande) {
    res.status(404).json({ error: 'Demande introuvable ou déjà traitée' }); return;
  }

  // 2. Trouver ou créer le profil client
  let clientProfileId: string;

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', demande.email as string)
    .limit(1)
    .maybeSingle();

  if (existingProfile) {
    clientProfileId = existingProfile.id as string;
  } else {
    // Créer le compte Supabase Auth (le trigger handle_new_user crée le profil)
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email:          demande.email as string,
      password:       randomUUID(),
      email_confirm:  true,
      user_metadata:  { nom: demande.nom, prenom: demande.prenom },
    });

    if (authErr || !authData.user) {
      res.status(500).json({ error: authErr?.message ?? 'Erreur création compte client' }); return;
    }

    // Mettre à jour le profil créé par le trigger
    await supabase.from('profiles')
      .update({ nom: demande.nom, prenom: demande.prenom, telephone: demande.telephone })
      .eq('user_id', authData.user.id);

    const { data: newProfile } = await supabase
      .from('profiles').select('id').eq('user_id', authData.user.id).single();

    if (!newProfile) {
      res.status(500).json({ error: 'Profil client introuvable après création' }); return;
    }
    clientProfileId = newProfile.id as string;
  }

  // 3. Créer le dossier (numero auto-généré par trigger)
  const { data: dossier, error: dossierErr } = await supabase
    .from('dossiers')
    .insert({
      client_id:       clientProfileId,
      statut:          'en_attente',
      type_colis:      demande.type_colis,
      description:     demande.description  ?? '',
      adresse_depart:  demande.adresse_depart  ?? '',
      adresse_arrivee: demande.adresse_arrivee ?? '',
      poids_kg:        demande.poids_kg ?? null,
    })
    .select('id')
    .single();

  if (dossierErr || !dossier) {
    res.status(500).json({ error: dossierErr?.message ?? 'Erreur création dossier' }); return;
  }

  // 4. Marquer la demande comme traitée
  await supabase.from('demandes_publiques')
    .update({ traitee: true })
    .eq('id', demandeId);

  void logAudit({
    action: 'DEMANDE_CONVERTED', ressource: 'demandes_publiques',
    ressourceId: demandeId,
    details: { dossierId: dossier.id, email: demande.email, clientProfileId },
  });

  logger.info(`[convert-demande] Demande ${demandeId} → dossier ${dossier.id as string}`);
  res.json({ ok: true, dossierId: dossier.id });
});

// ── POST /api/notify/devis-envoye ─────────────────────────────────────────────

app.post('/api/notify/devis-envoye', requireAuth, express.json(), async (req, res) => {
  const { dossierId } = req.body as { dossierId: string };
  if (!dossierId) { res.status(400).json({ error: 'dossierId requis' }); return; }

  const { data: d } = await supabase
    .from('dossiers')
    .select('numero,montant_devis,client:profiles(email,prenom)')
    .eq('id', dossierId).single();

  if (d) {
    const cli = Array.isArray(d.client) ? d.client[0] : d.client as {email:string;prenom:string}|null;
    if (cli?.email) {
      await notifyStatutChange({
        statut: 'devis_attente_validation',
        clientEmail:   cli.email,
        clientPrenom:  cli.prenom,
        dossierNumero: d.numero as string,
        montantDevis:  (d.montant_devis as number) ?? 0,
      });
    }
  }
  res.json({ ok: true });
});

// ── GET /api/cron/reminders (quotidien 6h) ────────────────────────────────────

app.get('/api/cron/reminders', async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error:'Unauthorized' }); return;
  }
  try {
    const result = await sendReminders();
    logger.info('[cron/reminders]', result);
    res.json({ ok:true, ...result });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// ── GET /api/cron/weekly-report (lundi 8h) ────────────────────────────────────

app.get('/api/cron/weekly-report', async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error:'Unauthorized' }); return;
  }
  try {
    await sendWeeklyReport();
    res.json({ ok:true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// ── GET /api/cron/cleanup (quotidien 2h) ──────────────────────────────────────

app.get('/api/cron/cleanup', async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error:'Unauthorized' }); return;
  }
  try {
    const result = await runCleanup();
    logger.info('[cron/cleanup]', result);
    res.json({ ok:true, ...result });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' });
  }
});

// ── GET /api/pdf/cmr/:dossierId — Lettre de voiture CMR ──────────────────────

app.get('/api/pdf/cmr/:dossierId', requireAuth, async (req, res) => {
  const { dossierId } = req.params;
  const user = (req as Request & { user: { id: string } }).user;

  const { data: profile } = await supabase
    .from('profiles').select('role,id').eq('user_id', user.id).single();
  if (!profile) { res.status(403).json({ error: 'Accès refusé' }); return; }

  // Store voit tout, client voit ses dossiers
  if (profile.role !== 'store') {
    const { data: d } = await supabase
      .from('dossiers').select('client_id').eq('id', dossierId).single();
    if (!d || d.client_id !== profile.id) {
      res.status(403).json({ error: 'Accès refusé' }); return;
    }
  }

  try {
    const buffer = await buildCMRPDF(dossierId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="cmr-${dossierId}.pdf"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(buffer);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur CMR';
    logger.error('[pdf/cmr]', { error: msg });
    res.status(500).json({ error: msg });
  }
});

// ── DELETE /api/rgpd/delete-account ──────────────────────────────────────────

app.delete('/api/rgpd/delete-account', requireAuth, async (req, res) => {
  const user = (req as Request & { user: { id: string; email?: string } }).user;

  try {
    logger.info('[rgpd] Suppression compte demandée', { userId: user.id });

    // 1. Anonymiser le profil (conserver les dossiers pour obligations comptables 10 ans)
    const hash = createHash('sha256').update(user.id + Date.now()).digest('hex').slice(0, 12);
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({
        nom:       'Compte supprimé',
        prenom:    'Compte supprimé',
        email:     `deleted_${hash}@anonymous.local`,
        telephone: '0000000000',
      })
      .eq('user_id', user.id);

    if (profileErr) throw new Error(`Profile anonymization: ${profileErr.message}`);

    // 2. Supprimer l'utilisateur Supabase Auth (via admin API)
    const { error: authErr } = await supabase.auth.admin.deleteUser(user.id);
    if (authErr) {
      logger.warn('[rgpd] Auth delete failed (non bloquant)', { error: authErr.message });
    }

    // 3. Logger l'événement
    void logAudit({
      action: 'ACCOUNT_DELETED', ressource: 'profiles',
      details: { hash, reason: 'user_request_gdpr' },
    });

    // 4. Email de confirmation (best-effort)
    if (user.email) {
      await sendEmail({
        to:      user.email,
        subject: 'Votre compte Trans Services Marchita a été supprimé',
        html: `<p>Bonjour,</p>
          <p>Conformément à votre demande, votre compte et vos données personnelles ont été supprimés.</p>
          <p>Vos dossiers de transport sont conservés 10 ans pour obligations comptables, sans données nominatives.</p>
          <p>— Trans Services Marchita</p>`,
      });
    }

    res.json({ ok: true, message: 'Compte supprimé et données anonymisées.' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur suppression';
    logger.error('[rgpd] Delete failed', { error: msg });
    res.status(500).json({ error: msg });
  }
});

// ── GET /api/test-email — envoie un email de test et retourne la réponse Brevo ─

app.get('/api/test-email', async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: 'Unauthorized' }); return;
  }

  const apiKey = process.env.BREVO_API_KEY;
  const keyInfo = apiKey ? `${apiKey.slice(0, 20)}… (${apiKey.length} chars)` : 'ABSENT';
  logger.info(`[test-email] BREVO_API_KEY = ${keyInfo}`);

  if (!apiKey) {
    res.status(500).json({ error: 'BREVO_API_KEY absent', keyInfo }); return;
  }

  // Appel direct Brevo pour voir la réponse brute
  let brevoStatus = 0;
  let brevoBody   = '';
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method:  'POST',
      signal:  controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'api-key':      apiKey,
        'Connection':   'keep-alive',
      },
      body: JSON.stringify({
        sender:      { name: 'Trans Services Marchita', email: 'trans.services59@gmail.com' },
        to:          [{ email: 'cybermons3@gmail.com', name: 'Test' }],
        subject:     `[TEST] Marchita ${new Date().toISOString()}`,
        htmlContent: `<p>Email de test depuis Vercel production.</p><p>${new Date().toISOString()}</p>`,
      }),
    });
    clearTimeout(timer);
    brevoStatus = brevoRes.status;
    brevoBody   = await brevoRes.text();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg, keyInfo });
    return;
  }

  res.json({
    ok:          brevoStatus >= 200 && brevoStatus < 300,
    brevoStatus,
    brevoBody,
    keyInfo,
    timestamp:   new Date().toISOString(),
  });
});

// ── GET /api/health ───────────────────────────────────────────────────────────

app.get('/api/health', async (_req, res) => {
  const result = await healthCheck();
  res.status(result.db ? 200 : 503).json({ status: result.db ? 'ok' : 'degraded', ...result });
});

// ── GET /api/admin/gps-alerts (store uniquement) ──────────────────────────────

app.get('/api/admin/gps-alerts', requireAuth, async (req, res) => {
  const user = (req as Request & { user: { id: string } }).user;
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('user_id', user.id).single();

  if (!profile || profile.role !== 'store') {
    res.status(403).json({ error: 'Accès réservé au store' }); return;
  }

  try {
    const result = await checkGPSAlerts();
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur monitoring';
    res.status(500).json({ error: msg });
  }
});

// ── GET /api/cron/gps-check (Vercel Cron — toutes les 15 min) ────────────────

app.get('/api/cron/gps-check', async (req, res) => {
  // Vercel Cron envoie Authorization: Bearer CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('[cron] Unauthorized GPS check attempt', { ip: req.ip });
    res.status(401).json({ error: 'Unauthorized' }); return;
  }

  try {
    logger.info('[cron] GPS check triggered');
    const result = await checkGPSAlerts();
    logger.info('[cron] GPS check done', result);
    res.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Cron error';
    logger.error('[cron] GPS check failed', { error: msg });
    res.status(500).json({ error: msg });
  }
});

// ── Sentry error handler (doit être le dernier middleware) ────────────────────

if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// ── Démarrage local ───────────────────────────────────────────────────────────

if (!process.env.VERCEL) {
  const PORT = process.env.PORT ?? 3003;
  app.listen(PORT, () => {
    logger.info(`API server démarré sur http://localhost:${PORT}`);
  });
}

export default app;
