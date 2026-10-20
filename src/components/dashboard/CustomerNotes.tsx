
'use client';

import type { FormEvent } from 'react';
import type { Profile } from '@/types/matchmaking';

interface CustomerNotesProps {
  client: Profile;
  noteText: string;
  onNoteTextChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export default function CustomerNotes({
  client,
  noteText,
  onNoteTextChange,
  onSubmit,
}: CustomerNotesProps) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm flex flex-col">
      <h3 className="text-base font-bold text-stone-900 mb-3">
        Meeting & Discovery Call Notes
      </h3>

      <form onSubmit={onSubmit} className="mb-4">
        <textarea
          rows={3}
          value={noteText}
          onChange={(event) => onNoteTextChange(event.target.value)}
          placeholder={`Log call notes or preferences for ${client.firstName}...`}
          className="w-full p-3 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-rose-500 mb-2"
        />

        <button
          type="submit"
          className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition"
        >
          Save Note to Client Log
        </button>
      </form>

      <div className="space-y-3 overflow-y-auto flex-1">
        {client.notes?.map((note) => (
          <div
            key={note.id}
            className="p-3 rounded-xl bg-stone-50 border border-stone-100 text-xs"
          >
            <div className="flex justify-between text-[10px] text-stone-400 mb-1">
              <span className="font-semibold text-stone-600">
                {note.author}
              </span>
              <span>{note.date}</span>
            </div>

            <p className="text-stone-700 leading-relaxed">{note.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
