-- Replace the shared demo-organization policies with authenticated,
-- organization-scoped access. User workspaces are provisioned at signup.

alter table public.organizations
  add column if not exists notification_email text;

create or replace function public.current_user_organization_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.organization_id
  from public.profiles p
  where p.id = (select auth.uid())
  limit 1
$$;

revoke all on function public.current_user_organization_id() from public, anon;
grant execute on function public.current_user_organization_id() to authenticated;

create or replace function public.provision_user_workspace(
  p_user_id uuid,
  p_email text,
  p_metadata jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  workspace_id uuid;
  workspace_name text;
  member_name text;
begin
  if p_metadata is null then
    p_metadata := '{}'::jsonb;
  end if;

  if exists (select 1 from public.profiles where id = p_user_id) then
    return;
  end if;

  workspace_name := coalesce(
    nullif(trim(p_metadata ->> 'organization_name'), ''),
    coalesce(nullif(split_part(coalesce(p_email, ''), '@', 1), ''), 'ConfirmRoute') || ' workspace'
  );
  member_name := coalesce(
    nullif(trim(p_metadata ->> 'full_name'), ''),
    'Workspace admin'
  );

  insert into public.organizations (name, notification_email)
  values (workspace_name, p_email)
  returning id into workspace_id;

  insert into public.profiles (id, organization_id, full_name, role)
  values (p_user_id, workspace_id, member_name, 'admin');
end
$$;

revoke all on function public.provision_user_workspace(uuid, text, jsonb)
  from public, anon, authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email_confirmed_at is null then
    return new;
  end if;

  perform public.provision_user_workspace(
    new.id,
    new.email,
    new.raw_user_meta_data
  );
  return new;
end
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.handle_new_auth_user();

-- Provision users that existed before this migration.
do $$
declare
  auth_user record;
begin
  for auth_user in
    select u.id, u.email, u.raw_user_meta_data
    from auth.users u
    where u.email_confirmed_at is not null
      and not exists (
      select 1 from public.profiles p where p.id = u.id
    )
  loop
    perform public.provision_user_workspace(
      auth_user.id,
      auth_user.email,
      auth_user.raw_user_meta_data
    );
  end loop;
end
$$;

-- Composite foreign keys ensure a row cannot connect records across tenants,
-- even if a client bypasses the application's data-access code.
alter table public.customers
  add constraint customers_organization_id_id_key unique (organization_id, id);
alter table public.suppliers
  add constraint suppliers_organization_id_id_key unique (organization_id, id);
alter table public.bookings
  add constraint bookings_organization_id_id_key unique (organization_id, id);

alter table public.bookings
  drop constraint if exists bookings_customer_id_fkey,
  drop constraint if exists bookings_supplier_id_fkey;
alter table public.bookings
  add constraint bookings_customer_same_organization_fkey
    foreign key (organization_id, customer_id)
    references public.customers (organization_id, id),
  add constraint bookings_supplier_same_organization_fkey
    foreign key (organization_id, supplier_id)
    references public.suppliers (organization_id, id);

alter table public.booking_documents
  drop constraint if exists booking_documents_booking_id_fkey;
alter table public.booking_documents
  add constraint booking_documents_same_organization_fkey
    foreign key (organization_id, booking_id)
    references public.bookings (organization_id, id)
    on delete cascade;

alter table public.booking_exceptions
  drop constraint if exists booking_exceptions_booking_id_fkey;
alter table public.booking_exceptions
  add constraint booking_exceptions_same_organization_fkey
    foreign key (organization_id, booking_id)
    references public.bookings (organization_id, id)
    on delete cascade;

-- Remove every policy that granted access to the fixed demo organization.
drop policy if exists demo_read_organizations on public.organizations;
drop policy if exists demo_read_profiles on public.profiles;
drop policy if exists demo_select_customers on public.customers;
drop policy if exists demo_insert_customers on public.customers;
drop policy if exists demo_update_customers on public.customers;
drop policy if exists demo_select_suppliers on public.suppliers;
drop policy if exists demo_insert_suppliers on public.suppliers;
drop policy if exists demo_update_suppliers on public.suppliers;
drop policy if exists demo_select_bookings on public.bookings;
drop policy if exists demo_insert_bookings on public.bookings;
drop policy if exists demo_update_bookings on public.bookings;
drop policy if exists demo_select_booking_documents on public.booking_documents;
drop policy if exists demo_insert_booking_documents on public.booking_documents;
drop policy if exists demo_update_booking_documents on public.booking_documents;
drop policy if exists demo_select_booking_exceptions on public.booking_exceptions;
drop policy if exists demo_insert_booking_exceptions on public.booking_exceptions;
drop policy if exists demo_update_booking_exceptions on public.booking_exceptions;
drop policy if exists demo_select_booking_changes on public.booking_changes;
drop policy if exists demo_insert_booking_changes on public.booking_changes;

drop policy if exists organization_member_read on public.organizations;
create policy organization_member_read on public.organizations
  for select to authenticated
  using (id = (select public.current_user_organization_id()));

create or replace function public.current_user_is_workspace_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.organization_id = (select public.current_user_organization_id())
      and p.role = 'admin'
  )
