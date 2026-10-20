import type { Gender, Profile } from '@/types/matchmaking';
import { dietFit, gaussian, geoFit, jaccard, kidsFit, softTernaryFit } from './primitives';

export type DimensionKey =
  | 'age' | 'stature' | 'income' | 'kids' | 'location' | 'culture' | 'lifestyle' | 'family';

export interface DimensionResult { value: number; reason: string } // value is 0..1
export interface Dimension {
  label: string;
  /** Scores candidate `c` from the point of view of seeker `s`. */
  score: (s: Profile, c: Profile) => DimensionResult;
}

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** Religion first, then caste ("Caste No Bar" is treated as flexible). */
function communityFit(s: Profile, c: Profile): number {
  if (s.religion !== c.religion) return 0.2;
  if (s.caste === c.caste) return 1;
  if (s.caste === 'Caste No Bar' || c.caste === 'Caste No Bar') return 0.85;
  return 0.6;
}

const DRINK_LEVEL: Record<Profile['drinkingSmoking'], number> = { Never: 0, Occasionally: 1, Socially: 2 };

export const DIMENSIONS: Record<DimensionKey, Dimension> = {
  age: {
    label: 'Age Dynamic',
    score: (s, c) => {
      // Male seeker: she is ~3 yrs younger. Female seeker: he is ~3 yrs older.
      const gap = s.gender === 'Male' ? s.age - c.age : c.age - s.age;
      return { value: gaussian(gap, 3, 2.5), reason: `${c.age} vs ${s.age} (${signed(c.age - s.age)} yrs)` };
    },
  },
  stature: {
    label: 'Height',
    score: (s, c) => {
      const gap = s.gender === 'Male' ? s.heightCm - c.heightCm : c.heightCm - s.heightCm;
      return { value: gaussian(gap, 11, 7), reason: `${c.heightDisplay} vs ${s.heightDisplay}` };
    },
  },
  income: {
    label: 'Income Balance',
    score: (s, c) => {
      const ratio = c.incomeLPA / s.incomeLPA;
      const ideal = s.gender === 'Male' ? 0.7 : 1.3; // she earns ~70% of him / he earns ~130% of her
      return { value: gaussian(ratio, ideal, 0.4), reason: `${c.incomeDisplay} vs ${s.incomeDisplay}` };
    },
  },
  kids: {
    label: 'Children & Family Goals',
    score: (s, c) => ({ value: kidsFit(s.wantKids, c.wantKids), reason: `Kids: ${s.wantKids} / ${c.wantKids}` }),
  },
  location: {
    label: 'Location & Mobility',
    score: (s, c) => {
      const g = geoFit(s, c);
      return { value: g.value, reason: g.reason };
    },
  },
  culture: {
    label: 'Culture & Community',
    score: (s, c) => {
      const community = communityFit(s, c);
      const lang = jaccard(s.languages, c.languages);
      const diet = dietFit(s.diet, c.diet);
      const shared = s.languages.filter((l) => c.languages.includes(l)).length;
      return {
        value: 0.4 * community + 0.25 * lang + 0.35 * diet,
        reason: `${c.religion} (${c.caste}) • ${shared} shared languages • ${c.diet} vs ${s.diet}`,
      };
    },
  },
  lifestyle: {
    label: 'Lifestyle',
    score: (s, c) => {
      const drink = 1 - Math.abs(DRINK_LEVEL[s.drinkingSmoking] - DRINK_LEVEL[c.drinkingSmoking]) / 2;
      const pets = softTernaryFit(s.openToPets, c.openToPets);
      return {
        value: 0.6 * drink + 0.4 * pets,
        reason: `Drinking/smoking: ${c.drinkingSmoking} vs ${s.drinkingSmoking} • Pets: ${c.openToPets} / ${s.openToPets}`,
      };
    },
  },
  family: {
    label: 'Family & Marital Background',
    score: (s, c) => {
      const familyType = s.familyType === c.familyType ? 1 : 0.5;
      // Divorced/Widowed is a soft penalty unless both share that history.
      const marital =
        s.maritalStatus === c.maritalStatus ? 1 : s.maritalStatus === 'Never Married' ? 0.5 : 0.8;
      return {
        value: 0.5 * familyType + 0.5 * marital,
        reason: `${c.familyType} family • ${c.maritalStatus}`,
      };
    },
  },
};

/** Weights sum to 1 per gender. Easy to explain, easy to tune. */
export const WEIGHTS: Record<Gender, Record<DimensionKey, number>> = {
  Male:   { age: 0.18, stature: 0.10, income: 0.10, kids: 0.20, location: 0.15, culture: 0.15, lifestyle: 0.07, family: 0.05 },
  Female: { age: 0.08, stature: 0.07, income: 0.15, kids: 0.20, location: 0.22, culture: 0.13, lifestyle: 0.07, family: 0.08 },
};