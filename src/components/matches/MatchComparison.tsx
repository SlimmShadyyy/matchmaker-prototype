
import { Scale, X } from 'lucide-react';
import type { MatchResult, Profile } from '@/types/matchmaking';

interface MatchComparisonProps {
  client: Profile;
  compared: MatchResult[];
  selectedCount: number;
  showCompare: boolean;
  onShowCompare: () => void;
  onCloseCompare: () => void;
  onClear: () => void;
}

const COMPARE_ROWS: Array<[string, (profile: Profile) => string]> = [
  ['Age', (p) => `${p.age} yrs`],
  ['Height', (p) => p.heightDisplay],
  ['City', (p) => `${p.city} (${p.workMode})`],
  ['Income', (p) => p.incomeDisplay],
  ['Career', (p) => `${p.designation}, ${p.company}`],
  ['Education', (p) => `${p.degree}, ${p.undergradCollege}`],
  ['Wants kids', (p) => p.wantKids],
  ['Open to relocate', (p) => p.openToRelocate],
  ['Diet', (p) => p.diet],
  ['Religion / caste', (p) => `${p.religion} (${p.caste})`],
  ['Languages', (p) => p.languages.join(', ')],
  ['Marital status', (p) => p.maritalStatus],
];

const barColor = (ratio: number) =>
  ratio >= 0.75
    ? 'bg-emerald-500'
    : ratio >= 0.45
      ? 'bg-amber-400'
      : 'bg-rose-400';

export default function MatchComparison({
  client,
  compared,
  selectedCount,
  showCompare,
  onShowCompare,
  onCloseCompare,
  onClear,
}: MatchComparisonProps) {
  return (
    <>
      {selectedCount > 0 && (
        <div className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-stone-900 px-4 py-2.5 text-xs text-white shadow-xl">
          <Scale className="h-4 w-4" />
          {selectedCount} selected

          <button
            onClick={onShowCompare}
            disabled={selectedCount < 2}
            className="rounded-lg bg-rose-600 px-3 py-1.5 font-semibold disabled:opacity-40"
          >
            {selectedCount < 2 ? 'Pick 1 more' : 'Compare'}
          </button>

          <button
            onClick={onClear}
            className="text-stone-400 hover:text-white"
          >
            Clear
          </button>
        </div>
      )}

      {showCompare && compared.length >= 2 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm"
          onClick={onCloseCompare}
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-stone-900">
                Side-by-side for {client.firstName}
              </h3>

              <button
                onClick={onCloseCompare}
                className="p-1 text-stone-400 hover:text-stone-700"
                aria-label="Close comparison"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="w-32 py-2 pr-3" />
                  <th className="px-3 py-2 font-semibold text-stone-400">
                    {client.firstName} (client)
                  </th>

                  {compared.map((match) => (
                    <th
                      key={match.candidate.id}
                      className="px-3 py-2 text-stone-900"
                    >
                      {match.candidate.firstName}{' '}
                      {match.candidate.lastName}
                      <span className="ml-1.5 text-rose-600">
                        {match.totalScore}%
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-stone-100">
                {COMPARE_ROWS.map(([label, getValue]) => (
                  <tr key={label}>
                    <td className="py-2 pr-3 text-stone-400">{label}</td>
                    <td className="px-3 py-2 text-stone-500">
                      {getValue(client)}
                    </td>

                    {compared.map((match) => (
                      <td
                        key={match.candidate.id}
                        className="px-3 py-2 font-medium text-stone-800"
                      >
                        {getValue(match.candidate)}
                      </td>
                    ))}
                  </tr>
                ))}

                {compared[0].scoreBreakdown.map((item, index) => (
                  <tr key={item.category}>
                    <td className="py-2 pr-3 text-stone-400">
                      {item.category}
                    </td>
                    <td className="px-3 py-2" />

                    {compared.map((match) => {
                      const breakdown = match.scoreBreakdown[index];
                      const ratio = breakdown?.maxScore
                        ? breakdown.score / breakdown.maxScore
                        : 0;

                      return (
                        <td
                          key={match.candidate.id}
                          className="px-3 py-2"
                        >
                          <div className="mb-0.5 h-1.5 overflow-hidden rounded-full bg-stone-200">
                            <div
                              className={`h-full ${barColor(ratio)}`}
                              style={{ width: `${ratio * 100}%` }}
                            />
                          </div>

                          <span className="text-[10px] text-stone-500">
                            {breakdown
                              ? `${breakdown.score}/${breakdown.maxScore}`
                              : '—'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
