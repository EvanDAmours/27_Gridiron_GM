// The NFL off-season, in league order: contracts expire when free agency opens (teams keep the
// core players they re-sign), clubs sign free agents to fill their needs, and before the next
// season every roster is topped up from the real players still on the market. No player is
// ever invented here.

// Fewest players a club carries at each position.
export const ROSTER_MIN = { QB: 2, RB: 3, WR: 5, TE: 3, LT: 1, LG: 1, C: 1, RG: 1, RT: 1, DL: 7, LB: 5, CB: 5, S: 4, K: 1 };
export const ROSTER_TARGET = 53;

const roll = (rand, a, b) => a + Math.floor(rand() * (b - a + 1));

// Opening free agency for the season after `yr`. Every contract loses a year; the ones that
// run out either get re-signed (AI clubs keep most of their core) or hit the market. Players
// 36+ or rated under 45 retire instead. Everyone touched is stamped cy = yr + 1 so the season
// rollover does not count the year twice.
export function openFreeAgency(teams, ui, yr, rand = Math.random) {
  const cy = yr + 1;
  const pool = [], mine = [], resigned = [], retired = [];
  const out = teams.map((t, i) => {
    const roster = [];
    for (const p of t.roster) {
      const left = (p.contract || 0) - 1;
      if (left > 0) { roster.push({ ...p, contract: left, cy }); continue; }
      // Stars nearly always get a new deal (or the tag); good young starters usually do.
      const keep = p.ovr >= 90 && p.age <= 33 ? 0.92 : p.ovr >= 80 && p.age <= 31 ? 0.75 : p.ovr >= 72 && p.age <= 27 ? 0.55 : 0;
      if (i !== ui && rand() < keep) {
        const salary = +Math.max(p.salary || 1, (p.salary || 1) * (1.05 + rand() * 0.3)).toFixed(1);
        roster.push({ ...p, contract: roll(rand, 2, 4), salary, cy });
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

// What a free agent costs to sign: his last salary, scaled to his rating, never under $0.8M.
export const askingPrice = (p) => +Math.max(0.8, Math.min((p.salary || 1) * 1.1, 1 + 25 * Math.max(0, (p.ovr - 60) / 39) ** 2.2)).toFixed(1);

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
    const deal = { ...p, salary: capSpace(t) >= askingPrice(p) ? askingPrice(p) : 0.8, contract: roll(rand, 1, 2), cy, formerTeam: undefined };
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
    while (t.roster.length < ROSTER_TARGET && pool.length) {
      const want = needs(t);
      const k = pool.findIndex((p) => want.slice(0, 4).includes(p.pos));
      sign(t, i, k >= 0 ? k : 0);
    }
  });
  return signed;
}
