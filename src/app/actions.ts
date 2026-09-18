"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Recompute total_games and shuttle_share for every player registered in a
 * session, counting only games that have actually been played — status
 * "Ongoing" or "Done" ("Queued" doesn't count yet). Derived fresh from the
 * games table every time (rather than kept as an incrementing counter) so
 * it can never drift out of sync with what actually happened: creating,
 * editing, deleting a game, or moving its status all funnel through this.
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
  const [{ data: games, error: gamesError }, { data: session, error: sessionError }] = await Promise.all([
    supabase
      .from("games")
      .select("player1_id, player2_id, player3_id, player4_id")
      .eq("session_id", sessionId)
      .in("status", ["Ongoing", "Done"]),
    supabase.from("sessions").select("shuttle_fee_per_game").eq("id", sessionId).single(),
  ]);
  if (gamesError) throw new Error(gamesError.message);
  if (sessionError) throw new Error(sessionError.message);

  const counts = new Map<string, number>();
  for (const g of games ?? []) {
    for (const playerId of [g.player1_id, g.player2_id, g.player3_id, g.player4_id]) {
      if (playerId) counts.set(playerId, (counts.get(playerId) ?? 0) + 1);
    }
  }

  const { data: playerSessions, error: psError } = await supabase
    .from("player_sessions")
    .select("id, player_id")
    .eq("session_id", sessionId);
  if (psError) throw new Error(psError.message);

  const shuttleFeePerGame = session.shuttle_fee_per_game;

  await Promise.all(
    (playerSessions ?? []).map(async (ps) => {
      const totalGames = counts.get(ps.player_id) ?? 0;
      const { error } = await supabase
        .from("player_sessions")
        .update({ total_games: totalGames, shuttle_share: totalGames * shuttleFeePerGame })
        .eq("id", ps.id);
      if (error) throw new Error(error.message);
    })
  );
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
 * Add a player to a session via the "New player" / "Add player" forms.
 * Most submissions here are actually a returning player being registered
 * for a new date, not a brand-new person — so this looks up the roster by
 * name (case-insensitive) first and reuses that player if found, only
 * inserting a new `players` row when the name is genuinely new. Without
 * this, typing an existing player's name crashed with a duplicate-key
 * error on `players_name_key`. Redirects to "/" by default, or wherever
 * `redirect_to` says (e.g. back to the Sessions page you added them from).
 */
export async function createPlayer(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const sessionId = String(formData.get("session_id") ?? "");
  const redirectTo = String(formData.get("redirect_to") ?? "/");
  if (!name) throw new Error("Name is required");

  const supabase = await createClient();

  const { data: existing, error: lookupError } = await supabase
    .from("players")
    .select("id")
    .ilike("name", name)
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);

  let playerId: string;
  if (existing) {
    playerId = existing.id;
  } else {
    const { data: player, error } = await supabase
      .from("players")
      .insert({ name })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    playerId = player.id;
  }

  if (sessionId) {
    // Guard against re-registering someone already in this session (e.g.
    // the name matched an existing player who's already on today's list) —
    // registerPlayerForSession assumes a fresh registration and would
    // double-count the court share / crash on the player_sessions unique
    // constraint otherwise.
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
  const { error } = await supabase.from("sessions").insert({
    session_date: sessionDate,
    hours,
    fee_per_hour: feePerHour,
    shuttle_tube_cost: shuttleTubeCost,
    shuttles_per_tube: shuttlesPerTube,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/");
  redirect("/");
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
  const playerIds = formData.getAll("player_id").map(String).filter(Boolean).slice(0, 4);
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
    player1_id: playerIds[0] ?? null,
    player2_id: playerIds[1] ?? null,
    player3_id: playerIds[2] ?? null,
    player4_id: playerIds[3] ?? null,
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
  const playerIds = formData.getAll("player_id").map(String).filter(Boolean).slice(0, 4);
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
      player1_id: playerIds[0] ?? null,
      player2_id: playerIds[1] ?? null,
      player3_id: playerIds[2] ?? null,
      player4_id: playerIds[3] ?? null,
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
