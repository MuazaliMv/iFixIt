-- iFixIt migration 0017: provider onboarding indexes
BEGIN;
CREATE INDEX IF NOT EXISTS idx_provider_service_categories_category
  ON provider_service_categories(category_id, provider_user_id)
  WHERE is_active = TRUE;
COMMIT;
