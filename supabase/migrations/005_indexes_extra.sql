-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 005 — Index de performance complémentaires
-- ─────────────────────────────────────────────────────────────────────────────
-- Les index créés en migration 002 sont maintenus.
-- Ce fichier ajoute les index manquants et les index composites pour
-- les requêtes les plus fréquentes.

-- ── Index sur dossiers ────────────────────────────────────────────────────────

-- Pagination cursor-based (ORDER BY created_at DESC)
CREATE INDEX IF NOT EXISTS idx_dossiers_created_at_desc
  ON public.dossiers(created_at DESC);

-- Recherche combinée statut + created_at (dashboard store)
CREATE INDEX IF NOT EXISTS idx_dossiers_statut_created
  ON public.dossiers(statut, created_at DESC);

-- Filtres store : transporteur affecté + statut
CREATE INDEX IF NOT EXISTS idx_dossiers_transporteur_statut
  ON public.dossiers(transporteur_id, statut)
  WHERE transporteur_id IS NOT NULL;

-- Rappels automatiques (4.1)
CREATE INDEX IF NOT EXISTS idx_dossiers_rappel_pending
  ON public.dossiers(statut, rappel_envoye, updated_at)
  WHERE statut = 'devis_attente_validation' AND rappel_envoye = false;

-- ── Index sur positions_gps ───────────────────────────────────────────────────

-- Requête "dernière position par transporteur" (utilisée par la carte GPS)
-- NOTE : le nom de la colonne est created_at (pas horodatage)
CREATE INDEX IF NOT EXISTS idx_positions_gps_trk_created
  ON public.positions_gps(transporteur_id, created_at DESC);

-- ── Index sur factures ────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_factures_dossier_created
  ON public.factures(dossier_id, created_at DESC);

-- Numéro de facture unique (pour la génération FAC-YYYY-XXXXXX)
CREATE INDEX IF NOT EXISTS idx_factures_numero
  ON public.factures(numero);

-- ── Index sur audit_logs ──────────────────────────────────────────────────────

-- Filtres page Audit : action + created_at
CREATE INDEX IF NOT EXISTS idx_audit_action_created
  ON public.audit_logs(action, created_at DESC);

-- ── Index sur devis_items ─────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_devis_items_dossier
  ON public.devis_items(dossier_id);

-- ── Index sur profiles ────────────────────────────────────────────────────────

-- Lookup profil par user_id (critique : utilisé à chaque auth check)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_user_id_uniq
  ON public.profiles(user_id);

-- Lookup par rôle (is_store / is_client functions)
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON public.profiles(user_id, role);

-- ─────────────────────────────────────────────────────────────────────────────
-- EXPLAIN ANALYZE — Requêtes critiques à vérifier dans le SQL Editor Supabase
-- Décommentez et exécutez une par une pour valider l'utilisation des index.
-- ─────────────────────────────────────────────────────────────────────────────

/*
-- 1. Dashboard client : dossiers par client
EXPLAIN ANALYZE
SELECT * FROM dossiers
WHERE client_id = '<profile_id>'
ORDER BY created_at DESC;
-- Attendu : Index Scan on idx_dossiers_client_id

-- 2. Dashboard store : tous les dossiers paginés (cursor)
EXPLAIN ANALYZE
SELECT * FROM dossiers
WHERE created_at < '2026-01-01T00:00:00Z'
ORDER BY created_at DESC
LIMIT 21;
-- Attendu : Index Scan on idx_dossiers_created_at_desc

-- 3. Filtre statut + cursor
EXPLAIN ANALYZE
SELECT * FROM dossiers
WHERE statut = 'en_transit'
  AND created_at < '2026-01-01T00:00:00Z'
ORDER BY created_at DESC
LIMIT 21;
-- Attendu : Index Scan on idx_dossiers_statut_created

-- 4. Dernière position GPS (carte temps réel)
EXPLAIN ANALYZE
SELECT * FROM positions_gps
WHERE transporteur_id = '<id>'
ORDER BY created_at DESC
LIMIT 1;
-- Attendu : Index Scan on idx_positions_gps_trk_created

-- 5. Rappels automatiques
EXPLAIN ANALYZE
SELECT id FROM dossiers
WHERE statut = 'devis_attente_validation'
  AND rappel_envoye = false
  AND updated_at < now() - interval '48 hours';
-- Attendu : Index Scan on idx_dossiers_rappel_pending

-- 6. Audit logs (page store)
EXPLAIN ANALYZE
SELECT * FROM audit_logs
ORDER BY created_at DESC
LIMIT 30;
-- Attendu : Index Scan on idx_audit_logs_created_at
*/
