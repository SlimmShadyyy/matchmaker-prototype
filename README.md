# TDC Matchmaker Studio

An AI-assisted matchmaking dashboard built for **The Date Crew's Full Stack Intern Assessment**. A transparent, rule-based matching engine ranks candidates; an AI layer adds a bounded second opinion and drafts introduction emails; a matchmaker manages clients, notes, shortlists and sent introductions, all persisted server-side.

**Live demo:** _add your Vercel URL_ · **Repository:** _add your GitHub URL_

**Demo login:** `simran@thedatecrew.com` / `tdc-matchmaker-2026`
(Credentials are verified on the server and a signed, httpOnly session cookie is issued. It is a single demo account, not a full user system.)

## Features

- **Matchmaker login** with a server-verified session that survives page refreshes.
- **Customer dashboard:** 12 assigned customers, search and stage filter, journey-stage tracking, 20+ biodata fields (including Indian-matchmaking specifics such as religion/caste, diet, family type, work mode), and a call-notes timeline.
- **Matching on the server:** 220 synthetic candidates (110 per gender). The candidate pool never reaches the browser; matches are computed by `POST /api/matches`.
- **Editable dealbreakers for every client** (age, height and income ranges, accepted diets, divorced/widowed, same religion), with gender-aware defaults.
- **Interactive explorer:** live weight sliders, tier / city / score filters, sorting, shortlist, side-by-side comparison, and an exclusion funnel explaining why candidates were removed.
- **AI second opinion:** re-ranks the top 10 using the client's call notes and candidate bios (score nudge capped at ±8).
- **Send Match:** an AI-drafted, editable introduction email. The final email is saved with the sent record and can be reopened later.

## Architecture

```text
Browser (React)                      Server (Next.js route handlers, Node.js)
  page.tsx, components/, hooks/  ->    /api/auth       login (POST), logout (DELETE)
  holds no candidate data              /api/customer   GET dashboard data, PATCH mutations
                                       /api/matches    server-side matching engine
                                       /api/pool       opposite-gender pool (search)
                                       /api/ai-pitch   Groq: intro email (by ids)
                                       /api/rerank     Groq: bounded re-rank (by ids)
                                              |
                                  lib/server/repo.ts  (persistence)
                                   |-- SupabaseRepo   durable (production)
                                   '-- FileRepo       .data/*.json (local, zero setup)
```

```text
src/
  app/api/...                  Route handlers (all require a valid session)
  lib/matchingEngine.ts        Dealbreakers -> mutual scoring -> tiers
  lib/preferences.ts           Default + validated partner preferences
  lib/scoring/                 8 scoring dimensions, curves, per-gender weights
  lib/apiAuth.ts               Signed-cookie session (HMAC-SHA256, timing-safe)
  lib/server/repo.ts           Persistence interface + Supabase and file implementations
  lib/server/clients.ts        Merges static seed profiles with saved changes
  lib/aiHelpers.ts, groq.ts    Prompts, deterministic fallbacks, cache keys, Groq client
  lib/seedData.ts              Reproducible synthetic data (server-only)
supabase/schema.sql            Tables for notes, stage/preferences, shortlist, sent emails
```

**Design decisions worth discussing**
- *Seed data is static; changes are layered on top.* Only deltas (notes, stage, preferences, shortlist, sent emails) are stored, so editing the seed data never leaves stale copies in the database.
- *The server never trusts the browser.* The AI routes receive only ids, look up both profiles and recompute the score; the customer API validates stages, note length, preferences and the shape of the email being sent.
- *One repository interface, two backends.* Production uses Supabase; local development needs no setup. The same API test suite passes against both.
- *Matching is deterministic and server-side.* The browser sends slider and dealbreaker values; the server returns ranked results.

## Setup

```bash
npm install
npm i -D tsx
cp .env.example .env.local     # fill in what you have (see the table below)
npm run dev                    # http://localhost:3000
npm run check:matches          # every client should print OK
```

Add `"check:matches": "tsx scripts/check-matches.ts"` to the `scripts` section of `package.json`.

