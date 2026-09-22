/**
 * "Kal & Ronald  vs  Ced & Ron" — the app's one standard way to show a
 * doubles matchup: team1 (player1 + player2) on the left, team2 (player3 +
 * player4) on the right, matching the CourtBox / winner-picker left-vs-right
 * split everywhere else. Shared by the public queue view, the dashboard's
 * queued-games list, and the New/Edit Game form's live pairing preview, so
 * a matchup reads the same way wherever it shows up. A single missing slot
 * just drops out of its side (e.g. only one of two picked so far); a side
 * with nothing at all falls back to "—".
 *
 * Flows as one line of text that wraps naturally rather than splitting into
 * two fixed-width, independently truncated halves — an even 50/50 split
 * clips a long name on one side even when the other side has room to spare
 * (e.g. "Nikki & Achi" next to "Liam & We…"), which loses information a
 * queue master actually needs. Wrapping to a second line costs a bit of
 * row height but never hides a name.
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
    <p className={`font-semibold leading-snug text-black/80 ${textSize}`}>
      {left}
      <span className="mx-1.5 inline-block rounded-full bg-black/5 px-1.5 py-0.5 align-[0.1em] text-[9px] font-bold uppercase text-black/40">
        vs
      </span>
      {right}
    </p>
  );
}
