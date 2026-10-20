import type { AIPitchResponse, MatchResult, Profile } from '@/types/matchmaking';

type Breakdown = MatchResult['scoreBreakdown'];

/** Small non-cryptographic hash (FNV-1a). Runs in both browser and server. */
export function hashString(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
const ratio = (b: Breakdown[number]) => (b.maxScore ? b.score / b.maxScore : 0);

/** Compact one-paragraph profile used inside LLM prompts. */
export function describe(p: Profile): string {
  return (
    `${p.firstName} ${p.lastName} (${p.gender}, ${p.age}, ${p.heightDisplay}) in ${p.city} [${p.workMode}, relocate: ${p.openToRelocate}]. ` +
    `${p.designation} at ${p.company}, ${p.incomeDisplay}. ${p.degree}, ${p.undergradCollege}. ` +
    `Wants kids: ${p.wantKids}. Pets: ${p.openToPets}. Diet: ${p.diet}. Family: ${p.familyType}. ` +
    `${p.religion} (${p.caste}). ${p.maritalStatus}. Languages: ${p.languages.join(', ')}. Bio: ${p.bio}`
  );
}

export const notesText = (p: Profile): string =>
  p.notes?.length ? p.notes.map((n) => n.text).join(' | ') : 'None recorded.';

export const strongest = (b: Breakdown, n = 2) => [...b].sort((x, y) => ratio(y) - ratio(x)).slice(0, n);
export const weakest = (b: Breakdown) => [...b].sort((x, y) => ratio(x) - ratio(y))[0];

/** Data-driven (never invented) insight, used when no API key is set or the LLM fails. */
export function templateInsight(candidate: Profile, b: Breakdown): { insight: string; watchOut: string } {
  const [s1, s2] = strongest(b);
  const w = weakest(b);
  return {
    insight: `${candidate.firstName} scores best on ${s1.category.toLowerCase()} (${s1.reason}) and ${s2.category.toLowerCase()} (${s2.reason}).`,
    watchOut: w && ratio(w) < 0.6 ? `${w.category}: ${w.reason}` : 'No notable friction in the profile data.',
  };
}

/** Intro-email fallback assembled only from real profile fields and the score breakdown. */
export function templatePitch(
  client: Profile,
  candidate: Profile,
  b: Breakdown,
  totalScore: number,
  matchmakerName: string
): AIPitchResponse {
  const [s1, s2] = strongest(b);
  const shared = client.languages.filter((l) => candidate.languages.includes(l));
  return {
    compatibilitySummary: `${client.firstName} and ${candidate.firstName} score ${totalScore}% overall, strongest on ${s1.category.toLowerCase()} (${s1.reason}) and ${s2.category.toLowerCase()} (${s2.reason}).`,
    emailSubject: `An introduction worth your time: ${candidate.firstName}, ${candidate.designation} in ${candidate.city}`,
    emailBody:
      `Hi ${client.firstName},\n\n` +
      `Based on what you shared with us, I'd like to introduce ${candidate.firstName} ${candidate.lastName}, ${candidate.age}, a ${candidate.designation} at ${candidate.company} based in ${candidate.city}. ${candidate.firstName} studied at ${candidate.undergradCollege}.\n\n` +
      `Why I think this is a good fit: ${s1.reason.toLowerCase()}, and ${s2.reason.toLowerCase()}. On children, ${candidate.firstName} is "${candidate.wantKids}" and you are "${client.wantKids}".\n\n` +
      `If you'd like to meet, reply and I'll set up an intro call.\n\nWarmly,\n${matchmakerName} | The Date Crew`,
    talkingPoints: [
      `Their work as a ${candidate.designation} at ${candidate.company}`,
      shared.length ? `Shared languages: ${shared.join(', ')}` : `Life in ${candidate.city}`,
      `Food and lifestyle: ${candidate.diet}, ${candidate.drinkingSmoking.toLowerCase()} drinker/smoker`,
    ],
    source: 'fallback',
  };
}

/**
 * Builds a deterministic fingerprint of everything that defines a client's preferences:
 * - Active weight sliders (or default gender weights)
 * - Client's core preference fields (wantKids, openToRelocate, openToPets, diet, city)
 * - Matchmaker's call notes (since AI reads notes to personalize feedback)
 */
export function getPreferenceSignature(
  client: Profile,
  weights?: Record<string, number> | null
): string {
  const normalizedWeights = weights
    ? Object.entries(weights)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}:${Math.round((Number(v) || 0) * 100)}`)
        .join(',')
    : 'default-weights';

  // Hash the FULL text of every note so editing any note invalidates cached AI output.
  const notesHash = hashString((client.notes ?? []).map((n) => n.text.trim()).join('\u241f'));

  const corePrefs = [
    client.city,
    client.wantKids,
    client.openToRelocate,
    client.openToPets,
    client.diet,
    client.familyType,
  ].join('|');

  return `${corePrefs}__${normalizedWeights}__notes:${notesHash}`;
}

/** Cache key for a specific (Client + Partner + Current Preference State) */
export function getPairCacheKey(
  client: Profile,
  candidateId: string,
  weights?: Record<string, number> | null
): string {
  return `${client.id}__${candidateId}__${getPreferenceSignature(client, weights)}`;
}

/** Cache key for AI Re-rank of a Client's Top 10 under Current Preferences */
export function getRerankCacheKey(
  client: Profile,
  candidateIds: string[],
  weights?: Record<string, number> | null
): string {
  return `rerank__${client.id}__${candidateIds.join(',')}__${getPreferenceSignature(client, weights)}`;
}