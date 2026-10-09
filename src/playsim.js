// The game engine, play by play. Quick sims and watched (live) games both run on it, so they
// follow the same rules: real downs and distance, field position, a 60-minute clock, 4th-down
// decisions, field goals by distance, punts, turnovers, overtime.
//
// Every play is decided by the offense's starters against the defense's (unit ratings from the
// depth chart): a better offense gains more yards, completes more passes and turns it over less;
// a better defense gets more stops, sacks and takeaways. Players get the ball by depth chart,
// snap share AND talent, so a star WR1 or RB1 sees a star's share of the touches.
//
// Tuned to the modern NFL: ~22-23 points a team, ~63 offensive plays, ~215 passing and ~115
// rushing yards, ~64% completions, ~2.4 sacks and ~1.2 giveaways a game.
import { unitRatings } from "./gamesim.js";
import { dlAsPlayed } from "./dline.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const gauss = (rand) => { let u = 0, v = 0; while (!u) u = rand(); while (!v) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const expo = (rand, mean) => -Math.log(1 - rand() * 0.9999) * mean;
const last = (p) => (p?.name || "").split(" ").slice(-1)[0] || "Player";

// Home-field advantage and how much the game-day modifiers (game plan, coaches, morale,
// weather...) count: both in "edge" units, where 1 unit is worth about 2.5 points a game.
export const HOME_EDGE = 0.6;
export const POINTS_PER_EDGE = 2.5;

// Who gets the ball: snap share x how often that spot is targeted per snap x talent. Each
// rating point above 75 adds ~1.5% to a player's share, so an elite WR1 sees ~30% of the
// targets (a good one ~25%) and an elite back ~75% of the carries.
const TALENT = 0.015;
const TGT_RATE = { WR: [0.25, 0.22, 0.19, 0.18, 0.18], TE: [0.21, 0.17, 0.15], RB: [0.13, 0.12, 0.1] };
const TK = { DL: [0.07, 0.07, 0.06, 0.06, 0.03, 0.02], LB: [0.14, 0.12, 0.08, 0.03], CB: [0.07, 0.06, 0.03], S: [0.09, 0.08, 0.02] };

function pickW(rand, list) {
  const sum = list.reduce((s, [, w]) => s + Math.max(0, w), 0);
  if (!sum) return list[0]?.[0];
  let x = rand() * sum;
  for (const [p, w] of list) { x -= Math.max(0, w); if (x <= 0) return p; }
  return list[list.length - 1][0];
}

// One team's side of a game: its starters, who touches the ball, and its modifiers.
// order(pos): healthy players in depth order. snaps: id -> %. mod: game-day modifiers in points.
// lean: extra pass tendency (-0.15..0.15).
// Who gets home on a sack: edge rushers take about half a team's sacks, interior tackles and
// linebackers most of the rest, DBs a few (a 95-rated edge gets ~1.4x an average one's share).
// The spot he's playing says which (LE/RE edge, DT1/DT2 inside); else Madden's position (mpos),
// else body weight (an edge ~250-285 lbs, a tackle ~295+).
function rushRole(p) {
  if (p.pos === "DL") return p.dlKind ? (p.dlKind === "DT" ? 0.6 : 1) : p.mpos ? (p.mpos === "DT" ? 0.6 : 1) : (p.wt || 280) >= 292 ? 0.6 : 1;
  if (p.pos === "LB") return p.mpos === "SAM" ? 0.5 : 0.25;
  return 0.08;
}

