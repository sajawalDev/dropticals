import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseAnonKey, supabaseServiceKey, supabaseUrl } from './env';

/** Cache tag on every storefront read. Admin changes expire it with updateTag(). */
export const CATALOG_TAG = 'catalog';

const options = (fetchImpl: typeof fetch) => ({
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: fetchImpl },
});

let shop: SupabaseClient | null | undefined;
let admin: SupabaseClient | null | undefined;

/**
 * Read-only client for the storefront (anon key, row level security applies).
 * Responses are cached under the "catalog" tag and refreshed at least every two minutes.
 */
export function shopDb(): SupabaseClient | null {
  if (shop !== undefined) return shop;
  const url = supabaseUrl(), key = supabaseAnonKey();
  shop = url && key
    ? createClient(url, key, options((input, init) => fetch(input, { ...init, next: { tags: [CATALOG_TAG], revalidate: 120 } })))
    : null;
  return shop;
}

/** Full-access client for the server (service role key). Never cached, never sent to the browser. */
export function adminDb(): SupabaseClient {
  if (admin) return admin;
  const url = supabaseUrl(), key = supabaseServiceKey();
  if (!url || !key) throw new Error('Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_SUPABASE_SERVICE_ROLE_KEY.');
  admin = createClient(url, key, options((input, init) => fetch(input, { ...init, cache: 'no-store' })));
  return admin;
}

export const hasAdminDb = () => !!(supabaseUrl() && supabaseServiceKey());

export const PRODUCT_BUCKET = 'product-images';
export const RX_BUCKET = 'prescriptions';
