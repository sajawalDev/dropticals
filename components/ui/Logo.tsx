import { LOGO_EMBLEM, LOGO_RULE, LOGO_SHOP_BOX, LOGO_TAG, LOGO_WORD, type LogoPart } from '@/lib/logo';

const PARTS = { emblem: LOGO_EMBLEM, word: LOGO_WORD, tag: LOGO_TAG } satisfies Record<string, LogoPart>;

/** One part of the logo, drawn in currentColor. Decorative unless given a label. */
export function LogoPartSvg({ part, className, label }: { part: keyof typeof PARTS; className?: string; label?: string }) {
  const { d, box: [x, y, w, h] } = PARTS[part];
  const pad = 1;
  return (
    <svg
      className={className}
      viewBox={`${x - pad} ${y - pad} ${w + pad * 2} ${h + pad * 2}`}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <path fill="currentColor" fillRule="evenodd" d={d} />
    </svg>
  );
}

/** The full lockup: emblem, rule and wordmark (the "Eye Care Center" tagline is left out while there is no clinic). */
export function LogoFull({ className, label = "Dr's Opticals" }: { className?: string; label?: string }) {
  const [x, y, w, h] = LOGO_SHOP_BOX;
  return (
    <svg className={className} viewBox={`${x - 2} ${y - 2} ${w + 4} ${h + 4}`} role="img" aria-label={label}>
      <path fill="currentColor" fillRule="evenodd" d={LOGO_EMBLEM.d + LOGO_RULE.d + LOGO_WORD.d} />
    </svg>
  );
}

/** Emblem beside the wordmark, as used in the header. */
export function LogoLockup() {
  return (
    <>
      <span className="logo__mark-wrap"><LogoPartSvg part="emblem" className="logo__mark" /></span>
      <span className="logo__text">
        <LogoPartSvg part="word" className="logo__word" />
      </span>
    </>
  );
}

/** The emblem as a bare path at the origin, for placing inside another drawing. */
export function EmblemPath() {
  const [x, y] = LOGO_EMBLEM.box;
  return <path d={LOGO_EMBLEM.d} transform={`translate(${-x} ${-y})`} />;
}
