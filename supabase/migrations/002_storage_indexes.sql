-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 002 — Storage bucket + index de performance
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Bucket Supabase Storage ───────────────────────────────────────────────────
-- Exécuter via le SQL Editor Supabase (Storage API only)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800, -- 50 MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy documents : client voit ses documents, store voit tout
CREATE POLICY "Client voit ses documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND auth.uid() IS NOT NULL
  AND (
    -- Store : accès total
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'store'
    )
    OR
    -- Client : accès uniquement aux fichiers dans son dossier_id
    name LIKE (
      SELECT d.id::text || '/%'
      FROM public.dossiers d
      JOIN public.profiles p ON p.id = d.client_id
      WHERE p.user_id = auth.uid()
      LIMIT 1
    )
  )
);

-- Upload service role uniquement (via server Express)
CREATE POLICY "Service role upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND (auth.role() = 'service_role')
);

-- Policy logos : lecture publique
CREATE POLICY "Logos publics"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

-- ── Index de performance ──────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_dossiers_client_id
  ON public.dossiers(client_id);

CREATE INDEX IF NOT EXISTS idx_dossiers_statut
  ON public.dossiers(statut);

CREATE INDEX IF NOT EXISTS idx_dossiers_created_at
  ON public.dossiers(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dossiers_transporteur_id
  ON public.dossiers(transporteur_id)
  WHERE transporteur_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_positions_transporteur_created
  ON public.positions_gps(transporteur_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_factures_dossier_id
  ON public.factures(dossier_id);

CREATE INDEX IF NOT EXISTS idx_devis_items_dossier_id
  ON public.devis_items(dossier_id);
