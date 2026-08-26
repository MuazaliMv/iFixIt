-- ============================================================
-- iFixIt
-- Services component: canonical AC service subcategories
--
-- Keeps service selection on the existing service_categories /
-- service_subcategories catalogue used by both admin and customer flows.
-- Safe to re-run.
-- ============================================================

BEGIN;

WITH ac_category AS (
    SELECT id
    FROM service_categories
    WHERE code = 'AC_SERVICES'
    LIMIT 1
), seed(code, name, description, sort_order) AS (
    VALUES
        ('AC_DIAGNOSE', 'AC Diagnose', 'Diagnose an AC fault or performance issue.', 10),
        ('AC_NEW_INSTALLATION', 'New AC Installation', 'Install a new air-conditioning unit.', 20),
        ('AC_WATER_LEAK_FIX', 'AC Water leak Fix', 'Inspect and repair water leaking from an AC unit.', 30),
        ('AC_FULL_SERVICE', 'AC Full Service Outdoor and Indoor', 'Full servicing of both indoor and outdoor AC units.', 40),
        ('AC_INDOOR_SERVICE', 'AC indoor service', 'Service the indoor AC unit.', 50),
        ('AC_RELOCATION', 'AC Relocation', 'Relocate an existing AC unit.', 60),
        ('AC_OTHER_ISSUE', 'Or describe your own issue', 'Customer selects this option and enters a short issue description.', 70)
)
INSERT INTO service_subcategories (
    category_id,
    code,
    name,
    description,
    sort_order,
    is_active
)
SELECT
    ac_category.id,
    seed.code,
    seed.name,
    seed.description,
    seed.sort_order,
    TRUE
FROM ac_category
CROSS JOIN seed
ON CONFLICT (category_id, code)
DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order,
    is_active = TRUE,
    updated_at = now();

COMMIT;
