import { ImageResponse } from 'next/og';
import { SITE } from '@/lib/config';
import { OG_SIZE, googleFont, logoFullImage } from '@/lib/og';

export const alt = SITE.title;
export const size = OG_SIZE;
export const contentType = 'image/png';

const HEADLINE = 'Clarity, fitted to your face.';
const LINE = 'Eyeglasses with zero power or your prescription. Try any frame on your face, live.';

export default async function Image() {
  const logo = logoFullImage('#000');
  const fonts = [...await googleFont('Bodoni Moda', 500, HEADLINE), ...await googleFont('Montserrat', 500, LINE)];
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 56, padding: '72px 80px', background: '#fff', color: '#000' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32, width: 600 }}>
          <div style={{ fontFamily: 'Bodoni Moda', fontSize: 92, lineHeight: 0.98, letterSpacing: '-0.02em' }}>{HEADLINE}</div>
          <div style={{ fontFamily: 'Montserrat', fontSize: 28, lineHeight: 1.45, color: '#3d3d3d' }}>{LINE}</div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by ImageResponse */}
        <img src={logo.src} width={380} height={Math.round(380 / logo.ratio)} alt="" />
      </div>
    ),
    { ...size, fonts },
  );
}
