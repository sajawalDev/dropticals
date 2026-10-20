import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE, ADMIN_COOKIE_PATH, verifySession } from '@/lib/admin/jwt';

/**
 * Guards /admin. Every request needs a valid signed session token, or it is sent to
 * /admin/login (and a signed-in admin visiting the login page goes to the dashboard).
 * Pages and server actions check the session again against the database.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isLogin = pathname === '/admin/login';
  const isLogout = pathname === '/admin/logout';
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  const session = await verifySession(token);

  let response: NextResponse;
  if (!session && !isLogin && !isLogout) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    url.search = '';
    if (pathname !== '/admin') url.searchParams.set('next', pathname + search);
    response = NextResponse.redirect(url);
    if (token) response.cookies.set(ADMIN_COOKIE, '', { path: ADMIN_COOKIE_PATH, maxAge: 0 });
  } else if (session && isLogin) {
    response = NextResponse.redirect(new URL('/admin', request.url));
  } else {
    response = NextResponse.next();
  }

  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'same-origin');
  return response;
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
