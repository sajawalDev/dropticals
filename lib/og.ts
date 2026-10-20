import { LOGO_EMBLEM, LOGO_RULE, LOGO_SHOP_BOX, LOGO_WORD } from './logo';

/* Helpers for the generated share images (opengraph-image, apple-icon). */

export const OG_SIZE = { width: 1200, height: 630 };

/** An SVG document as an <img> source. */
export const svgDataUri = (viewBox: string, inner: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${inner}</svg>`)}`;

/** The logo lockup (without the clinic tagline) in a colour, as an <img> source, with its aspect ratio. */
export function logoFullImage(color: string) {
  const [x, y, w, h] = LOGO_SHOP_BOX;
  const d = LOGO_EMBLEM.d + LOGO_RULE.d + LOGO_WORD.d;
  return { src: svgDataUri(`${x - 2} ${y - 2} ${w + 4} ${h + 4}`, `<path fill="${color}" fill-rule="evenodd" d="${d}"/>`), ratio: (w + 4) / (h + 4) };
}

/** The emblem alone in a colour, as an <img> source, with its aspect ratio. */
export function emblemImage(color: string) {
  const [x, y, w, h] = LOGO_EMBLEM.box;
  return { src: svgDataUri(`${x - 1} ${y - 1} ${w + 2} ${h + 2}`, `<path fill="${color}" fill-rule="evenodd" d="${LOGO_EMBLEM.d}"/>`), ratio: (w + 2) / (h + 2) };
}

/**
 * Fetches a Google font, subset to `text`, for ImageResponse. Images are built
 * once at build time; if the font cannot be fetched they fall back to the default.
 */
export async function googleFont(family: string, weight: number, text: string) {
  try {
    const css = await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@${weight}&text=${encodeURIComponent(text)}`)
      .then(r => r.text());
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!url) return [];
    const data = await fetch(url).then(r => r.arrayBuffer());
    return [{ name: family, data, weight: weight as 400 | 500 | 600, style: 'normal' as const }];
  } catch {
    return [];
  }
}
