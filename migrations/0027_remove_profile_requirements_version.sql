-- Remove obsolete profile requirements version runtime key.
-- The dynamic required-fields system now uses the registry/rules tables as source of truth.

delete from app_configuration
where key = 'profile_requirements.version';
