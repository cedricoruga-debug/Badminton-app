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
  created_at: string;
};

export type Game = {
  id: string;
  session_id: string;
  game_number: number;
  game_date: string;
  status: "Queued" | "Ongoing" | "Done";
  player1_id: string | null;
  player2_id: string | null;
  player3_id: string | null;
  player4_id: string | null;
  /** 'team1' = player1+player2, 'team2' = player3+player4. Null = no winner
   * recorded — optional, doesn't block marking a game Done. */
  winner_team: "team1" | "team2" | null;
  score1: number | null;
  score2: number | null;
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
  payable: number;
  payment_method: "Cash" | "Gcash" | null;
  done_for_session: boolean;
  created_at: string;
};

export type PlayerSessionWithPlayer = PlayerSession & {
  player: Player;
};

export type AppSettings = {
  id: 1;
  display_title: string;
  payment_qr_url: string | null;
  app_icon_url: string | null;
  updated_at: string;
};
