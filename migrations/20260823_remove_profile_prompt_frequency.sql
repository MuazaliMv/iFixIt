-- Remove legacy profile prompt frequency runtime configuration.
-- The dynamic profile-field system remains intact; this only removes the obsolete app_configuration key.

delete from app_configuration
where key = 'profile_prompt.frequency';
