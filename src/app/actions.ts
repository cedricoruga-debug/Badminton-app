"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentUserRole } from "@/lib/accounts";
import { createClient } from "@/lib/supabase/server";

/**
 * Recompute total_games, court_share and shuttle_share for every player
 * registered in a session — counting only games that have actually been
 * played (status "Ongoing" or "Done"; "Queued" doesn't count yet), and
 * pulling court_share_per_player / shuttle_fee_per_game fresh from the
 * session every time. Derived fresh rather than kept as running totals so
 * none of it can drift out of sync with what's actually true: creating,
 * editing, deleting a game, or moving its status all funnel through this —
 * and so does editing the session's own cost inputs (hours, fee/hour,
 * shuttle tube cost) via updateSession, since those change
 * court_share_per_player and shuttle_fee_per_game without touching a game
 * at all.
 *
 * total_games then feeds shuttle_share (total_games * shuttle_fee_per_game),
 * and payable is a generated column off (court_share + shuttle_share) —
 * mirroring the original sheet's =CEILING(E+F+10, 10) rounding, since
 * ceil((court_share + shuttle_share) / 10) * 10 + 10 is the same formula.
 */
async function recomputePlayerGameCounts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string
) {
  // These three reads don't depend on each other, so fire them together
  // instead of one after another — halves the network round-trips this
  // function needs (it's called after every game create/edit/delete/status
  // change, so that adds up).
  const [
    { data: games, error: gamesError },
    { data: session, error: sessionError },
    { data: playerSessions, error: psError },
  ] = await Promise.all([
    supabase
      .from("games")
      .select("player1_id, player2_id, player3_id, player4_id")
      .eq("session_id", sessionId)
      .in("status", ["Ongoing", "Done"]),
    supabase
      .from("sessions")
      .select("court_share_per_player, shuttle_fee_per_game")
      .eq("id", sessionId)
      .single(),
    supabase.from("player_sessions").select("id, player_id").eq("session_id", sessionId),
  ]);
  if (gamesError) throw new Error(gamesError.message);
  if (sessionError) throw new Error(sessionError.message);
  if (psError) throw new Error(psError.message);

  const counts = new Map<string, number>();
  for (const g of games ?? []) {
    for (const playerId of [g.player1_id, g.player2_id, g.player3_id, g.player4_id]) {
      if (playerId) counts.set(playerId, (counts.get(playerId) ?? 0) + 1);
    }
  }

  const courtSharePerPlayer = session.court_share_per_player;
  const shuttleFeePerGame = session.shuttle_fee_per_game;

  // One request updating every player_session row at once, instead of one
  // request per player (this function runs after every game
  // create/edit/delete/status change, so with a full roster that used to
  // mean a dozen-plus parallel round trips just to update a count). Postgres
  // needs the not-null columns present even on a row that's really just
  // getting updated (session_id/player_id are unchanged — same values the
  // row already has — but ON CONFLICT DO UPDATE still validates the
  // candidate row before it realizes there's a conflict to resolve).
  if ((playerSessions ?? []).length > 0) {
    const rows = playerSessions!.map((ps) => {
      const totalGames = counts.get(ps.player_id) ?? 0;
      return {
        id: ps.id,
        session_id: sessionId,
        player_id: ps.player_id,
        total_games: totalGames,
        court_share: courtSharePerPlayer,
        shuttle_share: totalGames * shuttleFeePerGame,
      };
    });
    const { error } = await supabase.from("player_sessions").upsert(rows, { onConflict: "id" });
    if (error) throw new Error(error.message);
  }
}

/** Toggle a game between "Queued" and "Done" (was the AppSheet "Done" action). */
export async function toggleGameStatus(gameId: string, currentStatus: string) {
  const supabase = await createClient();
  const nextStatus = currentStatus === "Done" ? "Queued" : "Done";

  const { data: game, error } = await supabase
    .from("games")
    .update({ status: nextStatus })
    .eq("id", gameId)
    .select("session_id")
    .single();
  if (error) throw new Error(error.message);

  await recomputePlayerGameCounts(supabase, game.session_id);
  revalidatePath("/");
  revalidatePath("/games");
  revalidatePath("/sessions");
  revalidatePath("/player-sessions");
}

