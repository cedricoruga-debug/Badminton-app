/**
 * Leaderboard math, kept separate from the page so it's easy to test.
 *
 * Only finished ("Done") games count. A game with no winner recorded still
 * counts as "played" but not toward wins/losses or win rate — most groups
 * don't record every result, and it shouldn't hurt anyone's percentage.
 */
export type LeaderboardGame = {
  game_date: string;
  game_number: number;
  winner_team: "team1" | "team2" | null;
  player1_id: string | null;
  player2_id: string | null;
  player3_id: string | null;
  player4_id: string | null;
};

export type PlayerStats = {
  playerId: string;
  name: string;
  played: number;
  wins: number;
  losses: number;
  /** wins / (wins + losses), 0..1; null when no decided games */
  winRate: number | null;
  /** Current run: positive = consecutive wins, negative = consecutive losses */
  streak: number;
  bestStreak: number;
  lastPlayed: string | null;
};

/** Games needed with a recorded result before someone is ranked by win rate. */
export const MIN_DECIDED_FOR_RANK = 3;

export function computeLeaderboard(games: LeaderboardGame[], names: Map<string, string>): PlayerStats[] {
  const ordered = [...games].sort((a, b) =>
    a.game_date === b.game_date ? a.game_number - b.game_number : a.game_date < b.game_date ? -1 : 1
  );

  const stats = new Map<string, PlayerStats>();
  const get = (id: string) => {
    let s = stats.get(id);
    if (!s) {
      s = {
        playerId: id,
        name: names.get(id) ?? "Unknown",
        played: 0,
        wins: 0,
        losses: 0,
        winRate: null,
        streak: 0,
        bestStreak: 0,
        lastPlayed: null,
      };
      stats.set(id, s);
    }
    return s;
  };

  for (const g of ordered) {
    const team1 = [g.player1_id, g.player2_id].filter((x): x is string => !!x);
    const team2 = [g.player3_id, g.player4_id].filter((x): x is string => !!x);
    for (const [team, side] of [
      [team1, "team1"],
      [team2, "team2"],
    ] as const) {
      for (const id of team) {
        const s = get(id);
        s.played += 1;
        s.lastPlayed = g.game_date;
        if (!g.winner_team) continue;
        if (g.winner_team === side) {
          s.wins += 1;
          s.streak = s.streak > 0 ? s.streak + 1 : 1;
          s.bestStreak = Math.max(s.bestStreak, s.streak);
        } else {
          s.losses += 1;
          s.streak = s.streak < 0 ? s.streak - 1 : -1;
        }
      }
    }
  }

  const list = [...stats.values()];
  for (const s of list) {
    const decided = s.wins + s.losses;
    s.winRate = decided > 0 ? s.wins / decided : null;
  }

  // Wins first (rewards showing up and winning), then win rate, then games.
  return list.sort(
    (a, b) =>
      b.wins - a.wins ||
      (b.winRate ?? -1) - (a.winRate ?? -1) ||
      b.played - a.played ||
      a.name.localeCompare(b.name)
  );
}
