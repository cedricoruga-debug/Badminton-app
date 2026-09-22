/** A small pulsing dot — "this is live, it'll change on its own." Shared by
 * the public queue view's header/footer and the dashboard's "On court"
 * band, so the same visual cue means the same thing everywhere it shows up.
 * `dot`/`ping` are the two color classes: a solid dot plus the paler ring
 * animating outward. */
export function LiveDot({ dot, ping }: { dot: string; ping: string }) {
  return (
    <span className="relative flex h-1.5 w-1.5 flex-none">
      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${ping}`} />
      <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${dot}`} />
    </span>
  );
}
