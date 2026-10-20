
import { ChevronDown } from 'lucide-react';
import type { MatchResult } from '@/types/matchmaking';

interface ScoreBreakdownProps {
  match: MatchResult;
  expanded: boolean;
  onToggle: () => void;
}

const barColor = (ratio: number) =>
  ratio >= 0.75
    ? 'bg-emerald-500'
    : ratio >= 0.45
      ? 'bg-amber-400'
      : 'bg-rose-400';

export default function ScoreBreakdown({
  match,
  expanded,
  onToggle,
}: ScoreBreakdownProps) {
  return (
    <>
      <button
        onClick={onToggle}
        className="flex w-fit items-center gap-1 text-xs font-semibold text-stone-600 hover:text-stone-900"
      >
        <ChevronDown
          className={`h-3.5 w-3.5 transition ${
            expanded ? 'rotate-180' : ''
          }`}
        />
        {expanded ? 'Hide' : 'Why this score?'}
      </button>

      {expanded && (
        <div className="space-y-2.5 rounded-xl border border-stone-100 bg-stone-50 p-3">
          {match.scoreBreakdown.map((item) => {
            const ratio = item.maxScore
              ? item.score / item.maxScore
              : 0;

            return (
              <div key={item.category} className="text-xs">
                <div className="mb-1 flex justify-between">
                  <span className="font-semibold text-stone-700">
                    {item.category}
                  </span>
                  <span className="text-stone-500">
                    {item.score}/{item.maxScore}
                  </span>
                </div>

                <div className="h-1.5 overflow-hidden rounded-full bg-stone-200">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor(ratio)}`}
                    style={{ width: `${ratio * 100}%` }}
                  />
                </div>

                <p className="mt-1 text-[11px] text-stone-500">
                  {item.reason}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
