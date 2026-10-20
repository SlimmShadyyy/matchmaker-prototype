
'use client';

import { Loader2, Sparkles } from 'lucide-react';

interface AIRerankPanelProps {
  clientName: string;
  hasAiResults: boolean;
  aiSource: string;
  aiLoading: boolean;
  aiError: string;
  onRerank: () => void;
  onHide: () => void;
}

export default function AIRerankPanel({
  clientName,
  hasAiResults,
  aiSource,
  aiLoading,
  aiError,
  onRerank,
  onHide,
}: AIRerankPanelProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 bg-rose-50/60 border border-rose-200 rounded-xl px-4 py-3 text-xs">
      <Sparkles className="w-4 h-4 text-rose-600 shrink-0" />

      <span className="text-rose-950 flex-1 min-w-[200px]">
        {hasAiResults
          ? `Saved AI adjustments applied for current preferences (±8 max, ${
              aiSource === 'groq'
                ? 'Groq live AI'
                : 'template mode: add GROQ_API_KEY for live AI'
            }).`
          : `Let AI read ${clientName}'s call notes, bios, and current preference weights to re-rank the top 10.`}
      </span>

      {aiError && <span className="text-red-600">{aiError}</span>}

      {hasAiResults && (
        <button
          onClick={onHide}
          className="font-semibold text-rose-700"
        >
          Hide AI
        </button>
      )}

      <button
        onClick={onRerank}
        disabled={aiLoading}
        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-1.5 disabled:opacity-60"
      >
        {aiLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Sparkles className="w-3.5 h-3.5" />
        )}

        {hasAiResults ? 'Regenerate AI' : 'AI re-rank top 10'}
      </button>
    </div>
  );
}
