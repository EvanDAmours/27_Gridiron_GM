import { test } from "node:test";
import assert from "node:assert/strict";
import { recapEntry, gradePicks, classGrades, devCounts } from "../src/draftRecap.js";

const pick = (overall, owner, pot, dev) => ({ rd: Math.ceil(overall / 32), overall, owner, player: { id: overall, name: `P${overall}`, pos: "WR", age: 22, trueOvr: pot - 10, truePot: pot, dev } });

test("every pick gets a verdict from his trait and his ceiling against where he went", () => {
  const log = [pick(1, 0, 70, "normal"), pick(2, 1, 90, "superstar"), pick(3, 0, 85, "star"), pick(100, 1, 88, "normal")];
  for (let i = 4; i < 100; i++) log.push(pick(i, i % 4, 75, "normal"));
  const rows = gradePicks(log.map(recapEntry));
  const v = Object.fromEntries(rows.map((r) => [r.overall, r.verdict]));
  assert.equal(v[2], "jackpot");
  assert.equal(v[3], "hit");
  assert.equal(v[1], "miss"); // the top pick with the class's lowest ceiling
  assert.equal(v[100], "value"); // a ceiling near the top of the class at pick 100
  assert.equal(rows[0].overall, 1);
  const g = classGrades(rows, 4);
  assert.equal(g[1].hits, 1);
  assert.ok(g.every((t) => t.grade && t.rank));
  assert.equal(devCounts(rows).superstar, 1);
});

test("dev traits are revealed even for players drafted without a scouted trait", () => {
  const e = recapEntry({ rd: 1, overall: 5, owner: 2, player: { id: "abc", name: "X", pos: "QB", trueOvr: 70, truePot: 80 } });
  assert.ok(["generational", "superstar", "star", "normal", "late"].includes(e.dev));
});
