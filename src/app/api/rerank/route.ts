import { NextResponse } from 'next/server';
import type { AIRerankItem, AIRerankResponse } from '@/types/matchmaking';
import { describe, getRerankCacheKey, notesText, templateInsight } from '@/lib/aiHelpers';
import { getCachedRerank, setCachedRerank } from '@/lib/backendStore';
import { groqJson } from '@/lib/groq';
import { isAuthenticated, unauthorizedResponse } from '@/lib/apiAuth';
import { getRepo } from '@/lib/server/repo';
import { POOL, findSeedClient, mergeClient } from '@/lib/server/clients';
import { sanitizePreferences } from '@/lib/preferences';
import { runMatchmakingAlgorithm, sanitizeWeights } from '@/lib/matchingEngine';

const MAX_ADJUST = 8; // the algorithm stays in charge: the AI can only nudge scores
const MAX_MATCHES = 10;

/**
 * Body: { clientId, weights?, preferences?, forceRefresh? }
 * The server recomputes the shortlist itself (same engine, same inputs as the dashboard), so the
 * browser cannot feed the model made-up profiles or scores.
 */
export async function POST(req: Request) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const seed = findSeedClient(String(body.clientId ?? ''));
  if (!seed) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  try {
    const client = mergeClient(seed, await getRepo().load());
    const weights = sanitizeWeights(body.weights);
    const preferences = body.preferences !== undefined ? sanitizePreferences(body.preferences, client.preferences!) : client.preferences!;

    const top = runMatchmakingAlgorithm(client, POOL, { weights, preferences }).matches.slice(0, MAX_MATCHES);
    if (top.length === 0) return NextResponse.json({ error: 'No qualified matches to re-rank' }, { status: 404 });

    const cacheKey = getRerankCacheKey(client, top.map((m) => m.candidate.id), weights);
    if (body.forceRefresh !== true) {
      const cached = getCachedRerank(cacheKey);
      if (cached) return NextResponse.json({ ...cached, fromCache: true });
    }

    const fallback: AIRerankResponse = {
      source: 'fallback',
      results: top.map((m) => ({ id: m.candidate.id, adjustment: 0, ...templateInsight(m.candidate, m.scoreBreakdown) })),
    };

    if (!process.env.GROQ_API_KEY) {
      console.warn('[rerank] GROQ_API_KEY is not set: returning template fallback.');
      return NextResponse.json(fallback);
    }

    const prompt = `You are a senior Indian matchmaker reviewing an algorithm's shortlist for your CLIENT.
The algorithm already scored each pair on age, height, income, kids, location, culture, lifestyle and family.
Your job: use the qualitative signals the algorithm cannot see (the matchmaker's notes, the bios) to give each candidate a small score ADJUSTMENT between -${MAX_ADJUST} and +${MAX_ADJUST} (integers), a one-sentence INSIGHT on the fit, and a one-sentence WATCHOUT (a real friction or "none"). Use only facts given; do not invent.

CLIENT: ${describe(client)}
MATCHMAKER NOTES ON CLIENT: ${notesText(client)}

CANDIDATES:
${top
  .map(
    (m) =>
      `- id=${m.candidate.id} | score=${m.totalScore} | ${describe(m.candidate)} | breakdown=${m.scoreBreakdown
        .map((b) => `${b.category} ${b.score}/${b.maxScore}`)
        .join(', ')}`
  )
  .join('\n')}

Return ONLY JSON: {"results":[{"id":"<id>","adjustment":<int>,"insight":"...","watchOut":"..."}]} with one entry per candidate.`;

    try {
      const parsed = await groqJson<{ results?: Partial<AIRerankItem>[] }>(prompt, 0.3);
      const byId = new Map((parsed.results ?? []).map((r) => [r.id, r]));
      const results: AIRerankItem[] = top.map((m, i) => {
        const r = byId.get(m.candidate.id);
        const adj = Number(r?.adjustment);
        return {
          id: m.candidate.id,
          // Clamp in code: never trust the model with the final say
          adjustment: Number.isFinite(adj) ? Math.max(-MAX_ADJUST, Math.min(MAX_ADJUST, Math.round(adj))) : 0,
          insight: r?.insight || fallback.results[i].insight,
          watchOut: r?.watchOut || fallback.results[i].watchOut,
        };
      });
      const responseData: AIRerankResponse = { source: 'groq', results };
      setCachedRerank(cacheKey, responseData);
      return NextResponse.json({ ...responseData, fromCache: false });
    } catch (error) {
      console.error('[rerank] Groq error:', error);
      return NextResponse.json(fallback);
    }
  } catch (error) {
    console.error('[rerank] request failed:', error);
    return NextResponse.json({ error: 'Could not re-rank' }, { status: 500 });
  }
}
