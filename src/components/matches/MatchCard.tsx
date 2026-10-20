
import {
  Check,
  Scale,
  Send,
  Sparkles,
  Star,
} from 'lucide-react';

import type {
  AIPitchResponse,
  AIRerankItem,
  MatchResult,
  Profile,
} from '@/types/matchmaking';

import type { DimensionKey } from '@/lib/scoring/dimensions';
import ScoreBreakdown from '@/components/matches/ScoreBreakdown';

interface MatchCardProps {
  client: Profile;
  match: MatchResult;
  rank: number;
  moved: number;
  aiPitch?: AIPitchResponse;
  aiAdjustment?: AIRerankItem;
  isShortlisted: boolean;
  isSent: boolean;
  isCompared: boolean;
  expanded: boolean;
  weights: Record<DimensionKey, number>;
  onToggleScore: () => void;
  onToggleShortlist: () => void;
  onToggleCompare: () => void;
  onPitch: (
    match: MatchResult,
    weights: Record<DimensionKey, number>
  ) => void;
}

const TIER_STYLE: Record<MatchResult['tier'], string> = {
  'High Potential Match':
    'bg-rose-50 text-rose-700 border-rose-200',
  'Strong Compatibility':
    'bg-amber-50 text-amber-700 border-amber-200',
  'Moderate Fit':
    'bg-stone-100 text-stone-600 border-stone-200',
};

export default function MatchCard({
  client,
  match,
  rank,
  moved,
  aiPitch,
  aiAdjustment,
  isShortlisted,
  isSent,
  isCompared,
  expanded,
  weights,
  onToggleScore,
  onToggleShortlist,
  onToggleCompare,
  onPitch,
}: MatchCardProps) {
  const candidate = match.candidate;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      {/* Candidate identity and ranking */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-stone-900">
              {candidate.firstName} {candidate.lastName}, {candidate.age}
            </h3>

            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${TIER_STYLE[match.tier]}`}
            >
              {match.tier}
            </span>

            {moved !== 0 && (
              <span
                className={`text-[10px] font-bold ${
                  moved > 0 ? 'text-emerald-600' : 'text-rose-500'
                }`}
              >
                {moved > 0 ? '▲' : '▼'}
                {Math.abs(moved)}
              </span>
            )}
          </div>

          <p className="mt-0.5 text-xs text-stone-500">
            {candidate.designation} at {candidate.company} •{' '}
            {candidate.incomeDisplay}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <span className="text-xl font-extrabold text-rose-600">
            {match.totalScore}%
          </span>
          <p className="text-[10px] text-stone-400">rank #{rank}</p>
        </div>
      </div>

      {/* Candidate profile highlights */}
      <div className="flex flex-wrap gap-1.5 text-[11px] text-stone-600">
        <span className="rounded bg-stone-100 px-2 py-0.5">
          📏 {candidate.heightDisplay}
        </span>
        <span className="rounded bg-stone-100 px-2 py-0.5">
          📍 {candidate.city}
        </span>
        <span className="rounded bg-stone-100 px-2 py-0.5">
          👶 {candidate.wantKids}
        </span>
        <span className="rounded bg-stone-100 px-2 py-0.5">
          🥗 {candidate.diet}
        </span>
        <span className="rounded bg-stone-100 px-2 py-0.5">
          🙏 {candidate.religion}
        </span>
      </div>

      {/* Mutual compatibility */}
      <div className="flex gap-3 text-[11px] text-stone-500">
        <span>
          Fits {client.firstName}:{' '}
          <strong className="text-stone-700">{match.clientScore}</strong>
        </span>
        <span>
          Fits {candidate.firstName}:{' '}
          <strong className="text-stone-700">{match.candidateScore}</strong>
        </span>
      </div>

      {/* Score explanation */}
      <ScoreBreakdown
        match={match}
        expanded={expanded}
        onToggle={onToggleScore}
      />

      {/* AI reranking insight */}
      {aiAdjustment && (
        <div className="space-y-1 rounded-xl border border-violet-100 bg-violet-50/70 p-3 text-xs text-stone-700">
          <p className="flex items-center gap-1 font-semibold text-violet-800">
            <Sparkles className="h-3.5 w-3.5" />
            AI second opinion
            <span
              className={`ml-1 rounded px-1.5 ${
                aiAdjustment.adjustment > 0
                  ? 'bg-emerald-100 text-emerald-700'
                  : aiAdjustment.adjustment < 0
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-stone-100 text-stone-500'
              }`}
            >
              {aiAdjustment.adjustment > 0
                ? `+${aiAdjustment.adjustment}`
                : aiAdjustment.adjustment}
            </span>
          </p>

          <p>{aiAdjustment.insight}</p>

          <p className="text-stone-500">
            <strong>Watch out:</strong> {aiAdjustment.watchOut}
          </p>
        </div>
      )}

      {/* Previously saved AI pitch */}
      {aiPitch && (
        <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3 text-xs text-stone-700">
          <p className="mb-1 flex items-center gap-1 font-semibold text-rose-800">
            <Sparkles className="h-3.5 w-3.5" />
            Saved AI fit reasoning
          </p>
          <p>{aiPitch.compatibilitySummary}</p>
        </div>
      )}

      {/* Candidate actions */}
      <div className="mt-auto flex items-center gap-2 border-t border-stone-100 pt-2">
        <button
          onClick={onToggleShortlist}
          title="Shortlist"
          aria-label={
            isShortlisted ? 'Remove from shortlist' : 'Add to shortlist'
          }
          aria-pressed={isShortlisted}
          className={`rounded-lg border p-2 ${
            isShortlisted
              ? 'border-amber-300 bg-amber-50 text-amber-600'
              : 'border-stone-200 text-stone-400 hover:text-stone-700'
          }`}
        >
          <Star
            className={`h-4 w-4 ${
              isShortlisted ? 'fill-current' : ''
            }`}
          />
        </button>

        <button
          onClick={onToggleCompare}
          title="Compare (max 3)"
          aria-label={
            isCompared ? 'Remove from comparison' : 'Add to comparison'
          }
          aria-pressed={isCompared}
          className={`rounded-lg border p-2 ${
            isCompared
              ? 'border-stone-900 bg-stone-900 text-white'
              : 'border-stone-200 text-stone-400 hover:text-stone-700'
          }`}
        >
          <Scale className="h-4 w-4" />
        </button>

        <button
          onClick={() => onPitch(match, weights)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
            isSent
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'bg-rose-600 text-white shadow-sm hover:bg-rose-700'
          }`}
        >
          {isSent ? (
            <>
              <Check className="h-4 w-4" />
              Sent (view intro)
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5" />
              {aiPitch ? 'View Saved Pitch & Send' : 'AI Pitch & Send Match'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
