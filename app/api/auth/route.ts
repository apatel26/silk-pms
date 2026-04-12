import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { verifyPassword } from '@/lib/password';

const AUTH_COOKIE_NAME = 'pms_session';
const SESSION_COOKIE_VALUE_SEPARATOR = '|';

interface SessionData {
  userId: string;
  username: string;
  role: string;
  fullName: string;
  photoUrl: string | null;
}

function createSessionData(user: any): SessionData {
  return {
    userId: user.id,
    username: user.username,
    role: user.role,
    fullName: user.full_name || '',
    photoUrl: user.photo_url || null,
  };
}

function encodeSession(data: SessionData): string {
  try {
    return Buffer.from(JSON.stringify(data)).toString('base64');
  } catch {
    throw new Error('Failed to encode session data');
  }
}

function decodeSession(token: string): SessionData | null {
  try {
    if (!token || typeof token !== 'string') return null;
    if (!/^[A-Za-z0-9+/]+=*$/.test(token)) return null;
    return JSON.parse(Buffer.from(token, 'base64').toString());
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    const supabase = createServerClient();
    console.error('AUTH DEBUG: Supabase client created');

    // Find user
    let user = null;
    let userError = null;
    try {
      console.error('AUTH DEBUG: Starting query with supabase');
      const result = await supabase.from('users').select('*').eq('username', username).eq('active', true).single();
      user = result.data;
      userError = result.error;
      console.error('AUTH DEBUG: Query result data:', user ? 'found' : 'null');
      console.error('AUTH DEBUG: Query result error:', userError ? userError.message : 'none');
    } catch (queryErr) {
      console.error('AUTH DEBUG: Query exception:', queryErr instanceof Error ? queryErr.message : String(queryErr));
      console.error('AUTH DEBUG: Full error stack:', queryErr instanceof Error ? queryErr.stack : 'no stack');
      return NextResponse.json({ error: 'Database query failed: ' + (queryErr instanceof Error ? queryErr.message : String(queryErr)) }, { status: 500 });
    }

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Check password (use verifyPassword to support both legacy and hashed)
    const passwordValid = verifyPassword(password, user.password_hash);
    console.error('AUTH DEBUG: Password valid:', passwordValid);

    if (!passwordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Create session
    const sessionData = createSessionData(user);
    const sessionToken = encodeSession(sessionData);
    console.error('AUTH DEBUG: Session created');

    // Set cookie
    try {
      const cookieStore = await cookies();
      cookieStore.set(AUTH_COOKIE_NAME, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });
    } catch (cookieError) {
      console.error('AUTH DEBUG: Cookie set error:', cookieError);
      throw new Error('Failed to set session cookie');
    }

    console.error('AUTH DEBUG: Cookie set, returning success');

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.full_name,
        photoUrl: user.photo_url || null,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Login failed: ' + message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(AUTH_COOKIE_NAME);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(AUTH_COOKIE_NAME);

    if (!sessionCookie?.value) {
      return NextResponse.json({ authenticated: false });
    }

    const sessionData = decodeSession(sessionCookie.value);

    if (!sessionData) {
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({
      authenticated: true,
      user: sessionData,
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ authenticated: false });
  }
}
