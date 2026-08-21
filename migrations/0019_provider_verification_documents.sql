-- iFixIt Migration 0019: Provider Verification Documents
BEGIN;

CREATE TABLE IF NOT EXISTS public.provider_verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('ID_CARD','BUSINESS_LICENSE','UTILITY_BILL','INSURANCE','TAX_CERTIFICATE','OTHER')),
  document_label TEXT,
  storage_bucket TEXT NOT NULL DEFAULT 'provider-documents',
  storage_path TEXT NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (review_status IN ('PENDING','APPROVED','REQUEST_INFO','REJECTED')),
  review_note TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_provider_document_path UNIQUE (storage_bucket, storage_path)
);

CREATE INDEX IF NOT EXISTS idx_provider_verification_documents_provider ON public.provider_verification_documents(provider_user_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_provider_verification_documents_review ON public.provider_verification_documents(review_status, submitted_at DESC);

ALTER TABLE public.provider_verification_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.provider_verification_documents FROM anon, authenticated;

DROP TRIGGER IF EXISTS trg_provider_verification_documents_updated_at ON public.provider_verification_documents;
CREATE TRIGGER trg_provider_verification_documents_updated_at BEFORE UPDATE ON public.provider_verification_documents FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('provider-documents','provider-documents',false,10485760,ARRAY['application/pdf','image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public=false, file_size_limit=10485760, allowed_mime_types=EXCLUDED.allowed_mime_types;

COMMIT;
