-- profiles_update_own only lets a user edit their own row -- there was no
-- way for a dirigeant/sub_admin to fix a colleague's name/phone typo short
-- of Supabase Studio. Mirrors the is_org_admin_of(organization_id) shape
-- already used for sites/missions/shifts update policies. Role/email/
-- organization_id changes stay out of scope for the web edit form (the UI
-- only ever sends full_name/phone/professional_card_number), but RLS can't
-- restrict by column, so this technically permits an org admin to rewrite
-- any column on a same-org profile -- an acceptable trust level given they
-- already fully control creation of those same accounts.
create policy "profiles_update_org_admin"
  on public.profiles for update
  to authenticated
  using (public.is_org_admin_of(organization_id))
  with check (public.is_org_admin_of(organization_id));
