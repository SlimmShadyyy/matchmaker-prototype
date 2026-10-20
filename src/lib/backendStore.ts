import fs from 'fs';
import path from 'path';
import type { AIPitchResponse, AIRerankResponse } from '@/types/matchmaking';

/**
 * Best-effort cache for AI output (saves Groq calls). It is NOT the source of truth: losing it
 * (e.g. a serverless cold start) only means the next request calls the model again.
 * All matchmaker data lives in the repository (see lib/server/repo.ts).
 */
interface AICacheStore {
  pitches: Record<string, AIPitchResponse & { cachedAt?: string }>;
  reranks: Record<string, AIRerankResponse & { cachedAt?: string }>;
}

const CACHE_FILE = process.env.VERCEL
  ? path.join('/tmp', 'tdc-ai-cache.json')
  : path.join(process.cwd(), '.data', 'tdc-ai-cache.json');

let memory: AICacheStore | null = null;

function load(): AICacheStore {
  if (memory) return memory;
  try {
    if (fs.existsSync(CACHE_FILE)) {
      memory = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
      return memory!;
    }
  } catch {
    /* ignore corrupt or unreadable cache */
  }
  memory = { pitches: {}, reranks: {} };
  return memory;
}

function save(store: AICacheStore) {
  memory = store;
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(store), 'utf-8');
  } catch {
    /* read-only filesystem: keep the in-memory copy */
  }
}

export const getCachedPitch = (key: string): AIPitchResponse | null => load().pitches[key] ?? null;
export function setCachedPitch(key: string, data: AIPitchResponse) {
  const s = load();
  s.pitches[key] = { ...data, cachedAt: new Date().toISOString() };
  save(s);
}
export const getCachedRerank = (key: string): AIRerankResponse | null => load().reranks[key] ?? null;
export function setCachedRerank(key: string, data: AIRerankResponse) {
  const s = load();
  s.reranks[key] = { ...data, cachedAt: new Date().toISOString() };
  save(s);
}
