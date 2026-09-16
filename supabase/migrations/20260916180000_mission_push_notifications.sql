-- Real push delivery for the mission lifecycle (spec §2.4 "diffusion
-- instantanée"). Until now, new-mission/accept/refuse/cancel relied purely
-- on Supabase Realtime -- silent no-op whenever the recipient's app isn't
-- foregrounded. This fires from the database itself (via pg_net, an async
-- HTTP extension), so it works regardless of who's online, matching the
-- already-live agent/dirigeant apps' actual behavior requirement.

create extension if not exists pg_net;

alter table profiles add column if not exists push_token text;

-- Fire-and-forget: pg_net queues the HTTP call asynchronously and never
-- blocks/fails the write that triggered it. A missing/invalid push token
-- (agent never opened the app, or denied notification permission) is a
-- normal, silent no-op -- not an error.
create or replace function public.send_expo_push(
  p_push_token text,
  p_title text,
  p_body text,
  p_data jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_push_token is null or p_push_token = '' then
    return;
  end if;

  perform net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Accept', 'application/json'),
    body := jsonb_build_object(
      'to', p_push_token,
      'title', p_title,
      'body', p_body,
      'data', p_data
    )
  );
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
    perform send_expo_push(
      v_agent_token,
      'Nouvelle mission',
      format('%s — %s', v_site_name, v_scheduled),
      jsonb_build_object('type', 'mission_proposed', 'missionId', new.id)
    );
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    select push_token into v_creator_token from profiles where id = new.created_by;

    if new.status = 'accepted' then
      perform send_expo_push(
        v_creator_token,
        'Mission acceptée',
        format('%s a accepté la mission — %s', v_agent_name, v_site_name),
        jsonb_build_object('type', 'mission_accepted', 'missionId', new.id)
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
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_mission_change on missions;
create trigger trg_notify_mission_change
  after insert or update on missions
  for each row execute function notify_mission_change();
