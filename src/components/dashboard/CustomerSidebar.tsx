'use client';

import { Search, ShieldCheck } from 'lucide-react';
import type { Profile } from '@/types/matchmaking';

interface CustomerSidebarProps {
  customers: Profile[];
  selectedClientId: string;
  searchQuery: string;
  stageFilter: string;
  onSearchChange: (value: string) => void;
  onStageFilterChange: (value: string) => void;
  onSelectClient: (clientId: string) => void;
}

export default function CustomerSidebar({
  customers,
  selectedClientId,
  searchQuery,
  stageFilter,
  onSearchChange,
  onStageFilterChange,
  onSelectClient,
}: CustomerSidebarProps) {
  return (
    <aside className="lg:col-span-3 bg-white border-r border-stone-200 p-4 flex flex-col h-[calc(100vh-61px)] sticky top-[61px]">
      <div className="mb-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
          Assigned TDC Customers ({customers.length})
        </h2>

        <div className="relative mb-2">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search name or city..."
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-rose-500"
          />
        </div>

        <select
          value={stageFilter}
          onChange={(event) => onStageFilterChange(event.target.value)}
          className="w-full text-xs bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-stone-700"
        >
          <option value="All">All Journey Stages</option>
          <option value="Active Matching">Active Matching</option>
          <option value="Onboarding & Verification">
            Onboarding & Verification
          </option>
          <option value="Profile Curation">Profile Curation</option>
          <option value="Date Feedback Loop">Date Feedback Loop</option>
          <option value="Paused / Matched">Paused / Matched</option>
        </select>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {customers.map((client) => {
          const isSelected = client.id === selectedClientId;

          return (
            <button
              key={client.id}
              onClick={() => onSelectClient(client.id)}
              className={`w-full text-left p-3 rounded-xl border transition ${
                isSelected
                  ? 'bg-rose-50/70 border-rose-300 shadow-sm'
                  : 'bg-white border-stone-200 hover:bg-stone-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sm text-stone-900 flex items-center gap-1">
                  {client.firstName} {client.lastName}
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600 inline" />
                </span>

                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    client.gender === 'Male'
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-purple-50 text-purple-700'
                  }`}
                >
                  {client.gender}, {client.age}
                </span>
              </div>

              <div className="text-xs text-stone-500 flex items-center justify-between mb-2">
                <span>
                  {client.city} • {client.maritalStatus}
                </span>
                <span className="font-medium text-stone-700">
                  {client.incomeDisplay}
                </span>
              </div>

              <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                {client.statusTag}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
