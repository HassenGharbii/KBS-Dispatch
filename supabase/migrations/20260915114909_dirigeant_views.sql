-- Convenience view backing ReportsListScreen. security_invoker means this
-- view enforces the *querying* user's own RLS on the underlying tables
-- (agents see only their own shifts, dirigeant sees all via is_dirigeant()
-- in the shifts policies) rather than the view owner's privileges.
create or replace view public.shift_reports
with (security_invoker = true)
as
select
  s.id as shift_id,
  s.agent_id,
  p.full_name as agent_name,
  s.site_id,
  st.name as site_name,
  s.status,
  s.start_at,
  s.end_at,
  (select count(*) from public.events e where e.shift_id = s.id) as event_count,
  (
    select count(*)
    from public.photos ph
    join public.events e on e.id = ph.event_id
    where e.shift_id = s.id
  ) as photo_count
from public.shifts s
join public.profiles p on p.id = s.agent_id
join public.sites st on st.id = s.site_id;
