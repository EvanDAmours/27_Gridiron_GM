// Training camp and the staff budget. Every club runs the same camp: a number of practice
// sessions (the head coach adds a couple), each spent on one player. Camp work doesn't hand out
// rating on the spot: it pays off in the off-season, with that summer's growth, and it's capped by
// age and ceiling. A young player under his ceiling grows a little more; a veteran past his prime
// holds off some of the decline; anyone already at his ceiling gains nothing. Diminishing returns:
// the second and third sessions on the same man are worth less. A full camp is worth a point or
// two across a club's young core, not a jump for the whole roster.
//
// Staff points: a fixed budget each league year from the coaching staff (it doesn't grow with
// wins), plus up to CARRY left over from last year. They pay for staff decisions (coach
// development, meetings, extensions, scheme installs), not for player ratings.
import { agingEnd } from "./development.js";
import { devOf } from "./scouting.js";

export const MAX_PER_PLAYER = 3;
const STEP = [1, 0.7, 0.5]; // what the 1st, 2nd and 3rd session on one player are worth
export const CARRY = 5;

// Practice sessions a club gets: 8, plus the head coach (a strong one runs a better camp).
export function campSessions(team) {
  const hc = team?.coach?.hc;
  const r = hc?.rating ?? 70;
  return 8 + (r >= 88 ? 2 : r >= 80 ? 1 : 0) + (hc?.spec === "Player Developer" ? 2 : 0);
}

// The staff budget for a league year: about 12, more with a better staff (8-18).
export function staffBudget(team, extra = 0) {
  const c = team?.coach || {};
  const rs = ["hc", "oc", "dc"].map((k) => c[k]?.rating).filter((x) => x != null);
  const avg = rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : 72;
  return Math.max(8, Math.min(18, Math.round(12 + (avg - 75) / 4) + extra));
}

// The chance one session turns into a point: young players under their ceiling the most.
export function sessionOdds(p) {
  const pot = p.truePot ?? p.pot ?? p.ovr;
  const past = p.age > agingEnd(p);
  if (past) return 0.3; // a veteran: a point of decline held off
  if (p.ovr >= pot) return 0;
  const dev = devOf(p);
  const age = p.age <= 23 ? 0.45 : p.age <= 26 ? 0.3 : 0.15;
  // the last points to the very top come from playing, not practice
  const top = p.ovr >= 92 ? 0.15 : p.ovr >= 88 ? 0.4 : 1;
  return age * top * (dev === "generational" || dev === "superstar" ? 1.2 : dev === "star" ? 1.1 : 1);
}
// Expected points from n sessions on him (for the camp screen).
export const expectedGain = (p, n) => Math.round(STEP.slice(0, Math.min(n, MAX_PER_PLAYER)).reduce((s, k) => s + k * sessionOdds(p), 0) * 10) / 10;

// The off-season payoff for a player's camp work this year. change: his growth before camp (a
// veteran's camp only softens a decline). Capped at his ceiling.
export function campGain(p, change, yr, rand = Math.random) {
  const n = p.camp?.yr === yr ? Math.min(p.camp.n || 0, MAX_PER_PLAYER) : 0;
  if (!n) return 0;
  const odds = sessionOdds(p);
  let g = 0;
  for (let i = 0; i < n; i++) if (rand() < odds * STEP[i]) g++;
  if (p.age > agingEnd(p)) return Math.max(0, Math.min(g, -change)); // decline held off, never growth
  const room = Math.max(0, (p.truePot ?? p.pot ?? p.ovr) - (p.ovr + Math.max(0, change)));
  return Math.min(g, room);
}

// The staff's camp: sessions to the young players with the most room to grow (and the good
// veterans fighting age), up to three each. Returns { [id]: n }.
export function autoCamp(roster, sessions, start = {}) {
  const score = (p) => {
    const pot = p.truePot ?? p.pot ?? p.ovr, room = Math.max(0, pot - p.ovr);
    return sessionOdds(p) * (p.age > agingEnd(p) ? (p.ovr >= 75 ? 2 : 0.5) : 1 + room / 6);
  };
  const pool = roster.filter((p) => !p.injured && sessionOdds(p) > 0);
  const out = { ...start };
  // each session to whoever gains the most from his next one (a second session is worth less)
  for (let k = 0; k < sessions; k++) {
    let best = null, bv = 0;
    for (const p of pool) { const n = out[p.id] || 0; if (n >= MAX_PER_PLAYER) continue; const v = score(p) * STEP[n]; if (v > bv) { bv = v; best = p; } }
    if (!best) break;
    out[best.id] = (out[best.id] || 0) + 1;
  }
  return out;
}
// Camp for the whole league at kickoff: every AI club's staff assigns its sessions; your sessions
// stay where you put them, and any you didn't use the staff assigns. Mutates teams' rosters.
// Returns how many of your sessions the staff filled.
export function runCamps(teams, ui, yr) {
  let filled = 0;
  teams.forEach((t, i) => {
    const n = campSessions(t), mine = i === ui ? campOf(t.roster, yr) : {};
    const used = Object.values(mine).reduce((a, b) => a + b, 0);
    const alloc = used >= n ? mine : autoCamp(t.roster, n - used, mine);
    if (i === ui) filled = Math.max(0, Math.min(n, Object.values(alloc).reduce((a, b) => a + b, 0)) - used);
    t.roster = applyCamp(t.roster, alloc, yr);
  });
  return filled;
}
// Write a camp onto the roster (each player's p.camp = { yr, n }); players not in alloc get none.
export function applyCamp(roster, alloc, yr) {
  return roster.map((p) => (alloc[p.id] ? { ...p, camp: { yr, n: Math.min(alloc[p.id], MAX_PER_PLAYER) } } : p.camp?.yr === yr ? { ...p, camp: undefined } : p));
}
// This year's sessions on a roster, as { [id]: n }.
export const campOf = (roster, yr) => Object.fromEntries((roster || []).filter((p) => p.camp?.yr === yr && p.camp.n > 0).map((p) => [p.id, p.camp.n]));

// The camp priority room for a club that doesn't set one (the AI): the room with the most young
// players short of their ceiling.
const ROOMS = { QB: ["QB"], RB: ["RB"], WR: ["WR", "TE"], OL: ["LT", "LG", "C", "RG", "RT"], DL: ["DL"], LB: ["LB"], DB: ["CB", "S"] };
export function autoCampPri(roster) {
  let best = "balanced", bv = 0;
  for (const [k, ps] of Object.entries(ROOMS)) {
    const v = (roster || []).filter((p) => ps.includes(p.pos) && p.age <= 25).reduce((s, p) => s + Math.max(0, (p.truePot ?? p.pot ?? p.ovr) - p.ovr), 0);
    if (v > bv) { bv = v; best = k; }
  }
  return best;
}
// The weekly development focus for a club that doesn't set one: the player on each side of the
// ball who'd gain the most from it, among the young players still climbing (under 90 and short of
// their ceiling: the staff doesn't push a star past his). chance(p): development.js focusChance.
export function autoFocus(roster, chance, OFF, DEF) {
  const room = (p) => (p.truePot ?? p.pot ?? p.ovr) - p.ovr;
  const best = (side) => (roster || []).filter((p) => side.includes(p.pos) && !p.injured && room(p) > 0 && p.ovr < 90).sort((a, b) => chance(b) * Math.min(1, room(b) / 4) - chance(a) * Math.min(1, room(a) / 4))[0];
  return { off: best(OFF)?.id ?? null, def: best(DEF)?.id ?? null };
}
