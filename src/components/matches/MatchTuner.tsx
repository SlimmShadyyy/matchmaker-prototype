
'use client';

import { ChevronDown, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { DIMENSIONS, type DimensionKey } from '@/lib/scoring/dimensions';

interface MatchTunerProps {
  clientName: string;
  weights: Record<DimensionKey, number>;
  defaults: Record<DimensionKey, number>;
  tuned: boolean;
  showTuner: boolean;
  onToggle: () => void;
  onWeightsChange: (
    update: (weights: Record<DimensionKey, number>) => Record<DimensionKey, number>
  ) => void;
  onReset: () => void;
}

const DIM_KEYS = Object.keys(DIMENSIONS) as DimensionKey[];

export default function MatchTuner({
  clientName,
  weights,
  tuned,
  showTuner,
  onToggle,
  onWeightsChange,
  onReset,
}: MatchTunerProps) {
  const weightTotal = DIM_KEYS.reduce((sum, key) => sum + weights[key], 0) || 1;

  return (
    <div className="bg-amber-50/70 border border-amber-200 rounded-xl">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <span className="flex items-center gap-2 text-xs font-bold text-amber-900">
          <SlidersHorizontal className="w-4 h-4" />
          Tune what matters to {clientName}
          {tuned && (
            <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px]">
              custom weights
            </span>
          )}
        </span>

        <ChevronDown
          className={`w-4 h-4 text-amber-800 transition ${
            showTuner ? 'rotate-180' : ''
          }`}
        />
      </button>

      {showTuner && (
        <div className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {DIM_KEYS.map((key) => (
              <label key={key} className="text-xs text-amber-950">
                <span className="flex justify-between mb-0.5">
                  <span className="font-medium">
                    {DIMENSIONS[key].label}
                  </span>
                  <span className="font-semibold">
                    {Math.round((weights[key] / weightTotal) * 100)}%
                  </span>
                </span>

                <input
                  type="range"
                  min={0}
                  max={40}
                  value={Math.round(weights[key] * 100)}
                  onChange={(event) => {
                    const value = Number(event.target.value) / 100;
                    onWeightsChange((previous) => ({
                      ...previous,
                      [key]: value,
                    }));
                  }}
                  className="w-full accent-rose-600"
                />
              </label>
            ))}
          </div>

          <div className="flex items-center justify-between text-[11px] text-amber-800">
            <span>
              Rankings update live. Changing weights or call notes will
              request fresh AI feedback when needed.
            </span>

            <button
              onClick={onReset}
              disabled={!tuned}
              className="flex items-center gap-1 font-semibold disabled:opacity-40"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
