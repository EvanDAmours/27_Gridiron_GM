// When players hang it up. Each position has the age an established NFL player typically retires
// at (running backs around 30, receivers and defenders in their early 30s, linemen a little later,
// quarterbacks in their mid-30s, kickers and punters near 40). The chance climbs in the three
// years before that age and keeps climbing after it. Stars play on longer; fringe veterans leave
// sooner. Unsigned free agents retire far more readily: most careers end when nobody calls.
export const RETIRE_AGE = { QB: 36, RB: 30, WR: 32, TE: 32, LT: 33, LG: 33, C: 33, RG: 33, RT: 33, DL: 32, LB: 31, CB: 31, S: 32, K: 38, P: 38 };
import { devOf } from "./scouting.js";
// generational talents and superstars play years longer (see agingEnd in development.js)
const LONGEVITY = { generational: 4, superstar: 2 };
export const retireAge = (p) => (RETIRE_AGE[p.pos] ?? 32) + (LONGEVITY[devOf(p)] || 0);
// chance by years from his position's retirement age: 3 before, 2 before, ... 3+ after
const BY_YEAR = [0.06, 0.12, 0.22, 0.38, 0.55, 0.7, 0.8];

// p.age: his age in the season just played. freeAgent: unsigned when the season ended.
export function retireChance(p, { freeAgent = false } = {}) {
  const d = (p.age || 0) - retireAge(p), o = p.ovr || 0;
  if (d < -3) {
    if (!freeAgent) return 0;
    // a younger free agent nobody signed all year: the fringe move on to life after football
    if ((p.age || 0) >= 26) return o < 60 ? 0.5 : o < 68 ? 0.25 : 0.05;
    return o < 55 ? 0.3 : 0;
  }
  let ch = BY_YEAR[Math.min(6, d + 3)];
  if (o >= 88) ch *= 0.55; else if (o >= 80) ch *= 0.8; else if (o < 70) ch *= 1.5;
  if (freeAgent) ch = Math.max(ch * 2, 0.3);
  return Math.min(0.95, ch);
}
export const retires = (p, opts, rand = Math.random) => rand() < retireChance(p, opts);