export function makeSide({ team, order: depth, snaps, mod = 0, lean = 0 }) {
  // The defensive line plays at its spots: edges at LE/RE, tackles inside, each rated for his spot.
  const dl = dlAsPlayed(depth("DL"));
  const order = (pos) => (pos === "DL" ? dl : depth(pos));
  const u = unitRatings(order);
  const on = (pos) => order(pos).filter((p) => (snaps[p.id] || 0) > 0);
  const share = (p) => (snaps[p.id] || 0) / 100;
  const q = (p, k) => Math.exp(((p.ovr || 70) - 75) * k);
  const receivers = [];
  for (const pos of ["WR", "TE", "RB"]) on(pos).forEach((p, i) => receivers.push([p, (TGT_RATE[pos][i] ?? 0.1) * share(p) * q(p, TALENT)]));
  // Backs by snaps and talent; the next back up always spells the starter now and then, even
  // when the starter plays every snap (nobody carries 25+ times every week).
  const rushers = on("RB").map((p) => [p, share(p) * q(p, TALENT)]);
  const relief = order("RB").find((p) => !rushers.some(([r]) => r === p));
  if (relief && rushers.length < 2) rushers.push([relief, 0.2 * q(relief, TALENT)]);
  const qb = on("QB")[0] || order("QB")[0];
  const defs = [];
  for (const pos of ["DL", "LB", "CB", "S"]) on(pos).forEach((p, i) => defs.push([p, (TK[pos][i] ?? 0.01) * share(p) * q(p, 0.01)]));
  const rushW = defs.map(([p, w]) => [p, rushRole(p) * w * q(p, 0.018)]);
  const covW = defs.map(([p, w]) => [p, (p.pos === "CB" ? 1.4 : p.pos === "S" ? 1.1 : p.pos === "LB" ? 0.35 : 0.05) * w * q(p, 0.035)]);
  const tackleW = defs.map(([p, w]) => [p, w]);
  const k = on("K")[0] || order("K")[0];
  const passLean = clamp(0.6 + (u.pass - u.run) * 0.008 + lean, 0.45, 0.75);
  return { team, order, u, mod, passLean, receivers, rushers, qb, defs, rushW, covW, tackleW, k, kOvr: k?.ovr || 70 };
}

const emptyTeam = () => ({ plays: 0, passAtt: 0, comp: 0, passYds: 0, rushAtt: 0, rushYds: 0, sacks: 0, ints: 0, fumLost: 0, punts: 0, fgA: 0, fgM: 0, tds: 0, drives: 0, penalties: 0 });

export function createGame(home, away, { playoff = false, neutral = false, rand = Math.random } = {}) {
  const first = rand() < 0.5 ? "h" : "a";
  const g = {
    sides: { h: home, a: away }, playoff, neutral, rand,
    poss: first, firstPoss: first, yard: 25, down: 1, toGo: 10, qtr: 1, clock: 900,
    score: { h: 0, a: 0 }, done: false, ot: false, otScored: false, plays: 0,
    box: { h: {}, a: {} }, stats: { h: emptyTeam(), a: emptyTeam() },
  };
  g.stats[first].drives++;
  return g;
}

const other = (s) => (s === "h" ? "a" : "h");
function line(g, side, p) {
  if (!p) return {};
  const b = g.box[side];
  return (b[p.id] ||= { name: p.name, pos: p.pos });
}
const add = (l, k, v) => { if (v) l[k] = (l[k] || 0) + v; };

// League baselines for each unit rating (mean, spread) from the 2026 rosters. Units are
// compared in spreads above or below average, so an elite defense counts as much as an elite
// offense even though defensive units (8 players averaged) vary less than offensive ones.
export const LEAGUE = { pass: [81.4, 4.9], run: [81.7, 4.2], passD: [80.1, 2.4], runD: [79.1, 1.9], rush: [79.4, 2.2], ol: [78.2, 3.4] };
export let SENSITIVITY = 0.75; // edge units per spread of advantage
const z = (v, k) => (v - LEAGUE[k][0]) / LEAGUE[k][1];

// Matchup edges for the team with the ball (passing and running), in edge units.
function edges(g) {
  const o = g.sides[g.poss], d = g.sides[other(g.poss)];
  const extra = o.mod / POINTS_PER_EDGE + (g.poss === "h" && !g.neutral ? HOME_EDGE : 0);
  return { o, d, passE: (z(o.u.pass, "pass") - z(d.u.passD, "passD")) * SENSITIVITY + extra, runE: (z(o.u.run, "run") - z(d.u.runD, "runD")) * SENSITIVITY + extra, rushE: z(d.u.rush, "rush") - z(o.u.ol, "ol") };
}

// Field goal odds from a distance (yards) and the kicker's rating.
export const fgOdds = (dist, k = 75) => clamp(1.03 - 0.0045 * (dist - 18) - 0.0006 * Math.max(0, dist - 35) ** 2 + (k - 75) * 0.004, 0.15, 0.99);

function newPossession(g, yard) {
  g.poss = other(g.poss);
  g.yard = clamp(Math.round(yard), 1, 99);
  g.down = 1; g.toGo = Math.min(10, 100 - g.yard);
  g.stats[g.poss].drives++;
}
function kickoff(g) { // after a score, under the 2025 kickoff rules: touchbacks come out to the 35
  const rand = g.rand;
  newPossession(g, rand() < 0.55 ? 35 : clamp(Math.round(29 + gauss(rand) * 8), 10, 60));
}

