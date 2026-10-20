'use client';

import React, { useMemo, useState } from 'react';
import type {
  AIPitchResponse, AIRerankItem, AIRerankResponse, MatchResult, PartnerPreferences, Profile, SentRecord,
} from '@/types/matchmaking';
import { getPairCacheKey } from '@/lib/aiHelpers';
import { defaultPreferences } from '@/lib/preferences';
import { WEIGHTS, type DimensionKey } from '@/lib/scoring/dimensions';
import MatchFunnel from '@/components/matches/MatchFunnel';
import MatchTuner from '@/components/matches/MatchTuner';
import MatchPreferences from '@/components/matches/MatchPreferences';
import AIRerankPanel from '@/components/matches/AIRerankPanel';
import MatchFilters, {
  type Tier,
  type SortKey,
} from '@/components/matches/MatchFilters';
import MatchCard from '@/components/matches/MatchCard';
import MatchComparison from '@/components/matches/MatchComparison';
import useMatchResults from '@/hooks/useMatchResults';

interface Props {
  client: Profile;
  sent: Record<string, SentRecord>;
  shortlist: Record<string, boolean>;
  aiCache: Record<string, AIPitchResponse>;
  onToggleShortlist: (candidateId: string) => void;
  onPitch: (match: MatchResult, weights: Record<DimensionKey, number>, preferences: PartnerPreferences) => void;
  onSavePreferences: (preferences: PartnerPreferences) => Promise<void>;
}

const PAGE_SIZE = 12;


