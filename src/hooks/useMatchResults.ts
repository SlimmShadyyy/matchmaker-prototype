import { useEffect, useMemo, useState } from 'react';
import type {
  AIRerankItem,
  AIRerankResponse,
  MatchingResponse,
  PartnerPreferences,
  Profile,
} from '@/types/matchmaking';
import { getRerankCacheKey } from '@/lib/aiHelpers';
import { tierFor } from '@/lib/matchingEngine';
import { DIMENSIONS, type DimensionKey } from '@/lib/scoring/dimensions';

type RerankCache = Record<string, { map: Record<string, AIRerankItem>; source: AIRerankResponse['source'] }>;

interface UseMatchResultsOptions {
  client: Profile;
  weights: Record<DimensionKey, number>;
  defaults: Record<DimensionKey, number>;
  preferences: PartnerPreferences;
  rerankCacheByPref: RerankCache;
}

const EMPTY: MatchingResponse = { matches: [], excluded: {}, considered: 0, baselineRank: {} };

/**
 * Matching runs on the server (POST /api/matches), so the candidate pool never reaches the
 * browser. Slider and dealbreaker changes are debounced; the previous results stay on screen
 * while the next ones load.
 */
export default function useMatchResults({ client, weights, defaults, preferences, rerankCacheByPref }: UseMatchResultsOptions) {
  const dimensionKeys = Object.keys(DIMENSIONS) as DimensionKey[];
  const tuned = dimensionKeys.some((key) => weights[key] !== defaults[key]);

  const [data, setData] = useState<MatchingResponse | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const weightsKey = JSON.stringify(weights);
  const prefsKey = JSON.stringify(preferences);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setRefreshing(true);
      try {
        const res = await fetch('/api/matches', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            clientId: client.id,
            weights: tuned ? JSON.parse(weightsKey) : undefined,
            preferences: JSON.parse(prefsKey),
          }),
        });
        if (!res.ok) throw new Error(`matches ${res.status}`);
        setData(await res.json());
        setError('');
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setError('Could not load matches. Change a setting to retry.');
      } finally {
        if (!controller.signal.aborted) setRefreshing(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [client.id, tuned, weightsKey, prefsKey]);

  const result = data ?? EMPTY;

  const currentRerankKey = useMemo(
    () => getRerankCacheKey(client, result.matches.slice(0, 10).map((m) => m.candidate.id), weights),
    [client, result.matches, weights]
  );
  const activeRerankEntry = rerankCacheByPref[currentRerankKey] ?? null;
  const aiMap = activeRerankEntry?.map ?? null;
  const aiSource = activeRerankEntry?.source ?? 'fallback';

  // Algorithm score + bounded AI adjustment (Stage 3). Falls back to the pure algorithm ranking.
  const ranked = useMemo(() => {
    if (!aiMap) return result.matches;
    return result.matches
      .map((match) => {
        const adjustment = aiMap[match.candidate.id];
        if (!adjustment) return match;
        const score = Math.max(0, Math.min(100, match.totalScore + adjustment.adjustment));
        return { ...match, totalScore: score, tier: tierFor(score) };
      })
      .sort((a, b) => b.totalScore - a.totalScore);
  }, [result.matches, aiMap]);

  const baselineRank = useMemo(() => new Map(Object.entries(result.baselineRank)), [result.baselineRank]);
  const rank = useMemo(() => new Map(ranked.map((m, i) => [m.candidate.id, i + 1])), [ranked]);

  return {
    tuned, result, ranked, baselineRank, rank,
    currentRerankKey, activeRerankEntry, aiMap, aiSource,
    loading: data === null && !error,
    refreshing,
    error,
  };
}
