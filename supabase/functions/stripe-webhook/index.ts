import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const body      = await req.text();

  if (!signature) {
    return new Response("Signature manquante", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Signature invalide";
    return new Response(`Webhook Error: ${msg}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session   = event.data.object as Stripe.Checkout.Session;
    const dossierId = session.metadata?.dossierId;

    if (!dossierId) {
      return new Response("dossierId absent des métadonnées", { status: 400 });
    }

    const now = new Date();

    // 1. Marquer le dossier comme payé
    const { error: updateErr } = await supabase
      .from("dossiers")
      .update({
        statut:                   "paye",
        stripe_payment_intent_id: session.payment_intent as string,
        stripe_session_id:        session.id,
        paye_le:                  now.toISOString(),
        updated_at:               now.toISOString(),
      })
      .eq("id", dossierId);

    if (updateErr) {
      console.error("Erreur mise à jour dossier :", updateErr.message);
      return new Response(`DB Error: ${updateErr.message}`, { status: 500 });
    }

    // 2. Récupérer les infos du dossier pour la facture
    const { data: dossier, error: fetchErr } = await supabase
      .from("dossiers")
      .select("montant_devis")
      .eq("id", dossierId)
      .single();

    if (fetchErr || !dossier) {
      console.error("Erreur lecture dossier :", fetchErr?.message);
      return new Response(JSON.stringify({ received: true }));
    }

    // 3. Générer le numéro de facture FAC-YYYY-XXXXXX
    const year  = now.getFullYear();
    const seq   = String(Math.floor(Math.random() * 999_999) + 1).padStart(6, "0");
    const numero = `FAC-${year}-${seq}`;

    const montantHt  = dossier.montant_devis ?? session.amount_total! / 100;
    const tva        = Math.round(montantHt * 0.2 * 100) / 100;
    const montantTtc = Math.round((montantHt + tva) * 100) / 100;

    // 4. Créer la facture
    const { error: factureErr } = await supabase.from("factures").insert({
      dossier_id:   dossierId,
      numero,
      montant_ht:  montantHt,
      tva,
      montant_ttc: montantTtc,
    });

    if (factureErr) {
      console.error("Erreur création facture :", factureErr.message);
    } else {
      // 5. Mettre à jour le statut vers facture_generee
      await supabase
        .from("dossiers")
        .update({ statut: "facture_generee", updated_at: new Date().toISOString() })
        .eq("id", dossierId);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
