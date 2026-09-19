-- Notification fan-out for broadcast missions, swap requests, and
-- dirigeant-initiated reassignment. Extends the existing single trigger
-- (notify_mission_change) rather than adding a second trigger on the same
-- table, so exactly one trigger still fires per mission write.

create or replace function public.notify_org_admins(
  p_organization_id uuid, p_title text, p_body text, p_data jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare r record;
begin
  for r in
    select push_token from public.profiles
    where organization_id = p_organization_id and role in ('dirigeant', 'sub_admin')
      and push_token is not null
  loop
    perform public.send_expo_push(r.push_token, p_title, p_body, p_data);
  end loop;
end;
$$;

create or replace function public.notify_org_agents(
  p_organization_id uuid, p_title text, p_body text, p_data jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare r record;
begin
  for r in
    select push_token from public.profiles
    where organization_id = p_organization_id and role = 'agent' and push_token is not null
  loop
    perform public.send_expo_push(r.push_token, p_title, p_body, p_data);
  end loop;
end;
$$;

create or replace function public.notify_mission_change() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_site_name text;
  v_agent_name text;
  v_agent_token text;
  v_creator_token text;
  v_scheduled text;
begin
  select name into v_site_name from sites where id = new.site_id;
  select full_name, push_token into v_agent_name, v_agent_token
    from profiles where id = new.agent_id;
  v_scheduled := to_char(new.scheduled_start at time zone 'Europe/Paris', 'DD/MM à HH24:MI');

  if tg_op = 'INSERT' then
    if new.is_broadcast and new.agent_id is null then
      perform notify_org_agents(
        new.organization_id,
        'Nouvelle mission disponible',
        format('%s — %s', v_site_name, v_scheduled),
        jsonb_build_object('type', 'mission_broadcast_available', 'missionId', new.id)
      );
    else
      perform send_expo_push(
        v_agent_token,
        'Nouvelle mission',
        format('%s — %s', v_site_name, v_scheduled),
        jsonb_build_object('type', 'mission_proposed', 'missionId', new.id)
      );
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    select push_token into v_creator_token from profiles where id = new.created_by;

    if new.status = 'accepted' then
      perform send_expo_push(
        v_creator_token,
        'Mission acceptée',
        format('%s a accepté la mission — %s', v_agent_name, v_site_name),
        jsonb_build_object(
          'type', case when new.is_broadcast and old.agent_id is null
                        then 'mission_broadcast_claimed' else 'mission_accepted' end,
          'missionId', new.id
        )
      );
    elsif new.status = 'refused' then
      perform send_expo_push(
        v_creator_token,
        'Mission refusée',
        format('%s a refusé la mission — %s', v_agent_name, v_site_name),
        jsonb_build_object('type', 'mission_refused', 'missionId', new.id)
      );
    elsif new.status = 'cancelled' then
      perform send_expo_push(
        v_creator_token,
        'Mission annulée',
        format('%s a annulé la mission — %s. À réaffecter.', v_agent_name, v_site_name),
        jsonb_build_object('type', 'mission_cancelled', 'missionId', new.id)
      );
    elsif new.status = 'proposed' and old.status in ('cancelled', 'refused') then
      -- Dirigeant reassignment (reassignMission): reopens a cancelled/
      -- refused mission, either to a newly-named agent or back to broadcast.
      -- From the receiving agent's perspective this looks identical to a
      -- brand-new mission, so it reuses the exact same push copy.
      if new.is_broadcast and new.agent_id is null then
        perform notify_org_agents(
          new.organization_id,
          'Nouvelle mission disponible',
          format('%s — %s', v_site_name, v_scheduled),
          jsonb_build_object('type', 'mission_broadcast_available', 'missionId', new.id)
        );
      else
        perform send_expo_push(
          v_agent_token,
          'Nouvelle mission',
          format('%s — %s', v_site_name, v_scheduled),
          jsonb_build_object('type', 'mission_proposed', 'missionId', new.id)
        );
      end if;
    end if;
  end if;

  return new;
end;
$$;
-- trg_notify_mission_change already points at this function name;
-- create-or-replace is sufficient, no DROP/CREATE TRIGGER needed.

create or replace function public.handle_mission_swap_request_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mission public.missions;
  v_site_name text;
  v_from_name text; v_from_token text;
  v_to_name text; v_to_token text;
  v_scheduled text;
  v_updated int;
begin
  select * into v_mission from public.missions where id = new.mission_id;
  select name into v_site_name from public.sites where id = v_mission.site_id;
  select full_name, push_token into v_from_name, v_from_token from public.profiles where id = new.from_agent_id;
  select full_name, push_token into v_to_name, v_to_token from public.profiles where id = new.to_agent_id;
  v_scheduled := to_char(v_mission.scheduled_start at time zone 'Europe/Paris', 'DD/MM à HH24:MI');

  if tg_op = 'INSERT' then
    perform public.send_expo_push(
      v_to_token, 'Demande d''échange de mission',
      format('%s vous propose sa mission — %s (%s)', v_from_name, v_site_name, v_scheduled),
      jsonb_build_object('type', 'swap_requested', 'swapRequestId', new.id, 'missionId', new.mission_id)
    );
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    if new.status = 'accepted' then
      -- Atomic, guarded reassignment: fails (and rolls back the whole
      -- transaction, including this row's own UPDATE) if the mission
      -- changed state since the request was made.
      update public.missions
        set agent_id = new.to_agent_id, responded_at = now()
        where id = new.mission_id and agent_id = new.from_agent_id
          and status in ('accepted', 'en_route');
      get diagnostics v_updated = row_count;
      if v_updated = 0 then
        raise exception 'La mission a changé d''état, l''échange ne peut pas être appliqué';
      end if;

      perform public.send_expo_push(
        v_from_token, 'Échange accepté',
        format('%s a accepté de reprendre la mission — %s', v_to_name, v_site_name),
        jsonb_build_object('type', 'swap_accepted', 'swapRequestId', new.id, 'missionId', new.mission_id)
      );
      perform public.notify_org_admins(
        new.organization_id, 'Mission réaffectée',
        format('%s reprend la mission de %s — %s', v_to_name, v_from_name, v_site_name),
        jsonb_build_object('type', 'swap_accepted', 'swapRequestId', new.id, 'missionId', new.mission_id)
      );
    elsif new.status = 'refused' then
      perform public.send_expo_push(
        v_from_token, 'Échange refusé',
        format('%s a refusé de reprendre la mission — %s', v_to_name, v_site_name),
        jsonb_build_object('type', 'swap_refused', 'swapRequestId', new.id, 'missionId', new.mission_id)
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_handle_mission_swap_request_change on public.mission_swap_requests;
create trigger trg_handle_mission_swap_request_change
  after insert or update on public.mission_swap_requests
  for each row execute function public.handle_mission_swap_request_change();
