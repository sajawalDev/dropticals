import 'server-only';
import { createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { adminDb } from '@/lib/supabase/server';
import { ADMIN_COOKIE, ADMIN_COOKIE_PATH, SESSION_HOURS, signSession, verifySession } from './jwt';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
}

/** A short fingerprint of a password hash, carried in the session token. */
export const passwordVersion = (hash: string) => createHash('sha256').update(hash).digest('base64url').slice(0, 16);

/**
 * The signed-in admin, checked against the database on every request:
 * a disabled account or a changed password ends the session straight away.
 */
export const getAdmin = cache(async (): Promise<AdminUser | null> => {
  const claims = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!claims) return null;
  const { data, error } = await adminDb()
    .from('admin_users')
    .select('id, email, name, is_active, password_hash')
    .eq('id', claims.sub)
    .maybeSingle();
  if (error || !data || !data.is_active || passwordVersion(data.password_hash) !== claims.pwv) return null;
  return { id: data.id, email: data.email, name: data.name };
});

/** For pages: the admin, or off to sign in (the logout route clears a stale cookie first). */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) redirect('/admin/logout?reason=expired');
  return admin;
}

export async function startSession(user: AdminUser & { password_hash: string }) {
  const token = await signSession({ sub: user.id, email: user.email, name: user.name, pwv: passwordVersion(user.password_hash) });
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: ADMIN_COOKIE_PATH,
    maxAge: SESSION_HOURS * 3600,
    priority: 'high',
  });
}

export async function endSession() {
  (await cookies()).set(ADMIN_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: ADMIN_COOKIE_PATH, maxAge: 0 });
}
