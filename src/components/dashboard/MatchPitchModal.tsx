
'use client';

import { Loader2, RotateCcw, Send, Sparkles, X } from 'lucide-react';
import type {
  AIPitchResponse,
  MatchResult,
  Profile,
  SentRecord,
} from '@/types/matchmaking';
import { getPairCacheKey } from '@/lib/aiHelpers';

type EmailDraft = {
  subject?: string;
  body?: string;
};

interface MatchPitchModalProps {
  client: Profile;
  match: MatchResult;
  weights?: Record<string, number>;
  sentRecord?: SentRecord;
  aiCache: Record<string, AIPitchResponse>;
  loadingAiKey: string | null;
  drafts: Record<string, EmailDraft>;
  onRegenerate: () => void;
  onClose: () => void;
  onDraftChange: (key: string, patch: EmailDraft) => void;
  onConfirmSend: (match: MatchResult) => void;
}

export default function MatchPitchModal({
  client,
  match,
  weights,
  sentRecord,
  aiCache,
  loadingAiKey,
  drafts,
  onRegenerate,
  onClose,
  onDraftChange,
  onConfirmSend,
}: MatchPitchModalProps) {
  const prefKey = getPairCacheKey(client, match.candidate.id, weights);
  const simpleKey = `${client.id}_${match.candidate.id}`;
  const pitch = aiCache[prefKey] ?? aiCache[simpleKey];
  const isLoading = loadingAiKey === prefKey;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-stone-200 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-rose-600" />
            <h3 className="font-bold text-lg text-stone-900">
              Send Match Pitch to {client.firstName}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRegenerate}
              className="px-2.5 py-1 rounded-lg border border-stone-200 text-xs font-medium text-stone-600 hover:bg-stone-50 flex items-center gap-1"
              title="Force regenerate AI pitch"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Regenerate AI
            </button>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              aria-label="Close pitch modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <span className="text-stone-400 block">Suggested Match</span>
            <span className="font-bold text-stone-800">
              {match.candidate.firstName} {match.candidate.lastName} (
              {match.candidate.age})
            </span>
          </div>

          <div>
            <span className="text-stone-400 block">Height & City</span>
            <span className="font-semibold text-stone-800">
              {match.candidate.heightDisplay} • {match.candidate.city}
            </span>
          </div>

          <div>
            <span className="text-stone-400 block">Profession</span>
            <span className="font-semibold text-stone-800">
              {match.candidate.designation}, {match.candidate.company}
            </span>
          </div>

          <div>
            <span className="text-stone-400 block">Education</span>
            <span className="font-semibold text-stone-800">
              {match.candidate.undergradCollege}
            </span>
          </div>
        </div>

        {sentRecord && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl px-3.5 py-2.5">
            Sent on {new Date(sentRecord.sentAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}. You can edit and send again.
          </div>
        )}

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-stone-500 gap-2">
            <Loader2 className="w-7 h-7 animate-spin text-rose-600" />
            <p className="text-xs font-medium">
              Groq is crafting a personalized compatibility analysis & email
              pitch...
            </p>
          </div>
        ) : pitch ? (
          <div className="space-y-4 text-xs">
            <div className="bg-rose-50/70 border border-rose-200 p-3.5 rounded-xl">
              <span className="font-bold text-rose-900 block mb-1">
                AI Natural Language Fit Reasoning ({match.totalScore}% Match):
              </span>

              <p className="text-rose-950 leading-relaxed">
                {pitch.compatibilitySummary}
              </p>

              <p className="text-[10px] text-rose-700/70 mt-1.5">
                {pitch.source === 'groq'
                  ? 'Cached for current preferences & notes (Groq live AI)'
                  : 'Built-in template (set GROQ_API_KEY for live AI)'}
              </p>
            </div>

            <div>
              <label className="font-bold text-stone-600 block mb-1">
                Email Subject Line
              </label>
              <input
                type="text"
                value={drafts[prefKey]?.subject ?? pitch.emailSubject}
                onChange={(event) =>
                  onDraftChange(prefKey, { subject: event.target.value })
                }
                className="w-full p-2.5 rounded-lg border border-stone-300 bg-white text-stone-900 font-medium"
              />
            </div>

            <div>
              <label className="font-bold text-stone-600 block mb-1">
                Personalized Intro Email Body (Editable before sending)
              </label>
              <textarea
                rows={8}
                value={drafts[prefKey]?.body ?? pitch.emailBody}
                onChange={(event) =>
                  onDraftChange(prefKey, { body: event.target.value })
                }
                className="w-full p-3 rounded-lg border border-stone-300 bg-white text-stone-800 leading-relaxed"
              />
            </div>
          </div>
        ) : null}

        <div className="flex justify-end gap-3 pt-3 border-t border-stone-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50"
          >
            Cancel
          </button>

          <button
            onClick={() => onConfirmSend(match)}
            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow"
          >
            <Send className="w-3.5 h-3.5" />
            Confirm & Send Intro Email
          </button>
        </div>
      </div>
    </div>
  );
}
