'use server';

import { compare, hash } from 'bcryptjs';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminDb, hasAdminDb } from '@/lib/supabase/server';
import { endSession, getAdmin, startSession } from '../auth';
import { dbMessage } from '../guard';

/* Signing in and out, and changing the password. */

export interface FormState {
  error?: string;
  ok?: string;
  email?: string;
}

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_EMAIL = 5;
const MAX_PER_IP = 20;
/** Compared against when the email is unknown, so a wrong email takes as long as a wrong password. */
const DECOY_HASH = '$2b$12$ZGel5v5Mj1HpoLMWwk1XfefQpDepKAkWsWsj9AG2QM/Ajl9Fiq93.';

async function clientIp() {
  const h = await headers();
  return (h.get('x-forwarded-for')?.split(',')[0] || h.get('x-real-ip') || '').trim().slice(0, 64) || null;
}

/** Only dashboard paths may be returned to after signing in. */
function safeNext(v: FormDataEntryValue | null) {
  const s = typeof v === 'string' ? v : '';
  return /^\/admin(\/[\w\-/?=&.%]*)?$/.test(s) && !s.startsWith('/admin/login') && !s.startsWith('/admin/logout') ? s : '/admin';
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, c => '\\' + c);

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get('email') ?? '').trim().toLowerCase().slice(0, 160);
  const password = String(form.get('password') ?? '').slice(0, 200);
  if (!email || !password) return { error: 'Enter your email and password.', email };
  if (!hasAdminDb()) return { error: 'The database is not connected. Check the Supabase environment variables.', email };

  const db = adminDb();
  const ip = await clientIp();
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const [byEmail, byIp] = await Promise.all([
    db.from('admin_login_attempts').select('id', { count: 'exact', head: true }).eq('email', email).eq('success', false).gte('created_at', since),
    ip
      ? db.from('admin_login_attempts').select('id', { count: 'exact', head: true }).eq('ip', ip).eq('success', false).gte('created_at', since)
      : Promise.resolve({ count: 0, error: null }),
  ]);
  if (byEmail.error) return { error: dbMessage(byEmail.error), email };
  if ((byEmail.count ?? 0) >= MAX_PER_EMAIL || (byIp.count ?? 0) >= MAX_PER_IP) {
    return { error: 'Too many attempts. Wait 15 minutes, then try again.', email };
  }

  const { data: user, error } = await db
    .from('admin_users')
    .select('id, email, name, password_hash, is_active')
    .ilike('email', escapeLike(email))
    .maybeSingle();
  if (error) return { error: dbMessage(error), email };

  const matches = await compare(password, user?.password_hash ?? DECOY_HASH);
  const ok = !!user && user.is_active && matches;
  await db.from('admin_login_attempts').insert({ email, ip, success: ok });
  if (Math.random() < 0.05) {
    await db.from('admin_login_attempts').delete().lt('created_at', new Date(Date.now() - 30 * 86400000).toISOString());
  }
  if (!ok) return { error: 'That email and password do not match.', email };

  await db.from('admin_users').update({ last_login_at: new Date().toISOString() }).eq('id', user.id);
  await startSession(user);
  redirect(safeNext(form.get('next')));
}

export async function logout() {
  await endSession();
  redirect('/admin/login');
}

export async function changePassword(_: FormState, form: FormData): Promise<FormState> {
  const admin = await getAdmin();
  if (!admin) return { error: 'Your session has ended. Sign in again.' };
  const current = String(form.get('current') ?? '');
  const next = String(form.get('next') ?? '');
  const confirm = String(form.get('confirm') ?? '');
  if (next.length < 10) return { error: 'Use at least 10 characters for the new password.' };
  if (next.length > 72) return { error: 'Use at most 72 characters for the new password.' };
  if (!/[a-z]/i.test(next) || !/\d/.test(next)) return { error: 'Mix letters and numbers in the new password.' };
  if (next !== confirm) return { error: 'The new passwords do not match.' };
  if (next === current) return { error: 'Choose a password you have not used here before.' };

  const db = adminDb();
  const { data: user, error } = await db.from('admin_users').select('id, email, name, password_hash').eq('id', admin.id).single();
  if (error || !user) return { error: 'We could not load your account. Try again.' };
  if (!(await compare(current, user.password_hash))) return { error: 'Your current password is not right.' };

  const password_hash = await hash(next, 12);
  const { error: saveError } = await db.from('admin_users').update({ password_hash }).eq('id', admin.id);
  if (saveError) return { error: dbMessage(saveError) };
  // Keep this session going; every other signed-in device is signed out.
  await startSession({ ...user, password_hash });
  return { ok: 'Password changed. Other devices have been signed out.' };
}
