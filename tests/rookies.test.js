import { test } from "node:test";
import assert from "node:assert/strict";
import { genDC } from "../src/league.js";
import { aiDraftScore } from "../src/scouting.js";

// Draft a few classes the way AI teams do and look at the rookies by round.
const styles = ["rebuilder", "win-now", "analytics"];
const ovr = {}, pot = {};
for (let y = 0; y < 6; y++) {
  const pool = [...genDC(2060 + y)];
  for (let i = 0; i < 224; i++) {
    pool.sort((a, b) => aiDraftScore(b, styles[i % 3]) - aiDraftScore(a, styles[i % 3]));
    const p = pool.shift(), r = Math.ceil((i + 1) / 32);
    (ovr[r] ||= []).push(p.trueOvr); (pot[r] ||= []).push(p.truePot);
  }
}
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;

test("early-round rookies are close to league ready, like real rookies", () => {
  assert.ok(mean(ovr[1]) >= 73 && mean(ovr[1]) <= 81, `R1 ${mean(ovr[1])}`);
  assert.ok(mean(ovr[2]) >= 67 && mean(ovr[2]) <= 74, `R2 ${mean(ovr[2])}`);
  assert.ok(mean(ovr[3]) >= 65 && mean(ovr[3]) <= 72, `R3 ${mean(ovr[3])}`);
  assert.ok(mean(ovr[7]) < mean(ovr[3]) - 4, "late-rounders are depth");
});

test("ceilings stay where they were: still room to grow", () => {
  for (let r = 1; r <= 7; r++) assert.ok(mean(pot[r]) - mean(ovr[r]) >= 3, `R${r} gap ${mean(pot[r]) - mean(ovr[r])}`);
  assert.ok(mean(pot[1]) >= 84 && mean(pot[1]) <= 92, `R1 pot ${mean(pot[1])}`);
});
