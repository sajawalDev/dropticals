import { ImageResponse } from 'next/og';
import { money } from '@/lib/catalog';
import { getCatalog, getProduct } from '@/lib/catalog-server';
import { frameSvgMarkup } from '@/lib/frames';
import { OG_SIZE, emblemImage, googleFont, svgDataUri } from '@/lib/og';

export const alt = "Eyeglass frame from Dr's Opticals";
export const size = OG_SIZE;
export const contentType = 'image/png';

export async function generateStaticParams() {
  return (await getCatalog()).products.map(p => ({ id: p.id }));
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const p = (await getProduct((await params).id)) ?? (await getCatalog()).products[0];
  if (!p) return new ImageResponse(<div style={{ width: '100%', height: '100%', background: '#f3f4f4' }} />, size);
  const drawing = frameSvgMarkup(p, p.finishes[0] ?? '', 'og');
  const [, , vw, vh] = drawing.viewBox.split(' ').map(Number);
  const frameW = 860;
  const emblem = emblemImage('#000');
  const meta = [p.labels.shape, p.labels.material, money(p.price)].filter(Boolean).join(' · ');
  const fonts = [...await googleFont('Bodoni Moda', 500, p.name), ...await googleFont('Montserrat', 600, meta + "Dr's Opticals")];

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '56px 72px', background: '#f3f4f4', color: '#000' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by ImageResponse */}
          <img src={emblem.src} width={Math.round(48 * emblem.ratio)} height={48} alt="" />
          <div style={{ fontFamily: 'Montserrat', fontSize: 26, fontWeight: 600 }}>Dr&apos;s Opticals</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by ImageResponse */}
          <img src={svgDataUri(drawing.viewBox, drawing.inner)} width={frameW} height={Math.round(frameW * vh / vw)} alt="" />
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'Bodoni Moda', fontSize: 88, lineHeight: 1 }}>{p.name}</div>
          <div style={{ fontFamily: 'Montserrat', fontSize: 28, fontWeight: 600 }}>{meta}</div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
