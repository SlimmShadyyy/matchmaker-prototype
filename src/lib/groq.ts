import Groq from 'groq-sdk';

/**
 * Groq retires models regularly, so the model is configurable: set GROQ_MODEL in .env.local
 * to switch without touching code. Default is one of Groq's recommended replacements for the
 * retired llama-3.3-70b-versatile.
 */
export const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

/** Parse JSON even if the model wrapped it in prose or code fences. */
export function parseJsonLoose<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1)) as T;
    throw new Error('Model did not return JSON');
  }
}

/** One Groq call that must return a JSON object. Retries once without JSON mode if the model rejects it. */
export async function groqJson<T>(prompt: string, temperature: number): Promise<T> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const base = { model: GROQ_MODEL, messages: [{ role: 'user' as const, content: prompt }], temperature };
  let text: string | null | undefined;
  try {
    const res = await groq.chat.completions.create({ ...base, response_format: { type: 'json_object' } });
    text = res.choices[0]?.message?.content;
  } catch (e) {
    if ((e as { status?: number }).status !== 400) throw e; // only retry "bad request" (e.g. JSON mode unsupported)
    const res = await groq.chat.completions.create(base);
    text = res.choices[0]?.message?.content;
  }
  return parseJsonLoose<T>(text ?? '{}');
}