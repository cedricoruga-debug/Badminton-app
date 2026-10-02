-- ---------------------------------------------------------------------------
-- Multi-tenant clubs (v3)
--
-- Run AFTER schema.sql. Turns the single shared group app into one where
-- every sign-up gets its own "club" — its own players, sessions, games,
-- payments, settings, QR code and login accounts — and no club can see any
-- other club's data.
--
--   clubs         one row per club (name, sport, payment QR, icon)
--   club_members  which login account belongs to which club, and its role
--                 (one account = one club)
--
-- Every data table gets a club_id. It defaults to the signed-in user's own
-- club (current_club_id()), so app code that inserts rows never has to pass
-- it — and Row Level Security only ever shows a user their own club's rows.
--
-- Existing data: everything already in the database becomes ONE club,
-- seeded from app_settings, with every existing login account as a member.
-- Safe to re-run (every step checks before acting).
--
-- Also adds:
--   * clubs.sport ('badminton' | 'pickleball')
--   * fixed-rate fees: sessions.fee_mode / sessions.fixed_fee, mirrored per
--     player into player_sessions.fixed_fee, which the payable formula uses
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- clubs + club_members
-- ---------------------------------------------------------------------------
create table if not exists clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sport text not null default 'badminton' check (sport in ('badminton', 'pickleball')),
  payment_qr_url text,
  app_icon_url text,
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists club_members (
  club_id uuid not null references clubs(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('admin', 'user')),
  -- What this person signs in with, for display on the Accounts page: a
  -- plain username for staff accounts, the email for a club owner.
  login text not null,
  created_at timestamptz not null default now(),
  primary key (club_id, user_id)
);

create index if not exists club_members_club_id_idx on club_members (club_id);

-- The signed-in user's club. security definer so RLS policies can call it
-- without recursing into club_members' own policy.
create or replace function current_club_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select club_id from club_members where user_id = auth.uid();
$$;

create or replace function is_club_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'admin' from club_members where user_id = auth.uid()), false);
$$;

grant execute on function current_club_id() to authenticated;
grant execute on function is_club_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Seed the existing group as the first club (only if no club exists yet)
-- ---------------------------------------------------------------------------
do $$
declare
  seed_club_id uuid;
  seed_owner uuid;
begin
  if exists (select 1 from clubs) then
    return;
  end if;

  select id into seed_owner from auth.users
  where email not like '%@badminton.local'
  order by created_at
  limit 1;
  if seed_owner is null then
    select id into seed_owner from auth.users
    where raw_app_meta_data ->> 'role' = 'admin'
    order by created_at
    limit 1;
  end if;

  insert into clubs (name, sport, payment_qr_url, app_icon_url, owner_id)
  select coalesce(nullif(a.display_title, ''), 'My Club'), 'badminton', a.payment_qr_url, a.app_icon_url, seed_owner
  from (select 1) one
  left join app_settings a on a.id = 1
  returning id into seed_club_id;

  insert into club_members (club_id, user_id, role, login)
  select
    seed_club_id,
    u.id,
    case when u.raw_app_meta_data ->> 'role' = 'admin' or u.id = seed_owner then 'admin' else 'user' end,
    case when u.email like '%@badminton.local' then split_part(u.email, '@', 1) else u.email end
  from auth.users u
  where u.email is not null
  on conflict do nothing;
end $$;

-- ---------------------------------------------------------------------------
-- club_id on every data table
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  seed uuid := (select id from clubs order by created_at limit 1);
begin
  foreach t in array array['players', 'sessions', 'games', 'player_sessions'] loop
    execute format('alter table %I add column if not exists club_id uuid references clubs(id) on delete cascade', t);
    execute format('update %I set club_id = $1 where club_id is null', t) using seed;
    execute format('alter table %I alter column club_id set default current_club_id()', t);
    execute format('alter table %I alter column club_id set not null', t);
    execute format('create index if not exists %I on %I (club_id)', t || '_club_id_idx', t);
  end loop;
end $$;

-- Player names only need to be unique within a club now.
alter table players drop constraint if exists players_name_key;
alter table players drop constraint if exists players_club_id_name_key;
alter table players add constraint players_club_id_name_key unique (club_id, name);

-- A row can never point at another club's session or player (an id leaking
-- through a public join-code view can't be used to attach data across
-- clubs). Done with a trigger rather than composite foreign keys: extra
-- foreign keys between the same tables would make PostgREST see two
-- relationships and break the app's `player:players(*)`-style embeds.
-- (Clean-up for an earlier draft of this file that used composite keys.)
alter table games drop constraint if exists games_session_club_fkey;
alter table player_sessions drop constraint if exists player_sessions_session_club_fkey;
alter table player_sessions drop constraint if exists player_sessions_player_club_fkey;
alter table games drop constraint if exists games_player1_club_fkey;
alter table games drop constraint if exists games_player2_club_fkey;
alter table games drop constraint if exists games_player3_club_fkey;
alter table games drop constraint if exists games_player4_club_fkey;
alter table sessions drop constraint if exists sessions_id_club_id_key;
alter table players drop constraint if exists players_id_club_id_key;