| Variable | Needed | Purpose |
|---|---|---|
| `MATCHMAKER_SESSION_SECRET` | **Production** | Signs the session cookie. Login fails closed (HTTP 500) if missing in production. |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | Production | Durable storage. Without them a local JSON file is used (ephemeral on Vercel). |
| `GROQ_API_KEY` | Optional | Live AI. Without it, AI routes return clearly labelled template output. |

### Supabase

1. Create a project, open **SQL Editor**, and run `supabase/schema.sql`.
2. Copy the project URL and a **secret/service-role key** into `SUPABASE_URL` and `SUPABASE_SECRET_KEY`.
3. The key is used only in server code and bypasses Row Level Security. RLS is enabled with no policies, so the browser can read and write nothing directly. Never prefix these variables with `NEXT_PUBLIC_`.

### Deploy (Vercel)

1. Push to GitHub (`.env.local` and `.data/` must not be committed).
2. Import the repo on Vercel and add the variables above, including `MATCHMAKER_SESSION_SECRET` and the Supabase pair.
3. Deploy, then log in with the demo credentials. Change a stage, refresh the page, and confirm it persisted.

## Matching algorithm

**Stage 1: dealbreakers.** Every client has editable partner preferences that act as hard filters, plus two universal rules (a Yes-vs-No conflict on children, and no feasible relocation path). Each exclusion is counted and shown in the funnel.
- *Male clients* default to the brief's rules: the candidate is younger, shorter and earns less (age floor of 21 is only an adult limit).
- *Female clients* default to softer, mirrored rules: the candidate is no more than 2 years younger, at most 10 years older, at least as tall, and earns at least 70% of her income. Hard-mirroring the male rules left some women with too few options in testing, so these are intentionally looser.
- The matchmaker can change any range, accepted diets, divorced/widowed and same-religion filters per client and save them.

**Stage 2: mutual scoring.** Survivors are scored on eight dimensions (age, height, income balance, children, location and mobility, culture, lifestyle, family and marital background). Each returns a graduated 0-1 value: age, height and income use Gaussian "ideal gap" curves, diet uses a strictness ladder, and relocation uses haversine distance and willingness. Weights differ by gender. The pair is scored from the client's side and from the candidate's side and combined with a **harmonic mean**, which penalises lopsided matches. Scores map to High Potential (74+), Strong Compatibility (62+) and Moderate Fit, with thresholds taken from the observed score distribution.

**Stage 3: AI second opinion.** The top 10 (client profile, matchmaker notes, bios, score breakdowns) go to an LLM in one call. It returns a per-candidate adjustment, an insight and a watch-out. The adjustment is clamped to ±8 in server code, so the deterministic engine stays in charge while the AI contributes qualitative signals the numbers cannot see. The same model drafts the introduction email. When the key is missing or the call fails, routes return a template built only from real profile fields and the score breakdown, labelled as a template in the UI. AI output is cached (best effort) keyed on the weights and a hash of the full call notes.

## Assumptions

- Age, height and income preferences are graduated ideals for scoring, and hard limits only through the editable dealbreakers.
- For female clients the man is assumed to be the flexible party on relocation; remote workers count as fully mobile.
- "Maybe" on children is compatible with Yes or No at a reduced score; Yes vs No is a dealbreaker.
- "Caste No Bar" is treated as flexible; religion is a soft signal unless "same religion only" is enabled.
- All profiles are synthetic and generated from a fixed seed.

## Testing

`npm run check:matches` confirms every seeded client gets at least 15 qualified matches. The API was additionally exercised end to end (authentication, validation, matching, dealbreakers, notes, stage, shortlist, AI routes in template mode, sent emails, and persistence across a server restart) against both the file store and a mock Supabase REST server. This is a development-time check, not an automated suite in the repository.

## Known limitations

- **Sessions are stateless:** logging out clears the cookie, but a copied token stays valid until it expires (12 hours). There is one demo account and no login rate limiting.
- **"Send Match" is a mock:** the email is recorded, not delivered. A real build would add an email provider.
- **AI cache is best effort** (a file in `/tmp` on Vercel); losing it only costs another model call.
- Slider re-weighting changes the client's side of the mutual score only.
- Not for real customer data until proper authentication, access control and data-handling are in place.

## Next steps

Per-matchmaker accounts and assignment, real email delivery, a feedback loop (accepted / declined introductions informing the weights), and an automated test suite.
