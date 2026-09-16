create table public.sites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  sensitivity_level smallint not null default 1 check (sensitivity_level between 1 and 3),
  client_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.sites enable row level security;

-- Agents need the full active-site list to pick from at clock-in. No in-app
-- site management UI in Phase 1: sites are maintained by the dirigeant
-- directly in Supabase Studio.
create policy "sites_select_authenticated"
  on public.sites for select
  to authenticated
  using (true);

create policy "sites_insert_dirigeant"
  on public.sites for insert
  to authenticated
  with check (public.is_dirigeant());

create policy "sites_update_dirigeant"
  on public.sites for update
  to authenticated
  using (public.is_dirigeant())
  with check (public.is_dirigeant());

create policy "sites_delete_dirigeant"
  on public.sites for delete
  to authenticated
  using (public.is_dirigeant());
