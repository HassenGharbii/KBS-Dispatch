-- No visibility existed into "who reassigned this mission" / "who accepted
-- that swap" beyond the mission's current status -- this table + triggers
-- give the dirigeant console an append-only trail of the mission/swap
-- lifecycle events that actually matter operationally.

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  summary text not null,
  created_at timestamptz not null default now()
);

create index idx_audit_log_org_created on public.audit_log(organization_id, created_at desc);

alter table public.audit_log enable row level security;

-- Append-only from the client's point of view: only triggers (via
-- security definer functions below) ever insert; no UPDATE/DELETE policy
-- exists at all, and there is deliberately no client-facing INSERT policy
-- either.
create policy "audit_log_select_org_admin"
  on public.audit_log for select
  to authenticated
  using (public.is_org_admin_of(organization_id));

create or replace function public.log_mission_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
  target_agent_name text;
  site_name text;
begin
  select full_name into actor_name from public.profiles where id = auth.uid();
  select name into site_name from public.sites where id = new.site_id;

  -- Cancellation (agent's own cancel or an org admin's cancel -- both land
  -- here identically, "who" is whatever auth.uid() was at the time).
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    insert into public.audit_log (organization_id, actor_id, action, entity_type, entity_id, summary)
    values (
      new.organization_id, auth.uid(), 'mission_cancelled', 'mission', new.id,
      format('Mission (%s) annulée par %s', coalesce(site_name, '—'), coalesce(actor_name, 'inconnu'))
    );
  end if;

  -- Reassignment: the dirigeant/sub_admin's "Réaffecter" action, transitioning
  -- a cancelled/refused mission back to 'proposed' with a new agent_id (or
  -- broadcast).
  if old.status in ('cancelled', 'refused') and new.status = 'proposed' then
    if new.agent_id is not null then
      select full_name into target_agent_name from public.profiles where id = new.agent_id;
    end if;
    insert into public.audit_log (organization_id, actor_id, action, entity_type, entity_id, summary)
    values (
      new.organization_id, auth.uid(), 'mission_reassigned', 'mission', new.id,
      format(
        'Mission (%s) réaffectée par %s à %s',
        coalesce(site_name, '—'),
        coalesce(actor_name, 'inconnu'),
        case when new.is_broadcast then 'tous les agents (diffusion)' else coalesce(target_agent_name, '—') end
      )
    );
  end if;

  return new;
end;
$$;

create trigger trg_log_mission_audit_event
  after update on public.missions
  for each row execute function public.log_mission_audit_event();

create or replace function public.log_swap_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
  from_name text;
  to_name text;
begin
  if new.status not in ('accepted', 'refused') or old.status = new.status then
    return new;
  end if;

  select full_name into actor_name from public.profiles where id = auth.uid();
  select full_name into from_name from public.profiles where id = new.from_agent_id;
  select full_name into to_name from public.profiles where id = new.to_agent_id;

  insert into public.audit_log (organization_id, actor_id, action, entity_type, entity_id, summary)
  values (
    new.organization_id, auth.uid(),
    case when new.status = 'accepted' then 'swap_accepted' else 'swap_refused' end,
    'swap_request', new.id,
    case
      when new.status = 'accepted' then
        format('Échange accepté : %s a repris la mission de %s', coalesce(to_name, '—'), coalesce(from_name, '—'))
      else
        format('Échange refusé par %s (proposé par %s)', coalesce(to_name, '—'), coalesce(from_name, '—'))
    end
  );

  return new;
end;
$$;

create trigger trg_log_swap_audit_event
  after update on public.mission_swap_requests
  for each row execute function public.log_swap_audit_event();

alter publication supabase_realtime add table public.audit_log;
