"use client";

/**
 * The dashboard's offline data cache — IndexedDB, via the tiny `idb`
 * wrapper. Scoped to just the *active* session's data (not the whole
 * app's history — that's what the online-only pages still read straight
 * from Supabase), which keeps this small and keeps the read helper below
 * fast.
 *
 * Stores are normalized (bare `Game`/`PlayerSession` rows, `Player` rows
 * kept separately) rather than mirroring the denormalized `GameWithPlayers`/
 * `PlayerSessionWithPlayer` shapes the UI actually wants — `loadActiveDashboardData`
 * joins them back together at read time. Two reasons: a `players` row is
 * shared across many games/player_sessions, so storing it once avoids N
 * stale copies drifting apart; and a future Realtime "one row changed"
 * payload (Phase 3) is always exactly one of these bare rows, so a
 * normalized store is the one that a single-row upsert can write into
 * directly without re-deriving anything.
 *
 * What's deliberately NOT cached here: anything money-derived that Postgres
 * computes (`payable`, `court_share_per_player`, etc.) is cached as-is
 * (whatever the server last said), never recalculated client-side — see
 * offlineQueue.ts for how mutations that would change those numbers are
 * handled offline (queued, but shown as "pending" rather than guessed).
 */

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
// Type-only import from queries.ts (a server-only module) — erased at
// compile time, so it doesn't pull any server code into the client bundle.
import type { GameWithPlayers, SessionOption } from "@/lib/queries";
import type { AppSettings, Game, Player, PlayerSession, PlayerSessionWithPlayer, Session } from "@/lib/types";

const DB_NAME = "badminton-dashboard-cache";
// v2: app_settings now holds the club row (string uuid key) instead of the
// old single-row settings keyed by the number 1.
const DB_VERSION = 2;

interface DashboardDB extends DBSchema {
  /** Every session as a picker option (id + date); the active session's row
   * is additionally overwritten with its full `Session` fields (see
   * seedFromServer) — that's the only one the dashboard renders in full. */
  sessions: { key: string; value: SessionOption & Partial<Session> };
  games: { key: string; value: Game; indexes: { session_id: string } };
  players: { key: string; value: Player };
  player_sessions: { key: string; value: PlayerSession; indexes: { session_id: string } };
  app_settings: { key: string; value: AppSettings };
  /** Small out-of-line key/value bucket for bookkeeping — which session is
   * "active" right now, and when the cache was last refreshed from the
   * server. Not a real table. */
  meta: { key: string; value: string | number | null };
}

/** Strips the joined `player1..4` objects a GameWithPlayers carries,
 * leaving just the bare Game row the `games` store keys on `player*_id`
 * for — those foreign keys are what gets stored; the joined objects get
 * reconstructed from the `players` store at read time instead. */
function toBareGame(g: GameWithPlayers): Game {
  return {
    id: g.id,
    session_id: g.session_id,
    game_number: g.game_number,
    game_date: g.game_date,
    status: g.status,
    player1_id: g.player1_id,
    player2_id: g.player2_id,
    player3_id: g.player3_id,
    player4_id: g.player4_id,
    winner_team: g.winner_team,
    score1: g.score1,
    score2: g.score2,
    requested_by: g.requested_by,
    created_at: g.created_at,
  };
}

/** Strips the joined `player` object a PlayerSessionWithPlayer carries —
 * same idea as toBareGame above. */
function toBarePlayerSession(ps: PlayerSessionWithPlayer): PlayerSession {
  return {
    id: ps.id,
    session_id: ps.session_id,
    player_id: ps.player_id,
    total_games: ps.total_games,
    court_share: ps.court_share,
    shuttle_share: ps.shuttle_share,
    discount_percent: ps.discount_percent,
    surcharge_amount: ps.surcharge_amount,
    fixed_fee: ps.fixed_fee,
    use_buffer: ps.use_buffer,
    payable: ps.payable,
    payment_method: ps.payment_method,
    done_for_session: ps.done_for_session,
    created_at: ps.created_at,
  };
}

let dbPromise: Promise<IDBPDatabase<DashboardDB>> | null = null;

