-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 006 — demandes_publiques : accès store + colonne traitee (idempotent)
-- ─────────────────────────────────────────────────────────────────────────────

-- Colonne traitee — idempotent (déjà dans 001, mais IF NOT EXISTS est sûr)
ALTER TABLE public.demandes_publiques
  ADD COLUMN IF NOT EXISTS traitee boolean NOT NULL DEFAULT false;

-- Remplacer l'ancienne policy SELECT (non-sécurisée contre la récursion) par is_store()
DROP POLICY IF EXISTS "Store lit demandes"            ON public.demandes_publiques;
DROP POLICY IF EXISTS "Store lit demandes_publiques"  ON public.demandes_publiques;
DROP POLICY IF EXISTS "Store update demandes_publiques" ON public.demandes_publiques;

CREATE POLICY "Store lit demandes_publiques"
  ON public.demandes_publiques FOR SELECT
  USING (is_store());

CREATE POLICY "Store update demandes_publiques"
  ON public.demandes_publiques FOR UPDATE
  USING (is_store());
