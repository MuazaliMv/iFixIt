-- Remove service subcategories from every active catalogue and request path.
--
-- The legacy columns and table remain in place so an older database snapshot can
-- still be restored without losing request history. Constraints prevent new
-- application data from reintroducing the retired feature.

BEGIN;

UPDATE service_subcategories
SET is_active = false,
    updated_at = now()
WHERE is_active;

DELETE FROM request_form_fields
WHERE field_key = 'service_subcategory';

ALTER TABLE service_subcategories
  ADD CONSTRAINT service_subcategories_must_remain_inactive
  CHECK (is_active = false);

DO $retire_nested_categories$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'service_categories'
      AND column_name = 'parent_id'
  ) THEN
    UPDATE service_categories
    SET is_active = false,
        updated_at = now()
    WHERE parent_id IS NOT NULL
      AND is_active;

    ALTER TABLE service_categories
      ADD CONSTRAINT service_categories_must_be_top_level
      CHECK (parent_id IS NULL);
  END IF;
END
$retire_nested_categories$;

DO $retire_request_field$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'request_intake'
      AND column_name = 'service_subcategory_code'
  ) THEN
    ALTER TABLE request_intake
      ADD CONSTRAINT request_intake_has_no_service_subcategory
      CHECK (service_subcategory_code IS NULL);
  END IF;
END
$retire_request_field$;

COMMIT;
