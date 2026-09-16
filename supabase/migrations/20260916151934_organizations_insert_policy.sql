-- Defense-in-depth: the web console's organization-creation route already
-- uses the service-role client (bypasses RLS) after checking the caller is
-- super_admin in code, but the table should still have a correct policy of
-- its own rather than silently denying every insert by default.
create policy "organizations_insert_super_admin"
  on public.organizations for insert
  to authenticated
  with check (public.is_super_admin());
