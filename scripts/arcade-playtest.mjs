// Headless playtest of the arcade mode: a scripted player snaps, waits for a man to come open,
// throws to where he'll be (with some human error), steers runners away from tacklers; the other
// team is the engine. Prints what a session feels like in numbers. Run: node scripts/arcade-playtest.mjs [games]
import { newGame, lineups, runPlay, simOpponentDrive } from "../src/arcade/bridge.js";
import { setupPlay, snap, tick, throwTo, juke, separation, ELIGIBLE } from "../src/arcade/play.js";

const N = +process.argv[2] || 4, DT = 1 / 60;
const seedOf = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);
const stat = { plays: 0, pass: { att: 0, comp: 0, yds: 0, td: 0, int: 0, sack: 0, drop: 0, late: 0, hurried: 0, openAtRelease: 0, contested: 0, ttt: [] }, run: { att: 0, yds: 0, td: 0, broke: 0 }, dur: [], tries: [], off: 0, inexact: 0, fumble: 0, pen: 0, oob: 0, types: {}, catchErr: [], longest: 0, retries: 0, maxSpeed: 0, jump: 0, jumpBy: {}, outcomes: {}, comps: {} };
const skill = { react: 0.25, aimErr: 1.2, patience: 1.2 };

function human(S, call, state) {
  // throw once someone is open (or on a clock), to where he'll be when the ball lands
  if (call.startsWith("pass") && S.phase === "live" && S.ball.holder === "QB" && !state.thrown) {
    let best = null, bs = -1;
    for (const r of ELIGIBLE) { const e = S.ents[r]; if (e.mode === "back" || e.mode === "block" || (e.delay && S.t < e.delay + 0.3)) continue; const s = separation(S, r) - (e.x < S.los ? 2 : 0); if (s > bs) { bs = s; best = r; } }
    if (state.greedy) { const deepest = ELIGIBLE.filter((r) => S.ents[r].mode === "route" || S.ents[r].mode === "stride").sort((a, b) => S.ents[b].x - S.ents[a].x)[0]; if (deepest) { best = deepest; bs = separation(S, best); } } // forces one deep now and then
    const open = bs > 3.2, clock = S.t > skill.patience + 1.8 || (S.pressureAt && S.t - S.pressureAt > skill.react);
    if (best && S.t > skill.patience && (open || clock)) {
      const e = S.ents[best], qb = S.ents.QB, arm = qb.p.posAttrs?.armStr ?? 80, vel = 17 + (arm - 70) * 0.12;
      // lead him: where he'll be when the ball gets there (two passes, since the flight time depends on the spot)
      let T = Math.max(0.35, Math.hypot(e.x - qb.x, e.y - qb.y) / vel); T = Math.max(0.35, Math.hypot(e.x + e.vx * T - qb.x, e.y + e.vy * T - qb.y) / vel);
      const err = skill.aimErr * (Math.random() - 0.5);
      throwTo(S, { x: e.x + e.vx * T + err, y: e.y + e.vy * T + skill.aimErr * (Math.random() - 0.5) });
      state.thrown = true; stat.pass.ttt.push(S.t); if (open) stat.pass.openAtRelease++;
    }
  }
  const c = S.ball.holder && S.ents[S.ball.holder];
  if (c && c.side === "off" && c.key !== "QB") {
    let nd = null, nb = 99; for (const e of Object.values(S.ents)) if (e.side === "def" && e.down <= 0 && (e.x > c.x - 1 || Math.hypot(e.x - c.x, e.y - c.y) < 2.5)) { const d = Math.hypot(e.x - c.x, e.y - c.y); if (d < nb) { nb = d; nd = e; } }
    // a runner follows his lane until someone's in it, then cuts away from him
    const lane = !call.startsWith("pass") && c.x < S.los + 2 ? S.lane : c.y;
    S.steer = nd && nb < 4.5 ? Math.max(-25, Math.min(25, c.y > nd.y ? c.y + 5 : c.y - 5)) : lane;
    if (nd && nb < 2.4 && Math.random() < 0.5 && juke(S)) stat.jukes = (stat.jukes || 0) + 1;
  }
}

