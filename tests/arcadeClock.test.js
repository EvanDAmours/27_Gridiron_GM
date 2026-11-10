// The arcade's clock management and fumbles, as the engine (playsim.js) books them: your timeouts are
// yours to call (and stop a running clock), a spike is a spike, the hurry-up saves time, and a ball
// that came out on the field is booked a fumble where it was recovered.
import test from "node:test";
import assert from "node:assert/strict";
import { newGame } from "../src/arcade/bridge.js";
import { step, callTimeout } from "../src/playsim.js";

const fresh = (i = 0) => { const { g } = newGame(i % 32, (i * 7 + 3) % 32, {}); g.koNext = false; g.poss = "h"; g.yard = 40; g.down = 1; g.toGo = 10; return g; };

test("a timeout stops a running clock and gives back all but the play", () => {
  let ran = 0;
  for (let i = 0; i < 40; i++) {
    const g = fresh(i); g.qtr = 2; g.clock = 200;
    const ev = step(g, "run_inside");
    if (!g.running || ev.type !== "run") continue;
    ran++;
    const before = g.lastRun.before, to = g.to.h;
    assert.ok(callTimeout(g, "h"));
    assert.equal(g.to.h, to - 1); assert.equal(g.running, false);
    assert.ok(g.clock >= before - 6 && g.clock <= before, `clock ${g.clock} from ${before}`);
  }
  assert.ok(ran > 10, `only ${ran} runs left the clock running`);
  const g = fresh(); g.to.h = 0; assert.equal(callTimeout(g, "h"), false);
});

test("the side you play never has a timeout called for it", () => {
  let auto = 0, mine = 0;
  for (let i = 0; i < 300; i++) {
    const g = fresh(i); g.qtr = 4; g.clock = 100; g.score.h = 10; g.score.a = 14; // behind late: the coach would stop the clock
    if (i % 2) g.userClock = "h";
    const ev = step(g, "run_inside");
    if (ev?.timeout === "h") { if (i % 2) mine++; else auto++; }
  }
  assert.equal(mine, 0); assert.ok(auto > 20, `the engine's coach called only ${auto}`);
});

test("spike and kneel on call; the hurry-up runs less clock", () => {
  const g = fresh(); g.qtr = 2; g.clock = 30; g.down = 2;
  const ev = step(g, "spike"); assert.ok(ev.spike); assert.equal(g.down, 3); assert.equal(g.clock, 29);
  const k = fresh(); k.qtr = 4; k.clock = 100; k.score.h = 21; k.userClock = "a"; // (their timeouts are the user's: none get called on a knee)
  const ke = step(k, "kneel"); assert.ok(ke.kneel); assert.equal(k.clock, 60);
  let slow = 0, fast = 0, n = 0;
  for (let i = 0; i < 120; i++) { const a = fresh(i), b = fresh(i); a.qtr = b.qtr = 1; a.clock = b.clock = 800; b.hurryUp = "h"; const e1 = step(a, "run_inside"), e2 = step(b, "run_inside"); if (e1.type === "run" && e2.type === "run" && a.running && b.running) { slow += 800 - a.clock; fast += 800 - b.clock; n++; } }
  assert.ok(n > 20 && fast / n < slow / n - 15, `hurry-up ${fast / n}s a play vs ${slow / n}s`);
});

test("a fumble on the field is booked where it was recovered", () => {
  let got = 0;
  for (let i = 0; i < 60; i++) {
    const g = fresh(i);
    const ev = step(g, "run_inside", 1, { fumble: true, fumYards: 4, inBounds: true });
    if (ev.type !== "fumble") continue;
    got++;
    assert.ok(ev.turnover); assert.equal(ev.yards, 4); assert.equal(g.poss, "a"); assert.equal(g.yard, 100 - 44);
  }
  assert.ok(got > 30, `only ${got} of 60 forced fumbles booked`);
});
