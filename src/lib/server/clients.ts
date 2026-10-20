import type { Profile } from '@/types/matchmaking';
import { TDC_CUSTOMERS, MATCHMAKING_POOL } from '@/lib/seedData';
import { defaultPreferences, sanitizePreferences } from '@/lib/preferences';
import type { PersistedState } from './repo';

/** Server-only access to the (static) seed data. The candidate pool never leaves the server. */
export const POOL = MATCHMAKING_POOL;
export const findSeedClient = (id: string): Profile | undefined => TDC_CUSTOMERS.find((c) => c.id === id);
export const findPoolProfile = (id: string): Profile | undefined => POOL.find((p) => p.id === id);
export const poolSizePerGender = () => POOL.filter((p) => p.gender === 'Female').length;

/** Same format as the seed notes ("14 Oct 2026"), so the timeline looks consistent. */
export const formatNoteDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

/** Seed profile + persisted changes = what the matchmaker sees. Notes: newest first, seed note last. */
export function mergeClient(seed: Profile, state: PersistedState): Profile {
  const saved = state.clientState[seed.id];
  const added = (state.notes[seed.id] ?? []).map((n) => ({
    id: n.id, date: formatNoteDate(n.createdAt), author: n.author, text: n.text,
  }));
  const fallback = defaultPreferences(seed);
  return {
    ...seed,
    statusTag: saved?.statusTag ?? seed.statusTag,
    preferences: saved?.preferences ? sanitizePreferences(saved.preferences, fallback) : fallback,
    notes: [...added, ...(seed.notes ?? [])],
  };
}

export const buildClients = (state: PersistedState): Profile[] => TDC_CUSTOMERS.map((c) => mergeClient(c, state));

/** A candidate is valid for a client only if they exist in the pool and are of the opposite gender. */
export function findCandidateFor(client: Profile, candidateId: string): Profile | undefined {
  const p = findPoolProfile(candidateId);
  return p && p.gender !== client.gender ? p : undefined;
}
