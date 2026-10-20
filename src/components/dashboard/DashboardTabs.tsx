
'use client';

import { Sparkles, FileText, Users } from 'lucide-react';

export type DashboardTab = 'matches' | 'biodata' | 'pool';

interface DashboardTabsProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  notesCount: number;
  oppositeGenderPoolCount: number;
}

export default function DashboardTabs({
  activeTab,
  onTabChange,
  notesCount,
  oppositeGenderPoolCount,
}: DashboardTabsProps) {
  const tabs = [
    {
      id: 'matches' as const,
      label: 'Smart Matches',
      icon: Sparkles,
    },
    {
      id: 'biodata' as const,
      label: `Full Customer Biodata & Call Notes (${notesCount})`,
      icon: FileText,
    },
    {
      id: 'pool' as const,
      label: `Browse Raw Opposite-Gender Pool (${oppositeGenderPoolCount})`,
      icon: Users,
    },
  ];

  return (
    <div className="flex border-b border-stone-200 gap-6 text-sm font-medium overflow-x-auto">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          className={`pb-3 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === id
              ? 'border-rose-600 text-rose-600 font-semibold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Icon className="w-4 h-4" />
          {label}
        </button>
      ))}
    </div>
  );
}
