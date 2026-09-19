-- Agent unavailability: purely informational for the dirigeant when
-- building future planning -- never automatically touches existing
-- assigned missions.

create table public.agent_unavailability (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.profiles(id),
  organization_id uuid not null references public.organizations(id),
  start_at timestamptz not null,
  end_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  constraint agent_unavailability_range_check check (end_at > start_at)
);

create index idx_unavailability_agent on public.agent_unavailability(agent_id);
create index idx_unavailability_range on public.agent_unavailability(start_at, end_at);

create or replace function public.set_unavailability_organization_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select organization_id into new.organization_id
    from public.profiles where id = new.agent_id;
  return new;
end;
$$;

create trigger trg_set_unavailability_organization_id
  before insert on public.agent_unavailability
  for each row execute function public.set_unavailability_organization_id();

alter table public.agent_unavailability enable row level security;

create policy "unavailability_select_own_or_org_admin"
  on public.agent_unavailability for select
  to authenticated
  using (agent_id = auth.uid() or public.is_org_admin_of(organization_id));

create policy "unavailability_insert_own"
  on public.agent_unavailability for insert
  to authenticated
  with check (agent_id = auth.uid());

create policy "unavailability_update_own"
  on public.agent_unavailability for update
  to authenticated
  using (agent_id = auth.uid())
  with check (agent_id = auth.uid());

create policy "unavailability_delete_own"
  on public.agent_unavailability for delete
  to authenticated
  using (agent_id = auth.uid());

alter publication supabase_realtime add table public.agent_unavailability;
