import 'server-only';
import { revalidatePath, updateTag } from 'next/cache';
import { CATALOG_TAG } from '@/lib/supabase/server';
import { getAdmin, type AdminUser } from './auth';

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string; field?: string };

export const fail = (error: string, field?: string): { ok: false; error: string; field?: string } => ({ ok: false, error, field });

/** Runs a dashboard action for a signed-in admin only, and turns unexpected errors into a friendly message. */
export async function asAdmin<T>(run: (admin: AdminUser) => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  const admin = await getAdmin();
  if (!admin) return fail('Your session has ended. Sign in again to continue.');
  try {
    return await run(admin);
  } catch (e) {
    console.error('[admin]', e);
    return fail('Something went wrong. Please try again.');
  }
}

/** After a change: refresh the dashboard, and the shop too when the catalogue changed. */
export function refresh({ shop = false }: { shop?: boolean } = {}) {
  if (shop) updateTag(CATALOG_TAG);
  revalidatePath('/admin', 'layout');
}

/** A Postgres error, in words an admin can act on. */
export function dbMessage(error: { code?: string; message: string; details?: string }, what = 'item') {
  if (error.code === '23505') {
    const m = /\((\w+)\)=/.exec(error.details ?? '')?.[1];
    return m === 'slug' ? `Another ${what} already uses that URL name. Choose a different one.`
      : m === 'code' ? 'Another product already uses that code.'
        : `That ${what} already exists.`;
  }
  if (error.code === '23514') return `Some ${what} details are out of range. Check the values and try again.`;
  if (error.code === '42P01' || /relation .* does not exist|schema cache/i.test(error.message)) {
    return 'The database tables are missing. Run supabase/schema.sql in the Supabase SQL Editor first.';
  }
  return error.message;
}

export const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
export const int = (v: unknown, min: number, max: number, fallback = min) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
export const isUuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v);
