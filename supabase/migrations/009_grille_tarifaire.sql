-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 009 — Table grille_tarifaire (admin panel futur)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.grille_tarifaire (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  type_colis        text          NOT NULL,
  poids_min         numeric,
  poids_max         numeric,
  type_electromenager text,
  prix_ht           numeric(10,2) NOT NULL,
  actif             boolean       NOT NULL DEFAULT true,
  created_at        timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE public.grille_tarifaire ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store gère grille_tarifaire"
  ON public.grille_tarifaire FOR ALL USING (is_store());

CREATE POLICY "Service role grille_tarifaire"
  ON public.grille_tarifaire FOR ALL USING (auth.role() = 'service_role');

-- Seed — tarifs colis (par tranche de poids)
INSERT INTO public.grille_tarifaire (type_colis, poids_min, poids_max, prix_ht) VALUES
  ('colis',  0,  5,   25),
  ('colis',  5,  20,  30),
  ('colis',  20, 50,  90),
  ('colis',  50, NULL, 175);

-- Seed — tarifs électroménager
INSERT INTO public.grille_tarifaire (type_colis, type_electromenager, prix_ht) VALUES
  ('electromenager', 'Machine à laver',   120),
  ('electromenager', 'Réfrigérateur',     150),
  ('electromenager', 'Congélateur',       130),
  ('electromenager', 'Télévision',         80),
  ('electromenager', 'Climatiseur',       100),
  ('electromenager', 'Lave-vaisselle',    120),
  ('electromenager', 'Four / micro-onde',  70);
