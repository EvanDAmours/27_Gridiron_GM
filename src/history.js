// League history: retirements, legacies and the Hall of Fame, plus career leaders.
//
// Career totals count games in this league (regular season). A retiring player's legacy adds up
// his career here (seasons at his peak, stats, awards, records) and, for the real players on the
// opening rosters, the career he already had: years before 2026 at the level he started at, or
// for the established greats, what they'd already won. A legacy of 60 or more puts him in the
// Hall of Fame, enshrined five years after he retires, like the NFL.

import { DRAFT_PEDIGREE, pedigreeKey } from "./data/draftPedigree.js";
import { FRANCHISE_CAREER } from "./data/franchiseCareer.js";
import { TEAM_CAREER_BASE, TEAM_CAREER_KEYS } from "./data/teamCareerBase.js";

export const HOF_LINE = 60;
export const HOF_WAIT = 5;

// What the established greats had already done before 2026 (MVPs, titles, All-Pro years), as
// legacy points. Everyone else on the opening rosters is credited by years and level instead.
export const PRE_LEAGUE_RESUME = {
  "Aaron Rodgers": 75, "Aaron Donald": 75, "Patrick Mahomes": 70, "Travis Kelce": 62, "Von Miller": 62, "Lamar Jackson": 50,
  "Khalil Mack": 45, "Calais Campbell": 45, "Derrick Henry": 45, "Chris Jones": 45, "T.J. Watt": 45,
  "Trent Williams": 45, "Matthew Stafford": 40, "Myles Garrett": 40, "Davante Adams": 40, "Mike Evans": 40,
  "Lane Johnson": 35, "Jalen Ramsey": 35, "Christian McCaffrey": 35, "Josh Allen": 35, "Cameron Jordan": 30,
  "Justin Jefferson": 30, "Saquon Barkley": 30, "Joe Burrow": 25, "Stefon Diggs": 20, "DeMarcus Lawrence": 20,
};

export const CAREER_STATS = [
  { key: "passYds", label: "Passing yards", per: 4000 }, { key: "passTD", label: "Passing TDs", per: 30 },
  { key: "rushYds", label: "Rushing yards", per: 1500 }, { key: "rushTD", label: "Rushing TDs", per: 12 },
  { key: "rec", label: "Receptions", per: 100 }, { key: "recYds", label: "Receiving yards", per: 1500 },
  { key: "recTD", label: "Receiving TDs", per: 10 }, { key: "sacks", label: "Sacks", per: 12 },
  { key: "ints", label: "Interceptions", per: 6 },
];
const AWARD_PTS = { mvp: 25, opoy: 15, dpoy: 15, sbmvp: 10, oroy: 5, droy: 5 };
const level = (ovr) => (ovr >= 95 ? 4 : ovr >= 90 ? 3 : ovr >= 85 ? 2 : ovr >= 80 ? 1 : 0);

// Where a player was drafted: { yr, rd, pk, tm } (tm: the club's abbreviation), or { undrafted, yr }.
// Drafts in this league come from the player (or the draft history); real players from the real
// draft record. Prospects not yet drafted get null.
export function draftPedigree(p, { draftHistory = {}, teams = [] } = {}) {
  if (!p) return null;
  if (p.draftPk > 0) {
    const h = (draftHistory[p.draftYr] || draftHistory[String(p.draftYr)] || []).find((x) => x.id === p.id);
    return { yr: p.draftYr, rd: p.draftRd || h?.rd || Math.ceil(p.draftPk / 32), pk: p.draftPk, tm: p.draftTm || (h ? teams[h.owner]?.ab : null) };
  }
  const real = DRAFT_PEDIGREE[pedigreeKey(p.name, p.bio?.college || p.college)];
  if (real) return { yr: real[0], rd: real[1], pk: real[2], tm: real[3] };
  if (p.undrafted || p.src === "m27") return { undrafted: true, yr: p.undrafted ? p.draftYr : null };
  return null;
}

