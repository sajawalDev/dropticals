/* The paths a MorphFrame paints into (see lib/morph.ts). */

/** Faint diagonal glare across the glass. */
export function GlareGradient({ id }: { id: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#000" stopOpacity="0" />
      <stop offset=".38" stopColor="#000" stopOpacity="0" />
      <stop offset=".45" stopColor="#000" stopOpacity=".06" />
      <stop offset=".52" stopColor="#000" stopOpacity="0" />
    </linearGradient>
  );
}

/** Empty frame paths, filled in on the client by paintFrameEls(). */
export function FrameOutline({ glare, color = '#000' }: { glare: string; color?: string }) {
  return (
    <>
      <path data-el="glassL" fill={`url(#${glare})`} stroke="none" />
      <path data-el="glassR" fill={`url(#${glare})`} stroke="none" />
      <g fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
        <path data-el="rimL" />
        <path data-el="rimR" />
        <path data-el="bridge" />
        <path data-el="ends" />
      </g>
    </>
  );
}
