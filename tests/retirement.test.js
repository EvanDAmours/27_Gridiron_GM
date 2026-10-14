import test from "node:test";
import assert from "node:assert/strict";
import { retireChance, retires, RETIRE_AGE } from "../src/retirement.js";

test("players retire around their position's age, backs first and kickers last", () => {
  assert.equal(retireChance({ pos: "RB", age: 26, ovr: 75 }), 0);
  assert.ok(retireChance({ pos: "RB", age: 30, ovr: 75 }) > retireChance({ pos: "WR", age: 30, ovr: 75 }));
  assert.equal(retireChance({ pos: "QB", age: 32, ovr: 75 }), 0);
  assert.ok(retireChance({ pos: "QB", age: 37, ovr: 75 }) > 0.3);
  assert.equal(retireChance({ pos: "K", age: 34, ovr: 75 }), 0);
  for (const pos of Object.keys(RETIRE_AGE)) {
    const at = (a) => retireChance({ pos, age: a, ovr: 75 });
    assert.ok(at(RETIRE_AGE[pos] + 2) > at(RETIRE_AGE[pos]) && at(RETIRE_AGE[pos]) > at(RETIRE_AGE[pos] - 2), pos);
  }
});

test("stars play on; fringe veterans and unsigned free agents leave sooner", () => {
  const vet = { pos: "WR", age: 32 };
  assert.ok(retireChance({ ...vet, ovr: 90 }) < retireChance({ ...vet, ovr: 75 }));
  assert.ok(retireChance({ ...vet, ovr: 65 }) > retireChance({ ...vet, ovr: 75 }));
  assert.ok(retireChance({ ...vet, ovr: 75 }, { freeAgent: true }) > retireChance({ ...vet, ovr: 75 }));
  // a young free agent: only the fringe give up
  assert.equal(retireChance({ pos: "CB", age: 24, ovr: 70 }, { freeAgent: true }), 0);
  assert.ok(retireChance({ pos: "CB", age: 27, ovr: 58 }, { freeAgent: true }) >= 0.5);
  assert.equal(retireChance({ pos: "CB", age: 27, ovr: 58 }), 0); // under contract he plays on
  assert.equal(retires({ pos: "RB", age: 34, ovr: 60 }, {}, () => 0.5), true);
  assert.equal(retires({ pos: "RB", age: 24, ovr: 60 }, {}, () => 0), false);
});
