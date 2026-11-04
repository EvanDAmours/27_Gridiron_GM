import test from "node:test";
import assert from "node:assert/strict";
import { newGame, lineups, runPlay, simOpponentDrive, resolvePlay, situation } from "../src/arcade/bridge.js";
import { setupPlay, snap, tick, throwTo, separation, ELIGIBLE, topSpeed } from "../src/arcade/play.js";

let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const toYourBall = (g) => { if (g.koNext || g.poss !== "h") simOpponentDrive(g); };

test("the formation has 22 men and every receiver a cover man", () => {
  const { g } = newGame(0, 1, { rand });
  runPlay(g); toYourBall(g);
  const S = setupPlay(g, lineups(g), "pass_medium");
  assert.equal(Object.keys(S.ents).length, 22);
  for (const r of ELIGIBLE) assert.ok(S.cover[r], `${r} has a cover man`);
  assert.ok(Object.values(S.ents).every((e) => Math.abs(e.y) < 26.65 && e.x > 0 && e.x < 110));
  for (const r of ELIGIBLE) assert.ok(S.ents[r].path?.length, `${r} has a route before the snap`);
});

test("the engine can be asked for a play that matches the field", () => {
  const { g } = newGame(5, 6, { rand });
  runPlay(g); toYourBall(g);
  const plays = g.plays, before = situation(g);
  const r = resolvePlay(g, "run_inside", { types: ["run", "td"], yards: 9, tol: 1 });
  assert.equal(g.plays, plays + 1, "one play booked however many rolls it took");
  assert.ok(["run", "td", "penalty"].includes(r.ev.type));
  if (r.ev.type === "run") { assert.ok(Math.abs(r.ev.yards - 9) <= 1 || !r.exact); assert.equal(g.yard, before.yard + r.ev.yards); }
});

// A decent player: snaps, waits for someone to come open, throws to where he'll be; steers a
// runner away from the nearest defender.
function playOne(g, call, { waitFor = 1.4, dt = 1 / 60 } = {}) {
  const S = setupPlay(g, lineups(g), call); snap(S);
  let frames = 0, thrown = false;
  while (tick(S, dt) && frames++ < 1500) {
    if (!thrown && call.startsWith("pass") && S.t > waitFor) {
      let best = null, bs = -1;
      for (const r of ELIGIBLE) { const e = S.ents[r]; if (e.mode === "back" || e.mode === "block") continue; const s = separation(S, r); if (s > bs) { bs = s; best = r; } }
      const e = S.ents[best]; throwTo(S, { x: e.x + e.vx * 0.8, y: e.y + e.vy * 0.8 }); thrown = true;
    }
    const c = S.ball.holder && S.ents[S.ball.holder];
    if (c && c.side === "off" && c.key !== "QB") { let nd = null, nb = 99; for (const e of Object.values(S.ents)) if (e.side === "def") { const d = Math.hypot(e.x - c.x, e.y - c.y); if (d < nb) { nb = d; nd = e; } } S.steer = nd ? (c.y > nd.y ? c.y + 6 : c.y - 6) : c.y; }
  }
  return { S, frames };
}

test("plays finish on their own and the engine books exactly one play each", () => {
  const { g } = newGame(2, 5, { rand });
  runPlay(g); toYourBall(g);
  const seen = {}; let mismatch = 0, n = 0;
  for (let i = 0; i < 80 && !g.done; i++) {
    toYourBall(g); if (g.done) break;
    if (g.down === 4) { runPlay(g, g.yard > 60 ? "fg" : "punt"); continue; }
    const call = ["pass_quick", "pass_medium", "pass_deep", "run_inside", "run_outside"][i % 5];
    const plays = g.plays, { S, frames } = playOne(g, call);
    assert.equal(S.phase, "done", `${call} finished`);
    assert.ok(frames < 1500, "the play ends on its own");
    assert.equal(g.plays, plays + 1, "exactly one engine play per snap");
    const ev = S.result; assert.ok(ev && ev.type, "an engine result");
    seen[ev.type] = (seen[ev.type] || 0) + 1; n++;
    if (S.exact === false) mismatch++;
    for (const e of Object.values(S.ents)) assert.ok(Math.abs(e.y) <= 27 && e.x > -12 && e.x < 112, `${e.key} stayed on the field (${e.x.toFixed(1)}, ${e.y.toFixed(1)})`);
  }
  assert.ok((seen.pass || 0) + (seen.td || 0) > 0, "some completions");
  assert.ok(seen.run, "some runs");
  assert.ok(mismatch / n < 0.35, `engine matched the field most of the time (${mismatch}/${n} off)`);
});

