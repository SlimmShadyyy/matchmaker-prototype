import type { Profile } from '@/types/matchmaking';

/** Bell curve: 1.0 at `ideal`, tapering smoothly. Replaces pass/fail cut-offs. */
export const gaussian = (x: number, ideal: number, spread: number): number =>
  Math.exp(-((x - ideal) ** 2) / (2 * spread ** 2));

/** Symmetric kids compatibility (key is sorted). 0 = dealbreaker. */
const KIDS: Record<string, number> = {
  'Yes|Yes': 1,
  'No|No': 1,
  'Maybe|Maybe': 0.8,
  'Maybe|Yes': 0.6,
  'Maybe|No': 0.6,
  'No|Yes': 0,
};
export const kidsFit = (a: string, b: string): number => KIDS[[a, b].sort().join('|')] ?? 0;

/** Yes/No/Maybe preferences that are not dealbreakers (e.g. pets). */
export const softTernaryFit = (a: string, b: string): number => {
  if (a === b) return 1;
  if (a === 'Maybe' || b === 'Maybe') return 0.6;
  return 0.2; // Yes vs No
};

/** Diet strictness ladder: the closer two people sit, the more compatible. */
const DIET_LADDER = ['Jain', 'Vegan', 'Vegetarian', 'Eggetarian', 'Non-Vegetarian'];
export const dietFit = (a: string, b: string): number =>
  1 - Math.abs(DIET_LADDER.indexOf(a) - DIET_LADDER.indexOf(b)) / (DIET_LADDER.length - 1);

/** Jaccard overlap of two string lists (0..1). */
export const jaccard = (a: string[], b: string[]): number => {
  const A = new Set(a);
  const B = new Set(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  const union = new Set([...A, ...B]).size;
  return union === 0 ? 0 : inter / union;
};

/* ---------- Geography ---------- */
const CITY_COORDS: Record<string, [number, number]> = {
  Bengaluru: [12.97, 77.59],
  Mumbai: [19.08, 72.88],
  'Delhi NCR': [28.61, 77.21],
  Hyderabad: [17.39, 78.49],
  Pune: [18.52, 73.86],
  Chennai: [13.08, 80.27],
  Kolkata: [22.57, 88.36],
  Ahmedabad: [23.02, 72.57],
};

/** Haversine distance in km. Unknown city => very far. */
export function distanceKm(a: string, b: string): number {
  const p = CITY_COORDS[a];
  const q = CITY_COORDS[b];
  if (!p || !q) return 9999;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(q[0] - p[0]);
  const dLon = rad(q[1] - p[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(p[0])) * Math.cos(rad(q[0])) * Math.sin(dLon / 2) ** 2;
  return Math.round(12742 * Math.asin(Math.sqrt(h)));
}

/** 0..1 willingness to move. Remote workers are fully flexible. */
export const relocationWillingness = (p: Profile): number =>
  p.workMode === 'Remote' ? 1 : { Yes: 1, Maybe: 0.5, No: 0 }[p.openToRelocate];

export function geoFit(seeker: Profile, other: Profile): { value: number; feasible: boolean; reason: string } {
  if (seeker.city === other.city) {
    return { value: 1, feasible: true, reason: `Both in ${seeker.city}` };
  }
  const km = distanceKm(seeker.city, other.city);
  if (km < 200) {
    return { value: 0.85, feasible: true, reason: `${other.city} is commutable (${km} km)` };
  }
  // Assumption: for a female seeker the man is expected to be the flexible one.
  const flex =
    seeker.gender === 'Female'
      ? relocationWillingness(other)
      : Math.max(relocationWillingness(seeker), relocationWillingness(other));
  return {
    value: 0.2 + 0.6 * flex,
    feasible: flex > 0,
    reason: `${seeker.city} ↔ ${other.city}, relocation flexibility ${Math.round(flex * 100)}%`,
  };
}