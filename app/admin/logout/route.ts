import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE, ADMIN_COOKIE_PATH } from '@/lib/admin/jwt';

/** Clears the admin session cookie and returns to the sign-in page. */
function signOut(request: NextRequest) {
  const url = new URL('/admin/login', request.url);
  if (request.nextUrl.searchParams.get('reason') === 'expired') url.searchParams.set('expired', '1');
  const response = NextResponse.redirect(url, 303);
  response.cookies.set(ADMIN_COOKIE, '', {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: ADMIN_COOKIE_PATH, maxAge: 0,
  });
  return response;
}

export const GET = signOut;
export const POST = signOut;
