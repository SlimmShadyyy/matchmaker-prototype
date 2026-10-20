import type { MatchResult, PartnerPreferences, Profile } from '@/types/matchmaking';
import { defaultPreferences } from './preferences';
import { DIMENSIONS, WEIGHTS, type DimensionKey } from './scoring/dimensions';
import { geoFit, kidsFit } from './scoring/primitives';

/** Tier cut-offs on the 0-100 mutual score. Tune from the real score distribution. */
export const TIER_THRESHOLDS = { high: 74, strong: 62 };

/** Maps a 0-100 mutual score to a tier label. */
export const tierFor = (score: number): MatchResult['tier'] =>
  score >= TIER_THRESHOLDS.high
    ? 'High Potential Match'
    : score >= TIER_THRESHOLDS.strong
    ? 'Strong Compatibility'
    : 'Moderate Fit';

export type WeightOverride = Record<DimensionKey, number>;

/**
 * One-directional score: "how well does `cand` fit what `seeker` wants?"
 * `override` lets a matchmaker re-weight the dimensions live; weights are re-normalised to sum to 1.
 */
function scoreOneWay(seeker: Profile, cand: Profile, override?: WeightOverride) {
  const base = override ?? WEIGHTS[seeker.gender];
  const keys = Object.keys(base) as DimensionKey[];
  const sum = keys.reduce((a, k) => a + base[k], 0) || 1;
  let raw = 0;
  const breakdown: MatchResult['scoreBreakdown'] = keys.map((key) => {
    const dim = DIMENSIONS[key];
    const weight = base[key] / sum;
    const { value, reason } = dim.score(seeker, cand);
    raw += value * weight * 100;
    return {
      category: dim.label,
      score: Math.round(value * weight * 100),
      maxScore: Math.round(weight * 100),
      reason,
    };
  });
  return { total: raw, breakdown };
}

/**
 * Stage 1: dealbreakers. Returns the exclusion reason, or null if the pair passes.
 * Universal rules (children, relocation) plus the client's editable partner preferences.
 * For male clients the defaults reproduce the brief's rules; for female clients they are softer.
 */
function dealbreaker(client: Profile, prefs: PartnerPreferences, cand: Profile): string | null {
  if (kidsFit(client.wantKids, cand.wantKids) === 0) return 'Conflicting views on children';
  if (!geoFit(client, cand).feasible) return 'Different cities, no relocation flexibility';
  if (cand.age < prefs.ageMin || cand.age > prefs.ageMax) return 'Outside age range';
  if (cand.heightCm < prefs.heightMin || cand.heightCm > prefs.heightMax) return 'Outside height range';
  if (cand.incomeLPA < prefs.incomeMin || cand.incomeLPA > prefs.incomeMax) return 'Outside income range';
  if (!prefs.diets.includes(cand.diet)) return 'Diet not accepted';
  if (!prefs.acceptDivorced && cand.maritalStatus !== 'Never Married') return 'Previously married';
  if (prefs.sameReligionOnly && cand.religion !== client.religion) return 'Different religion';
  return null;
}

export interface MatchingOutput {
  matches: MatchResult[];
  /** exclusion reason -> number of candidates removed (for the funnel UI) */
  excluded: Record<string, number>;
  considered: number;
}

export function runMatchmakingAlgorithm(
  client: Profile,
  pool: Profile[],
  options: { weights?: WeightOverride; preferences?: PartnerPreferences } = {}
): MatchingOutput {
  const excluded: Record<string, number> = {};
  const matches: MatchResult[] = [];
  const prefs = options.preferences ?? client.preferences ?? defaultPreferences(client);
  const opposite = pool.filter((p) => p.gender !== client.gender);

  for (const cand of opposite) {
    const why = dealbreaker(client, prefs, cand);
    if (why) {
      excluded[why] = (excluded[why] ?? 0) + 1;
      continue;
    }

    const mine = scoreOneWay(client, cand, options.weights); // is she/he right for client? (client's weights, tunable)
    const theirs = scoreOneWay(cand, client); // is client right for candidate?
    // Harmonic mean punishes lopsided matches
    const mutual =
      mine.total + theirs.total === 0 ? 0 : (2 * mine.total * theirs.total) / (mine.total + theirs.total);
    const totalScore = Math.round(mutual);

    matches.push({
      candidate: cand,
      totalScore,
      tier: tierFor(totalScore),
      hardCriteriaMet: true,
      clientScore: Math.round(mine.total),
      candidateScore: Math.round(theirs.total),
      scoreBreakdown: mine.breakdown,
    });
  }

  matches.sort((a, b) => b.totalScore - a.totalScore);
  return { matches, excluded, considered: opposite.length };
}

/** Validate untrusted weights (API bodies). Returns undefined unless all 8 dimensions are finite, non-negative numbers. */
export function sanitizeWeights(raw: unknown): WeightOverride | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out = {} as WeightOverride;
  for (const key of Object.keys(DIMENSIONS) as DimensionKey[]) {
    const v = Number((raw as Record<string, unknown>)[key]);
    if (!Number.isFinite(v) || v < 0 || v > 1) return undefined;
    out[key] = v;
  }
  return Object.values(out).some((v) => v > 0) ? out : undefined;
}
