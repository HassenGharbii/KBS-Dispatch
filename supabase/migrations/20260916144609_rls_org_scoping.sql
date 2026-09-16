-- Reworks every existing RLS policy that used bare is_dirigeant() to mean
-- "can see/manage everything" so it's scoped to the caller's own
-- organization instead -- otherwise one company's dirigeant could see or
-- modify another company's agents/sites/shifts/missions.

-- Generic helpers, reused by every table below instead of repeating
-- exists-subqueries: "is org_admin/dirigeant of the organization identified
-- by target_org" (sites, which carry organization_id directly, pass their
-- own column; shifts/events/photos/missions, which don't, pass the org
-- looked up via a join to the row's agent).
create or replace function public.is_org_admin_of(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_org_admin() and public.my_organization_id() = target_org;
$$;

create or replace function public.is_dirigeant_of(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_dirigeant() and public.my_organization_id() = target_org;
$$;

-- ===== profiles =====
drop policy "profiles_select_own_or_dirigeant" on public.profiles;
create policy "profiles_select_own_or_org_admin"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or public.is_super_admin()
    or public.is_org_admin_of(organization_id)
  );

-- ===== sites =====
drop policy "sites_select_authenticated" on public.sites;
create policy "sites_select_same_org"
  on public.sites for select
  to authenticated
  using (organization_id = public.my_organization_id() or public.is_super_admin());

drop policy "sites_insert_dirigeant" on public.sites;
create policy "sites_insert_org_admin"
  on public.sites for insert
  to authenticated
  with check (public.is_org_admin_of(organization_id));

drop policy "sites_update_dirigeant" on public.sites;
create policy "sites_update_org_admin"
  on public.sites for update
  to authenticated
  using (public.is_org_admin_of(organization_id))
  with check (public.is_org_admin_of(organization_id));

drop policy "sites_delete_dirigeant" on public.sites;
create policy "sites_delete_org_admin"
  on public.sites for delete
  to authenticated
  using (public.is_org_admin_of(organization_id));

-- ===== shifts =====
drop policy "shifts_select_own_or_dirigeant" on public.shifts;
create policy "shifts_select_own_or_org_admin"
  on public.shifts for select
  to authenticated
  using (
    agent_id = auth.uid()
    or public.is_super_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = shifts.agent_id and public.is_org_admin_of(p.organization_id)
    )
  );

-- Closed-shift correction stays dirigeant-only (not sub_admin) -- same
-- owner-only trust level the plan calls out for org settings.
drop policy "shifts_update_dirigeant" on public.shifts;
create policy "shifts_update_dirigeant"
  on public.shifts for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = shifts.agent_id and public.is_dirigeant_of(p.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = shifts.agent_id and public.is_dirigeant_of(p.organization_id)
    )
  );

create or replace function public.prevent_closed_shift_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'closed' and new is distinct from old and not exists (
    select 1 from public.profiles p
    where p.id = old.agent_id and public.is_dirigeant_of(p.organization_id)
  ) then
    raise exception 'Shift % is closed and cannot be modified', old.id;
  end if;
  return new;
end;
$$;

-- ===== events =====
drop policy "events_select_own_or_dirigeant" on public.events;
create policy "events_select_own_or_org_admin"
  on public.events for select
  to authenticated
  using (
    agent_id = auth.uid()
    or public.is_super_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = events.agent_id and public.is_org_admin_of(p.organization_id)
    )
  );

-- ===== photos =====
drop policy "photos_select_own_or_dirigeant" on public.photos;
create policy "photos_select_own_or_org_admin"
  on public.photos for select
  to authenticated
  using (
    agent_id = auth.uid()
    or public.is_super_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = photos.agent_id and public.is_org_admin_of(p.organization_id)
    )
  );

-- ===== storage (shift-photos bucket) =====
drop policy "shift_photos_select_own_or_dirigeant" on storage.objects;
create policy "shift_photos_select_own_or_org_admin"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'shift-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_super_admin()
      or exists (
        select 1 from public.profiles p
        where p.id::text = (storage.foldername(name))[1]
          and public.is_org_admin_of(p.organization_id)
      )
    )
  );

-- ===== missions =====
drop policy "missions_select_own_or_dirigeant" on public.missions;
create policy "missions_select_own_or_org_admin"
  on public.missions for select
  to authenticated
  using (
    agent_id = auth.uid()
    or public.is_super_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = missions.agent_id and public.is_org_admin_of(p.organization_id)
    )
  );

-- Sub-admins plan missions too (per the sub_admin scope), so creation moves
-- from dirigeant-only to org_admin, scoped to the target agent's org.
drop policy "missions_insert_dirigeant" on public.missions;
create policy "missions_insert_org_admin"
  on public.missions for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = missions.agent_id and public.is_org_admin_of(p.organization_id)
    )
  );

drop policy "missions_update_dirigeant" on public.missions;
create policy "missions_update_org_admin"
  on public.missions for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = missions.agent_id and public.is_org_admin_of(p.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = missions.agent_id and public.is_org_admin_of(p.organization_id)
    )
  );

-- ===== account provisioning =====
-- Whoever creates the auth.users row (now the web console's server routes,
-- previously curl/Studio) must also set organization_id in
-- raw_user_meta_data for every role except super_admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, role, professional_card_number, organization_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone',
    coalesce(new.raw_user_meta_data->>'role', 'agent'),
    new.raw_user_meta_data->>'professional_card_number',
    nullif(new.raw_user_meta_data->>'organization_id', '')::uuid
  );
  return new;
end;
$$;
