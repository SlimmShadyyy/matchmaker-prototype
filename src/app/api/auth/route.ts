import { NextRequest, NextResponse } from 'next/server';
import {
  COOKIE_NAME, MATCHMAKER, MissingSecretError, SESSION_TTL_SECONDS, credentialsMatch, issueSession,
} from '@/lib/apiAuth';

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const email = String(body.email ?? body.username ?? '');
  const password = String(body.password ?? '');

  if (!credentialsMatch(email, password)) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  try {
    const response = NextResponse.json({
      authenticated: true,
      matchmaker: { email: email.trim().toLowerCase(), ...MATCHMAKER },
    });
    response.cookies.set(COOKIE_NAME, issueSession(email), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_SECONDS,
    });
    return response;
  } catch (e) {
    if (e instanceof MissingSecretError) {
      console.error('[auth]', e.message);
      return NextResponse.json({ error: 'Server misconfigured: MATCHMAKER_SESSION_SECRET is not set' }, { status: 500 });
    }
    throw e;
  }
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.delete(COOKIE_NAME);
  return response;
}
