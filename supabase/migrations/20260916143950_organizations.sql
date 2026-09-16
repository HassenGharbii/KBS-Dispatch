-- Multi-tenant pivot: every security company is an "organization"; agents,
-- dirigeants and sub-admins all belong to exactly one, and must never see
-- another organization's data. super_admin is the only role with no
-- organization (it manages organizations themselves, not data within one).

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.organizations enable row level security;

alter table public.profiles
  add column organization_id uuid references public.organizations(id);

alter table public.sites
  add column organization_id uuid references public.organizations(id);

alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('agent', 'dirigeant', 'sub_admin', 'super_admin'));

-- One-time backfill: all data created before multi-tenancy existed belongs
-- to the original KBS Assistance organization.
insert into public.organizations (name) values ('KBS Assistance');

do $$
declare
  kbs_org_id uuid;
begin
  select id into kbs_org_id from public.organizations where name = 'KBS Assistance' limit 1;
  update public.profiles set organization_id = kbs_org_id where organization_id is null and role <> 'super_admin';
  update public.sites set organization_id = kbs_org_id where organization_id is null;
end $$;

alter table public.sites alter column organization_id set not null;

-- Same security-definer + fixed-search-path pattern as is_dirigeant() in
-- 20260915114849_extensions_and_helpers.sql, extended for organization scope.
create or replace function public.my_organization_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return (select organization_id from public.profiles where id = auth.uid());
end;
$$;

create or replace function public.is_super_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin');
end;
$$;

-- Replaces bare is_dirigeant() for "can plan/manage this organization's
-- data" checks (sites, missions, agents). is_dirigeant() itself is kept
-- as-is for the few actions still exclusive to the owner role (creating
-- sub-admins, closed-shift corrections).
create or replace function public.is_org_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('dirigeant', 'sub_admin')
  );
end;
$$;

create policy "organizations_select_admins"
  on public.organizations for select
  to authenticated
  using (public.is_super_admin() or id = public.my_organization_id());
