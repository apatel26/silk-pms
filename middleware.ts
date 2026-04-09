import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function decodeSession(token: string): any | null {
  try {
    if (!token || typeof token !== 'string') return null;
    // Validate base64 format before decoding
    if (!/^[A-Za-z0-9+/]+=*$/.test(token)) return null;
    return JSON.parse(Buffer.from(token, 'base64').toString());
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('pms_session');
  const isLoginPage = request.nextUrl.pathname === '/';

  let isAuthenticated = false;

  if (sessionCookie?.value) {
    const session = decodeSession(sessionCookie.value);
    isAuthenticated = session !== null;
  }

  // Redirect to login if not authenticated (except on login page)
  if (!isAuthenticated && !isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Redirect to dashboard if authenticated and on login page
  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/auth|api/settings|_next/static|_next/image|favicon.ico).*)'],
};
