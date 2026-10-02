import type { Sport } from "@/lib/types";

/**
 * Everything that reads differently between a badminton club and a
 * pickleball club, in one place. Safe to import from server and client code.
 *
 * Money model difference: a badminton shuttle is used up game by game (one
 * shuttle per doubles game, cost split by the 4 players), so its share
 * scales with games played. Pickleball balls last the whole session, so
 * their cost is split evenly across everyone registered — same as the
 * court fee. Both reuse the session's `shuttle_tube_cost` column to store
 * that cost.
 */
export type SportCopy = {
  label: string;
  /** "Shuttle" / "Ball" */
  item: string;
  /** "shuttle" / "ball" (lower case, for sentences) */
  itemLower: string;
  /** Label on the session form's cost field */
  costLabel: string;
  /** Helper text under that field */
  costHint: string;
  /** Points a standard game is played to */
  gameTo: number;
  scoreHint: string;
  /** "set" is the badminton-community word; pickleball players say "game" */
  matchWord: string;
};

export const SPORT_COPY: Record<Sport, SportCopy> = {
  badminton: {
    label: "Badminton",
    item: "Shuttle",
    itemLower: "shuttle",
    costLabel: "Shuttle tube cost",
    costHint: "12 shuttles per tube · one shuttle per game, shared by the 4 players.",
    gameTo: 21,
    scoreHint: "Rally scoring to 21",
    matchWord: "set",
  },
  pickleball: {
    label: "Pickleball",
    item: "Ball",
    itemLower: "ball",
    costLabel: "Balls cost (whole session)",
    costHint: "Split evenly across everyone in the session, like the court fee.",
    gameTo: 11,
    scoreHint: "To 11, win by 2",
    matchWord: "game",
  },
};

export function sportCopy(sport: Sport | null | undefined): SportCopy {
  return SPORT_COPY[sport ?? "badminton"] ?? SPORT_COPY.badminton;
}

export const BRAND = "KRO5";
