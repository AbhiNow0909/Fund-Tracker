-- ============================================================================
-- Private storage bucket for raw CAS PDFs.
-- Files are stored under  {user_id}/{filename}  and DELETED by the backend
-- (service role) immediately after both parsers finish — honoring the wireframe's
-- "processed on your device — nothing is uploaded permanently" promise.
--
-- Policy model:
--   • authenticated users may UPLOAD and READ only their own folder
--   • NO client-side update/delete — the backend service role handles cleanup
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('cas-pdfs', 'cas-pdfs', false)
on conflict (id) do nothing;

drop policy if exists "Users upload own CAS pdfs" on storage.objects;
create policy "Users upload own CAS pdfs" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'cas-pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users read own CAS pdfs" on storage.objects;
create policy "Users read own CAS pdfs" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'cas-pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