const STATUS_FORWARD: Record<string, "Queued" | "Ongoing" | "Done"> = {
  Queued: "Ongoing",
  Ongoing: "Done",
  Done: "Done",
};

/** Move a game one step forward: Queued -> Ongoing -> Done (the "Move forward" button). */
export async function advanceGameStatus(gameId: string, currentStatus: string) {
  const supabase = await createClient();
  const nextStatus = STATUS_FORWARD[currentStatus] ?? "Queued";

  const { data: game, error } = await supabase
    .from("games")
    .update({ status: nextStatus })
    .eq("id", gameId)
    .select("session_id")
    .single();
  if (error) throw new Error(error.message);

  await recomputePlayerGameCounts(supabase, game.session_id);
  revalidatePath("/");
  revalidatePath("/games");
  revalidatePath("/sessions");
  revalidatePath("/player-sessions");
}

/**
 * Finish an Ongoing game and record its winner in one step — the shortcut
 * behind CourtBox's two clickable court halves (tap a side, then Confirm).
 * Jumps straight to "Done" with the tapped team as winner instead of making
 * you open Edit Game and set status + winner separately. Score isn't part
 * of this shortcut (usually not known/needed tap-side) — add one later via
 * Edit Game if you want it on record.
 */
export async function finishGameWithWinner(gameId: string, winnerTeam: "team1" | "team2") {
  const supabase = await createClient();

  const { data: game, error } = await supabase
    .from("games")
    .update({ status: "Done", winner_team: winnerTeam })
    .eq("id", gameId)
    .select("session_id")
    .single();
  if (error) throw new Error(error.message);

  await recomputePlayerGameCounts(supabase, game.session_id);
  revalidatePath("/");
  revalidatePath("/games");
  revalidatePath("/sessions");
  revalidatePath("/player-sessions");
}

const PAYMENT_CYCLE: Array<"Unpaid" | "Cash" | "Gcash"> = ["Unpaid", "Gcash", "Cash"];

/** Cycle a player's payment method for a session: Unpaid -> GCash -> Cash -> Unpaid. */
export async function cyclePaymentMethod(
  playerSessionId: string,
  currentMethod: "Cash" | "Gcash" | null
) {
  const supabase = await createClient();
  const current = currentMethod ?? "Unpaid";
  const currentIndex = PAYMENT_CYCLE.indexOf(current);
  const next = PAYMENT_CYCLE[(currentIndex + 1) % PAYMENT_CYCLE.length];

  const { error } = await supabase
    .from("player_sessions")
    .update({ payment_method: next === "Unpaid" ? null : next })
    .eq("id", playerSessionId);

  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/sessions");
  revalidatePath("/player-sessions");
}

/** Retract a player's payment — sends them straight back to Unpaid so the
 * "Mark paid" icons show up again (e.g. the wrong method was tapped by
 * mistake, or the payment needs to be redone). */
export async function unmarkPaid(playerSessionId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("player_sessions")
    .update({ payment_method: null })
    .eq("id", playerSessionId);

  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/sessions");
  revalidatePath("/player-sessions");
}

/** Mark a player's session as paid via a specific method (Cash or GCash). */
export async function markPaid(playerSessionId: string, method: "Cash" | "Gcash") {
  const supabase = await createClient();

  const { error } = await supabase
    .from("player_sessions")
    .update({ payment_method: method })
    .eq("id", playerSessionId);

  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/sessions");
  revalidatePath("/player-sessions");
}

/**
 * Register a player for a session: bumps the session's own player_count
 * (there's no manual "expected player count" field anymore — headcount is
 * just however many players have actually joined), which recomputes the
 * session's court_share_per_player (a generated column), then re-splits
 * that fresh share across everyone already in the session as well as the
 * player being added, so the court fee always divides evenly by however
 * many people showed up.
 */
