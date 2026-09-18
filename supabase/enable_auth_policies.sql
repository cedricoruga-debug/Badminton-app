-- ---------------------------------------------------------------------------
-- Run this once in the Supabase SQL editor to switch the app from
-- "anyone with the anon key can read/write everything" to "must be signed
-- in." Safe to re-run (each policy is dropped before being recreated).
--
-- This is the same block that's now in schema.sql — pulled out on its own
-- so you can apply it to your existing live database without re-running the
-- whole schema file.
-- ---------------------------------------------------------------------------

drop policy if exists "Allow all (temporary, no auth yet)" on players;
drop policy if exists "Allow all (temporary, no auth yet)" on sessions;
drop policy if exists "Allow all (temporary, no auth yet)" on games;
drop policy if exists "Allow all (temporary, no auth yet)" on player_sessions;
drop policy if exists "Allow all (temporary, no auth yet)" on app_settings;
drop policy if exists "Require login" on players;
drop policy if exists "Require login" on sessions;
drop policy if exists "Require login" on games;
drop policy if exists "Require login" on player_sessions;
drop policy if exists "Require login" on app_settings;

create policy "Require login" on players for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "Require login" on sessions for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "Require login" on games for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "Require login" on player_sessions for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "Require login" on app_settings for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "Allow all read (assets)" on storage.objects;
drop policy if exists "Allow all insert (assets)" on storage.objects;
drop policy if exists "Allow all update (assets)" on storage.objects;
drop policy if exists "Allow all delete (assets)" on storage.objects;
drop policy if exists "Require login to write (assets)" on storage.objects;
drop policy if exists "Require login to update (assets)" on storage.objects;
drop policy if exists "Require login to delete (assets)" on storage.objects;

create policy "Allow all read (assets)" on storage.objects
  for select using (bucket_id = 'assets');
create policy "Require login to write (assets)" on storage.objects
  for insert with check (bucket_id = 'assets' and auth.uid() is not null);
create policy "Require login to update (assets)" on storage.objects
  for update using (bucket_id = 'assets' and auth.uid() is not null);
create policy "Require login to delete (assets)" on storage.objects
  for delete using (bucket_id = 'assets' and auth.uid() is not null);
