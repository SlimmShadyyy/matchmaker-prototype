export type Gender = 'Male' | 'Female';
export type TernaryPref = 'Yes' | 'No' | 'Maybe';
export type JourneyStage = 
  | 'Onboarding & Verification' 
  | 'Profile Curation' 
  | 'Active Matching' 
  | 'Date Feedback Loop' 
  | 'Paused / Matched';

export interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  dob: string; // YYYY-MM-DD
  age: number;
  country: string;
  city: string;
  heightCm: number;
  heightDisplay: string; // e.g., "5'8\" (173 cm)"
  email: string;
  phone: string;
  undergradCollege: string;
  degree: string;
  incomeLPA: number; // In Lakhs Per Annum (e.g., 28 = ₹28 LPA)
  incomeDisplay: string;
  company: string;
  designation: string;
  maritalStatus: 'Never Married' | 'Divorced' | 'Widowed';
  languages: string[];
  siblings: string;
  caste: string;
  religion: string;
  wantKids: TernaryPref;
  openToRelocate: TernaryPref;
  openToPets: TernaryPref;
  // Researched Indian Matchmaking Specific Fields
  diet: 'Vegetarian' | 'Non-Vegetarian' | 'Eggetarian' | 'Vegan' | 'Jain';
  familyType: 'Nuclear' | 'Joint';
  workMode: 'Remote' | 'Hybrid' | 'On-site';
  drinkingSmoking: 'Never' | 'Socially' | 'Occasionally';
  bio: string;
  verified: boolean;
  // Client-only fields
  preferences?: PartnerPreferences; // dealbreakers (hard filters) for this client's matches
  statusTag?: JourneyStage;
  notes?: { id: string; date: string; text: string; author: string }[];
}

export interface MatchResult {
  candidate: Profile;
  totalScore: number; // 0 - 100
  tier: 'High Potential Match' | 'Strong Compatibility' | 'Moderate Fit';
  hardCriteriaMet: boolean;
  clientScore?: number;    // how well the candidate fits the client's wants
  candidateScore?: number; // how well the client fits the candidate's wants
  scoreBreakdown: {
    category: string;
    score: number;
    maxScore: number;
    reason: string;
  }[];
}

export interface AIPitchResponse {
  compatibilitySummary: string;
  emailSubject: string;
  emailBody: string;
  talkingPoints: string[];
  source?: 'groq' | 'fallback'; // which engine produced this
}

/** AI second-opinion on a ranked match (Stage 3 of the pipeline). */
export interface AIRerankItem {
  id: string;
  adjustment: number; // clamped to -8..+8 server-side
  insight: string;
  watchOut: string;
}
export interface AIRerankResponse {
  results: AIRerankItem[];
  source: 'groq' | 'fallback';
}

/** Per-client dealbreakers. Anything outside these ranges is excluded before scoring. */
export interface PartnerPreferences {
  ageMin: number;
  ageMax: number;
  heightMin: number; // cm
  heightMax: number; // cm
  incomeMin: number; // LPA
  incomeMax: number; // LPA
  diets: Profile['diet'][]; // accepted diets
  acceptDivorced: boolean; // also covers widowed
  sameReligionOnly: boolean;
}

export type Note = NonNullable<Profile['notes']>[number];

/** A match pitch that was "sent" to a client (persisted). */
export interface SentRecord {
  candidateId: string;
  sentAt: string; // ISO timestamp
  score: number;
  pitch: AIPitchResponse; // the final (possibly edited) email that was sent
}

/** Response of POST /api/matches (matching runs on the server; the pool never reaches the browser). */
export interface MatchingResponse {
  matches: MatchResult[];
  excluded: Record<string, number>;
  considered: number;
  baselineRank: Record<string, number>; // rank with default weights, for the "moved" arrows
}
