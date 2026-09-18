# Sat Games — Badminton session tracker

A coded rebuild of the "RFC Sat" AppSheet app: Saturday badminton game
queuing, per-player fee tracking, and payment QR display. Built with
Next.js (App Router) and Supabase.

## How this maps to the old AppSheet app

| AppSheet (Google Sheets) | Here |
| --- | --- |
| `Sessions` table | `sessions` table — court/shuttle costs are set per session (hours × rate, shuttle tube cost ÷ shuttles per tube ÷ 4 players), matching how the original sheet actually computed things |
| `Games` table (SessionID, Date, Status, Player1-4) | `games` table |
| `PlayerSessions` table (TotalGames, CourtShare, ShuttleShare, Payable, Payment) | `player_sessions` table — `payable` is a generated column reproducing the real AppSheet formula: `ceil((court_share + shuttle_share) / 10) * 10 + 10` (verified against all 383 historical rows) |
| `Home` table + payment QR image | `app_settings` singleton row, `payment_qr_url` field |
| "Done" row action on Games | `toggleGameStatus` server action |
| `Payment` column (Cash / Gcash / blank) | `payment_method` column — `cyclePaymentMethod` server action cycles Unpaid → GCash → Cash |

No AppSheet automations/bots existed in the original app — all logic lived in
column formulas — so there was no workflow engine to port; it all became
plain server-side functions in `src/app/actions.ts`.

## First-time setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (free tier is plenty for this).
2. **Run the schema.** Open the Supabase dashboard → SQL Editor → paste the contents of `supabase/schema.sql` → Run.
3. **Configure environment variables.**
   ```bash
   cp env.local.example.txt .env.local
   ```
   Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your Supabase project's Settings → API page (use the **Publishable key** — Supabase's newer name for what used to be the "anon" key).
4. **Install dependencies** (if you haven't already):
   ```bash
   npm install
   ```
5. **Run it:**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000.

## Importing your real historical data

`supabase/migrate_data.sql` is generated directly from the real "Queuing sat"
Google Sheet export — all 20 sessions, 338 games, and 376 player-session
records (4 test rows and 3 exact-duplicate rows were excluded; player names
that were identical except for casing, e.g. "Ced" / "CED", were merged
automatically). Paste its contents into the Supabase SQL editor and run it
**after** `schema.sql` has been applied to an empty database — both were
tested end-to-end against a scratch Postgres database before being handed
off, so it should apply cleanly in one shot.

A few player names look like they might be the same person spelled
differently and were **not** auto-merged (money attribution isn't something
to guess on):

- Danelle / Donelle
- Eunica / Eunika
- Kervin / Kervs
- Gabi / Gabby
- Ced / Cedric / Cedrick
- Ed / Edison

If any of these are actually the same person, merge them with something like:

```sql
-- example: merging "Donelle" into "Danelle"
update player_sessions set player_id = (select id from players where name = 'Danelle')
  where player_id = (select id from players where name = 'Donelle');
update games set player1_id = (select id from players where name = 'Danelle') where player1_id = (select id from players where name = 'Donelle');
update games set player2_id = (select id from players where name = 'Danelle') where player2_id = (select id from players where name = 'Donelle');
update games set player3_id = (select id from players where name = 'Danelle') where player3_id = (select id from players where name = 'Donelle');
update games set player4_id = (select id from players where name = 'Danelle') where player4_id = (select id from players where name = 'Donelle');
delete from players where name = 'Donelle';
```

**If you already ran the old (v1) `schema.sql`** and seeded test data, reset
first so the new schema applies cleanly:

```sql
drop table if exists games, player_sessions, sessions, players, app_settings cascade;
```

Then run the current `schema.sql`, then `migrate_data.sql`.

## Adding your payment QR code

Upload your GCash/bank QR image anywhere reachable by URL (e.g. Supabase
Storage, or any image host), then set it:

```sql
update app_settings set payment_qr_url = 'https://...' where id = 1;
```

## What's next (not yet built)

- "New session" / "add game" / "add player" UI (currently done via SQL or the Supabase table editor).
- Authentication, if you want to restrict who can mark games done or payments as paid (RLS is currently wide open — see the comment in `supabase/schema.sql`).
