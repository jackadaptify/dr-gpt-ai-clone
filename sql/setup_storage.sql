-- Create a new storage bucket for chat attachments
insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', true)
on conflict (id) do nothing;

-- Policy to allow anyone (anon) to upload files (for demo purposes, ideally authenticated only)
create policy "Allow public uploads"
on storage.objects for insert
with check ( bucket_id = 'chat-attachments' );

-- Policy to allow anyone to view files
create policy "Allow public viewing"
on storage.objects for select
using ( bucket_id = 'chat-attachments' );

-- Policy to allow users to delete their own files (optional, but good practice)
-- create policy "Allow users to delete own files"
-- on storage.objects for delete
-- using ( bucket_id = 'chat-attachments' and auth.uid() = owner );