test("the rush gets home when the quarterback holds it", () => {
  const { g } = newGame(10, 12, { rand });
  runPlay(g); toYourBall(g);
  const S = setupPlay(g, lineups(g), "pass_deep"); snap(S);
  let frames = 0; while (tick(S, 1 / 60) && frames++ < 1500);
  assert.equal(S.phase, "done");
  assert.ok(["sacked", "late", "hurried"].includes(S.pick?.why), `the play ended on the rush or a late throw: ${S.pick?.why}`);
});

test("nobody moves faster than his legs allow", () => {
  const { g } = newGame(7, 8, { rand });
  runPlay(g); toYourBall(g);
  const S = setupPlay(g, lineups(g), "pass_medium"); snap(S);
  const dt = 1 / 60; let worst = 0;
  for (let i = 0; i < 400 && tick(S, dt); i++) {
    if (i === 90) { const e = S.ents.X; throwTo(S, { x: e.x + e.vx * 0.8, y: e.y + e.vy * 0.8 }); }
    for (const e of Object.values(S.ents)) { const v = Math.hypot(e.vx, e.vy) / topSpeed(e.p); if (v > worst) worst = v; }
  }
  assert.ok(worst <= 1.16, `top speed respected (a juke bursts a little) (${worst.toFixed(2)}x)`);
});

test("the retro renderer draws a play without throwing", async () => {
  globalThis.Image = class { constructor() { this.complete = false; this.naturalWidth = 0; } };
  const R = await import("../src/arcade/retro.js");
  const calls = {}; const ctx = new Proxy({}, { get: (_, k) => (typeof k === "string" ? () => { calls[k] = (calls[k] || 0) + 1; return k === "measureText" ? { width: 10 } : undefined; } : undefined), set: () => true });
  const { g } = newGame(3, 4, { rand });
  runPlay(g); toYourBall(g);
  const cam = R.makeCamera(390, 700);
  const S = setupPlay(g, lineups(g), "pass_deep");
  const teams = { user: { ab: "NYJ", name: "Jets", clr: "#125740", ac: "#fff" }, opp: { ab: "BAL", name: "Ravens", clr: "#241773", ac: "#9e7c0c" } };
  R.drawRetro(ctx, cam, S, teams, g, { ring: true }); R.drawHud(ctx, cam, { score: { h: 3, a: 7 }, qtr: 2, clock: 61 }, teams); R.drawDownBox(ctx, cam, "1ST & 10"); R.drawBanner(ctx, cam, "FIRST DOWN", "A long line of play by play text that needs wrapping across the banner", "OPEN BY 3 YD", "#fff");
  snap(S); S.aim = { x: S.los + 20, y: 4 };
  for (let i = 0; i < 90; i++) { tick(S, 1 / 60); R.drawRetro(ctx, cam, S, teams, g, { ring: true }); }
  throwTo(S, S.aim); let n = 0; while (tick(S, 1 / 60) && n++ < 900) R.drawRetro(ctx, cam, S, teams, g, {});
  assert.ok(calls.fillRect > 100 && calls.drawImage == null, "drew pixels (no sheets loaded here, so no images)");
  const f = cam.toField(...cam.toScreen(42, -7)); assert.ok(Math.abs(f.x - 42) < 1e-6 && Math.abs(f.y + 7) < 1e-6, "camera round-trips");
});

