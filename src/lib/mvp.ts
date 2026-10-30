/**
 * Today's MVP — shared by the dashboard (which shows it) and the server's
 * fee recompute (which gives the MVP(s) the session's MVP fee off), so the
 * player named MVP is always the one who actually gets the discount.
 *
 * MVP = best win rate, not most wins — a game with no winner recorded is
 * how a split (each team took one set) gets logged, so it's a real result
 * worth crediting, just not a clean win. Points per player per Done game:
 * 2 for being on the winning pair, 1 for a split (winner_team null on a
 * Done game — everyone in it gets credit, not just one side), 0 for the
 * losing pair. A game that hasn't been marked Done yet also has
 * winner_team null, but isn't a result at all — only Done games count
 * here. Win rate is points earned over the max possible (2 per game
 * played), so a session with nothing decided yet just has no MVP rather
 * than a misleading 0%. Ties share the title.
 *
 * Only players in `rosterIds` (still registered for the session) can be
 * MVP.
 */
export type MvpGame = {
  status: string;
  winner_team: "team1" | "team2" | null;
  player1_id: string | null;
  player2_id: string | null;
  player3_id: string | null;
  player4_id: string | null;
};

export function getMvpPlayerIds(games: MvpGame[], rosterIds: Iterable<string>): Set<string> {
  const roster = new Set(rosterIds);
  const points = new Map<string, number>();
  const doneGamesPlayed = new Map<string, number>();
  for (const g of games) {
    if (g.status !== "Done") continue;
    const slots = [g.player1_id, g.player2_id, g.player3_id, g.player4_id].filter(
      (id): id is string => Boolean(id)
    );
    for (const playerId of slots) {
      doneGamesPlayed.set(playerId, (doneGamesPlayed.get(playerId) ?? 0) + 1);
    }
    if (g.winner_team) {
      const winners = g.winner_team === "team1" ? [g.player1_id, g.player2_id] : [g.player3_id, g.player4_id];
      for (const playerId of winners) {
        if (playerId) points.set(playerId, (points.get(playerId) ?? 0) + 2);
      }
    } else {
      for (const playerId of slots) {
        points.set(playerId, (points.get(playerId) ?? 0) + 1);
      }
    }
  }

  const winRates = new Map<string, number>();
  for (const [playerId, gamesPlayed] of doneGamesPlayed) {
    if (roster.has(playerId)) winRates.set(playerId, (points.get(playerId) ?? 0) / (2 * gamesPlayed));
  }
  if (winRates.size === 0) return new Set();
  const best = Math.max(...winRates.values());
  return new Set([...winRates].filter(([, rate]) => rate === best).map(([id]) => id));
}
