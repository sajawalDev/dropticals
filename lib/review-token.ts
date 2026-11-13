import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { supabaseServiceKey } from './supabase/env';

/* =========================================================
   The "Give a review" link in the order-delivered email
   carries a signed token for the order, so the review page
   can fill in the customer's name and email without putting
   them in the address bar, and nobody can guess another
   customer's link. Signed with ADMIN_JWT_SECRET, or a key
   derived from the service role key when that is not set.
   ========================================================= */

const secret = () => {
  const own = process.env.ADMIN_JWT_SECRET;
  if (own && own.length >= 32) return 'review:' + own;
  const service = supabaseServiceKey();
  return service ? 'review:' + createHmac('sha256', 'drs-review-link').update(service).digest('hex') : '';
};

const sign = (orderId: string, key: string) => createHmac('sha256', key).update(orderId).digest('base64url').slice(0, 32);

/** A token for an order's review link, or '' when no key is configured. */
export function reviewToken(orderId: string) {
  const key = secret();
  return key ? `${orderId}.${sign(orderId, key)}` : '';
}

/** The order id inside a valid token, or null. */
export function readReviewToken(token: unknown): string | null {
  if (typeof token !== 'string' || token.length > 120) return null;
  const [id, sig] = token.split('.');
  if (!id || !sig || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const key = secret();
  if (!key) return null;
  const want = Buffer.from(sign(id, key));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got) ? id : null;
}
