import test from "node:test";
import assert from "node:assert/strict";
import { newGame, lineups, runPlay, simOpponentDrive } from "../src/arcade/bridge.js";
import { setupPlay, snap, tick, throwTo, separation, ELIGIBLE } from "../src/arcade/play.js";

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
});

test("a throw goes to the engine and the field acts out its verdict", () => {
  const { g } = newGame(2, 5, { rand });
  runPlay(g); toYourBall(g);
  const seen = {};
  for (let n = 0; n < 60 && !g.done; n++) {
    toYourBall(g); if (g.done) break;
    if (g.down === 4) { runPlay(g, g.yard > 60 ? "fg" : "punt"); continue; }
    const call = ["pass_quick", "pass_medium", "pass_deep", "run_inside", "run_outside"][n % 5];
    const plays = g.plays, S = setupPlay(g, lineups(g), call);
    snap(S);
    let frames = 0, thrown = false;
    while (tick(S, 1 / 60) && frames++ < 1500) {
      if (!thrown && call.startsWith("pass") && S.t > 1.5) {
        let best = null, bs = -1;
        for (const r of ELIGIBLE) { const s = separation(S, r); if (s > bs) { bs = s; best = r; } }
        const e = S.ents[best]; throwTo(S, { x: e.x + e.vx * 0.8, y: e.y + e.vy * 0.8 }); thrown = true;
      }
    }
    assert.equal(S.phase, "done", `${call} finished (${frames} frames)`);
    assert.ok(frames < 1500, "the play ends on its own");
    assert.equal(g.plays, plays + 1, "exactly one engine play per snap");
    const ev = S.result || S.ev;
    assert.ok(ev && ev.type, "an engine result");
    seen[ev.type] = (seen[ev.type] || 0) + 1;
    if (ev.type === "pass" || ev.type === "td") assert.ok(S.ball.holder && S.ents[S.ball.holder].side === "off", "a completion ends in an offensive player's hands");
    if (ev.type === "int") assert.ok(S.ents[S.ball.holder].side === "def", "a pick ends in a defender's hands");
    if (call.startsWith("pass") && S.pick) assert.ok(S.pick.bonus >= 0.7 && S.pick.bonus <= 1.25);
  }
  assert.ok(seen.pass || seen.td, "some completions");
  assert.ok(seen.run, "some runs");
});

test("the rush gets home when you hold the ball", () => {
  const { g } = newGame(10, 12, { rand });
  runPlay(g); toYourBall(g);
  const S = setupPlay(g, lineups(g), "pass_deep");
  snap(S);
  let frames = 0;
  while (tick(S, 1 / 60) && frames++ < 1500);
  assert.equal(S.phase, "done");
  assert.ok(S.pick?.why === "hurried" || S.pick?.why === "late", `forced throw: ${S.pick?.why}`);
});

test("the retro renderer draws a play without throwing", async () => {
  globalThis.Image = class { constructor() { this.complete = false; this.naturalWidth = 0; } };
  const R = await import("../src/arcade/retro.js");
  const calls = {}; const ctx = new Proxy({}, { get: (_, k) => (typeof k === "string" ? (...a) => { calls[k] = (calls[k] || 0) + 1; return k === "measureText" ? { width: 10 } : undefined; } : undefined), set: () => true });
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
