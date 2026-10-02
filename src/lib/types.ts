export type Player = {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
};

export type Session = {
  id: string;
  session_date: string;
  title: string | null;
  status: "Open" | "Closed";
  /** 6-digit code players enter on /join to view this session's live queue. */
  join_code: string | null;
  hours: number;
  fee_per_hour: number;
  court_fee: number;
  shuttle_tube_cost: number;
  shuttles_per_tube: number;
  cost_per_shuttle: number;
  shuttle_fee_per_game: number;
  player_count: number;
  court_share_per_player: number;
  /** 'split' = share the real court + shuttle/ball costs (the original
   * model); 'fixed' = everyone pays a flat `fixed_fee`. */
  fee_mode: FeeMode;
  fixed_fee: number;
  /** Simple pricing ('simple' fee mode): 'total' = court_amount is the whole
   * court rent, split evenly; 'per_player' = everyone pays court_amount. */
  court_fee_type: CourtFeeType;
  court_amount: number;
  /** Simple pricing: charged per game a player plays. */
  per_game_fee: number;
  created_at: string;
};

export type Game = {
  id: string;
  session_id: string;
  game_number: number;
  game_date: string;
  /** 'Requested' = submitted by a player from the public /join page,
   * pending the queue master's approval (moving it to 'Queued') or edit. */
  status: "Requested" | "Queued" | "Ongoing" | "Done";
  player1_id: string | null;
  player2_id: string | null;
  player3_id: string | null;
  player4_id: string | null;
  /** 'team1' = player1+player2, 'team2' = player3+player4. Null = no winner
   * recorded — optional, doesn't block marking a game Done. */
  winner_team: "team1" | "team2" | null;
  score1: number | null;
  score2: number | null;
  /** Free-text name from the public "Request a set" form — who asked for
   * this game. Null for anything the queue master logged themselves. */
  requested_by: string | null;
  created_at: string;
};

export type PlayerSession = {
  id: string;
  session_id: string;
  player_id: string;
  total_games: number;
  court_share: number;
  shuttle_share: number;
  /** Percent off the court+shuttle cost (before the flat +10 buffer),
   * queue-master-set per player per session. 0 = no discount. */
  discount_percent: number;
  /** Server-managed, not directly editable: this player's even share of
   * covering everyone else's discount_percent this session, in pesos —
   * always 0 for a player who has a discount of their own. See
   * recomputePlayerGameCounts in src/app/actions.ts. */
  surcharge_amount: number;
  /** The session's fixed fee copied onto this row when the session is in
   * fixed-rate mode (null in split mode) — the `payable` formula reads it. */
  fixed_fee: number | null;
  /** Copy of the club's round_up_buffer setting (round up to ₱10, +₱10). */
  use_buffer: boolean;
  payable: number;
  payment_method: "Cash" | "Gcash" | null;
  done_for_session: boolean;
  created_at: string;
};

export type PlayerSessionWithPlayer = PlayerSession & {
  player: Player;
};

export type Sport = "badminton" | "pickleball";

/** 'simple' = court fee + price per game (the default for new sessions);
 * 'split' = the original hours × rate + shuttle tube model; 'fixed' = flat fee. */
export type FeeMode = "simple" | "split" | "fixed";

export type CourtFeeType = "total" | "per_player";

/** One tenant: a badminton or pickleball group with its own players,
 * sessions, accounts, payment QR and icon. */
export type Club = {
  id: string;
  name: string;
  sport: Sport;
  payment_qr_url: string | null;
  app_icon_url: string | null;
  owner_id: string | null;
  /** Round each player's amount up to the next ₱10, then add ₱10 (the
   * original group's rule). Off for new clubs. */
  round_up_buffer: boolean;
  created_at: string;
  updated_at: string;
};

/** The club's display settings (icon, QR, name, sport) — what used to be
 * the single-row app_settings table before the app became multi-tenant. */
export type AppSettings = Club;
