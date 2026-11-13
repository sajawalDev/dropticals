import 'server-only';
import { cache } from 'react';
import { isMissingTable } from './catalog-build';
import { shopDb } from './supabase/server';

/* Reviews an admin has published, for the home page and product pages.
   Read with the public key: row level security returns published reviews only,
   and the customer's email column is not readable. Cached under the "catalog" tag. */

export interface PublicReview {
  id: string;
  first_name: string;
  rating: number;
  body: string;
  video_url: string | null;
  show_on_home: boolean;
  product_ids: string[];
  created_at: string;
}

export const getPublishedReviews = cache(async (): Promise<PublicReview[]> => {
  const db = shopDb();
  if (!db) return [];
  const { data, error } = await db
    .from('reviews')
    .select('id, first_name, rating, body, video_url, show_on_home, product_ids, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) {
    if (!isMissingTable(error)) console.warn('[reviews] could not load reviews:', error.message);
    return [];
  }
  return (data ?? []) as PublicReview[];
});

export async function getHomeReviews() {
  return (await getPublishedReviews()).filter(r => r.show_on_home);
}

/** Reviews chosen for a product's page, by the product's database id. */
export async function getProductReviews(productUuid: string) {
  if (!productUuid) return [];
  return (await getPublishedReviews()).filter(r => r.product_ids?.includes(productUuid));
}
