-- ---------------------------------------------------------------------------
-- Run this once in the Supabase SQL editor to turn on Realtime for every
-- table the app reads from. Without this, the app's "live update" feature
-- (see AppChrome.tsx's useLiveRefresh) subscribes successfully but never
-- actually receives a change event — it just silently does nothing, so
-- nothing breaks if you forget this, the live updates just won't happen.
--
-- Safe to re-run (adding a table that's already in the publication is a
-- no-op error we swallow with the DO block below).
-- ---------------------------------------------------------------------------

do $$
begin
  alter publication supabase_realtime add table players;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table sessions;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table games;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table player_sessions;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table app_settings;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table join_requests;
exception when duplicate_object then null;
end $$;
