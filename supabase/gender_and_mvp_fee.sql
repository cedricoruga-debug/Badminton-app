-- ---------------------------------------------------------------------------
-- Player gender + MVP fee (v3.2). Run after simple_pricing.sql.
-- Safe to re-run. Run this BEFORE deploying the code that uses it.
--
-- * players.gender: 'Male' / 'Female', optional (null = not set).
-- * sessions.mvp_fee: pesos taken off Today's MVP's fee. Two or more MVPs
--   (tied win rate) share it equally. 0 = no MVP discount.
-- * player_sessions.mvp_adjustment: server-managed (see
--   recomputePlayerGameCounts in src/app/actions.ts). Negative for an MVP
--   (their share of the MVP fee off), positive for everyone else who played
--   (their even share of covering it), so the session still collects the
--   same total.
-- ---------------------------------------------------------------------------
alter table players add column if not exists gender text;
do $$ begin
  alter table players add constraint players_gender_check check (gender in ('Male', 'Female'));
exception when duplicate_object then null; end $$;

alter table sessions add column if not exists mvp_fee numeric(10, 2) not null default 0;
alter table player_sessions add column if not exists mvp_adjustment numeric(10, 2) not null default 0;

-- Same as simple_pricing.sql's formula, plus mvp_adjustment — and an MVP
-- whose discount covers their whole amount pays 0 (no +₱10 buffer).
alter table player_sessions alter column payable set expression as (
  case
    when discount_percent >= 100 then 0  -- a 100% discount means free, no +₱10
    when fixed_fee is not null then greatest(0, ceil(fixed_fee * (1 - discount_percent / 100.0) + mvp_adjustment))
    when (court_share + shuttle_share + surcharge_amount) = 0 then 0
    when (court_share + shuttle_share) * (1 - discount_percent / 100.0) + surcharge_amount + mvp_adjustment <= 0 then 0
    when use_buffer then ceil(((court_share + shuttle_share) * (1 - discount_percent / 100.0) + surcharge_amount + mvp_adjustment) / 10.0) * 10 + 10
    else ceil((court_share + shuttle_share) * (1 - discount_percent / 100.0) + surcharge_amount + mvp_adjustment)
  end
);
