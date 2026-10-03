-- Mission timing rules + agent overtime ("heures sup") requests.
--
-- 1. A mission can no longer be created starting less than 10 minutes from
--    now, and must carry an explicit scheduled_end (> scheduled_start) --
--    both web and mobile create forms now collect it; this trigger is the
--    one source of truth regardless of which client inserted the row.
-- 2. An agent can only flip their own mission to 'in_progress' ("prendre le
--    service") starting 10 minutes before scheduled_start. Org admins are
--    exempt (manual corrections, re-dispatch, etc.).
-- 3. mission_overtime_requests: an agent nearing/at a mission's scheduled_end
--    can ask for extra time; an org admin accepts (pushes scheduled_end back)
--    or refuses it. Mirrors mission_swap_requests' shape.

create or replace function public.enforce_mission_create_timing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.scheduled_end is null then
    raise exception 'La date et heure de fin de mission sont obligatoires';
  end if;
  if new.scheduled_end <= new.scheduled_start then
    raise exception 'La fin de mission doit être après son début';
  end if;
  if new.scheduled_start - now() < interval '10 minutes' then
    raise exception 'Une mission doit être créée au moins 10 minutes avant son début';
  end if;
  return new;
end;
$$;

create trigger trg_enforce_mission_create_timing
  before insert on public.missions
  for each row execute function public.enforce_mission_create_timing();

-- "Prendre le service" window: the agent can only start (-> in_progress)
-- once within 10 minutes of scheduled_start. Only guards the agent's own
-- transition into 'in_progress' -- org-admin-driven updates are unrestricted,
-- same carve-out as enforce_agent_cancel_window.
create or replace function public.enforce_agent_start_window()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'in_progress' and old.status <> 'in_progress'
     and old.agent_id = auth.uid() and not public.is_org_admin() then
    if old.scheduled_start - now() > interval '10 minutes' then
      raise exception 'La prise de service n''est possible qu''à partir de 10 minutes avant le début de la mission';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_enforce_agent_start_window
  before update on public.missions
  for each row execute function public.enforce_agent_start_window();

create table public.mission_overtime_requests (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id),
  agent_id uuid not null references public.profiles(id),
  organization_id uuid not null references public.organizations(id),
  requested_minutes int not null check (requested_minutes > 0),
  status text not null default 'requested'
    check (status in ('requested', 'accepted', 'refused')),
  responded_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_overtime_mission on public.mission_overtime_requests(mission_id);
create index idx_overtime_agent on public.mission_overtime_requests(agent_id);

-- Only one open (pending) overtime request per mission at a time.
create unique index uq_overtime_requests_open_mission
  on public.mission_overtime_requests(mission_id) where status = 'requested';

create or replace function public.prepare_and_validate_overtime_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mission public.missions;
begin
  select organization_id into new.organization_id
    from public.profiles where id = new.agent_id;

  select * into v_mission from public.missions where id = new.mission_id;
  if not found then
    raise exception 'Mission introuvable';
  end if;
  if v_mission.agent_id is distinct from new.agent_id then
    raise exception 'Vous n''êtes pas affecté à cette mission';
  end if;
  if v_mission.status <> 'in_progress' then
    raise exception 'Une demande d''heures supplémentaires ne peut être faite que pendant le service';
  end if;

  return new;
end;
$$;

create trigger trg_prepare_and_validate_overtime_request
  before insert on public.mission_overtime_requests
  for each row execute function public.prepare_and_validate_overtime_request();

alter table public.mission_overtime_requests enable row level security;

create policy "overtime_select_involved_or_org_admin"
  on public.mission_overtime_requests for select
  to authenticated
  using (agent_id = auth.uid() or public.is_org_admin_of(organization_id));

create policy "overtime_insert_own"
  on public.mission_overtime_requests for insert
  to authenticated
  with check (agent_id = auth.uid());

create policy "overtime_update_org_admin_respond"
  on public.mission_overtime_requests for update
  to authenticated
  using (public.is_org_admin_of(organization_id) and status = 'requested')
  with check (public.is_org_admin_of(organization_id) and status in ('accepted', 'refused'));

alter publication supabase_realtime add table public.mission_overtime_requests;

-- Accepting an overtime request pushes the mission's scheduled_end back by
-- the requested number of minutes, and notifies the requesting agent either
-- way; a new request notifies the org admins.
create or replace function public.handle_mission_overtime_request_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mission public.missions;
  v_site_name text;
  v_agent_name text; v_agent_token text;
begin
  select * into v_mission from public.missions where id = new.mission_id;
  select name into v_site_name from public.sites where id = v_mission.site_id;
  select full_name, push_token into v_agent_name, v_agent_token from public.profiles where id = new.agent_id;

  if tg_op = 'INSERT' then
    perform public.notify_org_admins(
      new.organization_id, 'Demande d''heures supplémentaires',
      format('%s demande %s min de plus — %s', v_agent_name, new.requested_minutes, v_site_name),
      jsonb_build_object('type', 'overtime_requested', 'overtimeRequestId', new.id, 'missionId', new.mission_id)
    );
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    if new.status = 'accepted' then
      update public.missions
        set scheduled_end = scheduled_end + make_interval(mins => new.requested_minutes)
        where id = new.mission_id;

      perform public.send_expo_push(
        v_agent_token, 'Heures supplémentaires acceptées',
        format('%s minutes supplémentaires accordées — %s', new.requested_minutes, v_site_name),
        jsonb_build_object('type', 'overtime_accepted', 'overtimeRequestId', new.id, 'missionId', new.mission_id)
      );
    elsif new.status = 'refused' then
      perform public.send_expo_push(
        v_agent_token, 'Heures supplémentaires refusées',
        format('Votre demande d''heures supplémentaires a été refusée — %s', v_site_name),
        jsonb_build_object('type', 'overtime_refused', 'overtimeRequestId', new.id, 'missionId', new.mission_id)
      );
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_handle_mission_overtime_request_change
  after insert or update on public.mission_overtime_requests
  for each row execute function public.handle_mission_overtime_request_change();
