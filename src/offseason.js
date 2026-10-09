// The NFL off-season, in league order: contracts expire when free agency opens (teams keep the
// core players they re-sign), clubs sign free agents to fill their needs, and before the next
// season every roster is topped up from the real players still on the market. No player is
// ever invented here.

import { leagueCap, leagueMin } from "./cap.js";

// Fewest players a club carries at each position.
export const ROSTER_MIN = { QB: 2, RB: 3, WR: 5, TE: 3, LT: 1, LG: 1, C: 1, RG: 1, RT: 1, DL: 7, LB: 5, CB: 5, S: 4, K: 1 };
export const ROSTER_TARGET = 53;

const roll = (rand, a, b) => a + Math.floor(rand() * (b - a + 1));

// Opening free agency for the season after `yr`. Every contract loses a year; the ones that
// run out either get re-signed (AI clubs keep most of their core) or hit the market. Players
// 36+ or rated under 45 retire instead. Everyone touched is stamped cy = yr + 1 so the season
// rollover does not count the year twice.
export function openFreeAgency(teams, ui, yr, rand = Math.random, { cap = leagueCap(), room = cap * 0.06 } = {}) {
  const cy = yr + 1;
  const pool = [], mine = [], resigned = [], retired = [];
  const out = teams.map((t, i) => {
    const roster = [], expiring = [];
    for (const p of t.roster) {
      const left = (p.contract || 0) - 1;
      if (left > 0) roster.push({ ...p, contract: left, cy });
      else expiring.push(p);
    }
    // AI clubs re-sign best players first, and only what fits under the cap (with room for
    // coaches and the draft class).
    let payroll = roster.reduce((s, p) => s + (p.salary || 0), 0);
    // Franchise players first (QBs ahead of everyone), then by rating, so a club never spends
    // its room on lesser starters and loses its young star.
    const core = (p) => (isFranchisePlayer(p) ? 3 : 0) + (keepChance(p) >= 0.95 ? (p.pos === "QB" ? 2 : 1) : 0);
    for (const p of expiring.sort((a, b) => core(b) - core(a) || b.ovr - a.ovr)) {
      const keep = keepChance(p);
      const salary = +Math.max(p.salary || 1, askingPrice(p) * (0.95 + rand() * 0.15)).toFixed(1); // market, not a small raise
      // A young franchise player is kept even if it means cap casualties: the club cuts its
      // priciest non-core contracts (up to five) to make room, as real teams do before tagging; it
      // refills the roster in free agency and the draft. A club that still can't fit him is truly
      // cap-strapped and he walks.
      // For a franchise player the club also gives up its cap cushion (restructures, as real
      // teams do for a young QB); everyone else has to fit with room to spare.
      const limit = keep >= 0.95 ? cap : cap - room;
      // A franchise player goes further: the club cuts whoever it takes (never another franchise
      // player), and if he still doesn't fit it tags him anyway and sorts the cap out later.
      const star = isFranchisePlayer(p);
      if (i !== ui && keep >= 0.95 && payroll + salary > limit) {
        const cuts = roster.filter((q) => (star ? !isFranchisePlayer(q) && q.ovr < p.ovr : q.ovr < 80)).sort((a, b) => (b.salary || 0) - (a.salary || 0)).slice(0, star ? 12 : 5);
        for (const q of cuts) {
          if (payroll + salary <= limit || roster.length <= 30) break;
          roster.splice(roster.indexOf(q), 1);
          payroll -= q.salary || 0;
          pool.push({ ...q, contract: 0, cy, formerTeam: i, gl: [], av: 0 });
        }
      }
      if (i !== ui && (star || (rand() < keep && payroll + salary <= limit))) {
        roster.push({ ...p, contract: roll(rand, 2, 4), salary, cy });
        payroll += salary;
        resigned.push({ p, team: i });
        continue;
      }
      if (p.age >= 36 || p.ovr < 45) { retired.push({ p, team: i }); continue; }
      const fa = { ...p, contract: 0, cy, formerTeam: i, ss: p.ss, gl: [], av: 0 };
      pool.push(fa);
      if (i === ui) mine.push(fa);
    }
    return { ...t, roster };
  });
  pool.sort((a, b) => b.ovr - a.ovr);
  return { teams: out, pool, mine, resigned, retired };
}

