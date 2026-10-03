-- ---------------------------------------------------------------------------
-- Simple pricing + locked-down uploads (v3.1). Run after multi_tenant.sql.
-- Safe to re-run.
--
-- * New sessions are priced with two numbers: a court fee (the whole court
--   rent split evenly, or a flat amount per player) + a price per game.
-- * clubs.round_up_buffer: the original "round up to the next ₱10, then
--   +₱10" rule — on only for the original club, off for new clubs.
-- * Uploads (QR, icon) move to the "club-assets" bucket, which has no write
--   policy for signed-in users: the server uploads with the service-role
--   key after checking the caller is that club's admin. The old "assets"
--   bucket stays readable but refuses new uploads/overwrites.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('club-assets', 'club-assets', true)
  on conflict (id) do nothing;
update storage.buckets set allowed_mime_types = array['application/x-kro5-locked'] where id = 'assets';

alter table sessions drop constraint if exists sessions_fee_mode_check;
alter table sessions add constraint sessions_fee_mode_check check (fee_mode in ('split', 'fixed', 'simple'));
alter table sessions alter column fee_mode set default 'simple';
alter table sessions add column if not exists court_fee_type text not null default 'total';
do $$ begin
  alter table sessions add constraint sessions_court_fee_type_check check (court_fee_type in ('total', 'per_player'));
exception when duplicate_object then null; end $$;
alter table sessions add column if not exists court_amount numeric(10, 2) not null default 0;
alter table sessions add column if not exists per_game_fee numeric(10, 2) not null default 0;

alter table clubs add column if not exists round_up_buffer boolean not null default false;
-- (The live database turned this on for the original club only.)

alter table player_sessions add column if not exists use_buffer boolean not null default true;
alter table player_sessions alter column payable set expression as (
  case
    when discount_percent >= 100 then 0  -- a 100% discount means free, no +₱10
    when fixed_fee is not null then ceil(fixed_fee * (1 - discount_percent / 100.0))
    when (court_share + shuttle_share + surcharge_amount) = 0 then 0
    when use_buffer then ceil(((court_share + shuttle_share) * (1 - discount_percent / 100.0) + surcharge_amount) / 10.0) * 10 + 10
    else ceil((court_share + shuttle_share) * (1 - discount_percent / 100.0) + surcharge_amount)
  end
);

-- Each club picks how Start Session prices new sessions (changeable in the
-- club profile). The original club keeps the original model.
alter table clubs add column if not exists default_fee_mode text not null default 'simple';
do $$ begin
  alter table clubs add constraint clubs_default_fee_mode_check check (default_fee_mode in ('simple', 'split'));
exception when duplicate_object then null; end $$;
-- (The live database set default_fee_mode = 'split' for the original club.)