export default function MatchExplorer({ client, sent, shortlist, aiCache, onToggleShortlist, onPitch, onSavePreferences }: Props) {
  const defaults = WEIGHTS[client.gender];
  const defaultPrefs = useMemo(() => defaultPreferences(client), [client]);
  const savedPrefs = client.preferences ?? defaultPrefs;
  const [prefs, setPrefs] = useState<PartnerPreferences>(savedPrefs);
  const [showPrefs, setShowPrefs] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const prefsDirty = JSON.stringify(prefs) !== JSON.stringify(savedPrefs);
  const [weights, setWeights] = useState<Record<DimensionKey, number>>({ ...defaults });
  const [showTuner, setShowTuner] = useState(false);
  const [tier, setTier] = useState<Tier>('All');
  const [minScore, setMinScore] = useState(0);
  const [city, setCity] = useState('All');
  const [sort, setSort] = useState<SortKey>('score');
  const [onlyShortlist, setOnlyShortlist] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [compare, setCompare] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  

  // Cache of AI Re-rank results keyed by preference signature (weights + notes + top10 IDs)
  const [rerankCacheByPref, setRerankCacheByPref] = useState<
    Record<string, { map: Record<string, AIRerankItem>; source: AIRerankResponse['source'] }>
  >({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const {
    tuned, result, ranked, baselineRank, rank, currentRerankKey, aiMap, aiSource, loading, refreshing, error: matchError,
  } = useMatchResults({ client, weights, defaults, preferences: prefs, rerankCacheByPref });

  const savePrefs = async () => {
    setSavingPrefs(true);
    try {
      await onSavePreferences(prefs);
    } finally {
      setSavingPrefs(false);
    }
  };

  const runAiRerank = async (forceRefresh = false) => {
    if (!forceRefresh && rerankCacheByPref[currentRerankKey]) {
      return; // Already cached in client memory for these exact preferences
    }
    setAiLoading(true);
    setAiError('');
    try {
      const res = await fetch('/api/rerank', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, weights, preferences: prefs, forceRefresh }),
      });
      if (!res.ok) throw new Error('rerank failed');
      const data: AIRerankResponse = await res.json();
      setRerankCacheByPref((prev) => ({
        ...prev,
        [currentRerankKey]: {
          map: Object.fromEntries(data.results.map((r) => [r.id, r])),
          source: data.source,
        },
      }));
    } catch {
      setAiError('AI re-rank failed. Showing algorithm ranking.');
    } finally {
      setAiLoading(false);
    }
  };

  const clearCurrentAi = () => {
    setRerankCacheByPref((prev) => {
      const copy = { ...prev };
      delete copy[currentRerankKey];
      return copy;
    });
  };

 const cities = useMemo(
    () => ['All', ...Array.from(new Set(ranked.map((m) => m.candidate.city))).sort()],
    [ranked]
  );
  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = { All: ranked.length };
    ranked.forEach((m) => (counts[m.tier] = (counts[m.tier] ?? 0) + 1));
    return counts;
  }, [ranked]);

  const list = useMemo(() => {
    const filtered = ranked.filter(
      (m) =>
        (tier === 'All' || m.tier === tier) &&
        m.totalScore >= minScore &&
        (city === 'All' || m.candidate.city === city) &&
        (!onlyShortlist || shortlist[`${client.id}_${m.candidate.id}`])
    );
    if (sort === 'score') return filtered;
    const by: Record<Exclude<SortKey, 'score'>, (m: MatchResult) => number> = {
      age: (m) => m.candidate.age,
      income: (m) => -m.candidate.incomeLPA,
      height: (m) => -m.candidate.heightCm,
    };
    return [...filtered].sort((a, b) => by[sort](a) - by[sort](b));
  }, [ranked, tier, minScore, city, sort, onlyShortlist, shortlist, client.id]);

  const toggleCompare = (id: string) =>
    setCompare((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev));
  const compared = compare
    .map((id) => ranked.find((m) => m.candidate.id === id))
    .filter((m): m is MatchResult => Boolean(m));
  const resetFilters = () => {
    setTier('All');
    setMinScore(0);
    setCity('All');
    setSort('score');
    setOnlyShortlist(false);
  };

  return (
    <div className="space-y-4">
      {/* Funnel: why candidates were removed */}
      <MatchFunnel
        client={client}
        considered={result.considered}
        qualified={ranked.length}
        excluded={result.excluded}
      />

      {/* Algorithm tuner */}
      <MatchTuner
        clientName={client.firstName}
        weights={weights}
        defaults={defaults}
        tuned={tuned}
        showTuner={showTuner}
        onToggle={() => setShowTuner((v) => !v)}
        onWeightsChange={(update) => setWeights(update(weights))}
        onReset={() => setWeights({ ...defaults })}
      />

      {/* Dealbreakers (hard filters, editable per client) */}
      <MatchPreferences
        clientName={client.firstName}
        prefs={prefs}
        defaults={defaultPrefs}
        dirty={prefsDirty}
        saving={savingPrefs}
        open={showPrefs}
        onToggle={() => setShowPrefs((v) => !v)}
        onChange={setPrefs}
        onSave={savePrefs}
        onRevert={() => setPrefs(savedPrefs)}
        onUseDefaults={() => setPrefs(defaultPrefs)}
      />

      {/* AI second opinion */}
      <AIRerankPanel
        clientName={client.firstName}
        hasAiResults={Boolean(aiMap)}
        aiSource={aiSource}
        aiLoading={aiLoading}
        aiError={aiError}
        onRerank={() => runAiRerank(false)}
        onHide={clearCurrentAi}
      />

      {/* Filters */}   
      <MatchFilters
        tier={tier}
        city={city}
        sort={sort}
        minScore={minScore}
        onlyShortlist={onlyShortlist}
        cities={cities}
        tierCounts={tierCounts}
        shownCount={list.length}
        onTierChange={(value) => {
          setTier(value);
          setVisible(PAGE_SIZE);
        }}
        onCityChange={(value) => {
          setCity(value);
          setVisible(PAGE_SIZE);
        }}
        onSortChange={setSort}
        onMinScoreChange={(value) => {
          setMinScore(value);
          setVisible(PAGE_SIZE);
        }}
        onShortlistToggle={() => setOnlyShortlist((value) => !value)}
      />

      {matchError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-3">{matchError}</div>
      )}

      {/* Cards */}
      {loading ? (
        <div className="bg-white border border-stone-200 rounded-2xl p-10 text-center text-sm text-stone-500">
          Finding matches for {client.firstName}…
        </div>
      ) : list.length === 0 ? (
        <div className="bg-white border border-dashed border-stone-300 rounded-2xl p-10 text-center text-sm text-stone-500">
          {ranked.length === 0
            ? 'No one passes these dealbreakers. Loosen a range above.'
            : 'No matches fit these filters.'}{' '}
          {ranked.length > 0 && (
            <button onClick={resetFilters} className="text-rose-600 font-semibold">
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-opacity ${refreshing ? 'opacity-60' : ''}`}>
          {list.slice(0, visible).map((m) => {
            const c = m.candidate;
            const simpleKey = `${client.id}_${c.id}`;
            // Check preference-aware cache first, fallback to simple pair key if previously cached
            const prefCacheKey = getPairCacheKey(client, c.id, weights);
            const ai = aiCache[prefCacheKey] ?? aiCache[simpleKey];
            const open = expanded === c.id;
            const moved = tuned || aiMap ? (baselineRank.get(c.id) ?? 0) - (rank.get(c.id) ?? 0) : 0;
            const adj = aiMap?.[c.id];
            
            return (
              <MatchCard
                key={c.id}
                client={client}
                match={m}
                rank={rank.get(c.id) ?? 0}
                moved={moved}
                aiPitch={ai}
                aiAdjustment={adj}
                isShortlisted={Boolean(shortlist[simpleKey])}
                isSent={Boolean(sent[simpleKey])}
                isCompared={compare.includes(c.id)}
                expanded={open}
                weights={weights}
                onToggleScore={() => setExpanded(open ? null : c.id)}
                onToggleShortlist={() => onToggleShortlist(c.id)}
                onToggleCompare={() => toggleCompare(c.id)}
                onPitch={(match, matchWeights) => onPitch(match, matchWeights, prefs)}
              />
            );

          })}
        </div>
      )}

      {list.length > visible && (
        <div className="text-center">
          <button
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="px-5 py-2 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-white"
          >
            Show {Math.min(PAGE_SIZE, list.length - visible)} more
          </button>
        </div>
      )}

      <MatchComparison
        client={client}
        compared={compared}
        selectedCount={compare.length}
        showCompare={showCompare}
        onShowCompare={() => setShowCompare(true)}
        onCloseCompare={() => setShowCompare(false)}
        onClear={() => setCompare([])}
      />
    </div>
  );
}