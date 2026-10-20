import { NextResponse } from 'next/server';
import type { AIPitchResponse } from '@/types/matchmaking';
import { describe, getPairCacheKey, notesText, templatePitch } from '@/lib/aiHelpers';
import { getCachedPitch, setCachedPitch } from '@/lib/backendStore';
import { groqJson } from '@/lib/groq';
import { isAuthenticated, unauthorizedResponse, MATCHMAKER } from '@/lib/apiAuth';
import { getRepo } from '@/lib/server/repo';
import { POOL, findCandidateFor, findSeedClient, mergeClient } from '@/lib/server/clients';
import { sanitizePreferences } from '@/lib/preferences';
import { runMatchmakingAlgorithm, sanitizeWeights } from '@/lib/matchingEngine';

/**
 * Body: { clientId, candidateId, weights?, preferences?, forceRefresh? }
 * The server looks the profiles up by id and recomputes the score itself. It never trusts
 * profile data or scores sent by the browser.
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
  const candidate = findCandidateFor(seed, String(body.candidateId ?? ''));
  if (!candidate) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });

  try {
    const client = mergeClient(seed, await getRepo().load());
    const weights = sanitizeWeights(body.weights);
    const preferences = body.preferences !== undefined ? sanitizePreferences(body.preferences, client.preferences!) : client.preferences!;

    const match = runMatchmakingAlgorithm(client, POOL, { weights, preferences }).matches.find((m) => m.candidate.id === candidate.id);
    if (!match) {
      return NextResponse.json({ error: 'This candidate does not qualify under the current dealbreakers' }, { status: 404 });
    }

    const fallback = templatePitch(client, candidate, match.scoreBreakdown, match.totalScore, MATCHMAKER.name);
    const cacheKey = getPairCacheKey(client, candidate.id, weights);

    if (body.forceRefresh !== true) {
      const cached = getCachedPitch(cacheKey);
      if (cached) return NextResponse.json(cached);
    }

    if (!process.env.GROQ_API_KEY) {
      console.warn('[ai-pitch] GROQ_API_KEY is missing; using template fallback.');
      return NextResponse.json(fallback);
    }

    const prompt = `You are ${MATCHMAKER.name}, a thoughtful matchmaker at The Date Crew.

Write an introduction of the SUGGESTED MATCH to your CLIENT.
Use only facts supplied below. Never invent details, hobbies, or quotes.

CLIENT:
${describe(client)}

MATCHMAKER'S PRIVATE NOTES ON CLIENT (use to personalise, never quote verbatim):
${notesText(client)}

SUGGESTED MATCH:
${describe(candidate)}

ALGORITHM SCORE: ${match.totalScore}/100 (mutual).
BREAKDOWN: ${JSON.stringify(match.scoreBreakdown)}

Return only JSON with this structure:
{
  "compatibilitySummary": "Two sentences explaining the compatibility using concrete facts.",
  "emailSubject": "A warm, specific subject line.",
  "emailBody": "Three short paragraphs addressed to ${client.firstName}, signed ${MATCHMAKER.name} | The Date Crew.",
  "talkingPoints": ["Three short icebreakers grounded in the profiles."]
}`;

    try {
      const parsed = await groqJson<Partial<AIPitchResponse>>(prompt, 0.6);
      const pitch: AIPitchResponse = {
        compatibilitySummary: parsed.compatibilitySummary || fallback.compatibilitySummary,
        emailSubject: parsed.emailSubject || fallback.emailSubject,
        emailBody: parsed.emailBody || fallback.emailBody,
        talkingPoints: Array.isArray(parsed.talkingPoints) && parsed.talkingPoints.length > 0 ? parsed.talkingPoints : fallback.talkingPoints,
        source: 'groq',
      };
      setCachedPitch(cacheKey, pitch);
      return NextResponse.json(pitch);
    } catch (error) {
      console.error('[ai-pitch] Groq generation failed:', error);
      return NextResponse.json(fallback);
    }
  } catch (error) {
    console.error('[ai-pitch] request failed:', error);
    return NextResponse.json({ error: 'Could not generate the pitch' }, { status: 500 });
  }
}
