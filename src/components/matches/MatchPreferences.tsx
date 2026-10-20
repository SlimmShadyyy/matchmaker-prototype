'use client';

import { ChevronDown, RotateCcw, Save, ShieldCheck } from 'lucide-react';
import type { PartnerPreferences } from '@/types/matchmaking';
import { ALL_DIETS } from '@/lib/preferences';

interface MatchPreferencesProps {
  clientName: string;
  prefs: PartnerPreferences;
  defaults: PartnerPreferences;
  dirty: boolean;
  saving: boolean;
  open: boolean;
  onToggle: () => void;
  onChange: (next: PartnerPreferences) => void;
  onSave: () => void;
  onRevert: () => void;
  onUseDefaults: () => void;
}

type RangeKey = 'age' | 'height' | 'income';
const RANGES: { key: RangeKey; label: string; unit: string }[] = [
  { key: 'age', label: 'Age', unit: 'yrs' },
  { key: 'height', label: 'Height', unit: 'cm' },
  { key: 'income', label: 'Income', unit: '₹ LPA' },
];

export default function MatchPreferences({
  clientName, prefs, defaults, dirty, saving, open, onToggle, onChange, onSave, onRevert, onUseDefaults,
}: MatchPreferencesProps) {
  const customised = JSON.stringify(prefs) !== JSON.stringify(defaults);
  const num = (value: string) => Number(value) || 0;
  const toggleDiet = (diet: PartnerPreferences['diets'][number]) =>
    onChange({
      ...prefs,
      diets: prefs.diets.includes(diet) ? prefs.diets.filter((d) => d !== diet) : [...prefs.diets, diet],
    });

  return (
    <div className="bg-sky-50/70 border border-sky-200 rounded-xl">
      <button onClick={onToggle} className="w-full flex items-center justify-between p-4 text-left">
        <span className="flex items-center gap-2 text-xs font-bold text-sky-900">
          <ShieldCheck className="w-4 h-4" /> Dealbreakers for {clientName}
          {customised && <span className="px-2 py-0.5 rounded-full bg-sky-200 text-sky-900 text-[10px]">customised</span>}
          {dirty && <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px]">unsaved</span>}
        </span>
        <ChevronDown className={`w-4 h-4 text-sky-800 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 text-xs text-sky-950">
          <p className="text-[11px] text-sky-800">
            Candidates outside these limits are removed before scoring. Children and relocation conflicts always apply.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {RANGES.map(({ key, label, unit }) => {
              const minKey = `${key}Min` as keyof PartnerPreferences;
              const maxKey = `${key}Max` as keyof PartnerPreferences;
              return (
                <div key={key}>
                  <span className="font-semibold block mb-1">{label} <span className="text-sky-700/70 font-normal">({unit})</span></span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number" aria-label={`${label} minimum`} value={prefs[minKey] as number}
                      onChange={(e) => onChange({ ...prefs, [minKey]: num(e.target.value) })}
                      className="w-full p-1.5 rounded-lg border border-sky-200 bg-white"
                    />
                    <span>to</span>
                    <input
                      type="number" aria-label={`${label} maximum`} value={prefs[maxKey] as number}
                      onChange={(e) => onChange({ ...prefs, [maxKey]: num(e.target.value) })}
                      className="w-full p-1.5 rounded-lg border border-sky-200 bg-white"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <span className="font-semibold block mb-1.5">Accepted diets</span>
            <div className="flex flex-wrap gap-1.5">
              {ALL_DIETS.map((diet) => (
                <button
                  key={diet} onClick={() => toggleDiet(diet)}
                  className={`px-2.5 py-1 rounded-full border font-medium ${
                    prefs.diets.includes(diet) ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-sky-800 border-sky-200'
                  }`}
                >
                  {diet}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={prefs.acceptDivorced} onChange={(e) => onChange({ ...prefs, acceptDivorced: e.target.checked })} />
              Open to divorced / widowed candidates
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={prefs.sameReligionOnly} onChange={(e) => onChange({ ...prefs, sameReligionOnly: e.target.checked })} />
              Same religion only
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={onSave} disabled={!dirty || saving}
              className="px-3 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-800 text-white font-semibold flex items-center gap-1.5 disabled:opacity-40"
            >
              <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : `Save to ${clientName}'s profile`}
            </button>
            <button onClick={onRevert} disabled={!dirty} className="font-semibold text-sky-800 disabled:opacity-40">Revert</button>
            <button onClick={onUseDefaults} className="font-semibold text-sky-800 flex items-center gap-1">
              <RotateCcw className="w-3 h-3" /> Use defaults
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
