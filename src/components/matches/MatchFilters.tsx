
'use client';

import { Star } from 'lucide-react';

const TIERS = [
  'All',
  'High Potential Match',
  'Strong Compatibility',
  'Moderate Fit',
] as const;

type Tier = (typeof TIERS)[number];
type SortKey = 'score' | 'age' | 'income' | 'height';

interface MatchFiltersProps {
  tier: Tier;
  city: string;
  sort: SortKey;
  minScore: number;
  onlyShortlist: boolean;
  cities: string[];
  tierCounts: Record<string, number>;
  shownCount: number;
  onTierChange: (tier: Tier) => void;
  onCityChange: (city: string) => void;
  onSortChange: (sort: SortKey) => void;
  onMinScoreChange: (score: number) => void;
  onShortlistToggle: () => void;
}

export type { Tier, SortKey };

export default function MatchFilters({
  tier,
  city,
  sort,
  minScore,
  onlyShortlist,
  cities,
  tierCounts,
  shownCount,
  onTierChange,
  onCityChange,
  onSortChange,
  onMinScoreChange,
  onShortlistToggle,
}: MatchFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {TIERS.map((item) => (
        <button
          key={item}
          onClick={() => onTierChange(item)}
          className={`px-3 py-1.5 rounded-full border font-medium transition ${
            tier === item
              ? 'bg-stone-900 text-white border-stone-900'
              : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
          }`}
        >
          {item === 'All' ? 'All' : item.split(' ')[0]} (
          {tierCounts[item] ?? 0})
        </button>
      ))}

      <select
        value={city}
        onChange={(event) => onCityChange(event.target.value)}
        className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white"
      >
        {cities.map((item) => (
          <option key={item} value={item}>
            {item === 'All' ? 'All cities' : item}
          </option>
        ))}
      </select>

      <select
        value={sort}
        onChange={(event) =>
          onSortChange(event.target.value as SortKey)
        }
        className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white"
      >
        <option value="score">Sort: Best match</option>
        <option value="age">Sort: Youngest</option>
        <option value="income">Sort: Highest income</option>
        <option value="height">Sort: Tallest</option>
      </select>

      <label className="flex items-center gap-2 px-2 text-stone-600">
        Min {minScore}%
        <input
          type="range"
          min={0}
          max={90}
          step={5}
          value={minScore}
          onChange={(event) =>
            onMinScoreChange(Number(event.target.value))
          }
          className="accent-rose-600 w-24"
        />
      </label>

      <button
        onClick={onShortlistToggle}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-full border font-medium ${
          onlyShortlist
            ? 'bg-amber-100 border-amber-300 text-amber-800'
            : 'bg-white border-stone-200 text-stone-600'
        }`}
      >
        <Star
          className={`w-3.5 h-3.5 ${
            onlyShortlist ? 'fill-current' : ''
          }`}
        />
        Shortlist
      </button>

      <span className="ml-auto text-stone-400">
        {shownCount} shown
      </span>
    </div>
  );
}
