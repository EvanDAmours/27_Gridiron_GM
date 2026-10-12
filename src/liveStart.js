// "Start from the current week": a new 2026 league picks up where the real NFL season is. Every
// week that's been played for real is filled in with the real scores (records, points, streaks)
// and every player's real season stats so far. The data comes from src/data/live2026.json, which
// scripts/fetch-nfl-results.py refreshes after each week's games.
import { emptySS } from "./league.js";

// How names are compared between ESPN's box scores and the Madden rosters.
export const normName = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/[.'’]/g, "").replace(/-/g, " ").replace(/\b(jr|sr|ii|iii|iv|v)\b/g, "").replace(/\s+/g, " ").trim();
// Players ESPN lists under a different first name than Madden does.
const ALIAS = { "andy borregales": "andres borregales", "cam bynum": "camryn bynum", "jaylahn tuimoloau": "jt tuimoloau",
  "hollywood brown": "marquise brown", "nicholas singleton": "nick singleton", "ben yurosek": "benjamin yurosek", "gabriel rubio": "gabe rubio" };
const key = (n) => { const k = normName(n); return ALIAS[k] || k; };

const qbRate = (c, a, y, td, i) => {
  if (!a) return 0;
  const cl = (x) => Math.max(0, Math.min(2.375, x));
  return +(((cl((c / a - 0.3) * 5) + cl((y / a - 3) * 0.25) + cl((td / a) * 20) + cl(2.375 - (i / a) * 25)) / 6) * 100).toFixed(1);
};

// teams: the league's teams (index = team id); sched: the season's games ({wk, h, a} as team ids).
// Changes both in place. Returns { wk: weeks completed, games, players, unmatched }.
export function applyLiveSeason(teams, sched, live) {
  if (!live?.games?.length) return { wk: 0, games: 0, players: 0, unmatched: 0 };
  const through = live.throughWeek || 0;
  const id = Object.fromEntries(teams.map((t, i) => [t.ab, i]));
  let games = 0;
  for (const r of live.games) {
    if (r.wk > through) continue;
    const h = id[r.h], a = id[r.a];
    const g = sched.find((x) => x.wk === r.wk && x.h === h && x.a === a) || sched.find((x) => x.wk === r.wk && x.h === a && x.a === h);
    if (!g || g.played) continue;
    const hs = g.h === h ? r.hs : r.as, as = g.h === h ? r.as : r.hs;
    Object.assign(g, { played: true, hs, as, real: true, ot: !!r.ot });
    const H = teams[g.h], A = teams[g.a];
    H.pf += hs; H.pa += as; A.pf += as; A.pa += hs;
    if (hs > as) { H.w++; A.l++; } else if (as > hs) { A.w++; H.l++; } else { H.t = (H.t || 0) + 1; A.t = (A.t || 0) + 1; }
    for (const [t, won, lost] of [[H, hs > as, as > hs], [A, as > hs, hs > as]]) t.streak = won ? Math.max(0, t.streak || 0) + 1 : lost ? Math.min(0, t.streak || 0) - 1 : 0;
    games++;
  }
  // Real stats: matched on team and name first, then on name alone (players who've moved).
  const byTeam = new Map(), byName = new Map();
  teams.forEach((t) => [...t.roster, ...(t.ps || []), ...(t.ir || [])].forEach((p) => { byTeam.set(`${t.ab}|${key(p.name)}`, p); if (!byName.has(key(p.name))) byName.set(key(p.name), p); }));
  let players = 0, unmatched = 0;
  for (const [k, st] of Object.entries(live.stats || {})) {
    const [ab, name] = [k.slice(0, k.indexOf("|")), k.slice(k.indexOf("|") + 1)];
    const p = byTeam.get(`${ab}|${key(name)}`) || byName.get(key(name));
    if (!p) { unmatched++; continue; }
    const ss = { ...emptySS(p.pos), ...st };
    if (ss.att) ss.rate = qbRate(ss.comp || 0, ss.att, ss.passYds || 0, ss.passTD || 0, ss.passInt || 0);
    p.ss = ss; players++;
  }
  return { wk: through, games, players, unmatched };
}
