create table public.events (
  id uuid primary key,
  shift_id uuid not null references public.shifts(id) on delete cascade,
  -- Denormalized (redundant with the join through shift_id) so RLS policies
  -- below are flat equality checks instead of multi-level EXISTS subqueries.
  agent_id uuid not null references public.profiles(id),
  category_code text not null,
  item_codes text[] not null default '{}',
  comment text,
  occurred_at timestamptz not null,
  lat double precision,
  lng double precision,
  accuracy real,
  client_created_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index idx_events_shift on public.events(shift_id);
create index idx_events_agent on public.events(agent_id);

alter table public.events enable row level security;

create policy "events_select_own_or_dirigeant"
  on public.events for select
  to authenticated
  using (agent_id = auth.uid() or public.is_dirigeant());

create policy "events_insert_own"
  on public.events for insert
  to authenticated
  with check (agent_id = auth.uid());

-- Deliberately no UPDATE/DELETE policy for anyone: an event only reaches
-- Postgres once it has synced from the device, so by definition it's already
-- locked. Editing/deleting an unsynced event happens purely against the
-- local SQLite row before it ever reaches the server.
