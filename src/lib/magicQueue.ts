import type { Game, PlayerGender, PlayerSessionWithPlayer } from "@/lib/types";

export type GameForSuggest = Pick<
  Game,
  "id" | "game_number" | "status" | "player1_id" | "player2_id" | "player3_id" | "player4_id"
>;

/** What kind of doubles game a suggestion is. "open" is the gender-blind
 * pick, used when gender doesn't decide anything (see suggestMatchSets). */
export type MatchKind = "mens" | "womens" | "mixed" | "open";

export const MATCH_KIND_LABELS: Record<MatchKind, string> = {
  mens: "Men's doubles",
  womens: "Women's doubles",
  mixed: "Mixed doubles",
  open: "Doubles",
};

export type MatchSuggestion = {
  /** Four player ids in slot order — slots 0&1 are team 1, 2&3 team 2. */
  playerIds: string[];
  kind: MatchKind;
};

/** How many alternative foursomes Suggest cycles through before repeating —
 * a small fixed cap rather than something open-ended, so clicking through
 * every option and coming back around feels intentional, not endless.
 * Three, so a roster with enough men and women can show one each of men's,
 * women's and mixed doubles. */
export const SUGGESTION_SET_COUNT = 3;

/** How many windows per format to consider as alternates. */
const WINDOWS_PER_KIND = 3;

/**
 * "Magic Queue" auto-suggest: picks 4 players for this game instead of the
 * queue master choosing every one by hand, and — using players' gender —
 * shapes each pick as men's, women's or mixed doubles.
 *
 * 1. Fairness ranking (unchanged from before gender): the whole roster,
 *    ordered by fewest games already queued/ongoing elsewhere, then hasn't
 *    played yet / waited longest since their last game, then fewest games
 *    played overall. Anyone currently mid-game on any court goes to the
 *    back, so they're only used when there's no one else.
 *
 * 2. Candidates per format, drawn from that ranking: men's doubles = the
 *    best-ranked 4 men, women's = the best-ranked 4 women, mixed = the
 *    best-ranked 2 men + 2 women, laid out M,F | M,F so each team is a
 *    mixed pair. Each format also gets a couple of alternates (the window
 *    shifted one player down the ranking).
 *
 * 3. Candidates are scored by the sum of their players' ranking positions
 *    (lower = fairer), and the best one of each format comes first, so
 *    cycling the button shows the different formats before reshuffles of
 *    the same one.
 *
 * Players with no gender set are never placed in a men's/women's/mixed
 * game (we can't tell which they belong in), but they're never starved
 * either: if one of them is among the top 4 in the fairness ranking, the
 * first suggestion is the gender-blind "open" pick (the original
 * behaviour) so they still get their turn. If there aren't enough
 * gendered players to form any men's, women's or mixed game, Suggest falls
 * back to open picks entirely — so a club that hasn't filled in gender yet
 * sees exactly what it saw before.
 *
 * On top of all that, a foursome that's the exact same 4 people as
 * another already-queued or ongoing game (just re-paired) gets one player
 * swapped for the next-best alternative of the same gender, so it doesn't
 * suggest a game that's already effectively on the board — falling back
 * to allowing the repeat when no swap is possible.
 *
 * Pure function so it's easy to reason about independent of the
 * component's render.
 */
