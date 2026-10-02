"use client";

import { createContext, useContext } from "react";
import { sportCopy, type SportCopy } from "@/lib/sport";
import type { Club, Sport } from "@/lib/types";

/**
 * The signed-in user's club, available to every client component under
 * AppChrome — mostly so forms and labels can say "Shuttle" or "Ball" (and
 * draw the right court) without each page having to pass the sport down.
 */
const ClubCtx = createContext<Club | null>(null);

export function ClubProvider({ club, children }: { club: Club | null; children: React.ReactNode }) {
  return <ClubCtx.Provider value={club}>{children}</ClubCtx.Provider>;
}

export function useClub(): Club | null {
  return useContext(ClubCtx);
}

export function useSport(): { sport: Sport; copy: SportCopy } {
  const club = useContext(ClubCtx);
  const sport = club?.sport ?? "badminton";
  return { sport, copy: sportCopy(sport) };
}
