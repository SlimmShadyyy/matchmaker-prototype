
'use client';

import { ShieldCheck } from 'lucide-react';
import type { Profile, JourneyStage } from '@/types/matchmaking';

interface ClientHeaderProps {
  client: Profile;
  onStageChange: (stage: JourneyStage) => void;
}

export default function ClientHeader({
  client,
  onStageChange,
}: ClientHeaderProps) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-2xl font-bold text-stone-900">
            {client.firstName} {client.lastName}
          </h1>

          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            Verified Profile
          </span>

          <span className="text-xs px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 font-medium">
            {client.gender} • {client.age} yrs • {client.heightDisplay}
          </span>
        </div>

        <p className="text-sm text-stone-600 mt-1">
          {client.designation} at <strong>{client.company}</strong> (
          {client.incomeDisplay}) • {client.undergradCollege}
        </p>

        <div className="flex flex-wrap gap-3 mt-3 text-xs text-stone-500">
          <span>📍 {client.city} ({client.workMode})</span>
          <span>👶 Wants Kids: <strong>{client.wantKids}</strong></span>
          <span>✈️ Relocate: <strong>{client.openToRelocate}</strong></span>
          <span>🐾 Pets: <strong>{client.openToPets}</strong></span>
          <span>🥗 Diet: <strong>{client.diet}</strong></span>
        </div>
      </div>

      <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
        <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
          Customer Journey Stage
        </label>

        <select
          value={client.statusTag}
          onChange={(event) =>
            onStageChange(event.target.value as JourneyStage)
          }
          className="px-3 py-2 rounded-xl border border-rose-200 bg-rose-50/50 text-rose-900 font-semibold text-xs focus:outline-none"
        >
          <option value="Onboarding & Verification">
            Onboarding & Verification
          </option>
          <option value="Profile Curation">Profile Curation</option>
          <option value="Active Matching">Active Matching</option>
          <option value="Date Feedback Loop">Date Feedback Loop</option>
          <option value="Paused / Matched">Paused / Matched</option>
        </select>
      </div>
    </div>
  );
}
