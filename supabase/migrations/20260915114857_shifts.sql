create table public.shifts (
  id uuid primary key,
  agent_id uuid not null references public.profiles(id),
  site_id uuid not null references public.sites(id),
  status text not null check (status in ('open', 'closed')),
  start_at timestamptz not null,
  start_lat double precision,
  start_lng double precision,
  start_accuracy real,
  end_at timestamptz,
  end_lat double precision,
  end_lng double precision,
  end_accuracy real,
  -- Device-asserted timestamp, kept immutable and separate from `created_at`
  -- (server receipt time) since these are legally-relevant records and any
  -- clock discrepancy should stay visible rather than being silently lost.
  client_created_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index idx_shifts_agent on public.shifts(agent_id);
create index idx_shifts_site on public.shifts(site_id);

alter table public.shifts enable row level security;

create policy "shifts_select_own_or_dirigeant"
  on public.shifts for select
  to authenticated
  using (agent_id = auth.uid() or public.is_dirigeant());

create policy "shifts_insert_own"
  on public.shifts for insert
  to authenticated
  with check (agent_id = auth.uid());

-- UPDATE is required so an agent can write their own clock-out fields onto
-- a shift row created at clock-in.
create policy "shifts_update_own"
  on public.shifts for update
  to authenticated
  using (agent_id = auth.uid())
  with check (agent_id = auth.uid());

-- Separate grant for the dirigeant: without this, the "closed shift" trigger
-- below is unreachable for them, since RLS denies the UPDATE outright before
-- the trigger ever runs (a dirigeant's auth.uid() never equals agent_id).
create policy "shifts_update_dirigeant"
  on public.shifts for update
  to authenticated
  using (public.is_dirigeant())
  with check (public.is_dirigeant());

-- Once a shift is closed it should not be silently rewritten by the agent;
-- protects logbook integrity. Dirigeant retains the ability to correct data.
-- Exact-duplicate upserts (the sync engine retrying after an ambiguous
-- network failure — request succeeded server-side but the response was
-- lost) must stay allowed as harmless no-ops, since idempotent retries are
-- central to the whole sync design; only an actual attempted change to an
-- already-closed shift is blocked.
create or replace function public.prevent_closed_shift_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'closed' and not public.is_dirigeant() and new is distinct from old then
    raise exception 'Shift % is closed and cannot be modified', old.id;
  end if;
  return new;
end;
$$;

create trigger trg_prevent_closed_shift_update
  before update on public.shifts
  for each row execute function public.prevent_closed_shift_update();