// A franchise player: a superstar in or before his prime (90+ at 29 or younger, or 86+ with an
// elite development trait or an X-Factor at 27 or younger; QBs three years later). AI clubs build
// around these players: they never let one walk, cut anyone else to keep him and tag him if
// they have to.
export function isFranchisePlayer(p) {
  const a = p.pos === "QB" ? p.age - 3 : p.age;
  if (p.pos === "K") return false;
  if (p.ovr >= 90 && a <= 29) return true;
  return p.ovr >= 86 && a <= 27 && (p.xf || p.dev === "superstar" || p.dev === "generational");
}

// How likely an AI club is to keep its own player whose deal is up. Young stars almost never
// reach the market (extension or the tag); the market gets veterans, mid-tier starters and the
// stars of clubs that can't fit them under the cap. QBs age about three years later.
export function keepChance(p) {
  if (isFranchisePlayer(p)) return 1;
  const a = p.pos === "QB" ? p.age - 3 : p.age;
  if (p.ovr >= 88) return a <= 28 ? 0.98 : a <= 30 ? 0.85 : a <= 32 ? 0.5 : 0.25;
  if (p.ovr >= 82) return a <= 27 ? 0.85 : a <= 29 ? 0.65 : a <= 31 ? 0.35 : 0.15;
  if (p.ovr >= 76) return a <= 26 ? 0.6 : a <= 29 ? 0.35 : 0.1;
  return 0;
}

// What a player asks for on a new deal: a share of the salary cap set by his position and
// rating, from real contracts. A 99 earns the top of his position's market (QB ~23.5% of the
// cap, elite WR or pass rusher ~15%, down to kickers ~2%); an 88 gets ~87% of that, an 80 half,
// a 70 a tenth, and anyone below starter level the minimum. Less once he's past his prime (QBs
// age four years later). cap: the cap for the league year the deal starts.
export const TOP_SHARE = { QB: 0.235, WR: 0.15, DL: 0.15, LT: 0.115, CB: 0.11, RT: 0.09, LB: 0.09, S: 0.085, TE: 0.08, LG: 0.08, RG: 0.08, RB: 0.07, C: 0.07, K: 0.02 };
const curve = (ovr) => Math.min(1, 1 / (1 + Math.exp(-(ovr - 80) / 4.5)) / 0.985);
export const askingPrice = (p, cap = leagueCap()) => {
  const a = p.pos === "QB" ? p.age - 4 : p.age;
  const age = a >= 34 ? 0.5 : a >= 32 ? 0.7 : a >= 30 ? 0.85 : 1;
  return +Math.max(cap * 0.0033, cap * (TOP_SHARE[p.pos] ?? 0.08) * curve(p.ovr) * age).toFixed(1);
};

// The position a club most needs: furthest below its minimum, then the weakest starter.
function needs(t) {
  const by = {};
  for (const p of t.roster) (by[p.pos] ||= []).push(p.ovr);
  return Object.keys(ROSTER_MIN)
    .map((pos) => ({ pos, short: ROSTER_MIN[pos] - (by[pos]?.length || 0), best: Math.max(0, ...(by[pos] || [0])) }))
    .sort((a, b) => b.short - a.short || a.best - b.best)
    .map((x) => x.pos);
}

// AI clubs sign from the pool. perTeam caps signings each; skip() can keep players off-limits
// (e.g. your own free agents in the first wave). capSpace(t) says what a club can still spend.
// Mutates the teams and the pool; returns the signings.
export function aiSignings(teams, pool, ui, { perTeam = 2, minOvr = 60, capSpace, cy, skip = () => false, rand = Math.random } = {}) {
  const signed = [];
  const order = teams.map((_, i) => i).filter((i) => i !== ui).sort(() => rand() - 0.5);
  for (let round = 0; round < perTeam; round++) {
    for (const i of order) {
      const t = teams[i];
      for (const pos of needs(t).slice(0, 3)) {
        const have = t.roster.filter((p) => p.pos === pos);
        const bar = Math.max(minOvr, have.length >= ROSTER_MIN[pos] ? Math.min(...have.map((p) => p.ovr)) + 1 : 0);
        const k = pool.findIndex((p) => p.pos === pos && p.ovr >= bar && !skip(p) && askingPrice(p) <= capSpace(t));
        if (k < 0) continue;
        const [p] = pool.splice(k, 1);
        const deal = { ...p, salary: askingPrice(p), contract: roll(rand, 1, p.age >= 30 ? 2 : 4), cy, formerTeam: undefined };
        t.roster.push(deal);
        signed.push({ p: deal, team: i, from: p.formerTeam });
        break;
      }
    }
  }
  return signed;
}