$$;

revoke all on function public.current_user_is_workspace_admin() from public, anon;
grant execute on function public.current_user_is_workspace_admin() to authenticated;

drop policy if exists organization_admin_update on public.organizations;
create policy organization_admin_update on public.organizations
  for update to authenticated
  using (
    id = (select public.current_user_organization_id())
    and (select public.current_user_is_workspace_admin())
  )
  with check (id = (select public.current_user_organization_id()));

drop policy if exists organization_member_read_profiles on public.profiles;
create policy organization_member_read_profiles on public.profiles
  for select to authenticated
  using (organization_id = (select public.current_user_organization_id()));

drop policy if exists organization_member_manage_customers on public.customers;
create policy organization_member_manage_customers on public.customers
  for all to authenticated
  using (organization_id = (select public.current_user_organization_id()))
  with check (organization_id = (select public.current_user_organization_id()));

drop policy if exists organization_member_manage_suppliers on public.suppliers;
create policy organization_member_manage_suppliers on public.suppliers
  for all to authenticated
  using (organization_id = (select public.current_user_organization_id()))
  with check (organization_id = (select public.current_user_organization_id()));

drop policy if exists organization_member_manage_bookings on public.bookings;
create policy organization_member_manage_bookings on public.bookings
  for all to authenticated
  using (organization_id = (select public.current_user_organization_id()))
  with check (organization_id = (select public.current_user_organization_id()));

drop policy if exists organization_member_manage_booking_documents on public.booking_documents;
create policy organization_member_manage_booking_documents on public.booking_documents
  for all to authenticated
  using (organization_id = (select public.current_user_organization_id()))
  with check (organization_id = (select public.current_user_organization_id()));

drop policy if exists organization_member_manage_booking_exceptions on public.booking_exceptions;
create policy organization_member_manage_booking_exceptions on public.booking_exceptions
  for all to authenticated
  using (organization_id = (select public.current_user_organization_id()))
  with check (organization_id = (select public.current_user_organization_id()));

drop policy if exists organization_member_read_booking_changes on public.booking_changes;
create policy organization_member_read_booking_changes on public.booking_changes
  for select to authenticated
  using (exists (
    select 1
    from public.bookings b
    where b.id = booking_changes.booking_id
      and b.organization_id = (select public.current_user_organization_id())
  ));

drop policy if exists organization_member_create_booking_changes on public.booking_changes;
create policy organization_member_create_booking_changes on public.booking_changes
  for insert to authenticated
  with check (exists (
    select 1
    from public.bookings b
    where b.id = booking_changes.booking_id
      and b.organization_id = (select public.current_user_organization_id())
  ));

-- Supabase Storage is private and the object path must begin with the
-- authenticated organization and a booking owned by that organization.
drop policy if exists demo_read_documents_bucket on storage.objects;
drop policy if exists demo_write_documents_bucket on storage.objects;

drop policy if exists organization_member_read_booking_files on storage.objects;
create policy organization_member_read_booking_files on storage.objects
  for select to authenticated
  using (
    bucket_id = 'booking-documents'
    and (storage.foldername(name))[1] = (select public.current_user_organization_id())::text
    and exists (
      select 1 from public.bookings b
      where b.id::text = (storage.foldername(name))[2]
        and b.organization_id = (select public.current_user_organization_id())
    )
  );

drop policy if exists organization_member_upload_booking_files on storage.objects;
create policy organization_member_upload_booking_files on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'booking-documents'
    and (storage.foldername(name))[1] = (select public.current_user_organization_id())::text
    and exists (
      select 1 from public.bookings b
      where b.id::text = (storage.foldername(name))[2]
        and b.organization_id = (select public.current_user_organization_id())
    )
  );

drop policy if exists organization_member_delete_booking_files on storage.objects;
create policy organization_member_delete_booking_files on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'booking-documents'
    and (storage.foldername(name))[1] = (select public.current_user_organization_id())::text
    and exists (
      select 1 from public.bookings b
      where b.id::text = (storage.foldername(name))[2]
        and b.organization_id = (select public.current_user_organization_id())
    )
  );