export function suggestMatchSets(
  players: PlayerSessionWithPlayer[],
  games: GameForSuggest[],
  gameId: string | undefined
): MatchSuggestion[] {
  if (players.length < 4) return [];

  const maxGameNumber = games.reduce((max, g) => Math.max(max, g.game_number), 0);
  const rosterOf = (g: GameForSuggest) => [g.player1_id, g.player2_id, g.player3_id, g.player4_id];

  // How many OTHER games (Queued or Ongoing, excluding this one) a player
  // is already lined up for. 1 or 2 just means "already has something
  // coming up", not "unavailable".
  function upcomingCount(ps: PlayerSessionWithPlayer): number {
    let count = 0;
    for (const g of games) {
      if (g.id === gameId || g.status === "Done") continue;
      if (rosterOf(g).includes(ps.player.id)) count++;
    }
    return count;
  }

  function waitScore(ps: PlayerSessionWithPlayer): number {
    const played = games.filter((g) => g.status !== "Queued" && rosterOf(g).includes(ps.player.id));
    // Hasn't played at all yet this session — top priority.
    if (played.length === 0) return Number.POSITIVE_INFINITY;
    const lastPlayed = Math.max(...played.map((g) => g.game_number));
    return maxGameNumber - lastPlayed;
  }

  const ranked = players
    .map((ps) => ({ ps, upcoming: upcomingCount(ps), wait: waitScore(ps) }))
    .sort((a, b) => {
      if (a.upcoming !== b.upcoming) return a.upcoming - b.upcoming;
      if (a.wait !== b.wait) return b.wait - a.wait;
      return a.ps.total_games - b.ps.total_games;
    })
    .map(({ ps }) => ps.player);

  // Everyone currently on a court, across every Ongoing game.
  const currentlyOnCourt = new Set(
    games
      .filter((g) => g.status === "Ongoing")
      .flatMap(rosterOf)
      .filter((id): id is string => Boolean(id))
  );

  // Off-court players first (in fairness order), on-court players last as
  // a fallback for small rosters.
  const order = [
    ...ranked.filter((p) => !currentlyOnCourt.has(p.id)),
    ...ranked.filter((p) => currentlyOnCourt.has(p.id)),
  ];
  const position = new Map(order.map((p, i) => [p.id, i]));
  const genderOf = new Map<string, PlayerGender | null>(order.map((p) => [p.id, p.gender]));

  const men = order.filter((p) => p.gender === "Male").map((p) => p.id);
  const women = order.filter((p) => p.gender === "Female").map((p) => p.id);
  const everyone = order.map((p) => p.id);

  function rosterSignature(ids: (string | null)[]): string {
    return ids
      .filter((id): id is string => Boolean(id))
      .sort()
      .join("|");
  }
  const activeRosterSignatures = new Set(
    games.filter((g) => g.id !== gameId && g.status !== "Done").map((g) => rosterSignature(rosterOf(g)))
  );

  /** Players eligible to replace `id` in a game of this kind. */
  function replacementPool(kind: MatchKind, id: string): string[] {
    if (kind === "open") return everyone;
    return genderOf.get(id) === "Male" ? men : women;
  }

  /** If this foursome is already on the board, swap one player for the
   * next-best eligible alternative (same gender for gendered games). */
  function avoidRepeat(kind: MatchKind, ids: string[]): string[] {
    if (!activeRosterSignatures.has(rosterSignature(ids))) return ids;
    // Try replacing the lowest-priority player first.
    const byPriority = [...ids].sort((a, b) => position.get(b)! - position.get(a)!);
    for (const out of byPriority) {
      for (const id of replacementPool(kind, out)) {
        if (ids.includes(id)) continue;
        const swapped = ids.map((x) => (x === out ? id : x));
        if (!activeRosterSignatures.has(rosterSignature(swapped))) return swapped;
      }
    }
    return ids;
  }

  /** Up to WINDOWS_PER_KIND sliding windows of `size` over `list`. */
  function windows(list: string[], size: number): string[][] {
    const out: string[][] = [];
    for (let start = 0; start + size <= list.length && out.length < WINDOWS_PER_KIND; start++) {
      out.push(list.slice(start, start + size));
    }
    return out;
  }

  const byKind: Record<MatchKind, MatchSuggestion[]> = { mens: [], womens: [], mixed: [], open: [] };
  for (const w of windows(men, 4)) byKind.mens.push({ kind: "mens", playerIds: w });
  for (const w of windows(women, 4)) byKind.womens.push({ kind: "womens", playerIds: w });
  const mixedMen = windows(men, 2);
  const mixedWomen = windows(women, 2);
  // Every pairing of a men's window with a women's window, so alternates
  // can shift just the men or just the women (sorted by score below).
  for (const m of mixedMen) {
    for (const f of mixedWomen) {
      // M,F | M,F — each team is one man + one woman.
      byKind.mixed.push({ kind: "mixed", playerIds: [m[0], f[0], m[1], f[1]] });
    }
  }
  for (const w of windows(everyone, 4)) byKind.open.push({ kind: "open", playerIds: w });

  const score = (s: MatchSuggestion) => s.playerIds.reduce((sum, id) => sum + position.get(id)!, 0);
  // Ties go to mixed, then men's, then women's — a stable, predictable order.
  const kindTiebreak: Record<MatchKind, number> = { mixed: 0, mens: 1, womens: 2, open: 3 };
  const compare = (a: MatchSuggestion, b: MatchSuggestion) =>
    score(a) - score(b) || kindTiebreak[a.kind] - kindTiebreak[b.kind];

  for (const k of ["mens", "womens", "mixed"] as const) byKind[k].sort(compare);
  const gendered = (["mens", "womens", "mixed"] as const).filter((k) => byKind[k].length > 0);

  // Order: an open pick first if an ungendered player is in the top 4 (so
  // they're not starved), then the best of each format, then alternates.
  const ordered: MatchSuggestion[] = [];
  if (gendered.length === 0) {
    ordered.push(...byKind.open);
  } else {
    const topFourHasUnknown = everyone.slice(0, 4).some((id) => !genderOf.get(id));
    if (topFourHasUnknown) ordered.push(byKind.open[0]);
    ordered.push(...gendered.map((k) => byKind[k][0]).sort(compare));
    ordered.push(...gendered.flatMap((k) => byKind[k].slice(1)).sort(compare));
  }

  const sets: MatchSuggestion[] = [];
  const seen = new Set<string>();
  for (const s of ordered) {
    const playerIds = avoidRepeat(s.kind, s.playerIds);
    const signature = rosterSignature(playerIds);
    if (seen.has(signature)) continue;
    seen.add(signature);
    sets.push({ kind: s.kind, playerIds });
    if (sets.length >= SUGGESTION_SET_COUNT) break;
  }
  return sets;
}
