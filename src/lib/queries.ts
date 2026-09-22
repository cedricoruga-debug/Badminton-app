import { createClient } from "@/lib/supabase/server";
import type {
  AppSettings,
  Game,
  JoinRequest,
  Player,
  PlayerSessionWithPlayer,
  Session,
} from "@/lib/types";

export async function getAppSettings(): Promise<AppSettings | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_settings")
    .select("*")
    .eq("id", 1)
    .single();
  if (error) {
    console.error("[getAppSettings] Supabase error:", error);
  }
  return data;
}

/** The most recently created session, or null if none exist yet. */
export async function getLatestSession(): Promise<Session | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .order("session_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[getLatestSession] Supabase error:", error);
  }
  return data;
}

export async function getPlayerSessions(
  sessionId: string
): Promise<PlayerSessionWithPlayer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("player_sessions")
    .select("*, player:players(*)")
    .eq("session_id", sessionId)
    .order("total_games", { ascending: true });
  if (error) {
    console.error("[getPlayerSessions] Supabase error:", error);
  }
  return (data as PlayerSessionWithPlayer[]) ?? [];
}

export type GameWithPlayers = Game & {
  player1: Player | null;
  player2: Player | null;
  player3: Player | null;
  player4: Player | null;
};

export async function getGames(sessionId: string): Promise<GameWithPlayers[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("games")
    .select(
      "*, player1:player1_id(*), player2:player2_id(*), player3:player3_id(*), player4:player4_id(*)"
    )
    .eq("session_id", sessionId)
    .order("game_number", { ascending: true });
  return (data as unknown as GameWithPlayers[]) ?? [];
}

/** Only the games for a session that haven't been marked Done yet. */
export async function getQueuedGames(sessionId: string): Promise<GameWithPlayers[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .select(
      "*, player1:player1_id(*), player2:player2_id(*), player3:player3_id(*), player4:player4_id(*)"
    )
    .eq("session_id", sessionId)
    .neq("status", "Done")
    .order("game_number", { ascending: true });
  if (error) {
    console.error("[getQueuedGames] Supabase error:", error);
  }
  return (data as unknown as GameWithPlayers[]) ?? [];
}

/** Total number of games logged for a session (queued + done). */
export async function getSessionGameCount(sessionId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("games")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);
  if (error) {
    console.error("[getSessionGameCount] Supabase error:", error);
  }
  return count ?? 0;
}

/** Players registered for a session who haven't paid yet. */
export async function getUnpaidPlayerSessions(
  sessionId: string
): Promise<PlayerSessionWithPlayer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("player_sessions")
    .select("*, player:players(*)")
    .eq("session_id", sessionId)
    .is("payment_method", null)
    .order("total_games", { ascending: true });
  if (error) {
    console.error("[getUnpaidPlayerSessions] Supabase error:", error);
  }
  return (data as PlayerSessionWithPlayer[]) ?? [];
}

/** Pending self-service join requests for a session — the "Join requests"
 * panel on the dashboard. Approved/declined ones drop out once handled. */
export async function getPendingJoinRequests(sessionId: string): Promise<JoinRequest[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("join_requests")
    .select("*")
    .eq("session_id", sessionId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[getPendingJoinRequests] Supabase error:", error);
  }
  return data ?? [];
}

export async function getAllPlayers(): Promise<Player[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("active", true)
    .order("name", { ascending: true });
  if (error) {
    console.error("[getAllPlayers] Supabase error:", error);
  }
  return data ?? [];
}

export async function getSessionById(id: string): Promise<Session | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("sessions").select("*").eq("id", id).maybeSingle();
  if (error) {
    console.error("[getSessionById] Supabase error:", error);
  }
  return data;
}

export type SessionWithTotal = Session & { total_payable: number };

/** All sessions, newest first, each with its total payable (summed from player_sessions). */
export async function getAllSessions(): Promise<SessionWithTotal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("*, player_sessions(payable)")
    .order("session_date", { ascending: false });
  if (error) {
    console.error("[getAllSessions] Supabase error:", error);
  }
  return (data ?? []).map((s) => {
    const { player_sessions, ...session } = s as Session & { player_sessions: { payable: number }[] };
    return {
      ...(session as Session),
      total_payable: (player_sessions ?? []).reduce((sum, ps) => sum + Number(ps.payable), 0),
    };
  });
}

export type GameFlat = GameWithPlayers & { session: { session_date: string } | null };

/** All games across every session, most recent first (capped at 200 rows). */
export async function getAllGames(): Promise<GameFlat[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .select(
      "*, player1:player1_id(*), player2:player2_id(*), player3:player3_id(*), player4:player4_id(*), session:session_id(session_date)"
    )
    .order("game_date", { ascending: false })
    .order("game_number", { ascending: true })
    .limit(200);
  if (error) {
    console.error("[getAllGames] Supabase error:", error);
  }
  return (data as unknown as GameFlat[]) ?? [];
}

export type PlayerSessionFlat = PlayerSessionWithPlayer & {
  session: { session_date: string } | null;
};

/** All player_sessions rows across every session, most recent first (capped at 500 rows). */
export async function getAllPlayerSessions(): Promise<PlayerSessionFlat[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("player_sessions")
    .select("*, player:players(*), session:sessions(session_date)")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) {
    console.error("[getAllPlayerSessions] Supabase error:", error);
  }
  return (data as unknown as PlayerSessionFlat[]) ?? [];
}
