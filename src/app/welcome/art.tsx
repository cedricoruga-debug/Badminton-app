/**
 * Small SVG drawings shared by the marketing page's sections (server and
 * client components alike — no hooks here). Colors come from the page's
 * CSS variables in landing.css so a palette change is one edit.
 */

const VOLT = "var(--kx-volt)";

/** Shuttlecock pointing right (cork leading), 54×32. */
export function Shuttle({ className, width = 54 }: { className?: string; width?: number }) {
  return (
    <svg className={className} width={width} height={(width * 32) / 54} viewBox="0 0 54 32" aria-hidden="true">
      <path d="M3 3L33 11.5V20.5L3 29Z" fill="#F4F7F2" />
      <path d="M10 5.5L33 14M10 26.5L33 18M18 8v16M26 10v12" stroke="#A9BBB2" strokeWidth="1.3" />
      <circle cx="39" cy="16" r="7.5" style={{ fill: VOLT }} />
    </svg>
  );
}

/** Pickleball, 30×30. */
export function Ball({ className, size = 30 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
      <circle cx="15" cy="15" r="14" style={{ fill: VOLT }} />
      {[
        [9, 10],
        [18, 8],
        [21, 17],
        [12, 19],
        [17, 24],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.2" fill="#6C7A2A" />
      ))}
    </svg>
  );
}

export function Racket({ grip }: { grip: string }) {
  return (
    <svg width="44" height="128" viewBox="0 0 44 128" fill="none" aria-hidden="true">
      <ellipse cx="22" cy="30" rx="17" ry="26" stroke="#F4F7F2" strokeWidth="3.5" />
      <path
        d="M10 18h24M8 30h28M10 42h24M16 7v46M22 4v52M28 7v46"
        stroke="#F4F7F2"
        strokeOpacity=".35"
        strokeWidth="1.2"
      />
      <path d="M22 56v40" stroke="#C9D6CF" strokeWidth="3" />
      <rect x="17" y="94" width="10" height="32" rx="4" style={{ fill: grip }} />
    </svg>
  );
}

export function Paddle({ face }: { face: string }) {
  return (
    <svg width="44" height="128" viewBox="0 0 44 128" fill="none" aria-hidden="true">
      <rect x="3" y="18" width="38" height="62" rx="16" stroke="#F4F7F2" strokeWidth="3" style={{ fill: face }} />
      <rect x="17" y="78" width="10" height="44" rx="4" fill="#F4F7F2" />
    </svg>
  );
}

/** Top-down badminton court lines (13.4 × 6.1 m), long axis horizontal. */
export function BadmintonLines({
  className,
  opacity = 0.85,
  stroke = 7,
  preserve = "none",
}: {
  className?: string;
  opacity?: number;
  stroke?: number;
  preserve?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 1340 610"
      preserveAspectRatio={preserve}
      fill="none"
      stroke="#F4F7F2"
      strokeWidth={stroke}
      strokeOpacity={opacity}
      aria-hidden="true"
    >
      <rect x="4" y="4" width="1332" height="602" />
      <path d="M4 46H1336M4 564H1336M472 4V606M868 4V606M76 4V606M1264 4V606M4 305H472M868 305H1336" />
      <path d="M670 4V606" strokeWidth={stroke * 1.7} />
    </svg>
  );
}

/** Top-down pickleball court with the kitchen (non-volley zone) shaded. */
export function PickleballLines({
  className,
  opacity = 0.85,
  preserve = "none",
}: {
  className?: string;
  opacity?: number;
  preserve?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 1340 610"
      preserveAspectRatio={preserve}
      fill="none"
      stroke="#F4F7F2"
      strokeWidth="7"
      strokeOpacity={opacity}
      aria-hidden="true"
    >
      <rect x="457" y="4" width="426" height="602" fill="#2C6E9E" stroke="none" />
      <rect x="4" y="4" width="1332" height="602" />
      <path d="M457 4V606M883 4V606M4 305H457M883 305H1336" />
      <path d="M670 4V606" strokeWidth="12" />
    </svg>
  );
}

export function Check({ size = 20 }: { size?: number }) {
  return (
    <svg
      className="kx-check"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

export function Arrow() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function Crown({ size = 20, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ fill: color }}>
      <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" />
    </svg>
  );
}

/** Decorative QR-style pattern (not a scannable code). */
export function QrArt({ size = 98 }: { size?: number }) {
  return (
    <svg viewBox="0 0 21 21" width={size} height={size} shapeRendering="crispEdges" fill="#0B1512" aria-hidden="true">
      <path d="M0 0h7v7H0zM1 1v5h5V1zM2 2h3v3H2zM14 0h7v7h-7zM15 1v5h5V1zM16 2h3v3h-3zM0 14h7v7H0zM1 15v5h5v-5zM2 16h3v3H2zM8 0h2v2H8zM11 1h2v3h-2zM8 3h2v3H8zM9 8h3v2H9zM13 8h2v3h-2zM8 11h2v2H8zM16 9h3v2h-3zM0 8h2v2H0zM3 9h3v2H3zM11 12h3v3h-3zM15 13h2v2h-2zM18 12h3v2h-3zM8 15h2v3H8zM11 16h2v2h-2zM14 17h3v2h-3zM18 16h2v5h-2zM10 19h3v2h-3z" />
    </svg>
  );
}

export function LogoMark() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 5l11 4v6L3 19z" />
      <path d="M7 7v10" />
      <circle cx="18" cy="12" r="3" />
    </svg>
  );
}