// Spend time on the clock and roll the quarter / half / game when it runs out.
function tick(g, secs) {
  g.clock -= secs;
  if (g.clock > 0) return null;
  if (g.ot) { // overtime period over
    if (g.score.h === g.score.a && g.playoff) { g.clock = 900; return "Another overtime period."; }
    g.done = true; return g.score.h === g.score.a ? "Overtime ends in a tie." : "Final.";
  }
  g.qtr++;
  if (g.qtr === 3) { g.clock = 900; g.poss = other(g.firstPoss); g.yard = 25; g.down = 1; g.toGo = 10; g.stats[g.poss].drives++; return "Halftime."; }
  if (g.qtr === 5) {
    if (g.score.h !== g.score.a) { g.done = true; g.qtr = 4; g.clock = 0; return "Final."; }
    g.ot = true; g.clock = g.playoff ? 900 : 600; g.poss = g.rand() < 0.5 ? "h" : "a"; g.yard = 25; g.down = 1; g.toGo = 10; g.stats[g.poss].drives++;
    return "Overtime!";
  }
  g.clock = 900;
  return `End of quarter ${g.qtr - 1}.`;
}

function scored(g, side, pts) {
  g.score[side] += pts;
  if (g.ot) { g.done = true; }
}

// Play style from the situation (or the user's call).
function chooseCall(g, o) {
  const rand = g.rand, lead = g.score[g.poss] - g.score[other(g.poss)];
  const late = g.qtr >= 4 && g.clock < 300, twoMin = (g.qtr === 2 || g.qtr === 4) && g.clock < 120;
  let pass = o.passLean;
  if (g.down === 3) pass = g.toGo >= 7 ? 0.86 : g.toGo <= 2 ? 0.42 : 0.68;
  else if (g.down === 2 && g.toGo >= 8) pass += 0.08;
  else if (g.down === 1) pass -= 0.08;
  if ((late && lead < 0) || twoMin) pass = Math.max(pass, 0.8);
  if (late && lead > 0) pass = Math.min(pass, 0.3);
  return rand() < pass ? "pass" : "run";
}

