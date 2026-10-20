import { SignJWT, jwtVerify } from 'jose';

/* =========================================================
   Admin session tokens: HS256 JWTs in an httpOnly cookie.
   Runs in the proxy and on the server.

   The signing key is ADMIN_JWT_SECRET when it is set (32+
   characters). Otherwise it is derived from the Supabase
   service role key with HMAC-SHA256, so it is just as secret
   and never needs to be stored separately.
   ========================================================= */

export const ADMIN_COOKIE = 'drs_admin';
export const ADMIN_COOKIE_PATH = '/admin';
export const SESSION_HOURS = 12;

const ISSUER = 'drs-opticals';
const AUDIENCE = 'drs-admin';

export interface AdminClaims {
  /** Admin user id. */
  sub: string;
  email: string;
  name: string;
  /** Fingerprint of the password hash: changing the password ends every older session. */
  pwv: string;
}

const enc = new TextEncoder();
let keyPromise: Promise<Uint8Array> | null = null;

function signingKey(): Promise<Uint8Array> {
  keyPromise ??= (async () => {
    const explicit = process.env.ADMIN_JWT_SECRET;
    if (explicit && explicit.length >= 32) return enc.encode(explicit);
    const service = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!service) throw new Error('Set ADMIN_JWT_SECRET (32+ characters) or NEXT_SUPABASE_SERVICE_ROLE_KEY to sign admin sessions.');
    const hmac = await crypto.subtle.importKey('raw', enc.encode(service), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return new Uint8Array(await crypto.subtle.sign('HMAC', hmac, enc.encode('drs-admin-session-v1')));
  })();
  return keyPromise;
}

export async function signSession(c: AdminClaims): Promise<string> {
  return new SignJWT({ email: c.email, name: c.name, pwv: c.pwv })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(c.sub)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setNotBefore('0s')
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(await signingKey());
}

/** The claims of a valid, unexpired token; null for anything else. */
export async function verifySession(token: string | undefined | null): Promise<AdminClaims | null> {
  if (!token || token.length > 4096) return null;
  try {
    const { payload } = await jwtVerify(token, await signingKey(), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ['HS256'],
      clockTolerance: 5,
    });
    const { sub, email, name, pwv } = payload as Partial<AdminClaims>;
    if (typeof sub !== 'string' || typeof email !== 'string' || typeof pwv !== 'string') return null;
    return { sub, email, name: typeof name === 'string' ? name : 'Admin', pwv };
  } catch {
    return null;
  }
}
