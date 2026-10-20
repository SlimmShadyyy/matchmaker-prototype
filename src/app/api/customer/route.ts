import { NextResponse } from 'next/server';
import { isAuthenticated, unauthorizedResponse, MATCHMAKER } from '@/lib/apiAuth';
import { getRepo } from '@/lib/server/repo';
import { buildClients, findCandidateFor, findSeedClient, mergeClient, poolSizePerGender } from '@/lib/server/clients';
import { defaultPreferences, sanitizePreferences } from '@/lib/preferences';
import type { AIPitchResponse, JourneyStage } from '@/types/matchmaking';

const VALID_STAGES: JourneyStage[] = [
  'Onboarding & Verification', 'Profile Curation', 'Active Matching', 'Date Feedback Loop', 'Paused / Matched',
];

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

/** Validate the email that is being "sent" (it comes from the browser, so never trust its shape). */
function parsePitch(raw: unknown): AIPitchResponse | null {
  const p = (raw ?? {}) as Record<string, unknown>;
  const text = (v: unknown, max: number) => (typeof v === 'string' && v.trim().length > 0 && v.length <= max ? v : null);
  const summary = text(p.compatibilitySummary, 2000);
  const subject = text(p.emailSubject, 300);
  const body = text(p.emailBody, 10000);
  if (!summary || !subject || !body) return null;
  const points = Array.isArray(p.talkingPoints) ? p.talkingPoints.filter((t): t is string => typeof t === 'string').slice(0, 10) : [];
  return {
    compatibilitySummary: summary, emailSubject: subject, emailBody: body, talkingPoints: points,
    source: p.source === 'groq' ? 'groq' : 'fallback',
  };
}

/** Everything the dashboard needs after login or refresh. The candidate pool is NOT included. */
export async function GET(request: Request) {
  if (!isAuthenticated(request)) return unauthorizedResponse();
  try {
    const state = await getRepo().load();
    return NextResponse.json({
      matchmaker: MATCHMAKER,
      customers: buildClients(state),
      poolCount: poolSizePerGender(),
      shortlist: state.shortlist,
      sent: state.sent,
    });
  } catch (error) {
    console.error('[customer] load failed:', error);
    return bad('Could not load dashboard data', 500);
  }
}

/** Mutations. Each returns the freshly merged customer (profile + ALL notes + preferences). */
export async function PATCH(request: Request) {
  if (!isAuthenticated(request)) return unauthorizedResponse();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return bad('Invalid request body');
  }

  const seed = findSeedClient(String(body.clientId ?? ''));
  if (!seed) return bad('Client not found', 404);
  const repo = getRepo();
  const extra: Record<string, unknown> = {};

  try {
    switch (body.action) {
      case 'updateStage': {
        if (!VALID_STAGES.includes(body.statusTag as JourneyStage)) return bad('Invalid customer stage');
        await repo.setStage(seed.id, body.statusTag as JourneyStage);
        break;
      }
      case 'addNote': {
        const text = String(body.text ?? '').trim();
        if (!text || text.length > 2000) return bad('Note must contain 1–2000 characters');
        await repo.addNote(seed.id, text, `${MATCHMAKER.name} (${MATCHMAKER.role})`);
        break;
      }
      case 'updatePreferences': {
        await repo.setPreferences(seed.id, sanitizePreferences(body.preferences, defaultPreferences(seed)));
        break;
      }
      case 'setShortlist': {
        const candidate = findCandidateFor(seed, String(body.candidateId ?? ''));
        if (!candidate) return bad('Candidate not found', 404);
        if (typeof body.value !== 'boolean') return bad('value must be true or false');
        await repo.setShortlist(seed.id, candidate.id, body.value);
        extra.shortlisted = body.value;
        break;
      }
      case 'markSent': {
        const candidate = findCandidateFor(seed, String(body.candidateId ?? ''));
        if (!candidate) return bad('Candidate not found', 404);
        const pitch = parsePitch(body.pitch);
        if (!pitch) return bad('A valid email (subject, body, summary) is required');
        const score = Math.max(0, Math.min(100, Math.round(Number(body.score) || 0)));
        extra.sent = await repo.recordSent(seed.id, candidate.id, score, pitch);
        break;
      }
      default:
        return bad('Unsupported action');
    }

    const state = await repo.load();
    return NextResponse.json({ customer: mergeClient(seed, state), ...extra });
  } catch (error) {
    console.error('[customer] update failed:', error);
    return bad('Could not save changes', 500);
  }
}
