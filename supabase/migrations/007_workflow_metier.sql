-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 007 — Workflow métier : devis_officiels + nouveaux statuts
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Colonne statut sur demandes_publiques ──────────────────────────────────
ALTER TABLE public.demandes_publiques
  ADD COLUMN IF NOT EXISTS statut text NOT NULL DEFAULT 'nouvelle';

-- ── 2. Table devis_officiels ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.devis_officiels (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  demande_id        uuid          REFERENCES public.demandes_publiques(id),
  numero            text          UNIQUE NOT NULL,
  montant_ht        numeric(10,2) NOT NULL,
  tva_pct           numeric(5,2)  DEFAULT 20,
  montant_ttc       numeric(10,2) NOT NULL,
  validite_jours    integer       DEFAULT 7,
  statut            text          NOT NULL DEFAULT 'brouillon',
  pdf_url           text,
  notes             text,
  envoye_le         timestamptz,
  accepte_le        timestamptz,
  refuse_le         timestamptz,
  token_acceptation text          UNIQUE,
  token_refus       text          UNIQUE,
  created_at        timestamptz   DEFAULT now(),
  updated_at        timestamptz   DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_devis_officiels_demande_id ON public.devis_officiels(demande_id);
CREATE INDEX IF NOT EXISTS idx_devis_officiels_token_acc  ON public.devis_officiels(token_acceptation);
CREATE INDEX IF NOT EXISTS idx_devis_officiels_token_ref  ON public.devis_officiels(token_refus);
CREATE INDEX IF NOT EXISTS idx_devis_officiels_statut     ON public.devis_officiels(statut);

ALTER TABLE public.devis_officiels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store gère devis_officiels"
  ON public.devis_officiels FOR ALL
  USING (is_store());

CREATE POLICY "Service role devis_officiels"
  ON public.devis_officiels FOR ALL
  USING (auth.role() = 'service_role');

-- ── 3. Nouvelles colonnes sur dossiers ────────────────────────────────────────
ALTER TABLE public.dossiers
  ADD COLUMN IF NOT EXISTS devis_officiel_id uuid REFERENCES public.devis_officiels(id),
  ADD COLUMN IF NOT EXISTS numero_suivi      text,
  ADD COLUMN IF NOT EXISTS paiement_id       uuid;

-- ── 4. Mise à jour du CHECK statut sur dossiers (backward compat) ─────────────
ALTER TABLE public.dossiers DROP CONSTRAINT IF EXISTS dossiers_statut_check;

ALTER TABLE public.dossiers
  ADD CONSTRAINT dossiers_statut_check CHECK (statut IN (
    'brouillon','en_attente','devis_envoye','devis_attente_validation',
    'valide','paye','en_transit','livre','facture_generee','annule',
    'en_attente_paiement','en_preparation','recu_store',
    'arrive_maroc','disponible_retrait','litige'
  ));
