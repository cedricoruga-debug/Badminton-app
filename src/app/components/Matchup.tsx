/**
 * "Kal & Ronald  vs  Ced & Ron" — the app's one standard way to show a
 * doubles matchup: team1 (player1 + player2) on the left, team2 (player3 +
 * player4) on the right, matching the CourtBox / winner-picker left-vs-right
 * split everywhere else. Shared by the public queue view, the dashboard's
 * queued-games list, and the New/Edit Game form's live pairing preview, so
 * a matchup reads the same way wherever it shows up. A single missing slot
 * just drops out of its side (e.g. only one of two picked so far); a side
 * with nothing at all falls back to "—".
 */
export function Matchup({
  team1,
  team2,
  size = "md",
}: {
  team1: (string | null | undefined)[];
  team2: (string | null | undefined)[];
  size?: "sm" | "md";
}) {
  const left = team1.filter(Boolean).join(" & ") || "—";
  const right = team2.filter(Boolean).join(" & ") || "—";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className="flex items-center gap-2">
      <span className={`min-w-0 flex-1 truncate font-semibold text-black/80 ${textSize}`}>{left}</span>
      <span className="flex-none rounded-full bg-black/5 px-1.5 py-0.5 text-[9px] font-bold uppercase text-black/40">
        vs
      </span>
      <span className={`min-w-0 flex-1 truncate text-right font-semibold text-black/80 ${textSize}`}>{right}</span>
    </div>
  );
}