create or replace function enforce_same_club()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from sessions where id = new.session_id and club_id = new.club_id) then
    raise exception 'That session belongs to another club.';
  end if;

  if tg_table_name = 'games' then
    if exists (
      select 1 from players p
      where p.id in (new.player1_id, new.player2_id, new.player3_id, new.player4_id)
        and p.club_id <> new.club_id
    ) then
      raise exception 'That player belongs to another club.';
    end if;
  elsif tg_table_name = 'player_sessions' then
    if not exists (select 1 from players where id = new.player_id and club_id = new.club_id) then
      raise exception 'That player belongs to another club.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists games_same_club on games;
create trigger games_same_club
  before insert or update of club_id, session_id, player1_id, player2_id, player3_id, player4_id on games
  for each row execute function enforce_same_club();

drop trigger if exists player_sessions_same_club on player_sessions;
create trigger player_sessions_same_club
  before insert or update of club_id, session_id, player_id on player_sessions
  for each row execute function enforce_same_club();

-- ---------------------------------------------------------------------------
-- Fixed-rate fees
-- A session either splits real costs (court hours x rate, shuttles/balls) —
-- the original behaviour — or charges everyone a flat fixed_fee. Court and
-- shuttle/ball shares are still tracked in fixed mode, so the Sessions page
-- can show the club's real profit (fee collected minus actual costs).
-- player_sessions.fixed_fee is a per-player copy of the session's fixed fee
-- (null = split mode), kept in sync by recomputePlayerGameCounts, because a
-- generated column can only read its own row.
-- ---------------------------------------------------------------------------
alter table sessions add column if not exists fee_mode text not null default 'split';
do $$
begin
  alter table sessions add constraint sessions_fee_mode_check check (fee_mode in ('split', 'fixed'));
exception when duplicate_object then null;
end $$;
alter table sessions add column if not exists fixed_fee numeric(10, 2) not null default 0;

alter table player_sessions add column if not exists fixed_fee numeric(10, 2);

-- Postgres 17+ can change a generated column's formula in place.
alter table player_sessions alter column payable set expression as (
  case
    when fixed_fee is not null then ceil(fixed_fee * (1 - discount_percent / 100.0))
    when (court_share + shuttle_share + surcharge_amount) = 0 then 0
    else ceil(((court_share + shuttle_share) * (1 - discount_percent / 100.0) + surcharge_amount) / 10.0) * 10 + 10
  end
);

-- ---------------------------------------------------------------------------
-- Row Level Security: a signed-in user sees and changes only their own club
-- ---------------------------------------------------------------------------
alter table clubs enable row level security;
alter table club_members enable row level security;

drop policy if exists "Own club" on clubs;
drop policy if exists "Own club admins update" on clubs;
create policy "Own club" on clubs for select using (id = (select current_club_id()));
create policy "Own club admins update" on clubs for update
  using (id = (select current_club_id()) and (select is_club_admin()))
  with check (id = (select current_club_id()));

drop policy if exists "Own club" on club_members;
create policy "Own club" on club_members for select using (club_id = (select current_club_id()));

-- The old "Require login" policy on each data table is renamed and
-- tightened in place (or created, on a re-run / fresh database).
do $$
declare
  t text;
begin
  foreach t in array array['players', 'sessions', 'games', 'player_sessions'] loop
    if exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'Require login') then
      execute format('alter policy "Require login" on %I rename to "Own club"', t);
    end if;
    if exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'Own club') then
      execute format(
        'alter policy "Own club" on %I using (club_id = (select current_club_id())) with check (club_id = (select current_club_id()))',
        t
      );
    else
      execute format(
        'create policy "Own club" on %I for all using (club_id = (select current_club_id())) with check (club_id = (select current_club_id()))',
        t
      );
    end if;
  end loop;
end $$;

grant select, update on clubs to authenticated;
grant select on club_members to authenticated;

