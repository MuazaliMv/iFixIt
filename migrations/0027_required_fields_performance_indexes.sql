create index if not exists idx_profile_field_status_field_key on profile_field_status(field_key);
create index if not exists idx_required_field_rules_updated_by on required_field_rules(updated_by) where updated_by is not null;
create index if not exists idx_required_field_rule_audit_changed_by on required_field_rule_audit(changed_by) where changed_by is not null;
