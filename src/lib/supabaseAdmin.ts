import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/** True when server-side Supabase credentials are configured. */
export const hasSupabase = () =>
  Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY));

/** Lazily created so a missing variable never breaks `next build`. Server-side only: the secret key bypasses RLS. */
export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase server environment variables');
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
