import { NextResponse } from 'next/server';
import { isAuthenticated, unauthorizedResponse } from '@/lib/apiAuth';
import { getRepo } from '@/lib/server/repo';
import { POOL, findSeedClient, mergeClient } from '@/lib/server/clients';
import { defaultPreferences, sanitizePreferences } from '@/lib/preferences';
import { runMatchmakingAlgorithm, sanitizeWeights } from '@/lib/matchingEngine';
import type { MatchingResponse } from '@/types/matchmaking';

/**
 * Server-side matching: the candidate pool never leaves the server.
 * Body: { clientId, weights?, preferences? }. Weights and preferences are live "what-if" overrides
 * from the dashboard; if preferences are omitted, the client's saved ones are used.
 */
export async function POST(request: Request) {
  if (!isAuthenticated(request)) return unauthorizedResponse();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const seed = findSeedClient(String(body.clientId ?? ''));
  if (!seed) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  try {
    const preferences =
      body.preferences !== undefined
        ? sanitizePreferences(body.preferences, defaultPreferences(seed))
        : mergeClient(seed, await getRepo().load()).preferences!;
    const client = { ...seed, preferences };
    const weights = sanitizeWeights(body.weights);

    const result = runMatchmakingAlgorithm(client, POOL, { weights, preferences });
    // Rank under default weights (same dealbreakers) so the UI can show "moved up/down" arrows
    const baseline = weights ? runMatchmakingAlgorithm(client, POOL, { preferences }) : result;

    const response: MatchingResponse = {
      ...result,
      baselineRank: Object.fromEntries(baseline.matches.map((m, i) => [m.candidate.id, i + 1])),
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error('[matches] failed:', error);
    return NextResponse.json({ error: 'Could not compute matches' }, { status: 500 });
  }
}
