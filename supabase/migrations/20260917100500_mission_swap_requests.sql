-- Agent-to-agent mission swap: an agent holding an accepted mission can
-- offer it to one specific named colleague, who must explicitly accept
-- before the reassignment happens.

create table public.mission_swap_requests (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id),
  from_agent_id uuid not null references public.profiles(id),
  to_agent_id uuid not null references public.profiles(id),
  organization_id uuid not null references public.organizations(id),
  status text not null default 'requested'
    check (status in ('requested', 'accepted', 'refused', 'cancelled')),
  message text,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  constraint mission_swap_from_ne_to check (from_agent_id <> to_agent_id)
);

create index idx_swap_mission on public.mission_swap_requests(mission_id);
create index idx_swap_to_agent on public.mission_swap_requests(to_agent_id);
create index idx_swap_from_agent on public.mission_swap_requests(from_agent_id);

-- Only one open (pending) swap request per mission at a time -- prevents an
-- agent fanning out simultaneous requests to several colleagues for the
-- same mission.
create unique index uq_swap_requests_open_mission
  on public.mission_swap_requests(mission_id) where status = 'requested';

-- Derives organization_id + validates the request is legal, in one BEFORE
-- INSERT trigger so there's no ordering ambiguity between separate triggers.
create or replace function public.prepare_and_validate_swap_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mission public.missions;
  v_to_org uuid;
begin
  select organization_id into new.organization_id
    from public.profiles where id = new.from_agent_id;

  select * into v_mission from public.missions where id = new.mission_id;
  if not found then
    raise exception 'Mission introuvable';
  end if;
  if v_mission.agent_id is distinct from new.from_agent_id then
    raise exception 'Vous n''êtes pas affecté à cette mission';
  end if;
  if v_mission.status not in ('accepted', 'en_route') then
    raise exception 'Cette mission ne peut pas être cédée dans son état actuel';
  end if;

  select organization_id into v_to_org from public.profiles where id = new.to_agent_id;
  if v_to_org is distinct from new.organization_id then
    raise exception 'Le collègue choisi n''appartient pas à votre organisation';
  end if;

  return new;
end;
$$;

create trigger trg_prepare_and_validate_swap_request
  before insert on public.mission_swap_requests
  for each row execute function public.prepare_and_validate_swap_request();

alter table public.mission_swap_requests enable row level security;

create policy "swap_select_involved_or_org_admin"
  on public.mission_swap_requests for select
  to authenticated
  using (
    from_agent_id = auth.uid() or to_agent_id = auth.uid()
    or public.is_org_admin_of(organization_id)
  );

create policy "swap_insert_from_agent"
  on public.mission_swap_requests for insert
  to authenticated
  with check (from_agent_id = auth.uid());

create policy "swap_update_to_agent_respond"
  on public.mission_swap_requests for update
  to authenticated
  using (to_agent_id = auth.uid() and status = 'requested')
  with check (to_agent_id = auth.uid() and status in ('accepted', 'refused'));

create policy "swap_update_from_agent_cancel"
  on public.mission_swap_requests for update
  to authenticated
  using (from_agent_id = auth.uid() and status = 'requested')
  with check (from_agent_id = auth.uid() and status = 'cancelled');

alter publication supabase_realtime add table public.mission_swap_requests;

-- Ordinary agents currently cannot SELECT other agents' profiles rows at
-- all (profiles_select_own_or_org_admin only allows own row or org-admin).
-- Two narrow additions rather than loosening profiles SELECT broadly (which
-- would expose home address/phone/push token to any colleague):

-- Colleague picker: name-only, same-org, excludes self.
create or replace function public.list_org_colleagues()
returns table(id uuid, full_name text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name
  from public.profiles p
  where p.role = 'agent'
    and p.organization_id = public.my_organization_id()
    and p.id <> auth.uid();
$$;
grant execute on function public.list_org_colleagues() to authenticated;

-- The two agents on a swap request (past or present) can see each other's
-- full profile row (needed for the embedded-join UI showing names).
create policy "profiles_select_swap_counterpart"
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1 from public.mission_swap_requests sr
      where (sr.from_agent_id = auth.uid() and sr.to_agent_id = profiles.id)
         or (sr.to_agent_id = auth.uid() and sr.from_agent_id = profiles.id)
    )
  );