function getDB(): Promise<IDBPDatabase<DashboardDB>> | null {
  if (typeof indexedDB === "undefined") return null; // SSR / unsupported browser
  if (!dbPromise) {
    dbPromise = openDB<DashboardDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // Simplest safe upgrade for a cache: drop everything and rebuild —
        // it's re-seeded from the server on the next online load anyway.
        if (oldVersion > 0) {
          for (const name of Array.from(db.objectStoreNames)) db.deleteObjectStore(name);
        }
        db.createObjectStore("sessions", { keyPath: "id" });
        const games = db.createObjectStore("games", { keyPath: "id" });
        games.createIndex("session_id", "session_id");
        db.createObjectStore("players", { keyPath: "id" });
        const playerSessions = db.createObjectStore("player_sessions", { keyPath: "id" });
        playerSessions.createIndex("session_id", "session_id");
        db.createObjectStore("app_settings", { keyPath: "id" });
        db.createObjectStore("meta");
      },
    });
  }
  return dbPromise;
}

/** What the dashboard needs, in the shape it needs it — the same shape
 * whether it just came from the server (page.tsx's fetch) or from this
 * cache (see DashboardClient, which derives everything else — queued vs.
 * ongoing games, MVP, unpaid players, etc. — from this uniformly so the
 * two sources never disagree on how a number is computed, only on how
 * fresh it is). */
export type DashboardData = {
  settings: AppSettings | null;
  session: Session | null;
  /** All sessions (for pickers in the New/Edit Game modal) — id + date only. */
  sessions: SessionOption[];
  sessionPlayers: PlayerSessionWithPlayer[];
  games: GameWithPlayers[];
};

/** Writes a freshly server-fetched DashboardData into the cache. Called
 * once per dashboard load whenever the server *was* reachable — this is
 * what keeps the cache warm for the next time it isn't. */
export async function seedFromServer(data: DashboardData): Promise<void> {
  const db = await getDB();
  if (!db) return;

  const tx = db.transaction(
    ["sessions", "games", "players", "player_sessions", "app_settings", "meta"],
    "readwrite"
  );

  // A different club signed in on this device (or the first seed since the
  // app went multi-tenant) — wipe the previous club's cached data first so
  // it can never show up under the new one.
  const cachedClubId = await tx.objectStore("meta").get("clubId");
  const clubId = data.settings?.id ?? null;
  if (cachedClubId !== clubId) {
    for (const store of ["sessions", "games", "players", "player_sessions", "app_settings"] as const) {
      await tx.objectStore(store).clear();
    }
    await tx.objectStore("meta").put(clubId, "clubId");
  }

  const sessionsStore = tx.objectStore("sessions");
  await sessionsStore.clear();
  for (const s of data.sessions) await sessionsStore.put(s);
  // Overwrite the active session's option row with its full fields, so an
  // offline load can rebuild it (hours, fees, join code…) from this store.
  if (data.session) await sessionsStore.put(data.session);

  if (data.settings) {
    await tx.objectStore("app_settings").clear();
    await tx.objectStore("app_settings").put(data.settings);
  }

  // Every player referenced anywhere in this payload, deduped — upsert
  // rather than clear-and-replace, since players from a previous session
  // may already be cached and there's no harm leaving them.
  const players = new Map<string, Player>();
  for (const ps of data.sessionPlayers) players.set(ps.player.id, ps.player);
  for (const g of data.games) {
    for (const p of [g.player1, g.player2, g.player3, g.player4]) {
      if (p) players.set(p.id, p);
    }
  }
  const playersStore = tx.objectStore("players");
  for (const p of players.values()) await playersStore.put(p);

  if (data.session) {
    // Replace this session's games/player_sessions wholesale — a deleted
    // game or removed player shouldn't linger in the cache forever.
    const gamesStore = tx.objectStore("games");
    const oldGameKeys = await gamesStore.index("session_id").getAllKeys(data.session.id);
    for (const key of oldGameKeys) await gamesStore.delete(key);
    for (const g of data.games) {
      await gamesStore.put(toBareGame(g));
    }

    const psStore = tx.objectStore("player_sessions");
    const oldPsKeys = await psStore.index("session_id").getAllKeys(data.session.id);
    for (const key of oldPsKeys) await psStore.delete(key);
    for (const ps of data.sessionPlayers) {
      await psStore.put(toBarePlayerSession(ps));
    }
  }

  const metaStore = tx.objectStore("meta");
  await metaStore.put(data.session?.id ?? null, "activeSessionId");
  await metaStore.put(Date.now(), "lastSyncedAt");

  await tx.done;
}

