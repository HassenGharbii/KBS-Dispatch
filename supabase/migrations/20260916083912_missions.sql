-- Phase 3: mission dispatch (dirigeant -> agent), plus the coordinates
-- needed to compute a departure time (home -> site route duration).

alter table public.sites
  add column lat double precision,
  add column lng double precision;
-- Backfill for the seeded demo sites lives in supabase/seed.sql, not here --
-- this migration runs before seed.sql on a fresh `db reset`, so the site
-- rows it would need to UPDATE don't exist yet at this point.

alter table public.profiles
  add column home_address text,
  add column home_lat double precision,
  add column home_lng double precision;

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id),
  agent_id uuid not null references public.profiles(id),
  created_by uuid not null references public.profiles(id),
  scheduled_start timestamptz not null,
  scheduled_end timestamptz,
  instructions text,
  status text not null default 'proposed'
    check (status in ('proposed', 'accepted', 'refused', 'cancelled', 'en_route', 'in_progress', 'completed')),
  responded_at timestamptz,
  -- Mirrors shifts.current_lat/lng (Phase 2): overwritten in place, no
  -- movement trail, used only while the agent is 'en_route' (before
  -- clock-in creates a shift row and shift-level tracking takes over).
  current_lat double precision,
  current_lng double precision,
  current_location_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_missions_agent on public.missions(agent_id);
create index idx_missions_site on public.missions(site_id);

alter table public.shifts add column mission_id uuid references public.missions(id);

alter table public.missions enable row level security;

create policy "missions_select_own_or_dirigeant"
  on public.missions for select
  to authenticated
  using (agent_id = auth.uid() or public.is_dirigeant());

create policy "missions_insert_dirigeant"
  on public.missions for insert
  to authenticated
  with check (public.is_dirigeant() and created_by = auth.uid());

-- Same trust level as shifts_update_own: the agent's own row, no
-- column-level restriction beyond that (mirrors the existing shifts policy
-- shape rather than introducing new column-privilege machinery).
create policy "missions_update_own"
  on public.missions for update
  to authenticated
  using (agent_id = auth.uid())
  with check (agent_id = auth.uid());

-- Without this, the dirigeant can't cancel/reassign a mission -- same
-- "unreachable without a separate policy" issue shifts_update_dirigeant
-- was added to fix.
create policy "missions_update_dirigeant"
  on public.missions for update
  to authenticated
  using (public.is_dirigeant())
  with check (public.is_dirigeant());

alter publication supabase_realtime add table public.missions;
