-- Badminton App schema (v2)
-- Mirrors the AppSheet "RFC Sat" app's tables (Sessions, Games, PlayerSessions, Home),
-- rebuilt as a proper relational schema instead of a Google Sheet.
--
-- v2 correction: the real fee model was reverse-engineered from actual historical
-- data (the "Queuing sat" Google Sheet export), which revealed two things v1 got
-- wrong:
--   1. Court/shuttle rates are set PER SESSION (court rental hours x hourly rate,
--      shuttle tube cost split across shuttles and then across a 4-player game),
--      not a single global rate in app_settings.
--   2. "Payable" is not simply CourtShare + ShuttleShare. It's rounded up with a
--      buffer: Payable = ceil((CourtShare + ShuttleShare) / 10) * 10 + 10. This
--      was verified against all 383 historical PlayerSessions rows with zero
--      mismatches, so it's encoded as the generated column formula below.
--   3. "Payment" in the source data is the METHOD used (Cash / Gcash), not a
--      plain paid/unpaid flag.
--
-- Run this in the Supabase SQL editor (or `supabase db push` once you have the CLI set up).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- players
-- New table (AppSheet stored player names as free text). Having a real table
-- lets us keep a stable roster instead of re-typing names every session.
-- ---------------------------------------------------------------------------
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- sessions   (was: AppSheet "Sessions" table)
-- One row per game day. Court/shuttle costs are set here per session (they
-- varied week to week in the historical data — different hours, different
-- rates) and shared out across whoever shows up that day.
-- ---------------------------------------------------------------------------
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  session_date date not null,
  title text,
  status text not null default 'Open' check (status in ('Open', 'Closed')),

  hours numeric(5, 2) not null default 0,
  fee_per_hour numeric(10, 2) not null default 0,
  court_fee numeric(10, 2) generated always as (hours * fee_per_hour) stored,

  shuttle_tube_cost numeric(10, 2) not null default 0,
  shuttles_per_tube integer not null default 12,
  cost_per_shuttle numeric(10, 2) generated always as (
    case when shuttles_per_tube = 0 then 0 else shuttle_tube_cost / shuttles_per_tube end
  ) stored,
  -- one shuttle is shared by a 4-player doubles game
  shuttle_fee_per_game numeric(10, 2) generated always as (
    case when shuttles_per_tube = 0 then 0 else shuttle_tube_cost / shuttles_per_tube / 4 end
  ) stored,

  -- how many distinct players showed up this session; court cost is split evenly across them
  player_count integer not null default 0,
  court_share_per_player numeric(10, 2) generated always as (
    case when player_count = 0 then 0 else (hours * fee_per_hour) / player_count end
  ) stored,

  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- games   (was: AppSheet "Games" table)
-- One row per individual game (doubles: 4 players) within a session.
-- ---------------------------------------------------------------------------
create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  game_number integer not null,
  game_date date not null,
  status text not null default 'Queued' check (status in ('Queued', 'Ongoing', 'Done')),
  player1_id uuid references players(id),
  player2_id uuid references players(id),
  player3_id uuid references players(id),
  player4_id uuid references players(id),
  created_at timestamptz not null default now(),
  unique (session_id, game_number)
);

-- safe to re-run against a database created before "Ongoing" existed
alter table games drop constraint if exists games_status_check;
alter table games add constraint games_status_check check (status in ('Queued', 'Ongoing', 'Done'));

-- ---------------------------------------------------------------------------
-- player_sessions   (was: AppSheet "PlayerSessions" table)
-- One row per player per session: how many games they played and what they owe.
-- court_share is that session's court_share_per_player (constant per player for
-- the day); shuttle_share scales with how many games they actually played.
-- ---------------------------------------------------------------------------
create table if not exists player_sessions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  player_id uuid not null references players(id),
  total_games integer not null default 0,
  court_share numeric(10, 2) not null default 0,
  shuttle_share numeric(10, 2) not null default 0,
  payable numeric(10, 2) generated always as (
    case when (court_share + shuttle_share) = 0 then 0
         else ceil((court_share + shuttle_share) / 10.0) * 10 + 10
    end
  ) stored,
  -- null = unpaid; otherwise the method used
  payment_method text check (payment_method is null or payment_method in ('Cash', 'Gcash')),
  -- set from the "Done" toggle on a player row once someone's finished
  -- playing for the day; excludes them from the New Game player picker
  -- while keeping their games/payment record intact.
  done_for_session boolean not null default false,
  created_at timestamptz not null default now(),
  unique (session_id, player_id)
);

-- safe to re-run against a database created before done_for_session existed
alter table player_sessions add column if not exists done_for_session boolean not null default false;

-- ---------------------------------------------------------------------------
-- app_settings   (was: AppSheet "Home" table, plus QR config)
-- Single-row settings table: display title and the payment QR image.
-- Rates now live per-session above, not here.
-- ---------------------------------------------------------------------------
create table if not exists app_settings (
  id integer primary key default 1 check (id = 1), -- enforce a single row
  display_title text not null default 'Sat Games',
  payment_qr_url text,
  app_icon_url text,
  updated_at timestamptz not null default now()
);

-- safe to re-run against a database created before app_icon_url existed
alter table app_settings add column if not exists app_icon_url text;

insert into app_settings (id) values (1)
  on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- The app now sits behind a login (Supabase Auth + a proxy/middleware
-- redirect), so every table requires a signed-in user for every operation —
-- there's no per-user data ownership here (it's one shared group app), just
-- "must be logged in." If you're running this against a fresh database
-- before setting up auth, these policies still work: an anon (logged-out)
-- request is simply refused until you sign in.
-- ---------------------------------------------------------------------------
alter table players enable row level security;
alter table sessions enable row level security;
alter table games enable row level security;
alter table player_sessions enable row level security;
alter table app_settings enable row level security;

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

-- ---------------------------------------------------------------------------
-- storage   (uploaded images — the app icon and the payment QR code, set
-- from the app's Settings popup instead of pasting a URL by hand)
-- One public bucket. Reads stay public (so <img src="..."> tags just work
-- without signed URLs — these are non-sensitive display images), but
-- writes require a signed-in user, same as the tables above.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('assets', 'assets', true)
  on conflict (id) do nothing;

drop policy if exists "Allow all read (assets)" on storage.objects;
drop policy if exists "Allow all insert (assets)" on storage.objects;
drop policy if exists "Allow all update (assets)" on storage.objects;
drop policy if exists "Allow all delete (assets)" on storage.objects;

create policy "Allow all read (assets)" on storage.objects
  for select using (bucket_id = 'assets');
create policy "Require login to write (assets)" on storage.objects
  for insert with check (bucket_id = 'assets' and auth.uid() is not null);
create policy "Require login to update (assets)" on storage.objects
  for update using (bucket_id = 'assets' and auth.uid() is not null);
create policy "Require login to delete (assets)" on storage.objects
  for delete using (bucket_id = 'assets' and auth.uid() is not null);
