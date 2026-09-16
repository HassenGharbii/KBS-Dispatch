insert into storage.buckets (id, name, public)
values ('shift-photos', 'shift-photos', false)
on conflict (id) do nothing;

-- Path convention: {agent_id}/{shift_id}/{event_id}/{photo_id}.jpg
create policy "shift_photos_select_own_or_dirigeant"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'shift-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_dirigeant()
    )
  );

create policy "shift_photos_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'shift-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
