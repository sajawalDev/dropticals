/* =========================================================
   Supabase settings, read from the environment.
   NEXT_PUBLIC_SUPABASE_URL, NEXT_SUPABASE_ANNON_KEY and
   NEXT_SUPABASE_SERVICE_ROLE_KEY are set on Vercel and in
   .env.local; the other spellings are accepted too.
   Server only: the keys are not inlined into browser code.
   ========================================================= */

export const supabaseUrl = () => (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/+$/, '');

export const supabaseAnonKey = () =>
  process.env.NEXT_SUPABASE_ANNON_KEY ||
  process.env.NEXT_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';

export const supabaseServiceKey = () =>
  process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  '';

/** What the browser needs for live updates. The anon key is a public key; row level security guards the data. */
export interface PublicSupabase {
  url: string;
  anonKey: string;
}

export function publicSupabase(): PublicSupabase | null {
  const url = supabaseUrl(), anonKey = supabaseAnonKey();
  return url && anonKey ? { url, anonKey } : null;
}