// Career totals in this league: past seasons plus the one in progress.
export function careerTotals(p) {
  const out = {};
  for (const { key } of CAREER_STATS) out[key] = (p.cs?.[key] || 0) + (p.ss?.[key] || 0);
  out.gp = (p.cs?.gp || 0) + (p.ss?.gp || 0);
  return out;
}

// Awards he won in this league: { mvp: [2027, ...], ... }.
export function awardsOf(pid, awards = []) {
  const out = {};
  for (const a of awards) for (const k of Object.keys(AWARD_PTS)) if (a?.[k]?.pid === pid) (out[k] ||= []).push(a.yr);
  return out;
}

// startYr: the league's first season. startOvr: his rating when the league began (real players).
export function legacyOf(p, { awards = [], book = null, yr, startYr = 2026, startOvr } = {}) {
  const career = careerTotals(p);
  const won = awardsOf(p.id, awards);
  const peak = Math.max(p.peak || 0, p.ovr || 0);
  const firstYr = p.draftYr > 0 ? Math.max(startYr, p.draftPk > 0 ? p.draftYr + 1 : p.draftYr) : startYr;
  const seasonsHere = Math.max(1, yr - firstYr + 1);
  const pre = p.draftPk > 0 ? 0 : PRE_LEAGUE_RESUME[p.name] ?? Math.max(0, startYr - (p.draftYr || startYr)) * level(startOvr ?? p.ovr) * 0.75;
  const stats = CAREER_STATS.reduce((s, c) => s + (career[c.key] || 0) / c.per, 0) * 4;
  const awardPts = Object.entries(won).reduce((s, [k, ys]) => s + AWARD_PTS[k] * ys.length, 0);
  const records = book ? Object.values(book.best).filter((r) => r.pid === p.id).length * 10 : 0;
  // All-Pro and Pro Bowl selections in this league (first team 6, second team 3, Pro Bowl 2).
  const honorPts = (p.honors || []).reduce((s, h) => s + ({ ap1: 6, ap2: 3, pb: 2 }[h.k] || 0), 0);
  const legacy = Math.round(pre + seasonsHere * level(peak) + stats + awardPts + records + honorPts);
  return { legacy, career, won, peak, seasonsHere, pre: Math.round(pre) };
}

