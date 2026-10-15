# Graph Report - badminton-app  (2026-10-15)

## Corpus Check
- 87 files · ~67,531 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: .css 2, (none) 1, .ico 1)

## Summary
- 534 nodes · 1344 edges · 20 communities (15 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3a9d1390`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- queries.ts
- next
- createClient
- icons.tsx
- welcome/page.tsx
- app/actions.ts
- package.json
- JoinForm.tsx
- PlayerSessionRow.tsx
- sessions/page.tsx
- compilerOptions
- leaderboard/page.tsx
- Going live (Vercel + GitHub)
- manifest.json
- sw.js
- vercel.json
- AGENTS.md
- CLAUDE.md
- .claude/CLAUDE.md
- postcss.config.mjs

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 53 edges
2. `react` - 29 edges
3. `next` - 26 edges
4. `DashboardClient()` - 24 edges
5. `Modal()` - 22 edges
6. `createClient()` - 21 edges
7. `PlayerSessionRow()` - 20 edges
8. `compilerOptions` - 16 edges
9. `GameFormFields()` - 14 edges
10. `useIsOnline()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `How this maps to the old AppSheet app` --references--> `toggleGameStatus()`  [INFERRED]
  README.md → src/app/actions.ts
- `How this maps to the old AppSheet app` --references--> `cyclePaymentMethod()`  [INFERRED]
  README.md → src/app/actions.ts
- `How this maps to the old AppSheet app` --references--> `Home()`  [INFERRED]
  README.md → src/app/page.tsx
- `handleDelete()` --calls--> `deleteGame()`  [EXTRACTED]
  src/app/components/GameFormFields.tsx → src/app/actions.ts
- `GET()` --calls--> `createClient()`  [EXTRACTED]
  src/app/auth/callback/route.ts → src/lib/supabase/server.ts

## Import Cycles
- None detected.

## Communities (20 total, 5 thin omitted)

### Community 0 - "queries.ts"
Cohesion: 0.06
Nodes (49): react-dom, CourtBox(), confirmWinner(), GameForStatus, PlayerCell(), SessionOption, TeamHalf(), EditGameButton() (+41 more)

### Community 1 - "next"
Cohesion: 0.08
Nodes (40): nextConfig, next, @supabase/ssr, GET(), AccountRow(), handleRoleChange(), AddAccountForm(), handleSubmit() (+32 more)

### Community 2 - "createClient"
Cohesion: 0.08
Nodes (39): @fontsource/nunito, AppChrome(), CHROMELESS_PATHS, useLiveRefresh(), onDbChange(), onRefocus(), refreshNow(), WATCHED_TABLES (+31 more)

### Community 3 - "icons.tsx"
Cohesion: 0.11
Nodes (34): react, deleteSession(), endSession(), AddPlayerButton(), useClub(), useSport(), DashboardClient(), EditSessionButton() (+26 more)

### Community 4 - "welcome/page.tsx"
Cohesion: 0.10
Nodes (43): Arrow(), BadmintonLines(), Ball(), Check(), Crown(), LogoMark(), Paddle(), PickleballLines() (+35 more)

### Community 5 - "app/actions.ts"
Cohesion: 0.10
Nodes (38): qrcode.react, advanceGameStatus(), backfillSessionJoinCode(), bulkAddPlayers(), createGame(), createPlayer(), createSession(), cyclePaymentMethod() (+30 more)

### Community 6 - "package.json"
Cohesion: 0.05
Nodes (41): eslintConfig, dependencies, @fontsource/big-shoulders-display, @fontsource/nunito, @fontsource/space-mono, idb, next, qrcode.react (+33 more)

### Community 7 - "JoinForm.tsx"
Cohesion: 0.08
Nodes (32): ClubCtx, Matchup(), EmptyRow(), EndedView(), toggle(), getRequesterToken(), JoinForm(), QueueGame (+24 more)

### Community 8 - "PlayerSessionRow.tsx"
Cohesion: 0.11
Nodes (33): markPaid(), setDoneForSession(), setPlayerDiscount(), unmarkPaid(), IconPeso(), IconPhone(), IconTrash(), PayButton() (+25 more)

### Community 9 - "sessions/page.tsx"
Cohesion: 0.12
Nodes (23): Adding your payment QR code, First-time setup, How this maps to the old AppSheet app, Importing your real historical data, KRO5 — Badminton & pickleball queuing, What's next (not yet built), DashboardSeed, GameRow() (+15 more)

### Community 10 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 11 - "leaderboard/page.tsx"
Cohesion: 0.23
Nodes (14): IconTrophy(), dynamic, Highlight(), LeaderboardPage(), loadGames(), loadNames(), pct(), PodiumCard() (+6 more)

### Community 12 - "Going live (Vercel + GitHub)"
Cohesion: 0.20
Nodes (9): 1. Lock down the database (do this first, before deploying), 2. Push the code to GitHub, 3. Deploy on Vercel, 4. First login, 5. Roles (admin vs. user), 6. Live updates across devices, 7. Clubs (multi-tenant) — sign-up, sports, fixed fees, 8. Simple pricing + uploads (v3.1) (+1 more)

### Community 13 - "manifest.json"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, scope, short_name, start_url (+1 more)

### Community 14 - "sw.js"
Cohesion: 0.40
Nodes (3): CURRENT_CACHES, isCacheableAsset(), isSameOrigin()

## Knowledge Gaps
- **6 isolated node(s):** `@tailwindcss/postcss`, `@types/node`, `@types/react`, `@types/react-dom`, `tailwindcss` (+1 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 171 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `icons.tsx` to `queries.ts`, `next`, `createClient`, `welcome/page.tsx`, `app/actions.ts`, `package.json`, `JoinForm.tsx`, `PlayerSessionRow.tsx`?**
  _High betweenness centrality (0.180) - this node is a cross-community bridge._
- **What connects `@tailwindcss/postcss`, `@types/node`, `@types/react` to the rest of the system?**
  _6 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `queries.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06292966684294024 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `createClient`, `welcome/page.tsx`, `app/actions.ts`, `package.json`, `sessions/page.tsx`, `leaderboard/page.tsx`?**
  _High betweenness centrality (0.171) - this node is a cross-community bridge._
- **Should `next` be split into smaller, more focused modules?**
  _Cohesion score 0.07609427609427609 - nodes in this community are weakly interconnected._
- **Why does `createClient()` connect `app/actions.ts` to `queries.ts`, `next`, `createClient`, `icons.tsx`, `PlayerSessionRow.tsx`, `sessions/page.tsx`, `leaderboard/page.tsx`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Should `createClient` be split into smaller, more focused modules?**
  _Cohesion score 0.07918367346938776 - nodes in this community are weakly interconnected._