async function registerPlayerForSession(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
  playerId: string
) {
  const { count, error: countError } = await supabase
    .from("player_sessions")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);
  if (countError) throw new Error(countError.message);

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .update({ player_count: (count ?? 0) + 1 })
    .eq("id", sessionId)
    .select("court_share_per_player")
    .single();
  if (sessionError) throw new Error(sessionError.message);

  const newShare = session.court_share_per_player;

  const { error: rebalanceError } = await supabase
    .from("player_sessions")
    .update({ court_share: newShare })
    .eq("session_id", sessionId);
  if (rebalanceError) throw new Error(rebalanceError.message);

  const { error: insertError } = await supabase.from("player_sessions").insert({
    session_id: sessionId,
    player_id: playerId,
    total_games: 0,
    court_share: newShare,
    shuttle_share: 0,
  });
  if (insertError) throw new Error(insertError.message);
}

/**
 * Look up the roster by name (case-insensitive) and reuse that player if
 * found, only inserting a new `players` row when the name is genuinely new.
 * Shared by createPlayer and bulkAddPlayers — both hit the same
 * `players_name_key` duplicate-key problem otherwise, since most
 * submissions are actually a returning player being registered for a new
 * date, not a brand-new person.
 */
async function findOrCreatePlayerByName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  name: string
): Promise<string> {
  const { data: existing, error: lookupError } = await supabase
    .from("players")
    .select("id")
    .ilike("name", name)
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);

  if (existing) return existing.id;

  const { data: player, error } = await supabase
    .from("players")
    .insert({ name })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return player.id;
}

/**
 * Register a player for a session unless they're already on it — a plain
 * registerPlayerForSession call assumes a fresh registration and would
 * double-count the court share / crash on the player_sessions unique
 * constraint if the player (found or created above) turns out to already be
 * registered.
 */
async function registerIfNotAlready(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
  playerId: string
) {
  const { count: alreadyRegistered, error: existingRegError } = await supabase
    .from("player_sessions")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("player_id", playerId);
  if (existingRegError) throw new Error(existingRegError.message);

  if (!alreadyRegistered) {
    await registerPlayerForSession(supabase, sessionId, playerId);
  }
}

/**
 * Add a player to a session via the "New player" / "Add player" forms.
 * Redirects to "/" by default, or wherever `redirect_to` says (e.g. back to
 * the Sessions page you added them from).
 */
export async function createPlayer(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const sessionId = String(formData.get("session_id") ?? "");
  const redirectTo = String(formData.get("redirect_to") ?? "/");
  if (!name) throw new Error("Name is required");

  const supabase = await createClient();
  const playerId = await findOrCreatePlayerByName(supabase, name);

  if (sessionId) {
    await registerIfNotAlready(supabase, sessionId, playerId);
  }

  revalidatePath("/");
  revalidatePath("/sessions");
  redirect(redirectTo);
}

/**
 * Add a whole roster at once — the "Bulk add" mode of the New Player form,
 * one name per line pasted into a textarea instead of adding players one at
 * a time. Blank lines are skipped; duplicate lines (someone pasted the same
 * name twice) are deduped case-insensitively so they don't get registered
 * twice in the same submission. Each name goes through the same
 * find-or-create + register logic as a single add, so a list mixing
 * brand-new names with returning regulars just works.
 */
export async function bulkAddPlayers(formData: FormData) {
  const raw = String(formData.get("names") ?? "");
  const sessionId = String(formData.get("session_id") ?? "");
  const redirectTo = String(formData.get("redirect_to") ?? "/");
  if (!sessionId) throw new Error("Missing session");

  const seen = new Set<string>();
  const names = raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      const key = line.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  if (names.length === 0) throw new Error("Paste at least one name");

  const supabase = await createClient();

  // One name at a time, not Promise.all — registerIfNotAlready reads and
  // then writes the session's player_count, so two of these racing would
  // read the same stale count and stomp on each other's court-share split.
  for (const name of names) {
    const playerId = await findOrCreatePlayerByName(supabase, name);
    await registerIfNotAlready(supabase, sessionId, playerId);
  }

  revalidatePath("/");
  revalidatePath("/sessions");
  redirect(redirectTo);
}

