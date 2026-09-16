-- Extensions and shared helper functions used by later migrations.

create extension if not exists pgcrypto;

-- Returns true if the currently authenticated user is a 'dirigeant'.
-- security definer + fixed search_path avoids the classic RLS footgun of a
-- policy on `profiles` recursively querying `profiles` under the caller's
-- own (more restrictive) row-level policy.
--
-- language plpgsql (not sql): this migration runs before `profiles` exists
-- (created in the next migration). A `language sql` function body is
-- parsed and validated against real relations at CREATE FUNCTION time, which
-- would fail here with "relation public.profiles does not exist" — plpgsql
-- only checks its own block syntax at creation time and defers validating
-- the embedded SQL until the function is first called.
create or replace function public.is_dirigeant()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'dirigeant'
  );
end;
$$;
