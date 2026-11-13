import { ImageResponse } from 'next/og';
import { ICONS } from '@/lib/icons';
import { logoFullImage, svgDataUri } from '@/lib/og';

/*
 * Images for the emails: email apps such as Gmail do not show SVG, so the logo and
 * the social icons are served as PNG, drawn once at build time.
 *   /mail/logo.png       the logo lockup in black, on transparent
 *   /mail/instagram.png  the Instagram glyph on its gradient
 *   /mail/tiktok.png     the TikTok glyph on black
 *   /mail/frame.png      a pair of glasses, for order lines whose frame has no photo
 */

const ASSETS = ['logo.png', 'instagram.png', 'tiktok.png', 'frame.png'] as const;
type Asset = (typeof ASSETS)[number];

export const dynamicParams = false;

export function generateStaticParams() {
  return ASSETS.map(asset => ({ asset }));
}

const HEADERS = { 'Cache-Control': 'public, max-age=31536000, immutable' };

function glyph(name: 'instagram' | 'tiktok' | 'glasses', strokeWidth: number, color = '#ffffff') {
  const body = ICONS[name].body.replace(/currentColor/g, color);
  return svgDataUri(
    '0 0 24 24',
    `<g fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${body}</g>`,
  );
}

function icon(background: string, src: string) {
  const size = 96;
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: size / 2, backgroundImage: background }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by ImageResponse */}
        <img src={src} width={54} height={54} alt="" />
      </div>
    ),
    { width: size, height: size, headers: HEADERS },
  );
}

export async function GET(_request: Request, { params }: RouteContext<'/mail/[asset]'>) {
  const asset = (await params).asset as Asset;

  if (asset === 'instagram.png') {
    return icon('linear-gradient(45deg, #feda75 0%, #fa7e1e 25%, #d62976 55%, #962fbf 80%, #4f5bd5 100%)', glyph('instagram', 1.9));
  }
  if (asset === 'tiktok.png') {
    return icon('linear-gradient(135deg, #111111 0%, #000000 100%)', glyph('tiktok', 2.2));
  }
  if (asset === 'frame.png') {
    const size = 128;
    return new ImageResponse(
      (
        <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f6f6f4' }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by ImageResponse */}
          <img src={glyph('glasses', 1.4, '#0b0b0b')} width={84} height={84} alt="" />
        </div>
      ),
      { width: size, height: size, headers: HEADERS },
    );
  }

  const logo = logoFullImage('#000000');
  const width = 408;
  const height = Math.round(width / logo.ratio);
  return new ImageResponse(
    (
      <div style={{ width, height, display: 'flex' }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by ImageResponse */}
        <img src={logo.src} width={width} height={height} alt="" />
      </div>
    ),
    { width, height, headers: HEADERS },
  );
}
