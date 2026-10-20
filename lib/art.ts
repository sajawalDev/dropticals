import { LENSES, type LensKey } from './catalog';

/* =========================================================
   Generated illustrations: the trial lenses and the eye.
   Each returns SVG markup for the inside of an <svg>.
   ========================================================= */

const LENS_LABEL: Record<LensKey, string> = {
  plain: 'Plain lens  +0.00',
  bluecut: 'Blue-cut lens  +0.00',
  antifog: 'Anti-fog lens  +0.00',
};

/** A trial lens from the optometrist's kit, showing what each lens does. */
export function trialLensMarkup(kind: LensKey) {
  const id = 'tl' + kind;
  const defs = `<defs>`
    + `<linearGradient id="${id}Ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f4f4"/><stop offset=".5" stop-color="#9b9b9b"/><stop offset="1" stop-color="#e2e2e2"/></linearGradient>`
    + `<clipPath id="${id}Clip"><circle cx="150" cy="150" r="116"/></clipPath>`
    + `<path id="${id}Arc" d="M150 150m-129 0a129 129 0 1 1 258 0"/>`
    + `<filter id="${id}Soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="5"/></filter>`
    + `<filter id="${id}Fog" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves="3" seed="4"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -1.4 1.6"/><feGaussianBlur stdDeviation="3"/></filter>`
    + `</defs>`;
  const handle = `<g transform="rotate(42 150 150)"><rect x="268" y="138" width="48" height="24" rx="8" fill="url(#${id}Ring)" stroke="#000" stroke-width="1.2"/></g>`;
  const rim = `<circle cx="150" cy="150" r="129" fill="none" stroke="url(#${id}Ring)" stroke-width="22"/><circle cx="150" cy="150" r="140" fill="none" stroke="#000" stroke-width="1.2"/><circle cx="150" cy="150" r="118" fill="none" stroke="#000" stroke-width="1.2"/>`;
  const engraving = `<text style="font-family:var(--sans)" font-size="11" font-weight="600" fill="#000" letter-spacing="1.5"><textPath href="#${id}Arc" startOffset="50%" text-anchor="middle">${LENS_LABEL[kind]}</textPath></text>`;
  const chart = `<g style="font-family:var(--serif)" font-weight="600" text-anchor="middle" fill="#000"><text x="150" y="150" font-size="96">D O</text><text x="150" y="196" font-size="30" letter-spacing="10">E F P T O Z</text><text x="150" y="226" font-size="17" letter-spacing="7">L P E D F C</text></g>`;
  const paper = `<rect x="0" y="0" width="300" height="300" fill="#fff"/>`;

  let inner: string;
  if (kind === 'plain') {
    inner = `${paper}<g filter="url(#${id}Soft)" opacity=".9">${chart}</g><g class="cut">${chart}</g>`;
  } else if (kind === 'bluecut') {
    const rays = Array.from({ length: 28 }, (_, i) => {
      const a = (i / 28) * Math.PI * 2, r1 = 62, r2 = 140;
      return `<line x1="${(150 + Math.cos(a) * r1).toFixed(1)}" y1="${(150 + Math.sin(a) * r1 * 0.8).toFixed(1)}" x2="${(150 + Math.cos(a) * r2).toFixed(1)}" y2="${(150 + Math.sin(a) * r2 * 0.8).toFixed(1)}"/>`;
    }).join('');
    inner = paper
      + `<g class="rays" stroke="#000" stroke-width="2.2" stroke-linecap="round" opacity=".85">${rays}</g>`
      + `<rect x="92" y="102" width="116" height="84" rx="10" fill="#000"/>`
      + `<g fill="#fff"><rect x="104" y="116" width="58" height="7" rx="3.5"/><rect x="104" y="132" width="88" height="5" rx="2.5" opacity=".7"/><rect x="104" y="144" width="74" height="5" rx="2.5" opacity=".7"/><rect x="104" y="156" width="82" height="5" rx="2.5" opacity=".7"/></g>`
      + `<rect x="132" y="186" width="36" height="10" fill="#000"/><rect x="112" y="196" width="76" height="6" rx="3" fill="#000"/>`
      + `<rect class="cut" x="0" y="0" width="300" height="300" fill="#000" fill-opacity=".06"/>`;
  } else {
    inner = paper + chart
      + `<g class="fog"><rect x="0" y="0" width="300" height="300" fill="#fff" opacity=".55"/><rect x="0" y="0" width="300" height="300" filter="url(#${id}Fog)"/></g>`;
  }
  return { inner: `${defs}${handle}<g clip-path="url(#${id}Clip)">${inner}</g>${rim}${engraving}`, label: `${LENSES[kind].label} lens demonstration` };
}

/** The fibres of the iris in the watching eye. */
export const irisFibres = Array.from({ length: 56 }, (_, i) => {
  const a = (i / 56) * Math.PI * 2, r1 = 30 + (i % 3) * 3, r2 = 70 - (i % 4) * 4;
  return { x1: (Math.cos(a) * r1).toFixed(1), y1: (Math.sin(a) * r1).toFixed(1), x2: (Math.cos(a) * r2).toFixed(1), y2: (Math.sin(a) * r2).toFixed(1) };
});
