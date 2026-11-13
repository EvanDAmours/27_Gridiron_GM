// The week in review, for Easy Mode's Home: your game and your best players in it, the league's
// offensive and defensive players of the week, the upset and the game of the week, and the season
// milestones passed this week (a back over 1,000 yards, a rusher to 10 sacks). Built from the week's
// box scores (keyed by player id: { name, pos, ...that game's stats }) and the players' season totals.
import { gameScore, statLine } from "./gameday.js";

const OFF = new Set(["QB", "RB", "FB", "WR", "TE"]);
const DEF = new Set(["DL", "LB", "CB", "S", "DE", "DT", "EDGE", "OLB", "ILB", "MLB", "FS", "SS"]);
// [season stat, the marks worth a line, what it's called]
export const MILESTONES = [
  ["passYds", [3000, 4000, 5000], "passing yards"], ["passTD", [30, 40, 50], "touchdown passes"],
  ["rushYds", [1000, 1500, 2000], "rushing yards"], ["rushTD", [10, 15, 20], "rushing touchdowns"],
  ["recYds", [1000, 1500, 2000], "receiving yards"], ["rec", [100, 125], "catches"], ["recTD", [10, 15], "receiving touchdowns"],
  ["sacks", [10, 15, 20], "sacks"], ["ints", [5, 8, 10], "interceptions"],
];
const pct = (w, l, t = 0) => (w + t * 0.5) / Math.max(1, w + l + t);
const fmt = (n) => n.toLocaleString("en-US");

// games: the week's played games ({ h, a, hs, as, boxH, boxA }); teams: the league (rosters with season
// totals in p.ss, records w/l/t including this week); ui: your club. playoff: a playoff round (the
// records and the season totals are the regular season's, so no milestones, and the records stand as they are).
export function weekRecap(games, teams, ui, { playoff = false } = {}) {
  const played = (games || []).filter((g) => g.hs != null && g.as != null);
  if (!played.length) return null;
  const lines = [];
  for (const g of played) for (const side of ["h", "a"]) {
    const ti = side === "h" ? g.h : g.a;
    for (const [id, s] of Object.entries((side === "h" ? g.boxH : g.boxA) || {})) if (s && s.name) lines.push({ id, ti, g, s, sc: gameScore(s) });
  }
  const pick = (l) => l && { id: l.id, ti: l.ti, name: l.s.name, pos: l.s.pos, line: statLine(l.s), g: l.g };
  const best = (f) => lines.filter(f).sort((a, b) => b.sc - a.sc)[0];

  // your game, and your three best in it
  const mine = played.find((g) => g.h === ui || g.a === ui) || null;
  const stars = mine ? lines.filter((l) => l.g === mine && l.ti === ui && l.sc > 0).sort((a, b) => b.sc - a.sc).slice(0, 3).map(pick) : [];

  // players of the week (a defender's score runs lower, so each side gets its own)
  const potw = { off: pick(best((l) => OFF.has(l.s.pos))), def: pick(best((l) => DEF.has(l.s.pos))) };

  // the upset: the winner's record before this game well below the loser's (records count this week, so take it back out)
  let upset = null;
  for (const g of played) {
    if (g.hs === g.as) continue;
    const w = g.hs > g.as ? g.h : g.a, l = w === g.h ? g.a : g.h, tw = teams[w], tl = teams[l];
    if (!tw || !tl) continue;
    const back = playoff ? 0 : 1; // (a week's records count the game; a playoff game isn't in them)
    const pw = pct((tw.w || 0) - back, tw.l || 0, tw.t || 0), pl = pct(tl.w || 0, (tl.l || 0) - back, tl.t || 0), gap = pl - pw;
    const gamesIn = (tw.w || 0) + (tw.l || 0) - back;
    if (gamesIn >= 3 && gap >= 0.25 && (!upset || gap > upset.gap)) upset = { g, w, l, gap };
  }
  // the game of the week: the closest finish, the higher-scoring one if it's a tie
  const gotw = [...played].filter((g) => g !== upset?.g).sort((a, b) => Math.abs(a.hs - a.as) - Math.abs(b.hs - b.as) || (b.hs + b.as) - (a.hs + a.as))[0] || null;

  // milestones passed this week: his season total is past the mark, and wasn't before this game
  const marks = [];
  if (!playoff) for (const l of lines) {
    const p = teams[l.ti]?.roster?.find((x) => String(x.id) === String(l.id));
    if (!p?.ss) continue;
    for (const [k, list, what] of MILESTONES) {
      const tot = p.ss[k] || 0, now = l.s[k] || 0;
      const m = [...list].reverse().find((x) => tot >= x && tot - now < x);
      if (m) marks.push({ id: l.id, ti: l.ti, k, name: p.name, mark: m, text: tot > m ? `${p.name} went over ${fmt(m)} ${what} (${fmt(tot)})` : `${p.name} reached ${fmt(m)} ${what}`, big: m / list[0] + (/Yds$/.test(k) ? 0.1 : 0) });
    }
  }
  // yours first, then the biggest marks; one line per kind of mark (four backs to 10 touchdowns is one story)
  marks.sort((a, b) => (b.ti === ui) - (a.ti === ui) || b.big - a.big);
  const seen = new Set(), milestones = marks.filter((m) => (m.ti === ui || !seen.has(m.k)) && seen.add(m.k)).slice(0, 3);
  return { mine, stars, potw, upset, gotw, milestones };
}
