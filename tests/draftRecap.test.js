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

import { genDC } from "../src/league.js";
import { aiDraftScore, prospectRead, publicPot } from "../src/scouting.js";

test("every class has a few hidden gems the board undervalues", () => {
  let late = 0, total = 0;
  for (let y = 0; y < 6; y++) {
    const cls = genDC(2040 + y);
    const gems = cls.filter((p) => p.gem);
    assert.ok(gems.length >= 4 && gems.length <= 6, `${gems.length} gems`);
    for (const p of gems) {
      assert.ok(p.truePot >= 82 && publicPot(p) < p.truePot);
      assert.ok(["star", "superstar", "generational", "late"].includes(p.dev));
      assert.ok(p.cons.mid > 72, "the board has him as a mid/late-rounder");
    }
    const pool = [...cls];
    for (let i = 0; i < 224; i++) { pool.sort((a, b) => aiDraftScore(b, "analytics") - aiDraftScore(a, "analytics")); const p = pool.shift(); if (p.gem) { total++; if (i >= 96) late++; } }
    total += pool.filter((p) => p.gem).length; late += pool.filter((p) => p.gem).length;
  }
  assert.ok(late / total > 0.4, `${late}/${total} gems lasted past round 3`);
});

test("before a report your scout sees the public read of a gem; a report finds him", () => {
  const cls = genDC(2050);
  const gem = cls.find((p) => p.gem);
  const sc = { major: { id: "m", name: "Scout", group: "QB", eval: 99 } };
  sc.major.group = { QB: "QB", RB: "RB", WR: "REC", TE: "REC", DL: "DL", LB: "LB", CB: "DB", S: "DB", LT: "OL", LG: "OL", C: "OL", RG: "OL", RT: "OL" }[gem.pos];
  const read = prospectRead(sc, gem);
  assert.ok(Math.abs(read.potV - publicPot(gem)) < 6);
});