/** Reads the cache back into the same DashboardData shape. Returns `null`
 * only when nothing has ever been cached (this device has never loaded the
 * dashboard online) — a legitimately empty *session* (cache is warm, there
 * just isn't one yet) still returns a value, with `session: null`, matching
 * what the server would say in that case too. */
export async function loadActiveDashboardData(): Promise<DashboardData | null> {
  const db = await getDB();
  if (!db) return null;

  const lastSyncedAt = await db.get("meta", "lastSyncedAt");
  if (lastSyncedAt == null) return null;

  const settings = (await db.getAll("app_settings"))[0] ?? null;

  const storedSessions = await db.getAll("sessions");
  storedSessions.sort((a, b) => (a.session_date < b.session_date ? 1 : a.session_date > b.session_date ? -1 : 0));
  const sessions: SessionOption[] = storedSessions.map((s) => ({ id: s.id, session_date: s.session_date }));

  const activeSessionId = ((await db.get("meta", "activeSessionId")) as string | null) ?? null;
  const activeRow = activeSessionId ? storedSessions.find((s) => s.id === activeSessionId) : undefined;
  // Only a row that carries the full fields counts (a bare option row means
  // the cache was never fully seeded for it).
  const session = activeRow && "court_fee" in activeRow ? (activeRow as Session) : null;

  const playersById = new Map<string, Player>();
  for (const p of await db.getAll("players")) playersById.set(p.id, p);

  const rawGames = activeSessionId
    ? await db.getAllFromIndex("games", "session_id", activeSessionId)
    : [];
  rawGames.sort((a, b) => a.game_number - b.game_number);
  const games: GameWithPlayers[] = rawGames.map((g) => ({
    ...g,
    player1: g.player1_id ? (playersById.get(g.player1_id) ?? null) : null,
    player2: g.player2_id ? (playersById.get(g.player2_id) ?? null) : null,
    player3: g.player3_id ? (playersById.get(g.player3_id) ?? null) : null,
    player4: g.player4_id ? (playersById.get(g.player4_id) ?? null) : null,
  }));

  const rawPlayerSessions = activeSessionId
    ? await db.getAllFromIndex("player_sessions", "session_id", activeSessionId)
    : [];
  rawPlayerSessions.sort((a, b) => a.total_games - b.total_games);
  const sessionPlayers: PlayerSessionWithPlayer[] = rawPlayerSessions
    .filter((ps) => playersById.has(ps.player_id))
    .map((ps) => ({ ...ps, player: playersById.get(ps.player_id)! }));

  return { settings, session, sessions, sessionPlayers, games };
}

/** When the cache was last refreshed from a real server response — used to
 * word the offline banner ("showing data from 6 minutes ago") rather than
 * just a flat "offline" with no sense of how stale it might be. */
export async function getLastSyncedAt(): Promise<number | null> {
  const db = await getDB();
  if (!db) return null;
  const value = await db.get("meta", "lastSyncedAt");
  return typeof value === "number" ? value : null;
}

/** Wipes the whole cache — called on sign-out, so the next person to sign
 * in on this device (possibly from another club) never sees this data. */
export async function clearLocalCache(): Promise<void> {
  const db = await getDB();
  if (!db) return;
  const tx = db.transaction(
    ["sessions", "games", "players", "player_sessions", "app_settings", "meta"],
    "readwrite"
  );
  for (const store of ["sessions", "games", "players", "player_sessions", "app_settings", "meta"] as const) {
    await tx.objectStore(store).clear();
  }
  await tx.done;
}
