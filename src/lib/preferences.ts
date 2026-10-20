import type { PartnerPreferences, Profile } from '@/types/matchmaking';

export const ALL_DIETS: Profile['diet'][] = ['Vegetarian', 'Non-Vegetarian', 'Eggetarian', 'Vegan', 'Jain'];

/**
 * Gender-aware default dealbreakers. A matchmaker can edit them per client.
 *  - Male clients: the brief's explicit rules (she is younger, shorter and earns less).
 *  - Female clients: deliberately softer. He is not much younger, at least as tall, and earns a
 *    comparable income. Hard-mirroring the male rules left some women with too few options.
 */
export function defaultPreferences(c: Profile): PartnerPreferences {
  const base = { diets: [...ALL_DIETS], acceptDivorced: true, sameReligionOnly: false };
  if (c.gender === 'Male') {
    return {
      ...base,
      ageMin: 21, ageMax: c.age - 1, // brief: only "younger"; 21 is just an adult floor
      heightMin: 140, heightMax: c.heightCm - 1,
      incomeMin: 0, incomeMax: c.incomeLPA - 1,
    };
  }
  return {
    ...base,
    ageMin: c.age - 2, ageMax: c.age + 10,
    heightMin: c.heightCm, heightMax: 220,
    incomeMin: Math.round(c.incomeLPA * 0.7), incomeMax: 500,
  };
}

const clampInt = (v: unknown, fallback: number, lo: number, hi: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : fallback;
};

/** Validate untrusted input (API bodies). Invalid or missing fields fall back to `base`. */
export function sanitizePreferences(raw: unknown, base: PartnerPreferences): PartnerPreferences {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const diets = Array.isArray(r.diets) ? ALL_DIETS.filter((d) => (r.diets as unknown[]).includes(d)) : base.diets;
  return {
    ageMin: clampInt(r.ageMin, base.ageMin, 18, 80),
    ageMax: clampInt(r.ageMax, base.ageMax, 18, 80),
    heightMin: clampInt(r.heightMin, base.heightMin, 120, 230),
    heightMax: clampInt(r.heightMax, base.heightMax, 120, 230),
    incomeMin: clampInt(r.incomeMin, base.incomeMin, 0, 1000),
    incomeMax: clampInt(r.incomeMax, base.incomeMax, 0, 1000),
    diets,
    acceptDivorced: typeof r.acceptDivorced === 'boolean' ? r.acceptDivorced : base.acceptDivorced,
    sameReligionOnly: typeof r.sameReligionOnly === 'boolean' ? r.sameReligionOnly : base.sameReligionOnly,
  };
}
