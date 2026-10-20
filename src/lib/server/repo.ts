import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'node:crypto';
import type { AIPitchResponse, JourneyStage, SentRecord } from '@/types/matchmaking';
import { getSupabaseAdmin, hasSupabase } from '@/lib/supabaseAdmin';

/**
 * Persistence layer. Everything a matchmaker changes lives here, layered over the static seed
 * profiles. Two interchangeable implementations:
 *   - SupabaseRepo: durable; used whenever SUPABASE_URL + SUPABASE_SECRET_KEY are set (production)
 *   - FileRepo:     JSON file; zero-setup local development (ephemeral on serverless hosts)
 */
export interface StoredNote { id: string; author: string; text: string; createdAt: string }

export interface PersistedState {
  clientState: Record<string, { statusTag?: JourneyStage; preferences?: unknown }>;
  notes: Record<string, StoredNote[]>; // newest first
  shortlist: Record<string, true>;     // key: `${clientId}_${candidateId}`
  sent: Record<string, SentRecord>;    // same key
}

export interface Repo {
  kind: 'supabase' | 'file';
  load(): Promise<PersistedState>;
  setStage(clientId: string, stage: JourneyStage): Promise<void>;
  setPreferences(clientId: string, preferences: unknown): Promise<void>;
  addNote(clientId: string, text: string, author: string): Promise<StoredNote>;
  setShortlist(clientId: string, candidateId: string, value: boolean): Promise<void>;
  recordSent(clientId: string, candidateId: string, score: number, pitch: AIPitchResponse): Promise<SentRecord>;
}

const emptyState = (): PersistedState => ({ clientState: {}, notes: {}, shortlist: {}, sent: {} });
const pairKey = (clientId: string, candidateId: string) => `${clientId}_${candidateId}`;

/* ------------------------------ Supabase ------------------------------ */