// Starters per position, for judging whether a free agent would start somewhere.
export const STARTS = { QB: 1, RB: 1, WR: 3, TE: 1, LT: 1, LG: 1, C: 1, RG: 1, RT: 1, DL: 4, LB: 3, CB: 2, S: 2, K: 1 };
const startBar = (t, pos) => {
  const r = t.roster.filter((p) => p.pos === pos).map((p) => p.ovr).sort((a, b) => b - a);
  return r[STARTS[pos] - 1] ?? 0;
};

// The best free agents go to the clubs where they'd start and that can pay them (the club
// gaining the most wins him). Mutates the teams and the pool; returns the signings.
export function starterSignings(teams, pool, ui, { minOvr = 72, perTeam = 2, capSpace, cy, skip = () => false, rand = Math.random } = {}) {
  const signed = [], count = {};
  for (const p of [...pool]) {
    if (p.ovr < minOvr || skip(p)) continue;
    let best = -1, gain = 0;
    teams.forEach((t, i) => {
      if (i === ui || (count[i] || 0) >= perTeam || askingPrice(p) > capSpace(t)) return;
      const g = p.ovr - startBar(t, p.pos) + rand() * 2;
      if (g > gain) { gain = g; best = i; }
    });
    if (best < 0 || gain < 2) continue;
    pool.splice(pool.indexOf(p), 1);
    const deal = { ...p, salary: askingPrice(p), contract: roll(rand, 1, p.age >= 30 ? 2 : 4), cy, formerTeam: undefined };
    teams[best].roster.push(deal);
    count[best] = (count[best] || 0) + 1;
    signed.push({ p: deal, team: best, from: p.formerTeam });
  }
  return signed;
}

// Before the season: every club reaches its position minimums, and AI clubs fill out to 53,
// all from the real players left in the pool (cheapest deals if money is tight).
export function fillRosters(teams, pool, ui, { capSpace, cy, rand = Math.random } = {}) {
  const signed = [];
  const sign = (t, i, k) => {
    const [p] = pool.splice(k, 1);
    const deal = { ...p, salary: capSpace(t) >= askingPrice(p) ? askingPrice(p) : leagueMin(), contract: roll(rand, 1, 2), cy, formerTeam: undefined };
    t.roster.push(deal);
    signed.push({ p: deal, team: i });
  };
  teams.forEach((t, i) => {
    for (const [pos, min] of Object.entries(ROSTER_MIN)) {
      let have = t.roster.filter((p) => p.pos === pos).length;
      while (have < min) {
        const k = pool.findIndex((p) => p.pos === pos);
        if (k < 0) break;
        sign(t, i, k); have++;
      }
    }
    if (i === ui) return;
    // Cut-down day: AI clubs release their lowest-rated players beyond 53 (never below a minimum).
    while (t.roster.length > ROSTER_TARGET) {
      const spare = [...t.roster].sort((a, b) => a.ovr - b.ovr).find((p) => t.roster.filter((q) => q.pos === p.pos).length > ROSTER_MIN[p.pos]);
      if (!spare) break;
      t.roster.splice(t.roster.indexOf(spare), 1);
      pool.push({ ...spare, contract: 0, formerTeam: i });
    }
  });
  // Then clubs take turns, one signing each per round, so a thin market is shared out evenly.
  for (let more = true; more && pool.length; ) {
    more = false;
    teams.forEach((t, i) => {
      if (i === ui || t.roster.length >= ROSTER_TARGET || !pool.length) return;
      const want = needs(t);
      const k = pool.findIndex((p) => want.slice(0, 4).includes(p.pos));
      sign(t, i, k >= 0 ? k : 0);
      more = true;
    });
  }
  // Last pass: an AI club still over the cap releases its priciest depth players (never below 48).
  teams.forEach((t, i) => {
    while (i !== ui && capSpace(t) < 0 && t.roster.length > 48) {
      const cut = [...t.roster].sort((a, b) => a.ovr - b.ovr).slice(0, 15).sort((a, b) => (b.salary || 0) - (a.salary || 0))[0];
      t.roster.splice(t.roster.indexOf(cut), 1);
      pool.push({ ...cut, contract: 0, formerTeam: i });
    }
  });
  return signed;
}
