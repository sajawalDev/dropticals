import { ImageResponse } from 'next/og';
import { emblemImage } from '@/lib/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** Home-screen icon: the emblem in black on white. */
export default function AppleIcon() {
  const emblem = emblemImage('#000');
  const w = 136;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by ImageResponse */}
        <img src={emblem.src} width={w} height={Math.round(w / emblem.ratio)} alt="" />
      </div>
    ),
    size,
  );
}
