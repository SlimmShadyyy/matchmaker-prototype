
'use client';

import { Heart, LogOut } from 'lucide-react';

interface DashboardHeaderProps {
  matchmakerName: string;
  customerCount: number;
  onLogout: () => void;
}

export default function DashboardHeader({
  matchmakerName,
  customerCount,
  onLogout,
}: DashboardHeaderProps) {
  return (
    <header className="bg-white border-b border-stone-200 px-6 py-3.5 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-rose-600 flex items-center justify-center text-white">
          <Heart className="w-5 h-5 fill-current" />
        </div>

        <div>
          <span className="font-bold text-stone-900 tracking-tight">
            TDC Matchmaker Studio
          </span>
          <span className="ml-2.5 text-xs px-2 py-0.5 bg-rose-50 text-rose-700 rounded-full font-medium border border-rose-200">
            AI-assisted matching
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <div className="text-right hidden sm:block">
          <p className="font-semibold text-stone-800 text-xs">
            {matchmakerName}
          </p>
          <p className="text-stone-500 text-[11px]">
            Senior Matchmaker • {customerCount} Assigned Clients
          </p>
        </div>

        <button
          onClick={onLogout}
          className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition"
          title="Log out"
          aria-label="Log out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