function ok<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what} failed: ${res.error.message}`);
  if (res.data === null) throw new Error(`${what} failed: no data returned`);
  return res.data;
}
function done(res: { error: { message: string } | null }, what: string) {
  if (res.error) throw new Error(`${what} failed: ${res.error.message}`);
}

class SupabaseRepo implements Repo {
  kind = 'supabase' as const;

  async load(): Promise<PersistedState> {
    const sb = getSupabaseAdmin();
    const [notes, state, shortlist, sent] = await Promise.all([
      sb.from('customer_notes').select('id, client_id, author, note_text, created_at').order('created_at', { ascending: false }),
      sb.from('client_state').select('client_id, status_tag, preferences'),
      sb.from('shortlists').select('client_id, candidate_id'),
      sb.from('sent_matches').select('client_id, candidate_id, score, pitch, sent_at'),
    ]);
    const out = emptyState();
    for (const r of ok(notes, 'Load notes')) {
      (out.notes[r.client_id] ??= []).push({ id: r.id, author: r.author, text: r.note_text, createdAt: r.created_at });
    }
    for (const r of ok(state, 'Load client state')) {
      out.clientState[r.client_id] = { statusTag: r.status_tag ?? undefined, preferences: r.preferences ?? undefined };
    }
    for (const r of ok(shortlist, 'Load shortlist')) out.shortlist[pairKey(r.client_id, r.candidate_id)] = true;
    for (const r of ok(sent, 'Load sent matches')) {
      out.sent[pairKey(r.client_id, r.candidate_id)] = {
        candidateId: r.candidate_id, score: r.score, pitch: r.pitch as AIPitchResponse, sentAt: r.sent_at,
      };
    }
    return out;
  }

  async setStage(clientId: string, stage: JourneyStage) {
    done(await getSupabaseAdmin().from('client_state').upsert(
      { client_id: clientId, status_tag: stage, updated_at: new Date().toISOString() }, { onConflict: 'client_id' }), 'Save stage');
  }

  async setPreferences(clientId: string, preferences: unknown) {
    done(await getSupabaseAdmin().from('client_state').upsert(
      { client_id: clientId, preferences, updated_at: new Date().toISOString() }, { onConflict: 'client_id' }), 'Save preferences');
  }

  async addNote(clientId: string, text: string, author: string): Promise<StoredNote> {
    const res = await getSupabaseAdmin().from('customer_notes')
      .insert({ id: `note-${randomUUID()}`, client_id: clientId, author, note_text: text })
      .select('id, author, note_text, created_at').single();
    if (res.error || !res.data) throw new Error(`Save note failed: ${res.error?.message ?? 'no data returned'}`);
    const row = res.data;
    return { id: row.id, author: row.author, text: row.note_text, createdAt: row.created_at };
  }

  async setShortlist(clientId: string, candidateId: string, value: boolean) {
    const sb = getSupabaseAdmin();
    if (value) {
      done(await sb.from('shortlists').upsert({ client_id: clientId, candidate_id: candidateId }, { onConflict: 'client_id,candidate_id' }), 'Save shortlist');
    } else {
      done(await sb.from('shortlists').delete().eq('client_id', clientId).eq('candidate_id', candidateId), 'Remove shortlist');
    }
  }

  
    async recordSent(
    clientId: string,
    candidateId: string,
    score: number,
    pitch: AIPitchResponse
    ): Promise<SentRecord> {
    const sentAt = new Date().toISOString();

    done(
        await getSupabaseAdmin()
        .from('sent_matches')
        .upsert(
            {
            client_id: clientId,
            candidate_id: candidateId,

            // Fields used by the current application
            score,
            pitch,
            sent_at: sentAt,

            // Legacy columns still required by your Supabase table
            email_subject: pitch.emailSubject,
            email_body: pitch.emailBody,
            match_score: score,
            updated_at: sentAt,
            },
            { onConflict: 'client_id,candidate_id' }
        ),
        'Record sent match'
    );

    return {
        candidateId,
        score,
        pitch,
        sentAt,
    };
    }

}

/* ------------------------------ JSON file ------------------------------ */

class FileRepo implements Repo {
  kind = 'file' as const;
  private chain: Promise<unknown> = Promise.resolve(); // serialises read-modify-write within this process

  constructor(private file: string) {}

  private async read(): Promise<PersistedState> {
    try {
      return { ...emptyState(), ...JSON.parse(await fs.readFile(this.file, 'utf8')) };
    } catch {
      return emptyState();
    }
  }

  private mutate<T>(fn: (s: PersistedState) => T): Promise<T> {
    const run = this.chain.then(async () => {
      const state = await this.read();
      const result = fn(state);
      await fs.mkdir(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.${process.pid}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(state, null, 2), 'utf8');
      await fs.rename(tmp, this.file); // atomic replace
      return result;
    });
    this.chain = run.catch(() => undefined);
    return run;
  }

  load() { return this.read(); }

  setStage(clientId: string, stage: JourneyStage) {
    return this.mutate((s) => { s.clientState[clientId] = { ...s.clientState[clientId], statusTag: stage }; });
  }
  setPreferences(clientId: string, preferences: unknown) {
    return this.mutate((s) => { s.clientState[clientId] = { ...s.clientState[clientId], preferences }; });
  }
  addNote(clientId: string, text: string, author: string) {
    const note: StoredNote = { id: `note-${randomUUID()}`, author, text, createdAt: new Date().toISOString() };
    return this.mutate((s) => { (s.notes[clientId] ??= []).unshift(note); return note; });
  }
  setShortlist(clientId: string, candidateId: string, value: boolean) {
    return this.mutate((s) => {
      if (value) s.shortlist[pairKey(clientId, candidateId)] = true;
      else delete s.shortlist[pairKey(clientId, candidateId)];
    });
  }
  recordSent(clientId: string, candidateId: string, score: number, pitch: AIPitchResponse) {
    const rec: SentRecord = { candidateId, score, pitch, sentAt: new Date().toISOString() };
    return this.mutate((s) => { s.sent[pairKey(clientId, candidateId)] = rec; return rec; });
  }
}

/* ------------------------------ factory ------------------------------ */

const g = globalThis as unknown as { __tdcRepo?: Repo };

export function getRepo(): Repo {
  if (g.__tdcRepo) return g.__tdcRepo;
  if (hasSupabase()) {
    g.__tdcRepo = new SupabaseRepo();
  } else {
    const onServerless = Boolean(process.env.VERCEL);
    console.warn(
      onServerless
        ? '[repo] Supabase is not configured: using an EPHEMERAL file in /tmp. Data will be lost on cold starts. Set SUPABASE_URL and SUPABASE_SECRET_KEY.'
        : '[repo] Supabase is not configured: using a local JSON file (.data/matchmaker-state.json).'
    );
    g.__tdcRepo = new FileRepo(
      onServerless ? path.join('/tmp', 'tdc-matchmaker-state.json') : path.join(process.cwd(), '.data', 'matchmaker-state.json')
    );
  }
  return g.__tdcRepo;
}