// Run one play. call (optional, from the user): run_inside, run_outside, run_screen, scramble,
// pass_quick, pass_medium, pass_deep, pass_rpo, punt, fg. bonus: timing-minigame multiplier on
// yards gained. Returns what happened, for the play-by-play.
export function step(g, call, bonus = 1) {
  if (g.done) return null;
  const rand = g.rand;
  const { o, d, passE, runE, rushE } = edges(g);
  const off = g.poss, def = other(off);
  const st = g.stats[off];
  const lead = g.score[off] - g.score[def];
  const hurry = ((g.qtr === 2 || g.qtr === 4) && g.clock < 120) || (g.qtr === 4 && g.clock < 300 && lead < 0);
  const fgDist = 100 - g.yard + 17;
  const before = { yard: g.yard, down: g.down, toGo: g.toGo, qtr: g.qtr, clock: g.clock, poss: off };
  const ev = { ...before, yards: 0, type: "", text: "", td: false, turnover: false, score: 0 };
  g.plays++;

  // Fourth down (or the end of a half in range): kick, punt or go for it.
  const endOfHalf = (g.qtr === 2 || g.qtr === 4 || g.ot) && g.clock <= 25 && fgDist <= 55 && !(g.qtr >= 4 && lead < -3);
  let decision = call === "punt" || call === "fg" ? call : null;
  if (!decision && (g.down === 4 || endOfHalf || (g.ot && g.down >= 3 && fgDist <= 52))) {
    if (endOfHalf && fgDist <= 55) decision = "fg";
    else if (g.ot && g.down >= 3 && fgDist <= 52 && !call) decision = "fg"; // overtime: take the points
    else if (g.down === 4) {
      const needTD = g.qtr === 4 && g.clock < 240 && lead < -3;
      // Modern 4th-down aggression: short yardage near midfield or in scoring range is often a go.
      const goShort = g.toGo <= 2 && g.yard >= 40 ? (g.toGo === 1 ? 0.7 : 0.45) : g.toGo <= 4 && g.yard >= 55 && g.yard < 70 ? 0.3 : 0;
      if (call) decision = null; // the user chose to go for it
      else if (needTD || (g.qtr === 4 && g.clock < 240 && lead < 0 && fgDist > 52)) decision = null;
      else if (rand() < goShort * (fgDist <= 40 ? 0.6 : 1)) decision = null;
      else if (fgDist <= 54) decision = "fg";
      else decision = "punt";
    }
  }
  if (decision === "fg") {
    const made = rand() < fgOdds(fgDist, o.kOvr);
    const kl = line(g, off, o.k);
    add(kl, "fgA", 1); st.fgA++;
    ev.type = made ? "fg" : "fg_miss"; ev.player = o.k;
    if (made) { add(kl, "fgM", 1); add(kl, "pts", 3); kl.lng = Math.max(kl.lng || 0, fgDist); st.fgM++; ev.score = 3; scored(g, off, 3); ev.text = `${o.k?.name || "Kicker"}'s ${fgDist}-yard field goal is GOOD.`; }
    else ev.text = `${o.k?.name || "Kicker"}'s ${fgDist}-yard try is NO GOOD.`;
    ev.note = tick(g, 6);
    if (!g.done) { if (made) kickoff(g); else newPossession(g, Math.max(20, 100 - (g.yard - 7))); }
    return ev;
  }
  if (decision === "punt") {
    const net = Math.round(clamp(41 + gauss(rand) * 8, 20, 65));
    const spot = g.yard + net;
    st.punts++;
    ev.type = "punt"; ev.turnover = false;
    ev.text = spot >= 100 ? "Punt into the end zone — touchback." : `Punt, ${net} yards net.`;
    ev.note = tick(g, 8);
    if (!g.done) newPossession(g, spot >= 100 ? 20 : 100 - spot);
    return ev;
  }

  // Penalties (~4% of snaps).
  if (rand() < 0.04) {
    st.penalties++;
    const offense = rand() < 0.55;
    const yds = offense ? (rand() < 0.6 ? -10 : -5) : rand() < 0.35 ? 15 : 5;
    ev.type = "penalty"; ev.yards = yds;
    ev.text = offense ? (yds === -10 ? "🚩 Holding, offense. 10-yard penalty." : "🚩 False start. 5-yard penalty.") : yds === 15 ? "🚩 Pass interference, defense. Automatic first down." : "🚩 Offside, defense. 5-yard penalty.";
    g.yard = clamp(g.yard + yds, 1, 99);
    if (yds === 15 || (!offense && yds >= g.toGo)) { g.down = 1; g.toGo = Math.min(10, 100 - g.yard); }
    else g.toGo = Math.max(1, g.toGo - yds);
    ev.note = tick(g, 5);
    return ev;
  }

  // Run or pass?
  let style = call && call.startsWith("pass_") ? "pass" : call && (call.startsWith("run_") || call === "scramble") ? "run" : null;
  if (call === "pass_rpo") style = rand() < 0.55 ? "pass" : "run";
  if (call === "run_screen") style = "screen";
  if (!style) style = chooseCall(g, o);
  const qb = o.qb;
  let yards = 0, desc = "", type = "", carrier = null, completed = false, clockStops = false;

  if (style === "pass" || style === "screen") {
    const deep = call === "pass_deep", quick = call === "pass_quick" || call === "pass_rpo", screen = style === "screen";
    const sackP = clamp(0.064 + rushE * 0.008 - passE * 0.004 + (deep ? 0.025 : quick || screen ? -0.035 : 0), 0.02, 0.14);
    const qbl = line(g, off, qb);
    if (!screen && rand() < sackP) {
      const loss = Math.round(5 + rand() * 5);
      // Multi-sack games happen, but a rusher who already has two gets chipped and doubled.
      const rusher = pickW(rand, d.rushW.map(([p, w]) => { const n = g.box[def][p.id]?.sacks || 0; return [p, n < 2 ? w : w * 0.45 ** (n - 1)]; }));
      add(qbl, "sk", 1); add(qbl, "skYds", loss); st.sacks++;
      if (rusher) { const rl = line(g, def, rusher); add(rl, "sacks", 1); add(rl, "qbH", 1); add(rl, "tkl", 1); }
      yards = -loss; type = "sack"; desc = `${qb?.name || "QB"} is SACKED${rusher ? ` by ${rusher.name}` : ""} for a loss of ${loss}.`;
      if (rand() < 0.07) { // strip sack
        if (rusher) add(line(g, def, rusher), "ff", 1);
        if (rand() < 0.55) { add(qbl, "fum", 1); st.fumLost++; type = "fumble"; ev.turnover = true; desc += " FUMBLE — recovered by the defense!"; }
      }
    } else if (!screen && !call && rand() < (qb?.spd >= 78 ? 0.05 : 0.02)) { // scramble
      yards = Math.round(clamp(3 + expo(rand, 4.5) + passE * 0.3, -2, 40));
      add(qbl, "rushAtt", 1); st.rushAtt++;
      carrier = qb; type = "run"; desc = `${qb?.name || "QB"} scrambles for ${yards}.`;
    } else {
      // Once a receiver has had a big day the ball spreads around (no 15-catch games every week).
      const busy = ([p, w]) => { const n = g.box[off][p.id]?.tgt || 0; return [p, n <= 8 ? w : w * Math.exp(-(n - 8) / 4)]; };
      const target = screen ? (o.rushers[0]?.[0] || pickW(rand, o.receivers.map(busy))) : pickW(rand, o.receivers.map(busy));
      const tl = line(g, off, target);
      add(qbl, "att", 1); add(tl, "tgt", 1); st.passAtt++;
      const intP = clamp(0.024 - passE * 0.004 + (deep ? 0.012 : quick ? -0.006 : 0) + (screen ? -0.015 : 0), 0.006, 0.06);
      if (rand() < intP) {
        const db = pickW(rand, d.covW);
        add(qbl, "passInt", 1); st.ints++;
        if (db) { add(line(g, def, db), "ints", 1); add(line(g, def, db), "pd", 1); }
        type = "int"; desc = `${qb?.name || "QB"}'s pass is INTERCEPTED${db ? ` by ${db.name}` : ""}!`;
        const ret = Math.round(clamp(expo(rand, 9), 0, 60));
        ev.turnover = true; ev.player = db; ev.defPlay = true;
        ev.type = type; ev.text = desc;
        ev.note = tick(g, 6);
        if (!g.done) newPossession(g, 100 - g.yard - Math.round(8 + rand() * 12) + ret);
        return ev;
      }
      const compP = clamp(0.645 + passE * 0.018 + ((target?.ovr || 75) - 75) * 0.0025 + (deep ? -0.22 : quick ? 0.08 : 0) + (screen ? 0.18 : 0), 0.3, 0.9);
      if (rand() < compP) {
        const mean = screen ? 5.5 : deep ? 24 : quick ? 6.5 : 10.3;
        yards = Math.round((2 + expo(rand, mean - 2 + passE * 0.45 + ((target?.ovr || 75) - 75) * 0.05)) * (bonus || 1));
        if (screen && rand() < 0.15) yards = -Math.round(rand() * 3);
        completed = true; carrier = target; type = "pass";
        add(qbl, "comp", 1); add(tl, "rec", 1); st.comp++;
        desc = `${qb?.name || "QB"} finds ${target?.name || "his receiver"} for ${yards}.`;
      } else {
        type = "inc"; clockStops = true;
        if (rand() < 0.3) { const db = pickW(rand, d.covW); if (db) add(line(g, def, db), "pd", 1); desc = `${qb?.name || "QB"}'s pass for ${last(target)} is broken up${db ? ` by ${db.name}` : ""}.`; }
        else desc = `${qb?.name || "QB"}'s pass ${deep ? "deep " : ""}for ${last(target)} falls incomplete.`;
      }
    }
  } else {
    // Designed run: the back (by depth, snaps and talent), now and then a QB keeper.
    const keeper = call === "scramble" || (!call && (qb?.spd || 60) >= 80 && rand() < 0.1);
    // A back's share tapers off as his carries pile up in a game (fatigue): a workhorse gets ~20-24,
    // and the season record (416) stays out of reach.
    const tired = ([p, w]) => { const n = g.box[off][p.id]?.rushAtt || 0; return [p, n <= 12 ? w : w * Math.exp(-(n - 12) / 4)]; };
    carrier = keeper ? qb : pickW(rand, o.rushers.map(tired)) || qb;
    const outside = call === "run_outside";
    const mean = 3.65 + runE * 0.3 + ((carrier?.ovr || 75) - 75) * 0.02 + (keeper ? 0.6 : 0);
    const breakaway = rand() < clamp(0.04 + ((carrier?.spd || 80) - 82) * 0.003 + runE * 0.005 + (outside ? 0.025 : 0), 0.015, 0.12);
    yards = breakaway ? Math.round(mean + 5 + expo(rand, 11)) : Math.round(clamp(mean - 0.6 + gauss(rand) * (outside ? 3.6 : 2.8), -4, 14));
    if (yards > 0) yards = Math.round(yards * (bonus || 1));
    const cl = line(g, off, carrier);
    add(cl, "rushAtt", 1); st.rushAtt++;
    type = "run";
    desc = `${carrier?.name || "Runner"} ${keeper ? "keeps it" : outside ? "bounces outside" : ["up the middle", "off left tackle", "off right tackle"][Math.floor(rand() * 3)]} for ${yards}.`;
    if (yards < 0) { const t = pickW(rand, d.tackleW); if (t) add(line(g, def, t), "tfl", 1); }
  }

  // Ball carrier: yardage, touchdowns, fumbles, tackles.
  if (type === "run" || type === "pass") {
    const room = 100 - g.yard;
    if (yards >= room) yards = room;
    const cl = line(g, off, carrier);
    if (type === "run") { add(cl, "rushYds", yards); st.rushYds += yards; }
    else { add(cl, "recYds", yards); add(line(g, off, qb), "passYds", yards); st.passYds += yards; }
    if (yards >= room) {
      ev.td = true; st.tds++;
      if (type === "run") add(cl, "rushTD", 1); else { add(cl, "recTD", 1); add(line(g, off, qb), "passTD", 1); }
      desc = type === "run" ? `${carrier?.name || "Runner"} runs it in from ${room} — TOUCHDOWN!` : `${qb?.name || "QB"} hits ${carrier?.name || "his receiver"} for a ${room}-yard TOUCHDOWN!`;
    } else if (rand() < (type === "run" ? 0.0055 : 0.004) - Math.max(-0.002, Math.min(0.002, (type === "run" ? runE : passE) * 0.0006))) {
      add(cl, "fum", 1); st.fumLost++;
      const t = pickW(rand, d.tackleW); if (t) add(line(g, def, t), "ff", 1);
      ev.turnover = true; type = "fumble"; desc += ` FUMBLE — the defense recovers!`;
    } else {
      const t = pickW(rand, d.tackleW);
      if (t) { add(line(g, def, t), "tkl", 1); if (rand() < 0.3) { const t2 = pickW(rand, d.tackleW); if (t2 && t2 !== t) add(line(g, def, t2), "ast", 1); } }
      if (rand() < 0.14) clockStops = true; // out of bounds
    }
  }

  ev.type = ev.td ? "td" : type; ev.yards = yards; ev.player = carrier; ev.passer = completed ? qb : null; ev.text = desc;

  if (ev.td) {
    // Extra point (or the occasional two-point try).
    const kl = line(g, off, o.k);
    let pts = 6;
    if (rand() < 0.05 || (g.qtr === 4 && g.clock < 300 && [-2, -10, 5, 1].includes(g.score[off] + 6 - g.score[def]))) {
      if (rand() < 0.48) { pts += 2; ev.text += " Two-point try is good."; } else ev.text += " Two-point try fails.";
    } else {
      add(kl, "xpA", 1);
      if (rand() < 0.955) { add(kl, "xpM", 1); add(kl, "pts", 1); pts += 1; } else ev.text += " Extra point is no good.";
    }
    ev.score = pts; scored(g, off, pts);
    ev.note = tick(g, 6);
    if (!g.done) kickoff(g);
    return ev;
  }
  if (type === "fumble") {
    ev.note = tick(g, 6);
    if (!g.done) newPossession(g, 100 - clamp(g.yard + yards, 1, 99));
    return ev;
  }

  // Spot the ball, update downs.
  g.yard += yards;
  if (g.yard <= 0) { // safety
    ev.type = "safety"; ev.text += " SAFETY!"; ev.score = 0; scored(g, def, 2);
    ev.note = tick(g, 6);
    if (!g.done) newPossession(g, 35); // free kick to the team that scored
    return ev;
  }
  if (yards >= g.toGo) { g.down = 1; g.toGo = Math.min(10, 100 - g.yard); ev.firstDown = true; }
  else { g.down++; g.toGo -= yards; }
  if (g.down > 4) { // turnover on downs
    ev.text += " Turnover on downs.";
    ev.downs = true;
    ev.note = tick(g, hurry ? 4 : 6);
    if (!g.done) newPossession(g, 100 - g.yard);
    return ev;
  }
  ev.note = tick(g, clockStops ? (hurry ? 5 : 7) : hurry ? 18 : late(g) && lead > 0 ? 44 : 38 + Math.round(rand() * 8));
  return ev;
}
const late = (g) => g.qtr === 4 && g.clock < 300;

// Play a whole game instantly.
export function playGame(g) {
  let guard = 0;
  while (!g.done && guard++ < 400) step(g);
  if (!g.done) g.done = true;
  return g;
}

// Season stats lines keyed by player id for each side, with QB ratings left to the caller.
export const boxOf = (g) => g.box;
