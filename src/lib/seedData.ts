import type { Profile, Gender, JourneyStage } from '@/types/matchmaking';

/* ---------- Seeded PRNG: reproducible but varied (no more index % n lockstep) ---------- */
function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MALE_NAMES = ['Aarav', 'Vihaan', 'Aditya', 'Rohan', 'Kabir', 'Siddharth', 'Arjun', 'Vikram', 'Karan', 'Pranav', 'Nikhil', 'Rishabh', 'Dev', 'Dhruv', 'Ishaan', 'Aryan', 'Yash', 'Harsh', 'Manav', 'Tanmay', 'Rahul', 'Varun', 'Kunal', 'Abhishek', 'Sameer', 'Gaurav', 'Neel', 'Akash', 'Mohit', 'Tushar'];
const FEMALE_NAMES = ['Ananya', 'Diya', 'Aadhya', 'Kavya', 'Meera', 'Riya', 'Neha', 'Pooja', 'Shruti', 'Tara', 'Naina', 'Sanya', 'Kritika', 'Aditi', 'Ira', 'Isha', 'Simran', 'Anjali', 'Nidhi', 'Priya', 'Sneha', 'Trisha', 'Mansi', 'Radhika', 'Divya', 'Pallavi', 'Juhi', 'Avni', 'Tanvi', 'Bhavna'];
const LAST_NAMES = ['Sharma', 'Verma', 'Iyer', 'Nair', 'Patel', 'Reddy', 'Gupta', 'Malhotra', 'Joshi', 'Chatterjee', 'Deshmukh', 'Kapoor', 'Mehta', 'Bhatia', 'Rao', 'Singh', 'Menon', 'Banerjee', 'Shah', 'Kulkarni'];
const CITIES = ['Bengaluru', 'Mumbai', 'Delhi NCR', 'Hyderabad', 'Pune', 'Chennai', 'Kolkata', 'Ahmedabad'];
const CITY_LANGUAGE: Record<string, string> = {
  Bengaluru: 'Kannada', Mumbai: 'Marathi', 'Delhi NCR': 'Punjabi', Hyderabad: 'Telugu',
  Pune: 'Marathi', Chennai: 'Tamil', Kolkata: 'Bengali', Ahmedabad: 'Gujarati',
};
const OTHER_LANGUAGES = ['Kannada', 'Marathi', 'Punjabi', 'Telugu', 'Tamil', 'Bengali', 'Gujarati', 'Malayalam'];
const COLLEGES = ['IIT Bombay', 'BITS Pilani', 'SRCC Delhi', 'NIT Trichy', 'VIT Vellore', 'Christ University', 'St. Xavier’s Mumbai', 'Manipal Institute of Technology', 'ISB Hyderabad', 'NIFT Delhi'];
const DEGREES = ['B.Tech CS', 'B.Com (Hons)', 'BBA', 'B.Tech ECE', 'MBA Finance', 'B.Des', 'BA Economics', 'M.Tech AI'];
const COMPANIES = ['Google', 'McKinsey & Co', 'Razorpay', 'Zomato', 'TCS', 'Goldman Sachs', 'Microsoft', 'Swiggy', 'Flipkart', 'Accenture', 'Cred', 'Zerodha'];
const DESIGNATIONS = ['Senior Product Manager', 'Software Development Engineer II', 'Management Consultant', 'Investment Banker', 'Lead UX Designer', 'VP of Marketing', 'Data Scientist', 'Founders Office Associate'];
const SIBLINGS = ['1 Elder Sister (Married)', '1 Younger Brother', 'Single Child', '1 Younger Sister', '1 Elder Brother (Married)'];
const RELIGIONS = [
  { religion: 'Hindu', weight: 60, castes: ['Brahmin', 'Kayastha', 'Khatri', 'Baniya', 'Maratha', 'Reddy', 'Nair', 'Caste No Bar'] },
  { religion: 'Sikh', weight: 10, castes: ['Jat Sikh', 'Arora', 'Khatri', 'Caste No Bar'] },
  { religion: 'Jain', weight: 10, castes: ['Shwetambar', 'Digambar', 'Caste No Bar'] },
  { religion: 'Christian', weight: 10, castes: ['Syrian Christian', 'Roman Catholic', 'Protestant'] },
  { religion: 'Muslim', weight: 10, castes: ['Sunni', 'Shia'] },
];
const STAGES: JourneyStage[] = ['Active Matching', 'Onboarding & Verification', 'Profile Curation', 'Date Feedback Loop', 'Paused / Matched'];

