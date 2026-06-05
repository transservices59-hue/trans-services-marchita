// ─── Chargement des variables d'environnement ────────────────────────────────
// On charge .env puis .env.local (override=true) pour couvrir les deux
// conventions : vars Vite (VITE_SUPABASE_URL) et vars server (SUPABASE_URL).
import dotenv from 'dotenv';
dotenv.config();                                          // .env baseline
dotenv.config({ path: '.env.local', override: true });   // .env.local override

import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

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

import type { Request, Response, NextFunction } from 'express';
import { buildDevisPDF, buildFacturePDF } from './pdf.js';
import { notifyStatutChange } from './emails.js';

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

// ── POST /api/create-checkout ─────────────────────────────────────────────────

app.post('/api/create-checkout', express.json(), async (req, res) => {
  console.log('[create-checkout] 📥 Requête reçue');
  try {
    const { dossierId, montant, email, successUrl, cancelUrl } = req.body as {
      dossierId: string;
      montant:   number;
      email?:    string;
      successUrl: string;
      cancelUrl:  string;
    };

    if (!dossierId || !montant || !successUrl || !cancelUrl) {
      res.status(400).json({ error: 'Paramètres manquants' });
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
            void notifyStatutChange({
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

// ── Démarrage local ───────────────────────────────────────────────────────────

if (!process.env.VERCEL) {
  const PORT = process.env.PORT ?? 3003;
  app.listen(PORT, () => {
    console.log(`🚀  API server  →  http://localhost:${PORT}`);
    console.log('    POST /api/create-checkout');
    console.log('    POST /api/stripe-webhook\n');
  });
}

export default app;
