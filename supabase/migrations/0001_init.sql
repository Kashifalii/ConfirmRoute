-- ConfirmRoute — initial schema
-- Tables, indexes, Row Level Security, and the private storage bucket.

create extension if not exists "pgcrypto";

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid not null references organizations (id) on delete cascade,
  full_name text not null,
  role text not null default 'employee' check (role in ('employee', 'admin')),
  created_at timestamptz not null default now()
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  email text,
  phone text,
  created_at timestamptz not null default now()
);
create index customers_organization_idx on customers (organization_id);

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  service_type text not null check (service_type in ('hotel', 'flight', 'tour', 'transfer')),
  created_at timestamptz not null default now()
);
create index suppliers_organization_idx on suppliers (organization_id);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  reference text not null,
  normalized_reference text not null,
  customer_id uuid not null references customers (id),
  supplier_id uuid not null references suppliers (id),
  service_type text not null check (service_type in ('hotel', 'flight', 'tour', 'transfer')),
  start_date date not null,
  end_date date,
  amount numeric(12, 2) check (amount is null or amount > 0),
  currency text check (currency in ('PKR', 'USD', 'AED', 'EUR', 'GBP')),
  status text not null default 'pending_review'
    check (status in ('pending_review', 'approved', 'archived')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index bookings_org_reference_idx on bookings (organization_id, normalized_reference);
create index bookings_org_status_idx on bookings (organization_id, status);

create table booking_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  booking_id uuid not null references bookings (id) on delete cascade,
  filename text not null,
  mime_type text not null,
  size_bytes integer not null check (size_bytes >= 0),
  storage_path text,
  source_scenario text,
  created_at timestamptz not null default now()
);
create index booking_documents_booking_idx on booking_documents (booking_id);

create table booking_exceptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  booking_id uuid not null references bookings (id) on delete cascade,
  type text not null check (type in ('missing_field', 'duplicate_reference', 'value_change', 'invalid_value')),
  field text,
  description text not null,
  previous_value text,
  new_value text,
  status text not null default 'open' check (status in ('open', 'resolved')),
  resolution_note text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index booking_exceptions_booking_status_idx on booking_exceptions (booking_id, status);

create table booking_changes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings (id) on delete cascade,
  actor text not null,
  field text not null,
  previous_value text,
  new_value text,
  reason text,
  created_at timestamptz not null default now()
);
create index booking_changes_booking_idx on booking_changes (booking_id);
create index booking_changes_created_idx on booking_changes (created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- These are initial demo-only policies so the original schema remains usable.
-- Apply 0002_auth_multitenancy.sql immediately afterward; it removes these
-- policies and installs authenticated organization-scoped access. Never expose
-- a project that has only this initial migration applied.
-- ---------------------------------------------------------------------------

alter table organizations enable row level security;
alter table profiles enable row level security;
alter table customers enable row level security;
alter table suppliers enable row level security;
alter table bookings enable row level security;
alter table booking_documents enable row level security;
alter table booking_exceptions enable row level security;
alter table booking_changes enable row level security;

-- Demo organization id (matches DEMO_ORGANIZATION_ID in the application).
do $$
declare
  demo_org uuid := 'a1b2c3d4-0000-4000-8000-000000000001';
begin
  insert into organizations (id, name, created_at)
  values (demo_org, 'K2 Horizon Travels', '2026-09-15T08:00:00Z')
  on conflict (id) do nothing;
end $$;

create policy demo_read_organizations on organizations
  for select to anon, authenticated
  using (id = 'a1b2c3d4-0000-4000-8000-000000000001');

create policy demo_read_profiles on profiles
  for select to anon, authenticated
  using (organization_id = 'a1b2c3d4-0000-4000-8000-000000000001');

do $$
declare
  t text;
begin
  foreach t in array array['customers', 'suppliers', 'bookings', 'booking_documents', 'booking_exceptions']
  loop
    execute format(
      'create policy demo_select_%1$s on %1$s for select to anon, authenticated using (organization_id = ''a1b2c3d4-0000-4000-8000-000000000001'')',
      t
    );
    execute format(
      'create policy demo_insert_%1$s on %1$s for insert to anon, authenticated with check (organization_id = ''a1b2c3d4-0000-4000-8000-000000000001'')',
      t
    );
    execute format(
      'create policy demo_update_%1$s on %1$s for update to anon, authenticated using (organization_id = ''a1b2c3d4-0000-4000-8000-000000000001'')',
      t
    );
  end loop;

  -- booking_changes carries no organization_id; it is scoped through its booking.
  create policy demo_select_booking_changes on booking_changes
    for select to anon, authenticated
    using (exists (
      select 1 from bookings b
      where b.id = booking_changes.booking_id
        and b.organization_id = 'a1b2c3d4-0000-4000-8000-000000000001'
    ));
  create policy demo_insert_booking_changes on booking_changes
    for insert to anon, authenticated
    with check (exists (
      select 1 from bookings b
      where b.id = booking_changes.booking_id
        and b.organization_id = 'a1b2c3d4-0000-4000-8000-000000000001'
    ));
end $$;

-- ---------------------------------------------------------------------------
-- Private storage bucket for booking documents. Migration 0002 replaces the
-- initial demo policies with organization- and booking-scoped access.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('booking-documents', 'booking-documents', false)
on conflict (id) do nothing;

create policy demo_read_documents_bucket on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'booking-documents');
create policy demo_write_documents_bucket on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'booking-documents');