/**
 * Remove a player's registration from a session (the trash icon on a player
 * row) — deletes their player_sessions row, then re-splits the session's
 * court fee across however many players remain. Doesn't touch the player's
 * roster entry, just their record for this one session.
 */
export async function removePlayerFromSession(playerSessionId: string, sessionId: string) {
  const supabase = await createClient();

  const { error: deleteError } = await supabase
    .from("player_sessions")
    .delete()
    .eq("id", playerSessionId);
  if (deleteError) throw new Error(deleteError.message);

  const { count, error: countError } = await supabase
    .from("player_sessions")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);
  if (countError) throw new Error(countError.message);

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .update({ player_count: count ?? 0 })
    .eq("id", sessionId)
    .select("court_share_per_player")
    .single();
  if (sessionError) throw new Error(sessionError.message);

  const { error: rebalanceError } = await supabase
    .from("player_sessions")
    .update({ court_share: session.court_share_per_player })
    .eq("session_id", sessionId);
  if (rebalanceError) throw new Error(rebalanceError.message);

  revalidatePath("/");
  revalidatePath("/sessions");
  revalidatePath("/player-sessions");
}

/**
 * Set (or clear) a player's discount for a session — the "Discount" editor
 * in their popup. A flat percentage off the court+shuttle cost, applied by
 * the `payable` generated column itself (see schema.sql), so this just
 * writes the one number; nothing here needs to touch court_share or
 * recompute anything else.
 */
export async function setPlayerDiscount(playerSessionId: string, discountPercent: number) {
  const clamped = Math.min(100, Math.max(0, Math.round(discountPercent)));

  const supabase = await createClient();
  const { error } = await supabase
    .from("player_sessions")
    .update({ discount_percent: clamped })
    .eq("id", playerSessionId);
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/sessions");
  revalidatePath("/player-sessions");
}

/**
 * Mark a player "done" for a session (or undo that) — the "Done" toggle on
 * a player row. Done players stop showing up as an option in the New Game
 * player picker, but their games-played and payment record are untouched.
 */
export async function setDoneForSession(playerSessionId: string, done: boolean) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("player_sessions")
    .update({ done_for_session: done })
    .eq("id", playerSessionId);
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/sessions");
  revalidatePath("/player-sessions");
}

/**
 * Add an existing player to a session (the "PlayerSessions Form" /
 * Recent Session "+ Add" shortcut). Starts at 0 games; court_share comes
 * from registerPlayerForSession's even split across the session's headcount.
 */
export async function addPlayerToSession(formData: FormData) {
  const sessionId = String(formData.get("session_id") ?? "");
  const playerId = String(formData.get("player_id") ?? "");
  if (!sessionId || !playerId) throw new Error("Missing session or player");

  const supabase = await createClient();
  await registerPlayerForSession(supabase, sessionId, playerId);

  revalidatePath("/");
  redirect("/");
}

/**
 * Upload a new app icon and/or payment QR image and save them to
 * app_settings (the "Settings" popup). Either file is optional — only the
 * ones actually provided get uploaded and overwritten.
 */
export async function updateAppSettings(formData: FormData) {
  const supabase = await createClient();

  // The Settings icon that opens this form only shows for admins in the
  // nav — this is the server-side backstop for that, same reasoning as the
  // admin checks in src/app/users/actions.ts.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (currentUserRole(user ?? undefined) !== "admin") {
    throw new Error("Only an admin can change app settings.");
  }

  const updates: Record<string, string> = {};

  const appIcon = formData.get("app_icon");
  if (appIcon instanceof File && appIcon.size > 0) {
    const path = `app-icon/${Date.now()}-${appIcon.name}`;
    const { error } = await supabase.storage
      .from("assets")
      .upload(path, appIcon, { contentType: appIcon.type, upsert: true });
    if (error) throw new Error(`App icon upload failed: ${error.message}`);
    updates.app_icon_url = supabase.storage.from("assets").getPublicUrl(path).data.publicUrl;
  }

  const qrCode = formData.get("qr_code");
  if (qrCode instanceof File && qrCode.size > 0) {
    const path = `qr/${Date.now()}-${qrCode.name}`;
    const { error } = await supabase.storage
      .from("assets")
      .upload(path, qrCode, { contentType: qrCode.type, upsert: true });
    if (error) throw new Error(`QR image upload failed: ${error.message}`);
    updates.payment_qr_url = supabase.storage.from("assets").getPublicUrl(path).data.publicUrl;
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from("app_settings").update(updates).eq("id", 1);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/", "layout");
  redirect("/");
}

