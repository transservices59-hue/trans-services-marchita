-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 004 — Automatisations : rappels, rapports, nettoyage
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Colonnes rappel sur dossiers (4.1) ───────────────────────────────────────

ALTER TABLE public.dossiers
  ADD COLUMN IF NOT EXISTS rappel_envoye    boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rappel_envoye_le timestamptz;

-- Index pour la query des rappels
CREATE INDEX IF NOT EXISTS idx_dossiers_rappel
  ON public.dossiers(statut, rappel_envoye, updated_at)
  WHERE statut = 'devis_attente_validation' AND rappel_envoye = false;

-- ── Table maintenance_logs (4.4) ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.maintenance_logs (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  action     text        NOT NULL,
  details    jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store voit maintenance_logs"
  ON public.maintenance_logs FOR SELECT USING (is_store());

CREATE POLICY "Service role insère maintenance_logs"
  ON public.maintenance_logs FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ── Fonction nettoyage nocturne (4.4) ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.run_nightly_cleanup()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_deleted_audit   integer := 0;
  v_deleted_gps     integer := 0;
BEGIN
  -- 1. Purger audit_logs anciens (> 90 jours)
  DELETE FROM public.audit_logs
  WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS v_deleted_audit = ROW_COUNT;

  -- 2. Purger positions GPS (garder les 5 dernières par transporteur,
  --    supprimer le reste si vieux de plus de 30 jours)
  DELETE FROM public.positions_gps
  WHERE id IN (
    SELECT id FROM (
      SELECT id,
             ROW_NUMBER() OVER (
               PARTITION BY transporteur_id
               ORDER BY created_at DESC
             ) AS rn
      FROM public.positions_gps
      WHERE created_at < now() - interval '30 days'
    ) ranked
    WHERE rn > 5
  );
  GET DIAGNOSTICS v_deleted_gps = ROW_COUNT;

  -- 3. Logger
  INSERT INTO public.maintenance_logs (action, details)
  VALUES ('nightly_cleanup', jsonb_build_object(
    'deleted_audit_logs',    v_deleted_audit,
    'deleted_gps_positions', v_deleted_gps,
    'run_at',                now()
  ));

  RETURN jsonb_build_object(
    'deleted_audit_logs',    v_deleted_audit,
    'deleted_gps_positions', v_deleted_gps
  );
END;
$$;

-- ── Fonction stats hebdomadaires (4.2) ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.weekly_stats(week_start date DEFAULT date_trunc('week', now() - interval '7 days')::date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_week_end   date        := week_start + 6;
  v_total      integer;
  v_paid       integer;
  v_ca         numeric;
  v_blocked    integer;
  v_active_trk integer;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE statut IN ('paye','facture_generee')),
    COALESCE(SUM(montant_devis) FILTER (WHERE statut IN ('paye','facture_generee')), 0)
  INTO v_total, v_paid, v_ca
  FROM public.dossiers
  WHERE created_at::date BETWEEN week_start AND v_week_end;

  SELECT COUNT(*) INTO v_blocked
  FROM public.dossiers
  WHERE statut IN ('en_attente','devis_envoye','devis_attente_validation')
    AND updated_at < now() - interval '7 days';

  SELECT COUNT(*) INTO v_active_trk
  FROM public.transporteurs WHERE actif = true;

  RETURN jsonb_build_object(
    'week_start',           week_start,
    'week_end',             v_week_end,
    'total_dossiers',       v_total,
    'paid_dossiers',        v_paid,
    'ca_total',             v_ca,
    'blocked_dossiers',     v_blocked,
    'active_transporteurs', v_active_trk
  );
END;
$$;

-- ── pg_cron (optionnel — activer l'extension dans Supabase > Database > Extensions) ──
-- Si pg_cron est activé, décommentez les lignes suivantes :

-- Nettoyage nocturne à 2h00
-- SELECT cron.schedule('nightly-cleanup', '0 2 * * *', 'SELECT public.run_nightly_cleanup()');

-- Rapport hebdomadaire le lundi à 7h50 (avant le cron Vercel 8h)
-- SELECT cron.schedule('weekly-stats-log', '50 7 * * 1', 'INSERT INTO public.maintenance_logs(action,details) VALUES(''weekly_stats'',public.weekly_stats())');

-- Purge audit_logs vieux (redondant avec run_nightly_cleanup, mais garde le cron séparé)
-- SELECT cron.schedule('purge-audit', '0 3 * * *', 'SELECT public.purge_old_audit_logs()');
