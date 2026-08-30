-- Non-destructive preflight for the frozen 14-table MVP schema.
-- This script performs no DDL/DML and must return zero rows from blocker queries
-- before any legacy archive migration is allowed.

with approved(table_name) as (
  values
    ('auth_profiles'),
    ('user_roles'),
    ('atolls'),
    ('islands'),
    ('service_categories'),
    ('provider_profiles'),
    ('provider_service_categories'),
    ('provider_service_areas'),
    ('user_service_addresses'),
    ('request_intake'),
    ('request_media'),
    ('request_status_history'),
    ('request_messages'),
    ('security_events')
)
select
  t.table_name as legacy_table
from information_schema.tables t
left join approved a on a.table_name = t.table_name
where t.table_schema = 'public'
  and t.table_type = 'BASE TABLE'
  and a.table_name is null
order by t.table_name;

-- BLOCKER 1: an approved table must not depend on a legacy public table.
with approved(table_name) as (
  values
    ('auth_profiles'),('user_roles'),('atolls'),('islands'),
    ('service_categories'),('provider_profiles'),('provider_service_categories'),
    ('provider_service_areas'),('user_service_addresses'),('request_intake'),
    ('request_media'),('request_status_history'),('request_messages'),('security_events')
), fk as (
  select
    tc.table_name,
    kcu.column_name,
    ccu.table_name as referenced_table,
    ccu.column_name as referenced_column,
    tc.constraint_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
   and tc.table_schema = kcu.table_schema
  join information_schema.constraint_column_usage ccu
    on ccu.constraint_name = tc.constraint_name
   and ccu.table_schema = tc.table_schema
  where tc.constraint_type = 'FOREIGN KEY'
    and tc.table_schema = 'public'
)
select fk.*
from fk
join approved src on src.table_name = fk.table_name
left join approved dst on dst.table_name = fk.referenced_table
where dst.table_name is null
order by fk.table_name, fk.column_name;

-- BLOCKER 2: views in public must not reference legacy tables.
with approved(table_name) as (
  values
    ('auth_profiles'),('user_roles'),('atolls'),('islands'),
    ('service_categories'),('provider_profiles'),('provider_service_categories'),
    ('provider_service_areas'),('user_service_addresses'),('request_intake'),
    ('request_media'),('request_status_history'),('request_messages'),('security_events')
), legacy as (
  select t.table_name
  from information_schema.tables t
  left join approved a on a.table_name=t.table_name
  where t.table_schema='public' and t.table_type='BASE TABLE' and a.table_name is null
)
select distinct v.table_schema, v.table_name as view_name, l.table_name as legacy_table
from information_schema.views v
join legacy l on v.view_definition ilike ('%' || l.table_name || '%')
where v.table_schema='public'
order by v.table_name, l.table_name;

-- BLOCKER 3: triggers on approved tables must be explicitly reviewed.
with approved(table_name) as (
  values
    ('auth_profiles'),('user_roles'),('atolls'),('islands'),
    ('service_categories'),('provider_profiles'),('provider_service_categories'),
    ('provider_service_areas'),('user_service_addresses'),('request_intake'),
    ('request_media'),('request_status_history'),('request_messages'),('security_events')
)
select event_object_table as table_name, trigger_name, action_timing, event_manipulation
from information_schema.triggers
where trigger_schema='public'
  and event_object_table in (select table_name from approved)
order by event_object_table, trigger_name;