-- ---------------------------------------------------------------------------
-- Creating a club (sign-up)
-- Called by a freshly signed-up user who doesn't belong to a club yet.
-- Makes them the club's owner and admin. Returns the new club id.
-- ---------------------------------------------------------------------------
create or replace function create_my_club(club_name text, club_sport text, my_login text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_club_id uuid;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in.';
  end if;
  if exists (select 1 from club_members where user_id = uid) then
    raise exception 'This account already belongs to a club.';
  end if;
  if coalesce(trim(club_name), '') = '' then
    raise exception 'Club name is required.';
  end if;
  if club_sport not in ('badminton', 'pickleball') then
    raise exception 'Pick badminton or pickleball.';
  end if;

  insert into clubs (name, sport, owner_id)
  values (left(trim(club_name), 60), club_sport, uid)
  returning id into new_club_id;

  insert into club_members (club_id, user_id, role, login)
  values (new_club_id, uid, 'admin', coalesce(nullif(trim(my_login), ''), 'owner'));

  return new_club_id;
end;
$$;

revoke execute on function create_my_club(text, text, text) from public, anon;
grant execute on function create_my_club(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Join codes are global (a player types one in with no club context), so
-- picking an unused one has to look across every club — something a
-- signed-in user's RLS-limited view can't do.
-- ---------------------------------------------------------------------------
create or replace function generate_join_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
begin
  for attempt in 1..50 loop
    candidate := lpad((100000 + floor(random() * 900000))::int::text, 6, '0');
    if not exists (select 1 from sessions where join_code = candidate) then
      return candidate;
    end if;
  end loop;
  raise exception 'Could not generate a unique join code — try again.';
end;
$$;

revoke execute on function generate_join_code() from public, anon;
grant execute on function generate_join_code() to authenticated;

-- ---------------------------------------------------------------------------
-- Public join-page functions, now club-aware
-- ---------------------------------------------------------------------------
-- New "_v2" names rather than changing the originals' return types, so the
-- previous app version keeps working until the new one is deployed.
create or replace function find_session_by_join_code_v2(code text)
returns table (id uuid, session_date date, title text, club_name text, sport text)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.session_date, s.title, c.name, c.sport
  from sessions s
  join clubs c on c.id = s.club_id
  where s.join_code = code and s.status = 'Open';
$$;
grant execute on function find_session_by_join_code_v2(text) to anon, authenticated;

create or replace function get_session_join_info_v2(code text)
returns table (status text, session_date date, payment_qr_url text, club_name text, sport text)
language sql
stable
security definer
set search_path = public
as $$
  select s.status, s.session_date, c.payment_qr_url, c.name, c.sport
  from sessions s
  join clubs c on c.id = s.club_id
  where s.join_code = code
  limit 1;
$$;
grant execute on function get_session_join_info_v2(text) to anon, authenticated;

-- request_game inserts as an anonymous visitor, who has no club of their
-- own — so club_id must come from the session, not the column default.
create or replace function request_game(
  code text,
  player_ids uuid[],
  requested_by text default null,
  requester_token text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  target_session_id uuid;
  target_session_date date;
  target_club_id uuid;
  registered_count integer;
  distinct_requested integer;
  next_game_number integer;
begin
  select id, session_date, club_id into target_session_id, target_session_date, target_club_id
  from sessions
  where join_code = code and status = 'Open';

  if target_session_id is null then
    raise exception 'That code doesn''t match an open session.';
  end if;

  player_ids := array_remove(player_ids, null);
  distinct_requested := (select count(distinct x) from unnest(player_ids) x);
  if distinct_requested = 0 then
    raise exception 'Pick at least one player.';
  end if;
  if distinct_requested > 4 then
    raise exception 'A set is at most 4 players.';
  end if;

  select count(*) into registered_count
  from player_sessions
  where session_id = target_session_id and player_id = any(player_ids);
  if registered_count <> distinct_requested then
    raise exception 'One or more players aren''t registered for this session.';
  end if;

  select coalesce(max(game_number), 0) + 1 into next_game_number
  from games
  where session_id = target_session_id;

  insert into games (club_id, session_id, game_number, game_date, status, player1_id, player2_id, player3_id, player4_id, requested_by, requester_token)
  values (target_club_id, target_session_id, next_game_number, target_session_date, 'Requested',
          player_ids[1], player_ids[2], player_ids[3], player_ids[4],
          nullif(trim(requested_by), ''), nullif(trim(requester_token), ''));

  return next_game_number;
end;
$$;
grant execute on function request_game(text, uuid[], text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage: each club uploads into its own "<club_id>/..." folder.
-- (Reads stay public — these are display images: the QR and the icon.)
--
-- On hosted Supabase, storage.objects is owned by supabase_storage_admin,
-- so changing these policies from a migration/SQL editor can fail with
-- "must be owner of table objects". If you see the notice below, make the
-- same change in Dashboard → Storage → Policies: for the INSERT, UPDATE and
-- DELETE policies on the assets bucket, use the expression
--   bucket_id = 'assets' and (storage.foldername(name))[1] = (select public.current_club_id())::text
-- ---------------------------------------------------------------------------
do $$
begin
  drop policy if exists "Require login to write (assets)" on storage.objects;
  drop policy if exists "Require login to update (assets)" on storage.objects;
  drop policy if exists "Require login to delete (assets)" on storage.objects;
  drop policy if exists "Own club folder write (assets)" on storage.objects;
  drop policy if exists "Own club folder update (assets)" on storage.objects;
  drop policy if exists "Own club folder delete (assets)" on storage.objects;

  create policy "Own club folder write (assets)" on storage.objects
    for insert with check (bucket_id = 'assets' and (storage.foldername(name))[1] = (select public.current_club_id())::text);
  create policy "Own club folder update (assets)" on storage.objects
    for update using (bucket_id = 'assets' and (storage.foldername(name))[1] = (select public.current_club_id())::text);
  create policy "Own club folder delete (assets)" on storage.objects
    for delete using (bucket_id = 'assets' and (storage.foldername(name))[1] = (select public.current_club_id())::text);
exception when insufficient_privilege then
  raise notice 'Could not change storage policies (not owner) — set them in Dashboard → Storage → Policies, see comment above.';
end $$;

-- ---------------------------------------------------------------------------
-- Realtime for the new settings table
-- ---------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table clubs;
exception when duplicate_object then null;
end $$;
