create table public.photos (
  id uuid primary key,
  event_id uuid not null references public.events(id) on delete cascade,
  agent_id uuid not null references public.profiles(id),
  storage_path text not null,
  taken_at timestamptz not null,
  width int,
  height int,
  file_size_bytes int,
  created_at timestamptz not null default now()
);

create index idx_photos_event on public.photos(event_id);
create index idx_photos_agent on public.photos(agent_id);

alter table public.photos enable row level security;

create policy "photos_select_own_or_dirigeant"
  on public.photos for select
  to authenticated
  using (agent_id = auth.uid() or public.is_dirigeant());

create policy "photos_insert_own"
  on public.photos for insert
  to authenticated
  with check (agent_id = auth.uid());

-- Same reasoning as events: no UPDATE/DELETE policy, a photo row is only
-- ever created once its event has already synced.
