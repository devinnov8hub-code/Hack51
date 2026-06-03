-- ════════════════════════════════════════════════════════════════════════════
-- Migration 003: Artifact upload storage bucket
-- ════════════════════════════════════════════════════════════════════════════
-- Adds a Supabase Storage bucket named "artifacts" so candidates can upload
-- files (PDF, ZIP, images, Office docs) when artifact_type is "upload" or "both".
--
-- Run this in the Supabase SQL Editor. It is idempotent — safe to run more
-- than once.
--
-- HOW THE UPLOAD WORKS:
--   1. Frontend calls POST /candidate/uploads/sign → gets a signed upload URL
--   2. Frontend uploads the file directly to that URL (file never touches the API)
--   3. Frontend submits the challenge with the returned public_url in artifact_urls
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Create the bucket (public read so the public_url works for reviewers).
--    If you prefer private files, set public = false and switch the controller
--    to return a signed download URL instead of getPublicUrl.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'artifacts',
  'artifacts',
  true,
  52428800, -- 50 MB per file
  array[
    'application/pdf',
    'application/zip',
    'application/x-zip-compressed',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/markdown'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2. The API uses the service-role key, which bypasses RLS, so the signed
--    upload URL works without extra policies. The policies below only matter
--    if you ever switch to client-side anon uploads. They're safe to keep.

-- Allow public read of artifacts (needed for public_url to resolve).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'artifacts_public_read'
  ) then
    create policy "artifacts_public_read"
      on storage.objects for select
      using (bucket_id = 'artifacts');
  end if;
end $$;
