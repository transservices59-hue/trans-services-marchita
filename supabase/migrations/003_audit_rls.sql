-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 003 — Audit logs + RLS renforcé + Security Definer functions
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Table audit_logs ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  action       text        NOT NULL,
  ressource    text        NOT NULL,
  ressource_id uuid,
  details      jsonb,
  ip_address   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at  ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id     ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ressource   ON public.audit_logs(ressource, created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Store voit tout, personne d'autre
CREATE POLICY "Store voit les audit_logs"
  ON public.audit_logs FOR SELECT
  USING (is_store());

-- Insertion uniquement service_role (server Express)
CREATE POLICY "Service role insère audit_logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ── Purge automatique > 90 jours (appeler via pg_cron ou un cron Supabase) ───

CREATE OR REPLACE FUNCTION public.purge_old_audit_logs()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE deleted_count integer;
BEGIN
  DELETE FROM public.audit_logs
  WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- ── Trigger auto-audit sur dossiers ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.audit_dossier_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, ressource, ressource_id, details)
  VALUES (
    auth.uid(),
    TG_OP,
    'dossiers',
    COALESCE(NEW.id, OLD.id),
    CASE TG_OP
      WHEN 'INSERT' THEN jsonb_build_object(
        'statut', NEW.statut,
        'type_colis', NEW.type_colis,
        'client_id', NEW.client_id
      )
      WHEN 'UPDATE' THEN jsonb_build_object(
        'old_statut', OLD.statut,
        'new_statut', NEW.statut,
        'montant_devis', NEW.montant_devis
      )
      WHEN 'DELETE' THEN jsonb_build_object('numero', OLD.numero)
    END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_dossiers ON public.dossiers;
CREATE TRIGGER trg_audit_dossiers
  AFTER INSERT OR UPDATE OR DELETE ON public.dossiers
  FOR EACH ROW EXECUTE FUNCTION public.audit_dossier_change();

-- ── Trigger auto-audit sur transporteurs ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.audit_transporteur_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, ressource, ressource_id, details)
  VALUES (
    auth.uid(),
    TG_OP,
    'transporteurs',
    COALESCE(NEW.id, OLD.id),
    CASE TG_OP
      WHEN 'INSERT' THEN jsonb_build_object('code', NEW.code, 'nom', NEW.nom, 'type', NEW.type)
      WHEN 'UPDATE' THEN jsonb_build_object(
        'code', NEW.code,
        'actif_before', OLD.actif, 'actif_after', NEW.actif
      )
      WHEN 'DELETE' THEN jsonb_build_object('code', OLD.code)
    END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_transporteurs ON public.transporteurs;
CREATE TRIGGER trg_audit_transporteurs
  AFTER INSERT OR UPDATE OR DELETE ON public.transporteurs
  FOR EACH ROW EXECUTE FUNCTION public.audit_transporteur_change();

-- ── Security Definer functions — évitent la récursion RLS ────────────────────

CREATE OR REPLACE FUNCTION public.is_store()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'store'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_client()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'client'
  );
$$;

CREATE OR REPLACE FUNCTION public.my_profile_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ── Réécriture des policies critiques avec Security Definer ───────────────────

-- Supprimer les anciennes policies récursives
DROP POLICY IF EXISTS "Store voit tous les profils"     ON public.profiles;
DROP POLICY IF EXISTS "Store accès dossiers"            ON public.dossiers;
DROP POLICY IF EXISTS "Client ses dossiers"             ON public.dossiers;
DROP POLICY IF EXISTS "Client update ses dossiers"      ON public.dossiers;
DROP POLICY IF EXISTS "Store gère transporteurs"        ON public.transporteurs;
DROP POLICY IF EXISTS "Lecture transporteurs"           ON public.transporteurs;
DROP POLICY IF EXISTS "Store gère factures"             ON public.factures;
DROP POLICY IF EXISTS "Client ses factures"             ON public.factures;
DROP POLICY IF EXISTS "Store gère devis"                ON public.devis_items;
DROP POLICY IF EXISTS "Client ses devis"                ON public.devis_items;
DROP POLICY IF EXISTS "Lecture positions"               ON public.positions_gps;
DROP POLICY IF EXISTS "Transporteur insère position"    ON public.positions_gps;

-- Profiles
CREATE POLICY "Store lit tous les profils"
  ON public.profiles FOR SELECT
  USING (is_store() OR user_id = auth.uid());

CREATE POLICY "Chacun lit son profil"
  ON public.profiles FOR SELECT
  USING (user_id = auth.uid());

-- Dossiers
CREATE POLICY "Store accès total dossiers"
  ON public.dossiers FOR ALL
  USING (is_store());

CREATE POLICY "Client lit ses dossiers"
  ON public.dossiers FOR SELECT
  USING (client_id = my_profile_id());

CREATE POLICY "Client met à jour ses dossiers"
  ON public.dossiers FOR UPDATE
  USING (client_id = my_profile_id());

-- Transporteurs
CREATE POLICY "Authentifié lit transporteurs"
  ON public.transporteurs FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Store gère transporteurs"
  ON public.transporteurs FOR ALL
  USING (is_store());

-- Factures
CREATE POLICY "Client lit ses factures"
  ON public.factures FOR SELECT
  USING (
    dossier_id IN (
      SELECT id FROM public.dossiers WHERE client_id = my_profile_id()
    )
  );

CREATE POLICY "Store gère toutes les factures"
  ON public.factures FOR ALL
  USING (is_store());

CREATE POLICY "Service role factures"
  ON public.factures FOR ALL
  USING (auth.role() = 'service_role');

-- Devis items
CREATE POLICY "Client lit ses devis items"
  ON public.devis_items FOR SELECT
  USING (
    dossier_id IN (
      SELECT id FROM public.dossiers WHERE client_id = my_profile_id()
    )
  );

CREATE POLICY "Store gère tous les devis items"
  ON public.devis_items FOR ALL
  USING (is_store());

-- Positions GPS
CREATE POLICY "Authentifié lit positions GPS"
  ON public.positions_gps FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role insère positions"
  ON public.positions_gps FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');