for (let gi = 0; gi < N; gi++) {
  const { g } = newGame((gi * 7) % 32, (gi * 11 + 3) % 32, { rand: seedOf(100 + gi) });
  runPlay(g);
  while (!g.done) {
    if (g.koNext || g.poss !== "h") { simOpponentDrive(g); continue; }
    if (g.down === 4) { runPlay(g, g.toGo <= 2 && g.yard > 40 ? "run_inside" : g.yard >= 60 ? "fg" : "punt"); continue; }
    const call = g.toGo <= 3 && Math.random() < 0.5 ? (Math.random() < 0.5 ? "run_inside" : "run_outside") : ["pass_quick", "pass_medium", "pass_deep", "run_inside", "run_outside", "pass_medium"][Math.floor(Math.random() * 6)];
    const S = setupPlay(g, lineups(g), call); snap(S);
    skill.patience = 0.6 + Math.random() * 1.8; // some snaps he fires early, some he waits on
    const state = { thrown: false, greedy: Math.random() < 0.15 }; let frames = 0, maxV = 0;
    const prev = Object.fromEntries(Object.entries(S.ents).map(([k, e]) => [k, [e.x, e.y]]));
    while (tick(S, DT) && frames++ < 1500) {
      human(S, call, state);
      if (S.catchAt != null && S.catchDepth == null) S.catchDepth = Math.round(S.ents[S.ball.holder].x - S.los);
      for (const [k, e] of Object.entries(S.ents)) { const [px, py] = prev[k], j = Math.hypot(e.x - px, e.y - py) / DT; if (j > e.top * 1.3 && S.phase !== "tackle" && S.phase !== "fall" && S.phase !== "done") { stat.jump++; const kk = `${k}:${e.mode}:${S.phase}:${call}:held${e.heldUntil > S.t ? 1 : 0}:t${S.t.toFixed(1)}:from${px.toFixed(0)},${py.toFixed(0)}:to${e.x.toFixed(0)},${e.y.toFixed(0)}`; stat.jumpBy[kk] = (stat.jumpBy[kk] || 0) + 1; } prev[k] = [e.x, e.y]; const v = Math.hypot(e.vx, e.vy) / e.top; if (v > maxV) maxV = v; }
    }
    stat.maxSpeed = Math.max(stat.maxSpeed, maxV);
    const ev = S.result; if (!ev) { stat.off++; continue; }
    if ((ev.type === "pass" || ev.type === "td") && S.catchAt != null) { const c = S.ents[S.ball.holder]; const depth = Math.round((S.catchX ?? c.x) - S.los); const k = state.greedy ? "greedy" : "normal"; (stat.comps[k] ||= []).push({ depth: S.catchDepth ?? depth, yds: ev.yards, td: ev.td ? 1 : 0, tgt: S.ball.holder }); }
    stat.plays++; stat.dur.push(S.t); if (call.startsWith("pass")) { const k = S.log.join("/") || S.pick?.why || "?"; stat.outcomes[k] = (stat.outcomes[k] || 0) + 1; } stat.types[ev.type] = (stat.types[ev.type] || 0) + 1;
    if (S.exact === false) stat.inexact++; if (S.mismatch) stat.retries++;
    if (ev.type === "penalty") { stat.pen++; continue; }
    if (call.startsWith("pass")) {
      stat.pass.att++;
      if (ev.type === "pass" || (ev.type === "td" && ev.passer)) { stat.pass.comp++; stat.pass.yds += ev.yards; if (ev.td) stat.pass.td++; stat.longest = Math.max(stat.longest, ev.yards); }
      if (ev.type === "int") stat.pass.int++; if (ev.type === "sack") stat.pass.sack++; if (ev.type === "fumble") stat.fumble++;
      if (S.pick?.why === "late") stat.pass.late++; if (S.pick?.why === "hurried") stat.pass.hurried++;
      if (S.pick?.err != null) stat.catchErr.push(S.pick.err);
      if (S.pick?.open === false && (ev.type === "pass" || ev.type === "td")) stat.pass.contested++;
      if (S.pick?.open === true) { stat.pass.openN = (stat.pass.openN || 0) + 1; if (ev.type === "pass" || ev.type === "td") stat.pass.openC = (stat.pass.openC || 0) + 1; }
    } else { stat.run.att++; stat.run.yds += ev.yards; if (ev.td) stat.run.td++; stat.run.broke += S.broke; stat.longest = Math.max(stat.longest, ev.yards); if (ev.type === "fumble") stat.fumble++; }
  }
  console.log(`game ${gi + 1}: ${g.score.h}-${g.score.a}`);
}
const avg = (a) => (a.length ? (a.reduce((s, x) => s + x, 0) / a.length).toFixed(2) : "-");
const pct = (a, b) => (b ? ((100 * a) / b).toFixed(0) + "%" : "-");
const p = stat.pass, r = stat.run;
console.log(`\n${stat.plays} plays in ${N} games. types:`, stat.types);
console.log(`pass: ${p.att} att, ${pct(p.comp, p.att)} comp, ${(p.yds / Math.max(1, p.att)).toFixed(1)} yds/att, ${p.td} td, ${p.int} int (${pct(p.int, p.att)}), ${p.sack} sacks (${pct(p.sack, p.att)}), late ${p.late}, hurried ${p.hurried}, open at the catch ${pct(p.openN, p.att)} (caught ${pct(p.openC, p.openN)}), contested catches ${p.contested}`);
console.log("what happened on throws:", Object.entries(stat.outcomes).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", "));
for (const [k, v] of Object.entries(stat.comps)) { const by = {}; for (const r of v) (by[r.tgt] ||= []).push(r); console.log(`${k} completions ${v.length}:`, Object.entries(by).map(([t, a]) => `${t} n${a.length} depth ${(a.reduce((s, r) => s + r.depth, 0) / a.length).toFixed(0)} yac ${(a.reduce((s, r) => s + r.yds - r.depth, 0) / a.length).toFixed(1)} td ${a.reduce((s, r) => s + r.td, 0)}`).join(" | ")); }
console.log(`time to throw ${avg(p.ttt)}s, ball-to-receiver at arrival ${avg(stat.catchErr)} yd`);
console.log(`run: ${r.att} att, ${(r.yds / Math.max(1, r.att)).toFixed(1)} yds/att, ${r.td} td, ${r.broke} broken tackles (${(r.broke / Math.max(1, r.att)).toFixed(2)}/run), jukes that worked ${stat.jukes || 0}`);
if (stat.jump) console.log("teleports by man:", Object.entries(stat.jumpBy).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k} ${v}`).join(", "));
console.log(`play length ${avg(stat.dur)}s, longest ${stat.longest}, fumbles ${stat.fumble}, flags ${stat.pen}, engine off the field's number: ${pct(stat.inexact, stat.plays)}, engine contradicted the field: ${stat.retries}, no result: ${stat.off}, teleports: ${stat.jump}, max speed ${stat.maxSpeed.toFixed(2)}x`);
