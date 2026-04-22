import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { verifyPassword } from '@/lib/password';
import { createAuditLog } from '@/lib/audit';

const AUTH_COOKIE_NAME = 'pms_session';

interface SessionData {
  userId: string;
  username: string;
  role: string;
  fullName: string;
}

function createSessionData(user: any): SessionData {
  return {
    userId: user.id,
    username: user.username,
    role: user.role,
    fullName: user.full_name || '',
  };
}

function encodeSession(data: SessionData): string {
  const jsonStr = JSON.stringify(data);
  const base64 = Buffer.from(jsonStr).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeSession(token: string): SessionData | null {
  try {
    if (!token || typeof token !== 'string') return null;
    const standardBase64 = token.replace(/-/g, '+').replace(/_/g, '/');
    const padded = standardBase64 + '=='.slice(0, (4 - (standardBase64.length % 4)) % 4);
    if (!/^[A-Za-z0-9+/]+=*$/.test(padded)) return null;
    return JSON.parse(Buffer.from(padded, 'base64').toString());
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
    let user = null;
    let userError = null;
    try {
      const result = await supabase.from('users').select('*').eq('username', username).eq('active', true).single();
      user = result.data;
      userError = result.error;
    } catch (queryErr) {
      return NextResponse.json({ error: 'Database query failed: ' + (queryErr instanceof Error ? queryErr.message : String(queryErr)) }, { status: 500 });
    }

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const passwordValid = verifyPassword(password, user.password_hash);
    if (!passwordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const sessionData = createSessionData(user);
    const sessionToken = encodeSession(sessionData);

    // Audit log successful login
    await createAuditLog({
      userId: user.id,
      username: user.username,
      action: 'login',
      entity_type: 'user',
      entity_id: user.id,
      details: { username: user.username },
    });

    try {
      const cookieStore = await cookies();
      cookieStore.set(AUTH_COOKIE_NAME, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });
    } catch (cookieError) {
      console.error('Cookie set error:', cookieError);
      return NextResponse.json({ error: 'Failed to set session cookie' }, { status: 500 });
    }

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
    const sessionCookie = cookieStore.get(AUTH_COOKIE_NAME);

    // Log logout before deleting cookie
    if (sessionCookie?.value) {
      const sessionData = decodeSession(sessionCookie.value);
      if (sessionData) {
        await createAuditLog({
          userId: sessionData.userId,
          username: sessionData.username,
          action: 'logout',
          entity_type: 'user',
          entity_id: sessionData.userId,
          details: { username: sessionData.username },
        });
      }
    }

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
