-- Broadcast missions: a mission can now be diffused to every agent in the
-- org instead of assigned to one named agent. missions.agent_id becomes
-- nullable (unclaimed broadcast) and gains organization_id directly (the
-- old join-through-agent_id trick breaks the moment agent_id can be null).
-- Also adds the 4h-before-start cancel window for agents (dirigeant/sub_admin
-- cancellations stay unrestricted).

alter table public.missions
  add column organization_id uuid references public.organizations(id),
  add column is_broadcast boolean not null default false;

-- Backfill from the agent every existing row already has, before dropping
-- the not-null constraint on agent_id.
update public.missions m
  set organization_id = p.organization_id
  from public.profiles p
  where p.id = m.agent_id;

alter table public.missions alter column organization_id set not null;
alter table public.missions alter column agent_id drop not null;

-- A non-broadcast mission always needs a named agent; a broadcast mission
-- may be unclaimed (agent_id null) or claimed (agent_id set, is_broadcast
-- stays true for history/UI purposes).
alter table public.missions add constraint missions_agent_or_broadcast_check
  check (agent_id is not null or is_broadcast);

create index idx_missions_org_scheduled on public.missions(organization_id, scheduled_start);
create index idx_missions_open_broadcast on public.missions(organization_id)
  where is_broadcast and agent_id is null;

-- Never trust client-supplied organization_id -- always derive it from the
-- creator's own profile, at insert time.
create or replace function public.set_mission_organization_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select organization_id into new.organization_id
    from public.profiles where id = new.created_by;
  if new.organization_id is null then
    raise exception 'Impossible de déterminer l''organisation de la mission';
  end if;
  return new;
end;
$$;

create trigger trg_set_mission_organization_id
  before insert on public.missions
  for each row execute function public.set_mission_organization_id();

-- Rework select/insert/update to use the new direct organization_id column
-- instead of the join-through-agent_id shape (simpler, and required now
-- that agent_id can be null for an unclaimed broadcast).
drop policy "missions_select_own_or_org_admin" on public.missions;
create policy "missions_select_own_or_org_admin"
  on public.missions for select
  to authenticated
  using (
    agent_id = auth.uid()
    or public.is_super_admin()
    or public.is_org_admin_of(organization_id)
    or (is_broadcast and agent_id is null and organization_id = public.my_organization_id())
  );

drop policy "missions_insert_org_admin" on public.missions;
create policy "missions_insert_org_admin"
  on public.missions for insert
  to authenticated
  with check (
    public.is_org_admin()
    and created_by = auth.uid()
    and (
      (is_broadcast and agent_id is null)
      or (
        not is_broadcast and agent_id is not null
        and exists (
          select 1 from public.profiles p
          where p.id = missions.agent_id and p.organization_id = public.my_organization_id()
        )
      )
    )
  );

drop policy "missions_update_org_admin" on public.missions;
create policy "missions_update_org_admin"
  on public.missions for update
  to authenticated
  using (public.is_org_admin_of(organization_id))
  with check (public.is_org_admin_of(organization_id));

-- missions_update_own is untouched -- still agent_id = auth.uid() both sides.

-- The narrow "claim" transition: USING targets only currently-open
-- broadcast missions in the caller's own org; WITH CHECK only allows the
-- transition to "claimed by me, accepted". Combined with the conditional
-- UPDATE ... WHERE agent_id IS NULL the client issues (see claimBroadcastMission
-- in missionsApi.ts), this is what makes claiming both race-safe and scoped.
create policy "missions_claim_broadcast"
  on public.missions for update
  to authenticated
  using (
    is_broadcast and agent_id is null and status = 'proposed'
    and organization_id = public.my_organization_id()
  )
  with check (
    agent_id = auth.uid() and status = 'accepted' and is_broadcast
    and organization_id = public.my_organization_id()
  );

-- 4h cancel window: an agent may cancel their own accepted/en_route mission
-- only up to 4 hours before scheduled_start. A trigger (not RLS WITH CHECK)
-- so it's one unconditional source of truth regardless of which permissive
-- policy matched the write, and so org-admin cancellations stay unrestricted.
-- Only guards the 'cancelled' transition -- refusing a still-'proposed'
-- mission is untouched.
create or replace function public.enforce_agent_cancel_window()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled'
     and old.agent_id = auth.uid() and not public.is_org_admin() then
    if old.scheduled_start - now() < interval '4 hours' then
      raise exception 'Une mission ne peut être annulée que jusqu''à 4 heures avant son début';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_enforce_agent_cancel_window
  before update on public.missions
  for each row execute function public.enforce_agent_cancel_window();
