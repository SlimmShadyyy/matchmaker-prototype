import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

export const COOKIE_NAME = 'tdc_matchmaker_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 12;

/** The single demo matchmaker. A real build would load users from the database. */
export const MATCHMAKER = { name: 'Simran Kaur', role: 'Lead Matchmaker' } as const;

const DEMO_EMAIL = 'simran@thedatecrew.com';
const DEMO_PASSWORD = 'tdc-matchmaker-2026';

export class MissingSecretError extends Error {}

/** Dedicated signing secret. Never reuse an API key. Required in production (fails closed). */
function secret(): string {
  const s = process.env.MATCHMAKER_SESSION_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === 'production') {
    throw new MissingSecretError('MATCHMAKER_SESSION_SECRET is not set');
  }
  return 'local-dev-only-session-secret';
}

const signature = (payload: string) => createHmac('sha256', secret()).update(payload).digest('hex');

export function isAuthenticated(request: Request): boolean {
  try {
    return verifySession(request.headers.get('cookie') ?? undefined);
  } catch {
    return false; // missing secret in production => nobody is authenticated
  }
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
}

export function issueSession(email: string) {
  const payload = `${email.trim().toLowerCase()}.${Date.now() + SESSION_TTL_SECONDS * 1000}`;
  return `${payload}.${signature(payload)}`;
}

export function verifySession(cookieHeader: string | undefined): boolean {
  const cookie = cookieHeader?.split(';').map((p) => p.trim()).find((p) => p.startsWith(`${COOKIE_NAME}=`));
  if (!cookie) return false;
  let token: string;
  try { token = decodeURIComponent(cookie.slice(COOKIE_NAME.length + 1)); } catch { return false; }
  const lastDot = token.lastIndexOf('.');
  if (lastDot < 0) return false;
  const payload = token.slice(0, lastDot);
  const supplied = token.slice(lastDot + 1);
  const expirySeparator = payload.lastIndexOf('.');
  const expiresAt = Number(payload.slice(expirySeparator + 1));
  if (expirySeparator < 0 || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) return false;
  const a = Buffer.from(supplied);
  const b = Buffer.from(signature(payload));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function credentialsMatch(email: string, password: string) {
  const expectedEmail = (process.env.MATCHMAKER_EMAIL || DEMO_EMAIL).toLowerCase();
  const expectedPassword = process.env.MATCHMAKER_PASSWORD || DEMO_PASSWORD;
  return email.trim().toLowerCase() === expectedEmail && password === expectedPassword;
}