test("a kick plays out and books one engine play", async () => {
  const { setupKick, kickFlick, tickKick } = await import("../src/arcade/kick.js");
  const { g } = newGame(1, 2, { rand });
  runPlay(g); toYourBall(g);
  g.yard = 70; g.down = 4; g.toGo = 8;
  const plays = g.plays, K = setupKick(g, lineups(g), "fg");
  assert.equal(K.dist, 47);
  const ev = kickFlick(K, 12, 0.3);
  assert.ok(ev && (ev.type === "fg" || ev.type === "fg_miss" || ev.type === "penalty"), `a kick result: ${ev?.type}`);
  let n = 0; while (tickKick(K, 1 / 60) && n++ < 1000);
  assert.equal(K.phase, "done"); assert.equal(g.plays, plays + 1);
  toYourBall(g); g.yard = 30; g.down = 4; g.toGo = 9;
  const P = setupKick(g, lineups(g), "punt"); const pev = kickFlick(P, 10, -1);
  assert.ok(pev && (pev.type === "punt" || pev.type === "penalty"), `a punt: ${pev?.type}`);
  n = 0; while (tickKick(P, 1 / 60) && n++ < 1000); assert.equal(P.phase, "done");
});

test("ratings, form and injuries reach the field", async () => {
  const K = await import("../src/arcade/ratings.js");
  const qb = (v, form = 0) => ({ pos: "QB", ovr: v + form, form, spd: 70, posAttrs: { accuracy: v, touch: v, armStr: v, pocketAwr: v, decisions: v, readDef: v } });
  assert.ok(K.qbAccuracy(qb(95)) > K.qbAccuracy(qb(60)) + 25, "accuracy follows the rating");
  assert.ok(K.qbAccuracy(qb(80, 4)) > K.qbAccuracy(qb(80)) + 3, "a hot streak shows");
  assert.ok(K.qbAccuracy(qb(80, -6)) < K.qbAccuracy(qb(80)) - 5, "playing hurt shows");
  const cb = { pos: "CB", ovr: 80, posAttrs: { manCov: 80 } }, lb = { pos: "LB", ovr: 80, spd: 80, posAttrs: { coverage: 60, zoneAwr: 60 } };
  assert.ok(K.coverMan(cb) > K.coverMan(lb), "a linebacker covers like the engine's lbCover");

  // the same throw, many times: a poor passer misses his spot by more than a good one
  const miss = (v) => {
    let tot = 0;
    for (let i = 0; i < 120; i++) {
      const { g } = newGame(0, 1, { rand }); runPlay(g); toYourBall(g);
      const L = lineups(g); L.off = { ...L.off, QB: { ...L.off.QB, ovr: v, form: 0, posAttrs: { ...L.off.QB.posAttrs, accuracy: v, touch: v } } };
      const S = setupPlay(g, L, "pass_medium"); snap(S); for (let k = 0; k < 90; k++) tick(S, 1 / 60);
      const aim = { x: S.los + 15, y: 5 }; const f = throwTo(S, aim); if (!f) continue;
      tot += Math.hypot(f.to.x - aim.x, f.to.y - aim.y);
    }
    return tot / 120;
  };
  assert.ok(miss(60) > miss(95) * 2, "a 60 misses his spot by far more than a 95");
});

test("the pass you choose is the pass you get", async () => {
  const { passPlan, BULLET_RANGE } = await import("../src/arcade/play.js");
  const { g } = newGame(0, 1, { rand }); runPlay(g); toYourBall(g);
  const S = setupPlay(g, lineups(g), "pass_medium"); snap(S); for (let k = 0; k < 80; k++) tick(S, 1 / 60);
  const qb = S.ents.QB, near = { x: qb.x + 12, y: 4 }, far = { x: qb.x + 35, y: -6 };
  assert.equal(passPlan(S, near, "auto").kind, "bullet", "AUTO is a bullet underneath");
  assert.equal(passPlan(S, far, "auto").kind, "lob", `AUTO is a lob past ${BULLET_RANGE} yards`);
  const b = passPlan(S, far, "bullet"), l = passPlan(S, far, "lob");
  assert.equal(b.kind, "bullet"); assert.equal(l.kind, "lob");
  assert.ok(b.T < l.T && b.arc < l.arc, "a bullet gets there sooner and flatter than a lob");
  const f = throwTo(S, far, null, "lob");
  assert.ok(f && !f.bullet && Math.abs(f.T - l.T) < 1e-9, "the throw flies the planned path");
});
