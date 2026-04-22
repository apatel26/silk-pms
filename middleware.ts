import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function decodeSession(token: string): any | null {
  try {
    if (!token || typeof token !== 'string') return null;
    // Restore standard base64 from URL-safe version
    const standardBase64 = token.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    const padded = standardBase64 + '=='.slice(0, (4 - (standardBase64.length % 4)) % 4);
    if (!/^[A-Za-z0-9+/]+=*$/.test(padded)) return null;
    return JSON.parse(Buffer.from(padded, 'base64').toString());
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
