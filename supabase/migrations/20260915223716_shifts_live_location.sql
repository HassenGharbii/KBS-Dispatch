-- Phase 2: real-time position of an agent currently on shift. Columns are
-- overwritten in place (not an append-only history table) since the
-- dirigeant's live map only ever needs "where is this agent right now" —
-- deliberately no movement trail, which also keeps this feature
-- privacy-friendly by construction (no growing location log).
alter table public.shifts
  add column current_lat double precision,
  add column current_lng double precision,
  add column current_accuracy real,
  add column current_location_at timestamptz;

-- Nothing in earlier migrations added any table to this publication, so
-- without this, Realtime subscriptions receive nothing — silently, no
-- error — which looks identical to "the map never updates."
alter publication supabase_realtime add table public.shifts;

-- Hardening surfaced by this feature (not caused by it): nothing previously
-- enforced "at most one open shift per agent" — a single agent's own UI
-- never exposed this, but the live map is the first place a violation
-- becomes visibly wrong (two pins for one agent).
create unique index idx_shifts_one_open_per_agent on public.shifts (agent_id) where status = 'open';
