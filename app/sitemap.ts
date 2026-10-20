import type { MetadataRoute } from 'next';
import { PRODUCTS } from '@/lib/catalog';
import { absoluteUrl } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const page = (path: string, priority: number, changeFrequency: 'weekly' | 'monthly' = 'monthly') =>
    ({ url: absoluteUrl(path), lastModified, changeFrequency, priority });

  return [
    page('/', 1, 'weekly'),
    page('/shop', 0.9, 'weekly'),
    page('/shop?gender=men', 0.8, 'weekly'),
    page('/shop?gender=women', 0.8, 'weekly'),
    ...PRODUCTS.map(p => ({
      ...page(`/frame/${p.id}`, 0.8, 'weekly'),
      images: [absoluteUrl(`/frame/${p.id}/opengraph-image`)],
    })),
    page('/mirror', 0.7),
    page('/lenses', 0.7),
    page('/clinic', 0.7),
    page('/about', 0.5),
    page('/contact', 0.5),
  ];
}
