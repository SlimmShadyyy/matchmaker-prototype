import { NextResponse } from 'next/server';
import { isAuthenticated, unauthorizedResponse } from '@/lib/apiAuth';
import { POOL, findSeedClient } from '@/lib/server/clients';

/** Opposite-gender pool for the "Browse pool" tab. GET /api/pool?clientId=...&q=... */
export async function GET(request: Request) {
  if (!isAuthenticated(request)) return unauthorizedResponse();

  const url = new URL(request.url);
  const seed = findSeedClient(url.searchParams.get('clientId') ?? '');
  if (!seed) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase().slice(0, 80);
  const all = POOL.filter((p) => p.gender !== seed.gender);
  const candidates = q
    ? all.filter((p) => `${p.id} ${p.firstName} ${p.lastName} ${p.city} ${p.company} ${p.designation}`.toLowerCase().includes(q))
    : all;

  return NextResponse.json({ total: all.length, candidates });
}
