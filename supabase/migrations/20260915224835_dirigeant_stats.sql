-- Cumulative hours summary for the dirigeant dashboard, grouped by
-- agent/site/year/month with optional filters. `language sql` (not
-- `security definer`) so it runs as SECURITY INVOKER by default — RLS on
-- `shifts` (shifts_select_own_or_dirigeant) is evaluated against the
-- *calling* user, matching the existing `shift_reports` view's approach:
-- a dirigeant sees every agent's hours, an agent calling this would only
-- ever see their own (not used that way today, but safe either way).
--
-- Open shifts count partial hours via coalesce(end_at, now()) — the
-- dirigeant's monthly total ticks upward in real time for shifts still in
-- progress, matching the "live" spirit of Phase 2.
create or replace function public.dirigeant_hours_summary(
  p_year int,
  p_month int default null,
  p_site_id uuid default null,
  p_agent_id uuid default null
)
returns table (
  agent_id uuid,
  agent_name text,
  site_id uuid,
  site_name text,
  year int,
  month int,
  total_hours numeric,
  shift_count int
)
language sql
stable
as $$
  select
    s.agent_id,
    p.full_name as agent_name,
    s.site_id,
    st.name as site_name,
    extract(year from s.start_at)::int as year,
    extract(month from s.start_at)::int as month,
    round((sum(extract(epoch from (coalesce(s.end_at, now()) - s.start_at))) / 3600.0)::numeric, 2) as total_hours,
    count(*)::int as shift_count
  from public.shifts s
  join public.profiles p on p.id = s.agent_id
  join public.sites st on st.id = s.site_id
  where extract(year from s.start_at) = p_year
    and (p_month is null or extract(month from s.start_at) = p_month)
    and (p_site_id is null or s.site_id = p_site_id)
    and (p_agent_id is null or s.agent_id = p_agent_id)
  group by s.agent_id, p.full_name, s.site_id, st.name,
           extract(year from s.start_at), extract(month from s.start_at);
$$;

grant execute on function public.dirigeant_hours_summary(int, int, uuid, uuid) to authenticated;