/** Shuttles per tube is always 12 — not collected on the form. */
const SHUTTLES_PER_TUBE = 12;

/**
 * A fresh 6-digit code, checked against the database so it can't collide
 * with another session's — generated in code rather than a DB default so a
 * collision is just "try again," not a failed insert to recover from.
 * Sessions are created rarely (once a game day), so the extra round trip
 * per attempt is a non-issue; 20 tries against a 6-digit space is
 * effectively certain to succeed long before running out.
 */
async function generateUniqueJoinCode(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const { count, error } = await supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("join_code", code);
    if (error) throw new Error(error.message);
    if (!count) return code;
  }
  throw new Error("Could not generate a unique join code — try again.");
}

/**
 * Create a brand-new session / game day (the "New Session" shortcut).
 * player_count isn't collected here — it starts at 0 and grows on its own
 * as players are registered for the session (see registerPlayerForSession),
 * so the court fee always splits by however many people actually showed up.
 */
export async function createSession(formData: FormData) {
  const sessionDate = String(formData.get("session_date") ?? "");
  if (!sessionDate) throw new Error("Date is required");

  const hours = Number(formData.get("hours") ?? 0) || 0;
  const feePerHour = Number(formData.get("fee_per_hour") ?? 0) || 0;
  const shuttleTubeCost = Number(formData.get("shuttle_tube_cost") ?? 0) || 0;
  const shuttlesPerTube = SHUTTLES_PER_TUBE;

  const supabase = await createClient();
  const joinCode = await generateUniqueJoinCode(supabase);

  const { error } = await supabase.from("sessions").insert({
    session_date: sessionDate,
    hours,
    fee_per_hour: feePerHour,
    shuttle_tube_cost: shuttleTubeCost,
    shuttles_per_tube: shuttlesPerTube,
    join_code: joinCode,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/");
  redirect("/");
}

/**
 * Backfill a join_code for a session that predates this feature (join_code
 * is nullable for exactly this reason — see schema.sql). Surfaced as a
 * "Generate join code" button on the dashboard for any session missing one.
 */
export async function backfillSessionJoinCode(sessionId: string) {
  const supabase = await createClient();
  const joinCode = await generateUniqueJoinCode(supabase);

  const { error } = await supabase
    .from("sessions")
    .update({ join_code: joinCode })
    .eq("id", sessionId);
  if (error) throw new Error(error.message);

  revalidatePath("/");
}

/** Edit an existing session's cost inputs (from the Sessions page). The date
 * isn't editable here — it's what identifies which session you're editing. */
export async function updateSession(formData: FormData) {
  const sessionId = String(formData.get("session_id") ?? "");
  if (!sessionId) throw new Error("Missing session");

  const hours = Number(formData.get("hours") ?? 0) || 0;
  const feePerHour = Number(formData.get("fee_per_hour") ?? 0) || 0;
  const shuttleTubeCost = Number(formData.get("shuttle_tube_cost") ?? 0) || 0;

  const supabase = await createClient();
  const { error } = await supabase
    .from("sessions")
    .update({
      hours,
      fee_per_hour: feePerHour,
      shuttle_tube_cost: shuttleTubeCost,
    })
    .eq("id", sessionId);

  if (error) throw new Error(error.message);

  // hours/fee_per_hour/shuttle_tube_cost feed the session's own
  // court_share_per_player and shuttle_fee_per_game (generated columns),
  // but each player's stored court_share/shuttle_share — and so their
  // generated `payable` — don't follow along on their own. Without this,
  // editing a session's cost inputs silently leaves everyone's amount due
  // stuck at whatever it was before the edit.
  await recomputePlayerGameCounts(supabase, sessionId);

  revalidatePath("/");
  revalidatePath("/sessions");
  redirect(`/sessions?session=${sessionId}`);
}

/**
 * Permanently delete a session and everything tied to it — its games and
 * player registrations cascade-delete along with it (foreign keys with
 * `on delete cascade` in schema.sql). For a session created by mistake or
 * that "didn't push through" (e.g. started but nobody actually played).
 */
export async function deleteSession(sessionId: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("sessions").delete().eq("id", sessionId);
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/sessions");
  revalidatePath("/games");
  revalidatePath("/player-sessions");
  redirect("/sessions");
}

function parseGameStatus(value: FormDataEntryValue | null): "Queued" | "Ongoing" | "Done" {
  const s = String(value);
  return s === "Ongoing" || s === "Done" ? s : "Queued";
}

function parseWinnerTeam(value: FormDataEntryValue | null): "team1" | "team2" | null {
  const s = String(value ?? "");
  return s === "team1" || s === "team2" ? s : null;
}

/** Blank/unparseable input means "no score entered" (null), not 0. */
function parseScore(value: FormDataEntryValue | null): number | null {
  if (value === null) return null;
  const s = String(value).trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Reads one of the four player-slot fields (player1_id..player4_id). The
 * form submits these as four independently-named hidden inputs rather than
 * a single repeated `player_id` list, so that an empty slot (a player
 * deselected mid-pick, leaving a gap) survives the round trip as a real gap
 * instead of getting silently compacted out — a repeated-list-plus-filter
 * approach would shift everyone after the gap down by one and reassign
 * partnerships that the queue master didn't ask to change. See
 * GameFormFields' `selected` state for the client-side half of this.
 */
function parsePlayerSlot(formData: FormData, field: string): string | null {
  const value = formData.get(field);
  const s = value ? String(value) : "";
  return s || null;
}

/**
 * Log a new game (the "New Game" shortcut, on the dashboard or the Games
 * page). The "date" field is really a session picker — its options are
 * existing session dates, so the game always inherits its game_date from
 * the session it's filed under. Redirects to "/" by default, or wherever
 * `redirect_to` says (e.g. back to the Games page you added it from).
 */
export async function createGame(formData: FormData) {
  const sessionId = String(formData.get("session_id") ?? "");
  const status = parseGameStatus(formData.get("status"));
  const player1Id = parsePlayerSlot(formData, "player1_id");
  const player2Id = parsePlayerSlot(formData, "player2_id");
  const player3Id = parsePlayerSlot(formData, "player3_id");
  const player4Id = parsePlayerSlot(formData, "player4_id");
  const winnerTeam = parseWinnerTeam(formData.get("winner_team"));
  const score1 = parseScore(formData.get("score1"));
  const score2 = parseScore(formData.get("score2"));
  const redirectTo = String(formData.get("redirect_to") ?? "/");
  if (!sessionId) throw new Error("Missing session");

  const supabase = await createClient();
  const [{ data: session, error: sessionError }, { count, error: countError }] = await Promise.all([
    supabase.from("sessions").select("session_date").eq("id", sessionId).single(),
    supabase.from("games").select("id", { count: "exact", head: true }).eq("session_id", sessionId),
  ]);
  if (sessionError) throw new Error(sessionError.message);
  if (countError) throw new Error(countError.message);

  const { error } = await supabase.from("games").insert({
    session_id: sessionId,
    game_number: (count ?? 0) + 1,
    game_date: session.session_date,
    status,
    player1_id: player1Id,
    player2_id: player2Id,
    player3_id: player3Id,
    player4_id: player4Id,
    // Only meaningful once the game is Done — a Queued/Ongoing game just
    // stores nulls here, same as never having set them.
    winner_team: status === "Done" ? winnerTeam : null,
    score1: status === "Done" ? score1 : null,
    score2: status === "Done" ? score2 : null,
  });

  if (error) throw new Error(error.message);

  // A game can be logged straight into "Ongoing"/"Done", so its players'
  // counts may need updating even on creation, not just on later status
  // changes.
  await recomputePlayerGameCounts(supabase, sessionId);

  revalidatePath("/");
  revalidatePath("/games");
  revalidatePath("/sessions");
  revalidatePath("/player-sessions");
  redirect(redirectTo);
}

/**
 * Delete a logged game (the "Delete game" option in its edit popup — for
 * when you added one by mistake or changed your mind about it). Games are
 * numbered off a plain count of however many exist in the session, so a
 * gap left by a deleted game would collide with the next one created —
 * renumber whatever's left back to a contiguous 1..N afterwards.
 */
export async function deleteGame(gameId: string, sessionId: string) {
  const supabase = await createClient();

  const { error: deleteError } = await supabase.from("games").delete().eq("id", gameId);
  if (deleteError) throw new Error(deleteError.message);

  const { data: remaining, error: fetchError } = await supabase
    .from("games")
    .select("id, game_number")
    .eq("session_id", sessionId)
    .order("game_number", { ascending: true });
  if (fetchError) throw new Error(fetchError.message);

  for (let i = 0; i < (remaining ?? []).length; i++) {
    const game = remaining![i];
    const correctNumber = i + 1;
    if (game.game_number !== correctNumber) {
      const { error: renumberError } = await supabase
        .from("games")
        .update({ game_number: correctNumber })
        .eq("id", game.id);
      if (renumberError) throw new Error(renumberError.message);
    }
  }

  await recomputePlayerGameCounts(supabase, sessionId);

  revalidatePath("/");
  revalidatePath("/games");
  revalidatePath("/sessions");
  revalidatePath("/player-sessions");
}

/** Edit an existing game's session/date, status, and players (from clicking a game on the dashboard). */
export async function updateGame(formData: FormData) {
  const gameId = String(formData.get("game_id") ?? "");
  const sessionId = String(formData.get("session_id") ?? "");
  const status = parseGameStatus(formData.get("status"));
  const player1Id = parsePlayerSlot(formData, "player1_id");
  const player2Id = parsePlayerSlot(formData, "player2_id");
  const player3Id = parsePlayerSlot(formData, "player3_id");
  const player4Id = parsePlayerSlot(formData, "player4_id");
  const winnerTeam = parseWinnerTeam(formData.get("winner_team"));
  const score1 = parseScore(formData.get("score1"));
  const score2 = parseScore(formData.get("score2"));
  if (!gameId || !sessionId) throw new Error("Missing game or session");

  const supabase = await createClient();

  // Recorded before the update so a game moved to a different date's
  // session still gets its old session's counts recomputed too.
  const { data: existingGame, error: existingError } = await supabase
    .from("games")
    .select("session_id")
    .eq("id", gameId)
    .single();
  if (existingError) throw new Error(existingError.message);
  const previousSessionId = existingGame.session_id;

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("session_date")
    .eq("id", sessionId)
    .single();
  if (sessionError) throw new Error(sessionError.message);

  const { error } = await supabase
    .from("games")
    .update({
      session_id: sessionId,
      game_date: session.session_date,
      status,
      player1_id: player1Id,
      player2_id: player2Id,
      player3_id: player3Id,
      player4_id: player4Id,
      // Only meaningful once the game is Done — moving a game back to
      // Queued/Ongoing clears out any winner/score it had.
      winner_team: status === "Done" ? winnerTeam : null,
      score1: status === "Done" ? score1 : null,
      score2: status === "Done" ? score2 : null,
    })
    .eq("id", gameId);

  if (error) throw new Error(error.message);

  await recomputePlayerGameCounts(supabase, sessionId);
  if (previousSessionId !== sessionId) {
    await recomputePlayerGameCounts(supabase, previousSessionId);
  }

  revalidatePath("/");
  revalidatePath("/games");
  revalidatePath("/sessions");
  revalidatePath("/player-sessions");
  redirect("/");
}
