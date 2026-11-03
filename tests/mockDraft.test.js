import test from "node:test";
import assert from "node:assert/strict";
import { mockDraft, needBonus } from "../src/mockDraft.js";

test("mock draft: best on the board, nudged by need, each prospect once", () => {
  const cls = Array.from({ length: 80 }, (_, i) => ({ id: `p${i}`, name: `P${i}`, pos: ["QB", "WR", "DL", "CB", "LT", "K"][i % 6], cons: { final: i + 1 } }));
  const strong = { roster: ["QB", "WR", "WR", "WR", "DL", "DL", "DL", "DL", "CB", "CB", "LT"].map((pos) => ({ pos, ovr: 88 })) };
  const needsQB = { roster: strong.roster.map((p) => (p.pos === "QB" ? { pos: "QB", ovr: 65 } : p)) };
  const teams = Array.from({ length: 32 }, (_, i) => (i === 1 ? needsQB : strong));
  const order = Array.from({ length: 40 }, (_, i) => ({ id: i, rd: i < 32 ? 1 : 2, overall: i + 1, owner: i % 32 }));
  const m = mockDraft({ order, cls, teams });
  assert.equal(m.length, 40);
  assert.equal(new Set(m.map((x) => x.player.id)).size, 40, "nobody twice");
  assert.ok(m.every((x) => x.player.pos !== "K" || x.pick.rd > 1), "no kickers in round 1");
  assert.equal(m[1].player.pos, "QB", "a QB-needy club takes a QB");
  assert.ok(needBonus(needsQB, "QB") > needBonus(strong, "QB"));
});

test("mock draft reads clubs like the AI drafts: no QB behind a young starter, no doubling up", () => {
  const pos = ["QB", "WR", "DL", "CB", "LT", "S", "LB", "TE"];
  const cls = Array.from({ length: 60 }, (_, i) => ({ id: `p${i}`, name: `P${i}`, pos: pos[i % 8], truePot: 80, trueOvr: 70, cons: { final: i + 1, fscore: 80 - i * 0.1 } }));
  // a club with a young 85 QB picks first while a QB tops the board
  const roster = [{ pos: "QB", ovr: 85, age: 24 }, ...["WR", "WR", "DL", "DL", "CB", "LT", "S", "LB", "TE"].map((p) => ({ pos: p, ovr: 70, age: 27 }))];
  const teams = Array.from({ length: 32 }, () => ({ roster, gmStyle: "analytics" }));
  const order = [{ id: 0, rd: 1, overall: 1, owner: 0 }, { id: 1, rd: 2, overall: 33, owner: 0 }];
  const m = mockDraft({ order, cls, teams });
  assert.notEqual(m[0].player.pos, "QB", "a club set at QB passes on the top QB in round 1");
  assert.notEqual(needGroupOf(m[1].player), needGroupOf(m[0].player), "its next pick is another position");
});
const needGroupOf = (p) => p.pos;
