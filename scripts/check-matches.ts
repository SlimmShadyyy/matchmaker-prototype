// Sanity check: every client must get a healthy list of matches. Run: npm run check:matches
import { TDC_CUSTOMERS, MATCHMAKING_POOL } from '../src/lib/seedData';
import { runMatchmakingAlgorithm } from '../src/lib/matchingEngine';

let failed = false;
for (const c of TDC_CUSTOMERS) {
  const { matches, considered } = runMatchmakingAlgorithm(c, MATCHMAKING_POOL);
  const ok = matches.length >= 15 && considered >= 100;
  if (!ok) failed = true;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${c.id} (${c.gender}, ${c.age}, ${c.city}): ${considered} -> ${matches.length} matches, top ${matches[0]?.totalScore ?? '-'}`);
}
process.exit(failed ? 1 : 0);