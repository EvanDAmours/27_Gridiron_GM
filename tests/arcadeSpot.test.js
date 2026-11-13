// The arcade field decides where a play ends: the engine books the yards the field shows (a runner
// brought down at the 1 is spotted at the 1, not wherever the engine's own roll would have put him).
import test from "node:test";
import assert from "node:assert/strict";
import { newGame, resolvePlay } from "../src/arcade/bridge.js";

const fresh = (i, yard = 40) => { const { g } = newGame(i % 32, (i * 7 + 3) % 32, {}); g.koNext = false; g.poss = "h"; g.yard = yard; g.down = 1; g.toGo = 10; g.qtr = 1; g.clock = 600; return g; };

test("a run and a catch are booked at the field's yards, long or short", () => {
  for (const [call, type, yards] of [["run_inside", "run", 7], ["run_outside", "run", 38], ["pass_medium", "pass", 23], ["pass_deep", "pass", 58]]) {
    let hit = 0;
    for (let i = 0; i < 20 && hit < 3; i++) {
      const g = fresh(i), start = g.yard;
      const r = resolvePlay(g, call, { types: [type], yards, tol: 0 }, { yards, inBounds: true }, 40);
      if (r.ev?.type !== type) continue;
      hit++; assert.equal(r.ev.yards, yards, `${call}: ${r.ev.yards}`); assert.equal(g.yard, start + yards);
    }
    assert.ok(hit >= 1, `${call}: no ${type} came up`);
  }
});

test("a sack is booked at the loss the field shows", () => {
  let hit = 0;
  for (let i = 0; i < 40 && hit < 3; i++) {
    const g = fresh(i), start = g.yard;
    const r = resolvePlay(g, "pass_deep", { types: ["sack"], yards: -3, tol: 0 }, { sackLoss: 3 }, 60);
    if (r.ev?.type !== "sack") continue;
    hit++; assert.equal(r.ev.yards, -3); assert.equal(g.yard, start - 3);
  }
  assert.ok(hit >= 1, "no sack came up");
});
