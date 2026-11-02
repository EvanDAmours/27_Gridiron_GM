// Real NFL transactions since the game's rosters were built: deadline trades, releases and
// signings (scripts/sync-espn-rosters.py writes data/realMoves2026.json from ESPN's rosters). A
// save in that season gets each one once, for the AI clubs: a player moves only if he's still
// where the real move found him, rosters stay at 53 (the practice squad first, then a depth-level
// free agent), and a move that touches your club is left to you (it's your roster) and noted.
import MOVES from "./data/realMoves2026.json" with { type: "json" };

const ROSTER = 53, PS = 10;
// The moves concerning one player (a new league's players start with them all made: the data
// already has them where the real moves put them). Each player carries the ones done (p.rm).
export const movesFor = (name, pos, list = MOVES.moves) => list.filter((m) => m.name === name && m.pos === pos).map((m) => m.id);
const GROUP = { LT: "OL", LG: "OL", C: "OL", RG: "OL", RT: "OL" };
const grp = (pos) => GROUP[pos] || pos;
const keep = (p) => p.pos === "QB" || p.pos === "K" || p.pos === "P";

// make(name, pos): a new player object for someone the save has never seen (a kicker the data
// adds, say), or null. Returns the log lines.
export function applyRealMoves(d, make = () => null, list = MOVES.moves, season = MOVES.season) {
  const out = [];
  // the 2026 season only (preseason and regular season): once your league reaches its playoffs
  // and off-season, its rosters have moved on
  if (!d || !Array.isArray(d.teams) || d.yr !== season || (d.sp && d.sp !== "preseason" && d.sp !== "regular")) return out;
  const fa = Array.isArray(d.fa) ? d.fa : (d.fa = []);
  const club = (ab) => d.teams.find((t) => t?.ab === ab);
  const yours = d.teams[d.ui];
  const on = (t, m) => t && [t.roster || [], t.ps || []].find((l) => l.some((p) => p?.name === m.name && p.pos === m.pos));
  // keep a club at 53: send the lowest-rated depth player down, or call up / sign at the spot it lost
  const fit = (t, need) => {
    t.ps = t.ps || [];
    while (t.roster.length > ROSTER) {
      const cut = t.roster.filter((p) => !keep(p)).sort((a, b) => a.ovr - b.ovr)[0];
      if (!cut) break;
      t.roster = t.roster.filter((p) => p !== cut);
      if (t.ps.length < PS) t.ps.push(cut); else fa.push(cut);
    }
    while (t.roster.length < ROSTER) {
      const byNeed = (a, b) => (grp(a.pos) !== need) - (grp(b.pos) !== need) || b.ovr - a.ovr;
      const up = [...t.ps].sort(byNeed)[0];
      if (up) { t.ps = t.ps.filter((p) => p !== up); t.roster.push(up); continue; }
      const sign = fa.filter((p) => p.ovr <= 72).sort(byNeed)[0];
      if (!sign) break;
      fa.splice(fa.indexOf(sign), 1);
      t.roster.push(sign);
    }
  };
  for (const m of list) {
    const from = m.from === "FA" ? null : club(m.from), to = m.to === "FA" ? null : club(m.to);
    // where he is in this save: his old club (or the free agents, for a signing)
    const list0 = from ? on(from, m) : fa.some((p) => p?.name === m.name && p.pos === m.pos) ? fa : null;
    let p = list0 && list0.find((x) => x?.name === m.name && x.pos === m.pos);
    // new to the league: only if he's nowhere in it (a club's roster, practice squad or injured
    // reserve, waivers, retired). A signing who's since gone on IR is still that club's player.
    const anywhere = () => d.teams.some((t) => t && [t.roster, t.ps, t.ir].some((l) => (l || []).some((x) => x?.name === m.name && x.pos === m.pos))) || [d.waivers, d.retired].some((l) => Array.isArray(l) && l.some((x) => x?.name === m.name && x.pos === m.pos));
    if (!p && m.from === "FA" && !anywhere()) { p = make(m.name, m.pos); if (p) p.rm = []; }
    if (!p || (p.rm || []).includes(m.id)) continue; // already done, or he's somewhere else in your league
    p.rm = [...(p.rm || []), m.id];
    if ((from && from === yours) || (to && to === yours)) {
      out.push(`In real life: ${m.name} (${m.pos}) ${m.to === "FA" ? `was released by ${m.from}` : m.from === "FA" ? `signed with ${m.to}` : `was traded from ${m.from} to ${m.to}`}. Your roster is yours: nothing changed.`);
      continue;
    }
    if (list0) list0.splice(list0.indexOf(p), 1);
    if (from) fit(from, grp(m.pos));
    if (to) { to.roster.push(p); fit(to, null); } else fa.push(p);
    out.push(m.to === "FA" ? `${m.name} (${m.pos}) released by ${m.from}` : m.from === "FA" ? `${m.name} (${m.pos}) signs with ${m.to}` : `TRADE: ${m.name} (${m.pos}) from ${m.from} to ${m.to}`);
  }
  return out;
}