// ── Franchise careers ──
// A club's all-time leaders count everything a player did for it: real players' seasons there
// before the league began (through 2025), every league season he finished there, and this season
// if he's there now. The real record books (through 2025) fill in everyone who played before.
export const normName = (name) => String(name || "").toLowerCase().replace(/[.'’]/g, "").replace(/\b(jr|sr|ii|iii|iv|v)\b/g, "").replace(/[^a-z]+/g, " ").trim();
const isReal = (p) => !(p?.draftYr >= 2026);
let clubsByName = null;
const clubsOf = (name) => {
  if (!clubsByName) { clubsByName = new Map(); for (const k of Object.keys(TEAM_CAREER_BASE)) { const [n, ab] = k.split("|"); (clubsByName.get(n) || clubsByName.set(n, []).get(n)).push(ab); } }
  return clubsByName.get(normName(name)) || [];
};
// His totals with club ab. curAb: the club he's on now (his season so far counts there).
export function teamCareer(p, ab, curAb) {
  const out = {};
  const base = isReal(p) ? TEAM_CAREER_BASE[`${normName(p.name)}|${ab}`] : null;
  TEAM_CAREER_KEYS.forEach((k, i) => { out[k] = base?.[i] || 0; });
  for (const s of p.sh || []) if (s.tm === ab) for (const k of TEAM_CAREER_KEYS) out[k] += s[k] || 0;
  if (curAb === ab) for (const k of TEAM_CAREER_KEYS) out[k] += p.ss?.[k] || 0;
  return out;
}
// Every club he has numbers with: { ab: { stat: total } }.
export function teamCareers(p, curAb) {
  const clubs = new Set([...(isReal(p) ? clubsOf(p.name) : []), ...(p.sh || []).map((s) => s.tm), ...(curAb ? [curAb] : [])]);
  const out = {};
  for (const ab of clubs) { if (!ab) continue; const c = teamCareer(p, ab, curAb); if (TEAM_CAREER_KEYS.some((k) => c[k] > 0)) out[ab] = c; }
  return out;
}
// The club's all-time top n in one stat: { name, v, active, pid, team, real }. teams: every club;
// others: free agents and the like; retired: league history entries (their tc holds club careers).
export function franchiseBoard(ab, key, { teams = [], others = [], retired = [] } = {}, n = 10) {
  const rows = [];
  const seen = new Set();
  const add = (row) => { const k = normName(row.name); if (row.v > 0 && !seen.has(k)) { seen.add(k); rows.push(row); } };
  const league = [];
  for (const t of teams) for (const p of [...(t.roster || []), ...(t.ir || []), ...(t.ps || [])]) league.push({ p, cur: t.ab });
  for (const p of others) league.push({ p, cur: null });
  for (const { p, cur } of league) { const v = teamCareer(p, ab, cur)[key]; if (v > 0) add({ name: p.name, pid: p.id, v, active: true, team: cur }); }
  for (const r of retired) { const v = r.tc?.[ab]?.[key] ?? (r.team === ab && !r.tc ? r.career?.[key] : 0); if (v > 0) add({ name: r.name, pid: r.id, v, active: false, retYr: r.retYr }); }
  for (const r of FRANCHISE_CAREER[ab]?.[key] || []) add({ name: r.n, v: r.v, active: false, real: true });
  return rows.sort((a, b) => b.v - a.v).slice(0, n);
}
// Where he stands in his club's history: [{ key, label, rank, v }] for every stat where he's top 10.
export function franchiseRanks(p, ab, ctx) {
  if (!ab) return [];
  const out = [];
  for (const c of CAREER_STATS) {
    const mine = teamCareer(p, ab, ab)[c.key];
    if (!(mine > 0)) continue;
    const board = franchiseBoard(ab, c.key, ctx, 10);
    const i = board.findIndex((r) => normName(r.name) === normName(p.name));
    if (i >= 0) out.push({ key: c.key, label: c.label, rank: i + 1, v: mine });
  }
  return out;
}
// The 10th-best real mark in a stat (anyone past it belongs in the club's history).
const tenth = (ab, key) => { const l = FRANCHISE_CAREER[ab]?.[key] || []; return l.length >= 10 ? l[9].v : 1; };

// A player hanging it up. Returns his history entry (or null if he isn't notable enough to keep).
export function retireEntry(p, team, yr, opts = {}) {
  const L = legacyOf(p, { ...opts, yr });
  const hof = L.legacy >= HOF_LINE;
  const tc = teamCareers(p, team?.ab);
  // a top-10 career with a club keeps him in the books even without a big legacy
  const clubGreat = Object.entries(tc).some(([ab, c]) => CAREER_STATS.some(({ key }) => c[key] >= tenth(ab, key)));
  if (!hof && L.legacy < 12 && !clubGreat) return null;
  return {
    id: p.id, name: p.name, pos: p.pos, num: p.num, team: team?.ab || p.formerTeam || "FA", age: p.age, retYr: yr,
    peak: L.peak, legacy: L.legacy, career: L.career, won: L.won, seasons: L.seasonsHere, tc,
    hof, hofClass: hof ? yr + HOF_WAIT : null,
  };
}

// Career leaders in this league: active players (with this season so far) and retired ones.
export function careerLeaders(teams, retired = [], key, n = 10) {
  const rows = [];
  teams.forEach((t) => (t.roster || []).forEach((p) => { const v = careerTotals(p)[key]; if (v) rows.push({ id: p.id, name: p.name, pos: p.pos, team: t.ab, v, active: true }); }));
  for (const r of retired) { const v = r.career?.[key]; if (v) rows.push({ id: r.id, name: r.name, pos: r.pos, team: r.team, v, active: false, retYr: r.retYr }); }
  const seen = new Set();
  return rows.sort((a, b) => b.v - a.v).filter((r) => (seen.has(r.id) ? false : seen.add(r.id))).slice(0, n);
}

// A club's Ring of Honor candidates: players who retired with it, Hall of Famers or a legacy of
// 20+, not yet inducted. Best first.
export const ringCandidates = (retired, team, hall) => (retired || []).filter((r) => r.team === team?.ab && !(hall?.ring || []).includes(r.id) && (r.hof || r.legacy >= 20)).sort((a, b) => b.legacy - a.legacy);

// A player's accolades in this league, each with the years: Super Bowls (on the champion's roster
// that season), MVP and the other awards, All-Pro and Pro Bowl selections. teams: today's clubs
// (champs carry the club's index); yr: the current season (its stats aren't in his season lines yet).
const ACCOLADES = [
  ["sb", "🏆", "Super Bowl"], ["mvp", "🏅", "MVP"], ["sbmvp", "🏟️", "Super Bowl MVP"], ["opoy", "⭐", "Off. Player of the Year"],
  ["dpoy", "🛡️", "Def. Player of the Year"], ["oroy", "🌱", "Off. Rookie of the Year"], ["droy", "🌱", "Def. Rookie of the Year"],
  ["ap1", "🥇", "First-team All-Pro"], ["ap2", "🥈", "Second-team All-Pro"], ["pb", "🎖️", "Pro Bowl"],
];
export function accoladesOf(p, { awards = [], champs = [], teams = [], yr, teamAb } = {}) {
  if (!p) return [];
  const got = {};
  const add = (k, y) => { if (y != null && !(got[k] ||= []).includes(y)) got[k].push(y); };
  for (const a of awards) {
    for (const k of ["mvp", "sbmvp", "opoy", "dpoy", "oroy", "droy"]) if (a?.[k]?.pid === p.id) add(k, a.yr);
    // a list, or split by conference ({ AFC: [...], NFC: [...] } for the Pro Bowl)
    const flat = (v) => (Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v).flat() : []);
    for (const k of ["ap1", "ap2", "pb"]) if (flat(a?.honors?.[k]).some((h) => h?.pid === p.id)) add(k, a.yr);
  }
  for (const h of Array.isArray(p.honors) ? p.honors : []) if (h?.k && h.yr) add(h.k, h.yr);
  // rings: his club in each season (his season lines), and this season's club
  const clubIn = new Map((p.sh || []).map((s) => [s.y, s.tm]));
  if (teamAb && (p.ss?.gp || 0) > 0) clubIn.set(yr, teamAb);
  for (const c of champs) { const ab = teams[c.ti]?.ab; if (ab && clubIn.get(c.yr) === ab) add("sb", c.yr); }
  return ACCOLADES.filter(([k]) => got[k]?.length).map(([k, icon, label]) => ({ k, icon, label, years: got[k].sort((a, b) => a - b) }));
}

// After a week: has anyone taken over his club's all-time lead in a stat? book.cc holds the league
// players who hold a club career record ({ ab: { stat: { name, pid, v } } }); until one does, the
// real record (through 2025) stands. Returns { book, broken: [{ key, label, name, pid, team, ti, v, prev }] }.
export function updateCareerRecords(book, teams) {
  const cc = { ...(book.cc || {}) };
  const broken = [];
  teams.forEach((t, ti) => {
    const recs = { ...(cc[t.ab] || {}) };
    for (const c of CAREER_STATS) {
      let top = null;
      for (const p of [...(t.roster || []), ...(t.ir || [])]) { const v = teamCareer(p, t.ab, t.ab)[c.key]; if (v > 0 && (!top || v > top.v)) top = { p, v }; }
      if (!top) continue;
      const real = FRANCHISE_CAREER[t.ab]?.[c.key]?.[0];
      const cur = recs[c.key] || (real ? { name: real.n, v: real.v } : null);
      if (cur && top.v <= cur.v) continue;
      const same = cur && (cur.pid === top.p.id || normName(cur.name) === normName(top.p.name));
      recs[c.key] = { name: top.p.name, pid: top.p.id, v: top.v };
      if (!same) broken.push({ key: c.key, label: c.label, name: top.p.name, pid: top.p.id, team: t.ab, ti, v: top.v, prev: cur });
    }
    cc[t.ab] = recs;
  });
  return { book: { ...book, cc }, broken };
}
