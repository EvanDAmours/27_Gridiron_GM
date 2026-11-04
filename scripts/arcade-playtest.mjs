// Headless playtest of the arcade mode: a scripted player snaps, waits for a man to come open,
// throws to where he'll be (with some human error), steers runners away from tacklers; the other
// team is the engine. Prints what a session feels like in numbers. Run: node scripts/arcade-playtest.mjs [games]
import { newGame, lineups, runPlay, simOpponentDrive } from "../src/arcade/bridge.js";
import { setupPlay, snap, tick, throwTo, juke, separation, ELIGIBLE } from "../src/arcade/play.js";

const N = +process.argv[2] || 4, DT = 1 / 60;
const SEED0 = +(process.env.SEED0 || 100);
const seedOf = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);
const stat = { plays: 0, pass: { att: 0, comp: 0, yds: 0, td: 0, int: 0, sack: 0, drop: 0, late: 0, hurried: 0, openAtRelease: 0, contested: 0, ttt: [] }, run: { att: 0, yds: 0, td: 0, broke: 0 }, dur: [], tries: [], off: 0, inexact: 0, fumble: 0, pen: 0, oob: 0, types: {}, catchErr: [], longest: 0, retries: 0, maxSpeed: 0, jump: 0, jumpBy: {}, outcomes: {}, comps: {} };
const skill = { react: 0.4, aimErr: 1.2, patience: 1.2 };

