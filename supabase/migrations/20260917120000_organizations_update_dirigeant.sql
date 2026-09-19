-- No UPDATE policy existed on organizations at all -- a dirigeant couldn't
-- even rename their own company without going through Supabase Studio.
-- Dirigeant-only (not sub_admin), matching the same trust tier already used
-- for creating sub-admins: organization identity is the owner's call.
create policy "organizations_update_dirigeant"
  on public.organizations for update
  to authenticated
  using (public.is_dirigeant_of(id))
  with check (public.is_dirigeant_of(id));
