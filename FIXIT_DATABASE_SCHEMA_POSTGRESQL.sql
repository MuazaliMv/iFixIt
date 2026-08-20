-- ============================================================================
-- iFixIt / FixIt Maldives
-- Production-oriented PostgreSQL / Supabase-compatible schema
-- Scope: Customer UC-C01..UC-C44 + provider/location dependencies
-- Payment model: customer pays provider directly OFF PLATFORM
-- KYC model: optional by default
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------- ENUM TYPES -------------------------------------------------------

do $$ begin
  create type account_status as enum ('ACTIVE','SUSPENDED','DEACTIVATED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type location_type as enum ('COUNTRY','ATOLL','CITY','ISLAND','DISTRICT','WARD','PHASE','SERVICE_AREA');
exception when duplicate_object then null; end $$;

do $$ begin
  create type address_type as enum ('HOME','WORK','BUSINESS','HOTEL','RESORT','OFFICE','OTHER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type request_status as enum ('PENDING','RESPONDED','ACCEPTED','INSPECTION_SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type request_priority as enum ('NORMAL','URGENT');
exception when duplicate_object then null; end $$;

do $$ begin
  create type provider_type as enum ('COMPANY','FREELANCER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type provider_status as enum ('PENDING_VERIFICATION','ACTIVE','SUSPENDED','REJECTED','DEACTIVATED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type verification_status as enum ('NOT_REQUIRED','NOT_STARTED','PENDING','IN_REVIEW','VERIFIED','REJECTED','EXPIRED','REVERIFY_REQUIRED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type approval_status as enum ('PENDING','APPROVED','REJECTED','SUSPENDED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type offer_response_status as enum ('PENDING','ACCEPT','DECLINE','REQUEST_CLARIFICATION','NO_RESPONSE_TIMEOUT','WITHDRAWN','NOT_SELECTED','CLOSED_REQUEST_CHANGED','CLOSED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type location_share_status as enum ('AREA_ONLY','EXACT_AFTER_ACCEPTANCE','EXACT_SHARED','WITHHELD_BY_CUSTOMER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type contact_source as enum ('CUSTOMER','SAVED_CONTACT','MANUAL');
exception when duplicate_object then null; end $$;

do $$ begin
  create type authority_level as enum ('CONTACT_ONLY','ACCESS_COORDINATION','JOB_COORDINATION');
exception when duplicate_object then null; end $$;

do $$ begin
  create type inspection_status as enum ('PROPOSED','CONFIRMED','RESCHEDULED','CANCELLED','COMPLETED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type clarification_status as enum ('OPEN','RESPONDED','CLOSED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type scope_change_status as enum ('PROPOSED','CLARIFICATION_REQUIRED','APPROVED','REJECTED','WITHDRAWN');
exception when duplicate_object then null; end $$;

do $$ begin
  create type cancellation_review_status as enum ('PENDING_REVIEW','UNDER_PROVIDER_REVIEW','UNDER_ADMIN_REVIEW','APPROVED','REJECTED','RESOLVED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type incident_type as enum ('PROVIDER_WITHDRAWAL','DELAY','NO_SHOW','UNREACHABLE','SAFETY_CONCERN','PROPERTY_DAMAGE','FRAUD_SUSPECTED','HARASSMENT','MISCONDUCT','OTHER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type incident_status as enum ('OPEN','IN_REVIEW','RESOLVED','CLOSED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type dispute_status as enum ('OPEN','PROVIDER_RESPONSE_PENDING','UNDER_REVIEW','RESOLVED','CLOSED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_channel as enum ('IN_APP','PUSH','SMS','VIBER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_delivery_status as enum ('QUEUED','SENT','DELIVERED','FAILED','SUPPRESSED','DEFERRED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type direct_payment_method as enum ('CASH','DIRECT_BANK_TRANSFER','OTHER_DIRECT_METHOD');
exception when duplicate_object then null; end $$;

do $$ begin
  create type direct_payment_record_status as enum ('NOT_RECORDED','CUSTOMER_DECLARED_PAID','CONFIRMED_BY_PROVIDER','DISPUTED','CANCELLED_RECORD');
exception when duplicate_object then null; end $$;

do $$ begin
  create type support_case_status as enum ('OPEN','IN_REVIEW','WAITING_CUSTOMER','RESOLVED','CLOSED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type warranty_status as enum ('OPEN','ELIGIBILITY_REVIEW','ELIGIBLE','NOT_ELIGIBLE','REWORK_SCHEDULED','IN_REWORK','RESOLVED','CLOSED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type privacy_request_type as enum ('EXPORT','DELETE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type privacy_request_status as enum ('PENDING','IN_REVIEW','COMPLETED','PARTIALLY_COMPLETED','REJECTED_WITH_REASON');
exception when duplicate_object then null; end $$;

do $$ begin
  create type organization_status as enum ('ACTIVE','SUSPENDED','DEACTIVATED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type organization_role as enum ('OWNER','ADMIN','REQUESTER','APPROVER','FINANCE','VIEWER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type organization_approval_type as enum ('REQUEST_SUBMISSION','PROVIDER_SELECTION','SCOPE_CHANGE','COST_APPROVAL');
exception when duplicate_object then null; end $$;

do $$ begin
  create type organization_approval_decision as enum ('PENDING','APPROVED','REJECTED');
exception when duplicate_object then null; end $$;

-- ---------- CUSTOMER / ACCOUNT ----------------------------------------------

create table if not exists customers (
  customer_id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  full_name varchar(150) not null,
  preferred_name varchar(100),
  phone varchar(32),
  email varchar(254),
  profile_photo_url text,
  preferred_language varchar(10) not null default 'en',
  preferred_locale varchar(20) not null default 'en-MV',
  fallback_language varchar(10) default 'en',
  timezone varchar(64) not null default 'Indian/Maldives',
  account_status account_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_phone_or_email_chk check (phone is not null or email is not null)
);

create unique index if not exists uq_customers_phone on customers (lower(phone)) where phone is not null;
create unique index if not exists uq_customers_email on customers (lower(email)) where email is not null;

create table if not exists customer_consents (
  consent_id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(customer_id) on delete cascade,
  consent_type varchar(50) not null,
  policy_version varchar(50) not null,
  accepted boolean not null,
  accepted_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique(customer_id, consent_type, policy_version)
);

create table if not exists customer_security_events (
  security_event_id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(customer_id) on delete cascade,
  event_type varchar(80) not null,
  session_id uuid,
  device_id varchar(255),
  device_name varchar(255),
  ip_address inet,
  user_agent text,
  event_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists customer_sessions (
  session_id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(customer_id) on delete cascade,
  auth_session_reference text,
  device_id varchar(255),
  device_name varchar(255),
  last_active_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists customer_saved_contacts (
  saved_contact_id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(customer_id) on delete cascade,
  contact_name varchar(150) not null,
  contact_phone varchar(32) not null,
  contact_role varchar(100),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- LOCATION ---------------------------------------------------------

create table if not exists locations (
  location_id uuid primary key default gen_random_uuid(),
  parent_location_id uuid references locations(location_id) on delete restrict,
  location_type location_type not null,
  code varchar(50),
  canonical_name varchar(150) not null,
  is_service_area boolean not null default false,
  customer_selectable boolean not null default true,
  service_enabled boolean not null default true,
  marketplace_status varchar(30) not null default 'ACTIVE',
  latitude numeric(9,6),
  longitude numeric(9,6),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint locations_lat_chk check (latitude is null or latitude between -90 and 90),
  constraint locations_lon_chk check (longitude is null or longitude between -180 and 180),
  constraint locations_service_area_type_chk check (
    is_service_area = false or location_type in ('SERVICE_AREA','WARD','PHASE','CITY','ISLAND')
  )
);

create unique index if not exists uq_locations_parent_name_type
  on locations (coalesce(parent_location_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(canonical_name), location_type);

create table if not exists location_localizations (
  location_id uuid not null references locations(location_id) on delete cascade,
  language_code varchar(10) not null,
  display_name varchar(150) not null,
  primary key(location_id, language_code)
);

create table if not exists customer_addresses (
  address_id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(customer_id) on delete cascade,
  address_label varchar(100) not null,
  address_type address_type not null default 'OTHER',
  location_id uuid not null references locations(location_id) on delete restrict,
  atoll_id uuid references locations(location_id) on delete restrict,
  city_id uuid references locations(location_id) on delete restrict,
  island_id uuid references locations(location_id) on delete restrict,
  ward_or_district_id uuid references locations(location_id) on delete restrict,
  house_name varchar(150),
  building_name varchar(150),
  floor varchar(50),
  unit_number varchar(50),
  street_name varchar(150),
  road_name varchar(150),
  block_or_zone varchar(100),
  landmark varchar(255),
  address_notes text,
  postal_code varchar(30),
  latitude numeric(9,6),
  longitude numeric(9,6),
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_customer_default_address
  on customer_addresses(customer_id) where is_default = true and is_active = true;

-- ---------- SERVICE CATALOG --------------------------------------------------

create table if not exists service_categories (
  category_id uuid primary key default gen_random_uuid(),
  category_code varchar(50) not null unique,
  canonical_name varchar(150) not null,
  description text,
  is_active boolean not null default true,
  urgent_supported boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists service_category_localizations (
  category_id uuid not null references service_categories(category_id) on delete cascade,
  language_code varchar(10) not null,
  display_name varchar(150) not null,
  description text,
  primary key(category_id, language_code)
);

create table if not exists services (
  service_id uuid primary key default gen_random_uuid(),
  category_id uuid not null references service_categories(category_id) on delete restrict,
  service_code varchar(50) not null unique,
  canonical_name varchar(150) not null,
  description text,
  is_active boolean not null default true,
  urgent_supported boolean not null default false,
  multi_location_supported boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists service_localizations (
  service_id uuid not null references services(service_id) on delete cascade,
  language_code varchar(10) not null,
  display_name varchar(150) not null,
  description text,
  primary key(service_id, language_code)
);

create table if not exists service_location_availability (
  service_id uuid not null references services(service_id) on delete cascade,
  service_area_location_id uuid not null references locations(location_id) on delete cascade,
  availability_status varchar(30) not null default 'AVAILABLE',
  available_from timestamptz,
  available_until timestamptz,
  primary key(service_id, service_area_location_id)
);

-- ---------- PROVIDERS --------------------------------------------------------

create table if not exists providers (
  provider_id uuid primary key default gen_random_uuid(),
  provider_type provider_type not null,
  display_name varchar(180) not null,
  status provider_status not null default 'PENDING_VERIFICATION',
  verification_status verification_status not null default 'NOT_STARTED',
  is_available boolean not null default true,
  average_rating numeric(3,2) not null default 0,
  review_count integer not null default 0,
  public_profile text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint providers_rating_chk check (average_rating between 0 and 5),
  constraint providers_review_count_chk check (review_count >= 0)
);

create table if not exists companies (
  company_id uuid primary key default gen_random_uuid(),
  provider_id uuid not null unique references providers(provider_id) on delete cascade,
  legal_name varchar(200) not null,
  registration_number varchar(100),
  primary_contact_name varchar(150),
  primary_contact_phone varchar(32),
  primary_contact_email varchar(254),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists freelancers (
  freelancer_id uuid primary key default gen_random_uuid(),
  provider_id uuid not null unique references providers(provider_id) on delete cascade,
  user_id uuid,
  service_area_location_id uuid not null references locations(location_id) on delete restrict,
  status provider_status not null default 'PENDING_VERIFICATION',
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists company_service_areas (
  company_id uuid not null references companies(company_id) on delete cascade,
  service_area_location_id uuid not null references locations(location_id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key(company_id, service_area_location_id)
);

create table if not exists provider_categories (
  provider_id uuid not null references providers(provider_id) on delete cascade,
  category_id uuid not null references service_categories(category_id) on delete cascade,
  status approval_status not null default 'PENDING',
  approved_at timestamptz,
  primary key(provider_id, category_id)
);

create table if not exists provider_services (
  provider_id uuid not null references providers(provider_id) on delete cascade,
  service_id uuid not null references services(service_id) on delete cascade,
  is_active boolean not null default true,
  approved_at timestamptz,
  primary key(provider_id, service_id)
);

create table if not exists company_personnel (
  personnel_id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(company_id) on delete cascade,
  user_id uuid,
  full_name varchar(150) not null,
  phone varchar(32),
  email varchar(254),
  personnel_role varchar(100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- BUSINESS / ORGANIZATION CUSTOMERS --------------------------------

create table if not exists customer_organizations (
  organization_id uuid primary key default gen_random_uuid(),
  organization_name varchar(200) not null,
  organization_type varchar(80),
  registration_number varchar(100),
  billing_name varchar(200),
  billing_email varchar(254),
  billing_phone varchar(32),
  billing_address_id uuid references customer_addresses(address_id) on delete set null,
  tax_reference varchar(100),
  status organization_status not null default 'ACTIVE',
  created_by_customer_id uuid not null references customers(customer_id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists organization_members (
  organization_member_id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references customer_organizations(organization_id) on delete cascade,
  customer_id uuid not null references customers(customer_id) on delete cascade,
  organization_role organization_role not null,
  permissions jsonb not null default '{}'::jsonb,
  invited_at timestamptz,
  joined_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(organization_id, customer_id)
);

create table if not exists organization_locations (
  organization_location_id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references customer_organizations(organization_id) on delete cascade,
  location_id uuid not null references locations(location_id) on delete restrict,
  address_id uuid references customer_addresses(address_id) on delete set null,
  location_label varchar(150) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists organization_invitations (
  invitation_id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references customer_organizations(organization_id) on delete cascade,
  invited_identifier varchar(254) not null,
  intended_role organization_role not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- MULTI-LOCATION GROUPS --------------------------------------------

create table if not exists multi_location_request_groups (
  multi_location_request_id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(customer_id) on delete cascade,
  organization_id uuid references customer_organizations(organization_id) on delete set null,
  group_name varchar(180),
  category_id uuid references service_categories(category_id) on delete restrict,
  service_id uuid references services(service_id) on delete restrict,
  group_status varchar(30) not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- SERVICE REQUESTS -------------------------------------------------

create table if not exists service_requests (
  service_request_id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(customer_id) on delete restrict,
  organization_id uuid references customer_organizations(organization_id) on delete restrict,
  requested_by_customer_id uuid references customers(customer_id) on delete restrict,
  multi_location_request_id uuid references multi_location_request_groups(multi_location_request_id) on delete set null,
  category_id uuid not null references service_categories(category_id) on delete restrict,
  service_id uuid not null references services(service_id) on delete restrict,
  service_location_id uuid not null references locations(location_id) on delete restrict,
  saved_address_id uuid references customer_addresses(address_id) on delete set null,
  problem_title varchar(200) not null,
  problem_description text not null,
  customer_notes text,
  access_instructions text,
  preferred_date date,
  preferred_time_from time,
  preferred_time_to time,
  priority request_priority not null default 'NORMAL',
  urgency_reason text,
  assigned_provider_id uuid references providers(provider_id) on delete set null,
  provider_selected_at timestamptz,
  location_share_status location_share_status not null default 'AREA_ONLY',
  status request_status not null default 'PENDING',
  submitted_at timestamptz not null default now(),
  inspection_scheduled_at timestamptz,
  provider_arrived_at timestamptz,
  inspection_started_at timestamptz,
  inspection_completed_at timestamptz,
  work_started_at timestamptz,
  work_completed_at timestamptz,
  customer_confirmed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by_customer_id uuid references customers(customer_id) on delete set null,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_request_time_window_chk check (
    preferred_time_from is null or preferred_time_to is null or preferred_time_from < preferred_time_to
  ),
  constraint service_request_work_status_chk check (
    status <> 'IN_PROGRESS' or work_started_at is not null
  ),
  constraint service_request_completed_chk check (
    status <> 'COMPLETED' or work_completed_at is not null
  ),
  constraint service_request_cancelled_chk check (
    status <> 'CANCELLED' or cancelled_at is not null
  )
);

create index if not exists idx_service_requests_customer_status on service_requests(customer_id, status, created_at desc);
create index if not exists idx_service_requests_org_status on service_requests(organization_id, status, created_at desc);
create index if not exists idx_service_requests_match on service_requests(service_location_id, service_id, priority, status);
create index if not exists idx_service_requests_provider_status on service_requests(assigned_provider_id, status);

create table if not exists service_request_address_snapshots (
  address_snapshot_id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null unique references service_requests(service_request_id) on delete cascade,
  source_address_id uuid references customer_addresses(address_id) on delete set null,
  location_id uuid not null references locations(location_id) on delete restrict,
  atoll_id uuid references locations(location_id) on delete restrict,
  city_id uuid references locations(location_id) on delete restrict,
  island_id uuid references locations(location_id) on delete restrict,
  ward_or_district_id uuid references locations(location_id) on delete restrict,
  house_name varchar(150),
  building_name varchar(150),
  floor varchar(50),
  unit_number varchar(50),
  street_name varchar(150),
  road_name varchar(150),
  block_or_zone varchar(100),
  landmark varchar(255),
  address_notes text,
  postal_code varchar(30),
  latitude numeric(9,6),
  longitude numeric(9,6),
  created_at timestamptz not null default now()
);

create table if not exists service_request_contacts (
  contact_id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references service_requests(service_request_id) on delete cascade,
  contact_source contact_source not null,
  customer_id uuid references customers(customer_id) on delete set null,
  saved_contact_id uuid references customer_saved_contacts(saved_contact_id) on delete set null,
  contact_name_snapshot varchar(150) not null,
  contact_phone_snapshot varchar(32) not null,
  contact_role varchar(100),
  contact_notes text,
  authority_level authority_level not null default 'CONTACT_ONLY',
  is_primary_contact boolean not null default false,
  contact_priority integer not null default 1,
  share_with_provider boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_service_request_primary_contact
  on service_request_contacts(service_request_id) where is_primary_contact = true and is_active = true;

create table if not exists service_request_attachments (
  attachment_id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references service_requests(service_request_id) on delete cascade,
  uploaded_by_customer_id uuid references customers(customer_id) on delete set null,
  attachment_type varchar(50) not null,
  storage_path text not null,
  original_filename text,
  mime_type varchar(150),
  size_bytes bigint,
  caption text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint attachment_size_chk check (size_bytes is null or size_bytes >= 0)
);

create table if not exists service_request_revisions (
  request_revision_id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references service_requests(service_request_id) on delete cascade,
  changed_by_customer_id uuid references customers(customer_id) on delete set null,
  changed_fields text[] not null,
  previous_values jsonb not null default '{}'::jsonb,
  new_values jsonb not null default '{}'::jsonb,
  changed_at timestamptz not null default now()
);

-- ---------- MATCHING / OFFERS / SELECTION -----------------------------------

create table if not exists matching_attempts (
  matching_attempt_id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references service_requests(service_request_id) on delete cascade,
  matching_status varchar(40) not null,
  eligible_provider_count integer not null default 0,
  responding_provider_count integer not null default 0,
  attempt_number integer not null default 1,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  next_retry_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  constraint matching_counts_chk check (eligible_provider_count >= 0 and responding_provider_count >= 0)
);

create table if not exists provider_job_offers (
  offer_id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references service_requests(service_request_id) on delete cascade,
  provider_id uuid not null references providers(provider_id) on delete cascade,
  offered_at timestamptz not null default now(),
  response_deadline_at timestamptz,
  responded_at timestamptz,
  response_status offer_response_status not null default 'PENDING',
  decline_reason text,
  expired_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(service_request_id, provider_id)
);

create index if not exists idx_provider_job_offers_provider_status
  on provider_job_offers(provider_id, response_status, offered_at desc);

create table if not exists request_clarifications (
  clarification_id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references service_requests(service_request_id) on delete cascade,
  offer_id uuid references provider_job_offers(offer_id) on delete set null,
  provider_id uuid not null references providers(provider_id) on delete cascade,
  question_text text not null,
  customer_response_text text,
  status clarification_status not null default 'OPEN',
  requested_at timestamptz not null default now(),
  responded_at timestamptz,
  closed_at timestamptz
);

create table if not exists provider_selection_history (
  selection_id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references service_requests(service_request_id) on delete cascade,
  selected_provider_id uuid not null references providers(provider_id) on delete restrict,
  selected_offer_id uuid references provider_job_offers(offer_id) on delete set null,
  selected_by_customer_id uuid not null references customers(customer_id) on delete restrict,
  selected_at timestamptz not null default now(),
  superseded_at timestamptz
);

-- ---------- INSPECTION / JOB EXECUTION ---------------------------------------

create table if not exists inspection_schedules (
  inspection_id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references service_requests(service_request_id) on delete cascade,
  provider_id uuid not null references providers(provider_id) on delete restrict,
  proposed_by_customer_id uuid references customers(customer_id) on delete set null,
  proposed_by_provider_id uuid references providers(provider_id) on delete set null,
  proposed_start_at timestamptz,
  proposed_end_at timestamptz,
  scheduled_start_at timestamptz,
  scheduled_end_at timestamptz,
  confirmed_by_customer_at timestamptz,
  confirmed_by_provider_at timestamptz,
  status inspection_status not null default 'PROPOSED',
  notes text,
  reschedule_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inspection_window_chk check (
    scheduled_start_at is null or scheduled_end_at is null or scheduled_start_at < scheduled_end_at
  )
);

create table if not exists inspection_schedule_history (
  inspection_history_id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references inspection_schedules(inspection_id) on delete cascade,
  previous_start_at timestamptz,
  previous_end_at timestamptz,
  new_start_at timestamptz,
  new_end_at timestamptz,
  changed_by_customer_id uuid references customers(customer_id) on delete set null,
  changed_by_provider_id uuid references providers(provider_id) on delete set null,
  reason text,
  changed_at timestamptz not null default now()
);

create table if not exists job_events (
  job_event_id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references service_requests(service_request_id) on delete cascade,
  provider_id uuid references providers(provider_id) on delete set null,
  personnel_id uuid references company_personnel(personnel_id) on delete set null,
  customer_id uuid references customers(customer_id) on delete set null,
  event_type varchar(80) not null,
  event_at timestamptz not null default now(),
  notes text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_job_events_request_time on job_events(service_request_id, event_at);

create table if not exists job_staff_assignments (
  job_staff_assignment_id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references service_requests(service_request_id) on delete cascade,
  personnel_id uuid not null references company_personnel(personnel_id) on delete cascade,
  assigned_by_provider_id uuid references providers(provider_id) on delete set null,
  assigned_at timestamptz not null default now(),
  unassigned_at timestamptz,
  is_supervisor boolean not null default false,
  unique(service_request_id, personnel_id, assigned_at)
);

create table if not exists job_scope_changes (
  scope_change_id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references service_requests(service_request_id) on delete cascade,
  provider_id uuid not null references providers(provider_id) on delete restrict,
  description text not null,
  reason text,
  evidence jsonb not null default '[]'::jsonb,
  proposed_additional_cost numeric(14,2),
  currency char(3) default 'MVR',
  status scope_change_status not null default 'PROPOSED',
  requested_at timestamptz not null default now(),
  customer_decision_at timestamptz,
  decided_by_customer_id uuid references customers(customer_id) on delete set null,
  decision_notes text,
  constraint scope_cost_chk check (proposed_additional_cost is null or proposed_additional_cost >= 0)
);

-- ---------- CANCELLATION / INCIDENTS / DISPUTES ------------------------------

create table if not exists cancellation_reviews (
  cancellation_review_id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references service_requests(service_request_id) on delete cascade,
  requested_by_customer_id uuid not null references customers(customer_id) on delete restrict,
  reason text not null,
  evidence jsonb not null default '[]'::jsonb,
  status cancellation_review_status not null default 'PENDING_REVIEW',
  provider_response text,
  admin_decision text,
  resolution_notes text,
  requested_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists provider_incidents (
  incident_id uuid primary key default gen_random_uuid(),
  service_request_id uuid references service_requests(service_request_id) on delete cascade,
  customer_id uuid references customers(customer_id) on delete set null,
  provider_id uuid references providers(provider_id) on delete set null,
  incident_type incident_type not null,
  severity varchar(20) not null default 'NORMAL',
  description text not null,
  status incident_status not null default 'OPEN',
  occurred_at timestamptz,
  reported_at timestamptz not null default now(),
  resolution text,
  resolved_at timestamptz
);

create table if not exists incident_attachments (
  incident_attachment_id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references provider_incidents(incident_id) on delete cascade,
  storage_path text not null,
  mime_type varchar(150),
  original_filename text,
  created_at timestamptz not null default now()
);

create table if not exists job_disputes (
  dispute_id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references service_requests(service_request_id) on delete cascade,
  customer_id uuid not null references customers(customer_id) on delete restrict,
  provider_id uuid references providers(provider_id) on delete set null,
  dispute_type varchar(60) not null,
  description text not null,
  status dispute_status not null default 'OPEN',
  provider_response text,
  resolution text,
  opened_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- ---------- REVIEWS ----------------------------------------------------------

create table if not exists provider_reviews (
  review_id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null unique references service_requests(service_request_id) on delete cascade,
  customer_id uuid not null references customers(customer_id) on delete restrict,
  provider_id uuid not null references providers(provider_id) on delete restrict,
  rating smallint not null,
  review_text text,
  status varchar(30) not null default 'PUBLISHED',
  is_verified_job boolean not null default true,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint review_rating_chk check (rating between 1 and 5)
);

create table if not exists provider_review_revisions (
  review_revision_id uuid primary key default gen_random_uuid(),
  review_id uuid not null references provider_reviews(review_id) on delete cascade,
  previous_rating smallint,
  previous_text text,
  new_rating smallint,
  new_text text,
  revised_at timestamptz not null default now()
);

create table if not exists saved_providers (
  saved_provider_id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(customer_id) on delete cascade,
  provider_id uuid not null references providers(provider_id) on delete cascade,
  note text,
  is_active boolean not null default true,
  saved_at timestamptz not null default now(),
  unique(customer_id, provider_id)
);

create table if not exists blocked_providers (
  blocked_provider_id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(customer_id) on delete cascade,
  provider_id uuid not null references providers(provider_id) on delete cascade,
  reason text,
  blocked_at timestamptz not null default now(),
  unblocked_at timestamptz
);

create unique index if not exists uq_active_blocked_provider
  on blocked_providers(customer_id, provider_id) where unblocked_at is null;

-- ---------- REBOOK -----------------------------------------------------------

create table if not exists service_request_rebooks (
  rebook_id uuid primary key default gen_random_uuid(),
  source_service_request_id uuid not null references service_requests(service_request_id) on delete restrict,
  new_service_request_id uuid not null unique references service_requests(service_request_id) on delete cascade,
  rebooked_by_customer_id uuid not null references customers(customer_id) on delete restrict,
  rebooked_at timestamptz not null default now()
);

-- ---------- NOTIFICATIONS ----------------------------------------------------

create table if not exists customer_notification_preferences (
  customer_id uuid primary key references customers(customer_id) on delete cascade,
  push_enabled boolean not null default true,
  sms_enabled boolean not null default true,
  viber_enabled boolean not null default false,
  preferred_channel notification_channel not null default 'IN_APP',
  fallback_channel notification_channel,
  quiet_hours_enabled boolean not null default false,
  quiet_hours_start time,
  quiet_hours_end time,
  notification_language varchar(10),
  marketing_opt_in boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists notifications (
  notification_id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(customer_id) on delete cascade,
  provider_id uuid references providers(provider_id) on delete cascade,
  service_request_id uuid references service_requests(service_request_id) on delete cascade,
  event_type varchar(100) not null,
  channel notification_channel not null,
  priority request_priority not null default 'NORMAL',
  language_code varchar(10) not null default 'en',
  subject text,
  body text not null,
  delivery_status notification_delivery_status not null default 'QUEUED',
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_customer_created on notifications(customer_id, created_at desc);

-- ---------- MESSAGING --------------------------------------------------------

create table if not exists conversations (
  conversation_id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references service_requests(service_request_id) on delete cascade,
  customer_id uuid not null references customers(customer_id) on delete restrict,
  provider_id uuid not null references providers(provider_id) on delete restrict,
  status varchar(20) not null default 'OPEN',
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  unique(service_request_id, customer_id, provider_id)
);

create table if not exists messages (
  message_id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(conversation_id) on delete cascade,
  sender_customer_id uuid references customers(customer_id) on delete set null,
  sender_provider_id uuid references providers(provider_id) on delete set null,
  sender_role varchar(20) not null,
  message_text text,
  message_status varchar(20) not null default 'SENT',
  sent_at timestamptz not null default now(),
  delivered_at timestamptz,
  read_at timestamptz,
  is_reported boolean not null default false,
  reported_at timestamptz,
  constraint message_sender_chk check (
    (sender_customer_id is not null and sender_provider_id is null)
    or (sender_customer_id is null and sender_provider_id is not null)
  )
);

create table if not exists message_attachments (
  message_attachment_id uuid primary key default gen_random_uuid(),
  message_id uuid not null references messages(message_id) on delete cascade,
  storage_path text not null,
  mime_type varchar(150),
  original_filename text,
  created_at timestamptz not null default now()
);

-- ---------- SUPPORT ----------------------------------------------------------

create table if not exists support_cases (
  support_case_id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(customer_id) on delete restrict,
  service_request_id uuid references service_requests(service_request_id) on delete set null,
  category varchar(80) not null,
  subject varchar(200) not null,
  description text not null,
  priority varchar(20) not null default 'NORMAL',
  status support_case_status not null default 'OPEN',
  assigned_team varchar(100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists support_case_messages (
  support_message_id uuid primary key default gen_random_uuid(),
  support_case_id uuid not null references support_cases(support_case_id) on delete cascade,
  customer_id uuid references customers(customer_id) on delete set null,
  staff_user_id uuid,
  message_text text not null,
  is_internal boolean not null default false,
  created_at timestamptz not null default now(),
  constraint support_sender_chk check (
    (customer_id is not null and staff_user_id is null)
    or (customer_id is null and staff_user_id is not null)
  )
);

-- ---------- OPTIONAL OFF-PLATFORM COST / PAYMENT RECORD ----------------------

create table if not exists service_costs (
  cost_id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references service_requests(service_request_id) on delete cascade,
  provider_id uuid not null references providers(provider_id) on delete restrict,
  labour_amount numeric(14,2) not null default 0,
  materials_amount numeric(14,2) not null default 0,
  transport_amount numeric(14,2) not null default 0,
  other_amount numeric(14,2) not null default 0,
  discount_amount numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null,
  currency char(3) not null default 'MVR',
  cost_notes text,
  revision_number integer not null default 1,
  revision_reason text,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  constraint cost_amounts_chk check (
    labour_amount >= 0 and materials_amount >= 0 and transport_amount >= 0 and other_amount >= 0
    and discount_amount >= 0 and tax_amount >= 0 and total_amount >= 0
  ),
  unique(service_request_id, revision_number)
);

create unique index if not exists uq_current_service_cost
  on service_costs(service_request_id) where is_current = true;

create table if not exists direct_payment_records (
  payment_record_id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references service_requests(service_request_id) on delete cascade,
  cost_id uuid references service_costs(cost_id) on delete set null,
  customer_id uuid not null references customers(customer_id) on delete restrict,
  provider_id uuid not null references providers(provider_id) on delete restrict,
  payment_method direct_payment_method,
  amount numeric(14,2),
  currency char(3) not null default 'MVR',
  customer_payment_declared_at timestamptz,
  customer_reference varchar(255),
  customer_proof_attachment_path text,
  provider_payment_confirmed_at timestamptz,
  provider_amount_received numeric(14,2),
  provider_receipt_reference varchar(255),
  payment_record_status direct_payment_record_status not null default 'NOT_RECORDED',
  dispute_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint direct_payment_amount_chk check (
    (amount is null or amount >= 0) and (provider_amount_received is null or provider_amount_received >= 0)
  )
);

comment on table direct_payment_records is
'OPTIONAL informational record only. FixIt does NOT collect, hold, route, settle or refund customer-to-provider payments.';

-- ---------- DOCUMENTS --------------------------------------------------------

create table if not exists request_documents (
  document_id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references service_requests(service_request_id) on delete cascade,
  provider_id uuid references providers(provider_id) on delete set null,
  document_type varchar(60) not null,
  version integer not null default 1,
  storage_path text not null,
  original_filename text,
  mime_type varchar(150),
  customer_visible boolean not null default true,
  issued_at timestamptz,
  created_at timestamptz not null default now(),
  unique(service_request_id, document_type, version)
);

-- ---------- WARRANTY / REWORK ------------------------------------------------

create table if not exists warranty_cases (
  warranty_case_id uuid primary key default gen_random_uuid(),
  original_service_request_id uuid not null references service_requests(service_request_id) on delete restrict,
  customer_id uuid not null references customers(customer_id) on delete restrict,
  provider_id uuid not null references providers(provider_id) on delete restrict,
  issue_type varchar(80) not null,
  description text not null,
  status warranty_status not null default 'OPEN',
  eligibility_reason text,
  reported_at timestamptz not null default now(),
  scheduled_at timestamptz,
  resolved_at timestamptz,
  resolution text
);

create table if not exists warranty_rework_requests (
  rework_request_id uuid primary key default gen_random_uuid(),
  warranty_case_id uuid not null references warranty_cases(warranty_case_id) on delete cascade,
  service_request_id uuid references service_requests(service_request_id) on delete set null,
  scheduled_at timestamptz,
  status varchar(40) not null default 'PENDING',
  completed_at timestamptz,
  resolution_notes text,
  created_at timestamptz not null default now()
);

-- ---------- PRIVACY ----------------------------------------------------------

create table if not exists privacy_requests (
  privacy_request_id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(customer_id) on delete cascade,
  request_type privacy_request_type not null,
  status privacy_request_status not null default 'PENDING',
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  data_export_path text,
  retention_reason text,
  resolution_notes text
);

-- ---------- DELEGATED JOB ACCESS ---------------------------------------------

create table if not exists job_delegations (
  delegation_id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references service_requests(service_request_id) on delete cascade,
  customer_id uuid not null references customers(customer_id) on delete restrict,
  contact_id uuid references service_request_contacts(contact_id) on delete set null,
  delegated_customer_id uuid references customers(customer_id) on delete set null,
  authority_level authority_level not null,
  permissions jsonb not null default '{}'::jsonb,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  granted_by_customer_id uuid not null references customers(customer_id) on delete restrict
);

-- ---------- CUSTOMER AVAILABILITY --------------------------------------------

create table if not exists customer_availability_preferences (
  availability_preference_id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(customer_id) on delete cascade,
  service_request_id uuid references service_requests(service_request_id) on delete cascade,
  day_of_week smallint,
  available_from time,
  available_to time,
  unavailable_from timestamptz,
  unavailable_to timestamptz,
  same_day_allowed boolean,
  timezone varchar(64) not null default 'Indian/Maldives',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint day_of_week_chk check (day_of_week is null or day_of_week between 0 and 6),
  constraint availability_time_chk check (
    available_from is null or available_to is null or available_from < available_to
  )
);

-- ---------- OPTIONAL CUSTOMER IDENTITY VERIFICATION / KYC --------------------

create table if not exists customer_identity_verifications (
  identity_verification_id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(customer_id) on delete cascade,
  verification_type varchar(60) not null,
  verification_level varchar(40) not null default 'OPTIONAL',
  status verification_status not null default 'NOT_STARTED',
  provider_name varchar(100),
  document_type varchar(80),
  document_reference text,
  document_expiry_date date,
  verification_score numeric(8,4),
  verification_started_at timestamptz,
  verified_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  expires_at timestamptz,
  reverification_required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table customer_identity_verifications is
'Optional by default. Normal customer registration and ordinary household-service requests do not require KYC unless a separately approved rule requires it.';

-- ---------- ORGANIZATION APPROVALS -------------------------------------------

create table if not exists organization_approvals (
  organization_approval_id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references customer_organizations(organization_id) on delete cascade,
  service_request_id uuid not null references service_requests(service_request_id) on delete cascade,
  approval_type organization_approval_type not null,
  decision organization_approval_decision not null default 'PENDING',
  requested_by_customer_id uuid not null references customers(customer_id) on delete restrict,
  decided_by_customer_id uuid references customers(customer_id) on delete set null,
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  notes text
);

-- ---------- MULTI-LOCATION CHILD LINK ----------------------------------------

create table if not exists multi_location_request_items (
  multi_location_request_item_id uuid primary key default gen_random_uuid(),
  multi_location_request_id uuid not null references multi_location_request_groups(multi_location_request_id) on delete cascade,
  service_request_id uuid not null unique references service_requests(service_request_id) on delete cascade,
  sequence_no integer not null default 1,
  created_at timestamptz not null default now(),
  unique(multi_location_request_id, sequence_no)
);

-- ---------- OPTIONAL URGENT METRICS ------------------------------------------

create table if not exists urgent_broadcasts (
  urgent_broadcast_id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references service_requests(service_request_id) on delete cascade,
  broadcast_started_at timestamptz not null default now(),
  eligible_provider_count integer not null default 0,
  providers_notified_count integer not null default 0,
  responding_provider_count integer not null default 0,
  first_response_at timestamptz,
  provider_selected_at timestamptz,
  inspection_scheduled_at timestamptz,
  provider_arrived_at timestamptz,
  work_started_at timestamptz,
  constraint urgent_metric_counts_chk check (
    eligible_provider_count >= 0 and providers_notified_count >= 0 and responding_provider_count >= 0
  )
);

-- ---------- UPDATED_AT TRIGGER ------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'customers','locations','customer_addresses','service_categories','services',
    'providers','companies','freelancers','company_personnel',
    'customer_organizations','organization_locations','multi_location_request_groups',
    'service_requests','service_request_contacts','provider_job_offers',
    'inspection_schedules','provider_reviews','support_cases','direct_payment_records',
    'customer_availability_preferences','customer_identity_verifications'
  ]
  loop
    execute format('drop trigger if exists trg_%I_updated_at on %I', t, t);
    execute format(
      'create trigger trg_%I_updated_at before update on %I for each row execute function set_updated_at()',
      t, t
    );
  end loop;
end $$;

-- ---------- IMPORTANT IMPLEMENTATION NOTES -----------------------------------
-- 1) RLS policies and authorization matrix are intentionally deferred for later design.
-- 2) Enforce request status transitions through service-layer transaction + DB guard/trigger.
-- 3) Enforce at least one active request contact at submission time.
-- 4) Enforce provider matching:
--      ACTIVE + exact service area + exact service + approved category + availability.
--    Freelancer: exactly one service area.
--    Company: zero or many service areas; zero means hidden from matching.
-- 5) Provider ACCEPT means willing/available, NOT assignment.
-- 6) Customer selection must be atomic and close other active offers.
-- 7) Exact address/GPS must remain hidden until sharing policy permits.
-- 8) UC-C29 is optional; no FixIt payment processing occurs.
-- 9) KYC is optional by default.
-- 10) Localized display text belongs in localization tables; canonical IDs/statuses remain language-neutral.
