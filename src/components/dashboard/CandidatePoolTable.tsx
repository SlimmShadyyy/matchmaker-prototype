
'use client';

import type { Profile } from '@/types/matchmaking';

interface CandidatePoolTableProps {
  candidates: Profile[]; // already filtered by the server (opposite gender + search)
  total: number;
  clientGender: Profile['gender'];
  query: string;
  loading: boolean;
  onQueryChange: (value: string) => void;
}

export default function CandidatePoolTable({
  candidates: filteredCandidates,
  total,
  clientGender,
  query,
  loading,
  onQueryChange,
}: CandidatePoolTableProps) {
  const oppositeGender = clientGender === 'Male' ? 'Female' : 'Male';

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm overflow-x-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 className="text-sm font-bold text-stone-800">
          Simulated Opposite-Gender Pool ({total} Verified {oppositeGender} Profiles)
          {query && <span className="text-stone-400 font-normal"> · {filteredCandidates.length} shown</span>}
        </h3>
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search name, city, company…"
          className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs w-60"
        />
      </div>
      <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>

      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-stone-200 text-stone-400 uppercase text-[10px]">
            <th className="py-2 px-3">ID</th>
            <th className="py-2 px-3">Name</th>
            <th className="py-2 px-3">Age / Height</th>
            <th className="py-2 px-3">City</th>
            <th className="py-2 px-3">Income</th>
            <th className="py-2 px-3">Role & Company</th>
            <th className="py-2 px-3">Kids / Relocate / Diet</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-stone-100">
          {filteredCandidates.map((candidate) => (
            <tr key={candidate.id} className="hover:bg-stone-50">
              <td className="py-2 px-3 font-mono text-[11px] text-stone-400">
                {candidate.id}
              </td>
              <td className="py-2 px-3 font-semibold text-stone-800">
                {candidate.firstName} {candidate.lastName}
              </td>
              <td className="py-2 px-3">
                {candidate.age}y • {candidate.heightDisplay}
              </td>
              <td className="py-2 px-3">{candidate.city}</td>
              <td className="py-2 px-3 font-medium text-emerald-700">
                {candidate.incomeDisplay}
              </td>
              <td className="py-2 px-3">
                {candidate.designation}, {candidate.company}
              </td>
              <td className="py-2 px-3">
                Kids: {candidate.wantKids} • Relocate:{' '}
                {candidate.openToRelocate} • {candidate.diet}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