function formatHeight(cm: number): string {
  const totalInches = Math.round(cm / 2.54);
  return `${Math.floor(totalInches / 12)}'${totalInches % 12}" (${cm} cm)`;
}

function generateProfile(index: number, gender: Gender, isClient = false): Profile {
  const rng = mulberry32(index * 9973 + (gender === 'Male' ? 11 : 23) + (isClient ? 7919 : 0));
  const int = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1));
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];
  const weighted = <T,>(items: readonly T[], weights: readonly number[]): T => {
    let r = rng() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r < 0) return items[i]; }
    return items[items.length - 1];
  };

  const names = gender === 'Male' ? MALE_NAMES : FEMALE_NAMES;
  const firstName = names[index % names.length];
  const lastName = LAST_NAMES[(index * 7 + Math.floor(index / names.length)) % LAST_NAMES.length];

  const age = gender === 'Male' ? int(26, 36) : int(23, 33);
  const heightCm = gender === 'Male'
    ? Math.round(168 + ((rng() + rng()) / 2) * 20)
    : Math.round(154 + ((rng() + rng()) / 2) * 21);
  // Skewed so most people sit in the lower/middle of the range
  const incomeLPA = gender === 'Male' ? Math.round(18 + rng() ** 1.3 * 44) : Math.round(12 + rng() ** 1.3 * 38);

  const relObj = weighted(RELIGIONS, RELIGIONS.map((r) => r.weight));
  const city = pick(CITIES);
  const company = pick(COMPANIES);
  const designation = pick(DESIGNATIONS);
  const college = pick(COLLEGES);
  const languages = Array.from(new Set([
    'English',
    ...(rng() < 0.9 ? ['Hindi'] : []),
    CITY_LANGUAGE[city],
    ...(rng() < 0.3 ? [pick(OTHER_LANGUAGES)] : []),
  ]));
  const workMode = pick(['Remote', 'Hybrid', 'On-site'] as const);

  return {
    id: `${isClient ? 'CLIENT' : 'POOL'}-${gender.charAt(0)}-${1000 + index}`,
    firstName,
    lastName,
    gender,
    dob: `${2026 - age}-${String(int(1, 12)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`,
    age,
    country: 'India',
    city,
    heightCm,
    heightDisplay: formatHeight(heightCm),
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@example.com`,
    phone: `+91 9${int(100000000, 999999999)}`,
    undergradCollege: college,
    degree: pick(DEGREES),
    incomeLPA,
    incomeDisplay: `₹${incomeLPA} LPA`,
    company,
    designation,
    maritalStatus: rng() < 0.1 ? 'Divorced' : 'Never Married',
    languages,
    siblings: pick(SIBLINGS),
    caste: pick(relObj.castes),
    religion: relObj.religion,
    wantKids: weighted(['Yes', 'No', 'Maybe'] as const, [50, 20, 30]),
    openToRelocate: pick(['Yes', 'No', 'Maybe'] as const),
    openToPets: pick(['Yes', 'No', 'Maybe'] as const),
    diet: weighted(['Vegetarian', 'Non-Vegetarian', 'Eggetarian', 'Vegan', 'Jain'] as const, [35, 35, 12, 8, 10]),
    familyType: rng() < 0.3 ? 'Joint' : 'Nuclear',
    workMode,
    drinkingSmoking: weighted(['Never', 'Occasionally', 'Socially'] as const, [40, 25, 35]),
    verified: true,
    bio: `${designation} at ${company}, alum of ${college}. Passionate about fitness, specialty coffee, and weekend travel. Looking for a grounded partner who values emotional maturity and shared ambition.`,
    ...(isClient && {
      statusTag: STAGES[index % STAGES.length],
      notes: [
        {
          id: `note-${index}-1`,
          date: '14 Oct 2026',
          author: 'Simran (Lead Matchmaker)',
          text: `Completed 45-min discovery call with ${firstName}. High clarity on family values and career pace. Prefers someone emotionally expressive.`,
        },
      ],
    }),
  };
}

// 12 TDC customers (6 male, 6 female)
export const TDC_CUSTOMERS: Profile[] = [
  ...Array.from({ length: 6 }, (_, i) => generateProfile(i + 2, 'Male', true)),
  ...Array.from({ length: 6 }, (_, i) => generateProfile(i + 5, 'Female', true)),
];

// 220 pool profiles (110 per gender) so every client sees 110 opposite-gender candidates
export const MATCHMAKING_POOL: Profile[] = [
  ...Array.from({ length: 110 }, (_, i) => generateProfile(i + 15, 'Female')),
  ...Array.from({ length: 110 }, (_, i) => generateProfile(i + 15, 'Male')),
];