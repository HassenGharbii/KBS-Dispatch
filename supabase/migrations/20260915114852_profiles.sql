create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  role text not null check (role in ('agent', 'dirigeant')),
  professional_card_number text,
  geoloc_consent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own_or_dirigeant"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_dirigeant());

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Accounts are admin-provisioned only (created directly in Supabase Studio /
-- via the Admin API, no in-app sign-up). Whoever creates the auth.users row
-- is expected to set full_name/phone/role/professional_card_number in
-- raw_user_meta_data; this trigger copies that into the profile row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, role, professional_card_number)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone',
    coalesce(new.raw_user_meta_data->>'role', 'agent'),
    new.raw_user_meta_data->>'professional_card_number'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