function human(S, call, state) {
  // throw once someone is open (or on a clock), to where he'll be when the ball lands
  if (call.startsWith("pass") && S.phase === "live" && S.ball.holder === "QB" && !state.thrown) {
    // a progression, like a real quarterback: the first read who's open once his route has developed,
    // then the next; late in the down, the check-down
    const READS = { pass_quick: ["X", "Z", "SLOT", "TE", "RB"], pass_medium: ["Z", "SLOT", "X", "TE", "RB"], pass_deep: ["X", "Z", "SLOT", "TE", "RB"] }[call];
    let best = null, bs = -1;
    for (const [i, r] of READS.entries()) {
      const e = S.ents[r]; if (!e || e.mode === "block" || e.mode === "back" || Math.hypot(e.vx, e.vy) < 2.5 && e.mode !== "settle") continue;
      if (S.t < 1.0 + i * 0.45) continue; // his turn in the progression
      const broke = e.mode !== "route" || (e.path?.length ?? 0) <= 1, hot = S.pressureAt && S.t - S.pressureAt > 0.3;
      const late = S.t > 1.6 + skill.patience;
      if (!broke && !hot && !late && call !== "pass_quick") continue; // wait for him to make his break
      const sp = separation(S, r); if (sp > 2.6) { best = r; bs = sp; break; }
      if (sp > bs) { bs = sp; best = r; }
    }
    if (state.forced && S.t > 1.4 && !state.greedy) { const r = READS[0], e = S.ents[r]; if (e && e.mode !== "block" && e.mode !== "back") { best = r; bs = 9; } } // he's decided pre-snap: throws it to his first read whatever the coverage
    if (state.greedy) { const deepest = ELIGIBLE.filter((r) => S.ents[r].mode === "route" || S.ents[r].mode === "stride").sort((a, b) => S.ents[b].x - S.ents[a].x)[0]; if (deepest) { best = deepest; bs = separation(S, best); } } // forces one deep now and then
    const open = bs > 2.6, clock = S.t > 1.6 + skill.patience || (S.pressureAt && S.t - S.pressureAt > skill.react);
    if (best && S.t > 1.0 && (open || clock)) {
      const e = S.ents[best], qb = S.ents.QB, arm = qb.p.posAttrs?.armStr ?? 80, vel = 17 + (arm - 70) * 0.12;
      // lead him: where he'll be when the ball gets there (two passes, since the flight time depends on the spot)
      let T = Math.max(0.35, Math.hypot(e.x - qb.x, e.y - qb.y) / vel); T = Math.max(0.35, Math.hypot(e.x + e.vx * T - qb.x, e.y + e.vy * T - qb.y) / vel);
      const err = skill.aimErr * (Math.random() - 0.5);
      throwTo(S, { x: e.x + e.vx * T + err, y: e.y + e.vy * T + skill.aimErr * (Math.random() - 0.5) });
      state.thrown = true; stat.pass.ttt.push(S.t); (stat.byCall ||= {}); const bc = (stat.byCall[call] ||= { n: 0, t: 0, d: 0, open: 0 }); bc.n++; bc.t += S.t; bc.d += e.x - S.los; if (open) bc.open++; if (open) stat.pass.openAtRelease++;
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
  const { g } = newGame((gi * 7) % 32, (gi * 11 + 3) % 32, { rand: seedOf(SEED0 + gi) });
  runPlay(g);
  while (!g.done) {
    if (g.koNext || g.poss !== "h") { simOpponentDrive(g); continue; }
    if (g.down === 4) { runPlay(g, g.toGo <= 2 && g.yard > 40 ? "run_inside" : g.yard >= 60 ? "fg" : "punt"); continue; }
    const call = g.toGo <= 3 && Math.random() < 0.5 ? (Math.random() < 0.5 ? "run_inside" : "run_outside") : ["pass_quick", "pass_medium", "pass_deep", "run_inside", "run_outside", "pass_medium"][Math.floor(Math.random() * 6)];
    const S = setupPlay(g, lineups(g), call); snap(S);
    skill.patience = 0.8 + Math.random() * 2.4; // some snaps he fires early, some he waits on
    const state = { thrown: false, greedy: Math.random() < 0.06, forced: Math.random() < 0.12 }; let frames = 0, maxV = 0;
    const prev = Object.fromEntries(Object.entries(S.ents).map(([k, e]) => [k, [e.x, e.y]]));
    while (tick(S, DT) && frames++ < 1500) {
      human(S, call, state);
      if (S.catchAt != null && S.catchDepth == null) { const h = S.ents[S.ball.holder]; S.catchDepth = Math.round(h.x - S.los); if (S.catchDepth >= 18 && h.side === "off") { let nb = 99, sf = 99; for (const e of Object.values(S.ents)) if (e.side === "def") { const d = Math.hypot(e.x - h.x, e.y - h.y); nb = Math.min(nb, d); if (e.key === "S0" || e.key === "S1") sf = Math.min(sf, d); } (stat.deepCatch ||= []).push([nb, sf, h.x - Math.max(...Object.values(S.ents).filter((e) => e.side === "def").map((e) => e.x))]); } }
      for (const [k, e] of Object.entries(S.ents)) { const [px, py] = prev[k], j = Math.hypot(e.x - px, e.y - py) / DT; if (j > e.top * 1.3 && S.phase !== "tackle" && S.phase !== "fall" && S.phase !== "done") { stat.jump++; const hd = S.ball.holder && S.ents[S.ball.holder]; const kk = `${(j/e.top).toFixed(1)}x:${k}:hold=${S.ball.holder}:dh=${hd ? Math.hypot(hd.x-e.x,hd.y-e.y).toFixed(1) : "-"}:v=${(Math.hypot(e.vx,e.vy)/e.top).toFixed(2)}:${e.mode}:${S.phase}:${call}:held${e.heldUntil > S.t ? 1 : 0}:t${S.t.toFixed(1)}:from${px.toFixed(0)},${py.toFixed(0)}:to${e.x.toFixed(0)},${e.y.toFixed(0)}`; stat.jumpBy[kk] = (stat.jumpBy[kk] || 0) + 1; } prev[k] = [e.x, e.y]; const v = Math.hypot(e.vx, e.vy) / e.top; if (v > maxV) maxV = v; }
    }
    stat.maxSpeed = Math.max(stat.maxSpeed, maxV);
    const ev = S.result; if (!ev) { stat.off++; continue; }
    if ((ev.type === "pass" || ev.type === "td") && S.catchAt != null) { const c = S.ents[S.ball.holder]; const depth = Math.round((S.catchX ?? c.x) - S.los); const k = state.greedy ? "greedy" : "normal"; (stat.comps[k] ||= []).push({ depth: S.catchDepth ?? depth, yds: ev.yards, td: ev.td ? 1 : 0, tgt: call.replace("pass_", "") + ":" + S.ball.holder }); }
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
  (stat.scores ||= []).push(g.score.h);
}
const avg = (a) => (a.length ? (a.reduce((s, x) => s + x, 0) / a.length).toFixed(2) : "-");
const pct = (a, b) => (b ? ((100 * a) / b).toFixed(0) + "%" : "-");
const p = stat.pass, r = stat.run;
console.log(`\n${stat.plays} plays in ${N} games. types:`, stat.types);
console.log(`pass: ${p.att} att, ${pct(p.comp, p.att)} comp, ${(p.yds / Math.max(1, p.att)).toFixed(1)} yds/att, ${p.td} td, ${p.int} int (${pct(p.int, p.att)}), ${p.sack} sacks (${pct(p.sack, p.att)}), late ${p.late}, hurried ${p.hurried}, open at the catch ${pct(p.openN, p.att)} (caught ${pct(p.openC, p.openN)}), contested catches ${p.contested}`);
console.log("what happened on throws:", Object.entries(stat.outcomes).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", "));
{ const all = Object.values(stat.comps).flat(); const air = all.reduce((s, r) => s + r.depth, 0) / Math.max(1, all.length), yac = all.reduce((s, r) => s + r.yds - r.depth, 0) / Math.max(1, all.length), big = all.filter((r) => r.yds >= 20).length;
  const pts = stat.scores || []; console.log(`NFL-style: comp ${pct(p.comp, p.att)} (NFL ~65%), Y/A ${(p.yds / Math.max(1, p.att)).toFixed(1)} (~7.0), air/comp ${air.toFixed(1)} (~6), YAC/comp ${yac.toFixed(1)} (~5.3), 20+ completions ${pct(big, all.length)} (~12%), sack% ${pct(p.sack, p.att + p.sack)} (~6.5%), INT% ${pct(p.int, p.att)} (~2.3%), pass TD% ${pct(p.td, p.att)} (~4.5%), rush Y/C ${(r.yds / Math.max(1, r.att)).toFixed(1)} (~4.3), pts/team ${(pts.reduce((s, x) => s + x, 0) / Math.max(1, pts.length)).toFixed(1)} (~22)`); }
for (const [k, v] of Object.entries(stat.comps)) { const by = {}; for (const r of v) (by[r.tgt] ||= []).push(r); console.log(`${k} completions ${v.length}:`, Object.entries(by).map(([t, a]) => `${t} n${a.length} depth ${(a.reduce((s, r) => s + r.depth, 0) / a.length).toFixed(0)} yac ${(a.reduce((s, r) => s + r.yds - r.depth, 0) / a.length).toFixed(1)} td ${a.reduce((s, r) => s + r.td, 0)}`).join(" | ")); }
console.log(`time to throw ${avg(p.ttt)}s, ball-to-receiver at arrival ${avg(stat.catchErr)} yd`);
console.log(`run: ${r.att} att, ${(r.yds / Math.max(1, r.att)).toFixed(1)} yds/att, ${r.td} td, ${r.broke} broken tackles (${(r.broke / Math.max(1, r.att)).toFixed(2)}/run), jukes that worked ${stat.jukes || 0}`);
if (stat.deepCatch) { const a = stat.deepCatch, m = (i) => (a.map((r) => r[i]).sort((x, y) => x - y)[a.length >> 1]).toFixed(1); console.log(`deep catches n${a.length}: nearest defender ${m(0)} yd, nearest safety ${m(1)} yd, past the deepest defender ${m(2)} yd (median); behind everyone ${Math.round(a.filter((r) => r[2] > 0).length / a.length * 100)}%`); }
if (stat.byCall) console.log("throws by call:", Object.entries(stat.byCall).map(([k, b]) => `${k} n${b.n} t${(b.t / b.n).toFixed(2)} depth${(b.d / b.n).toFixed(1)} open${Math.round(b.open / b.n * 100)}%`).join(" | "));
if (stat.jump) console.log("teleports by man:", Object.entries(stat.jumpBy).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `${k} ${v}`).join(", "));
console.log(`play length ${avg(stat.dur)}s, longest ${stat.longest}, fumbles ${stat.fumble}, flags ${stat.pen}, engine off the field's number: ${pct(stat.inexact, stat.plays)}, engine contradicted the field: ${stat.retries}, no result: ${stat.off}, teleports: ${stat.jump}, max speed ${stat.maxSpeed.toFixed(2)}x`);
