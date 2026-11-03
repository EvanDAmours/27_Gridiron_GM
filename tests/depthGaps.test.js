// The depth chart's missing-backup warning (depth.js depthGaps).
import test from "node:test";
import assert from "node:assert/strict";
import { depthGaps } from "../src/depth.js";

const full = () => Object.entries({ QB: 2, RB: 2, WR: 5, TE: 2, LT: 2, LG: 1, C: 1, RG: 1, RT: 2, DL: 6, LB: 4, CB: 5, S: 3, K: 1, P: 1 })
  .flatMap(([pos, n]) => Array.from({ length: n }, (_, i) => ({ id: `${pos}${i}`, pos, ovr: 70 })));

test("a full roster has no gaps; one kicker and one center are normal", () => {
  assert.deepEqual(depthGaps(full()), []);
});

test("a lone healthy QB is flagged, an injured one doesn't count", () => {
  const r = full().map((p) => (p.id === "QB1" ? { ...p, injured: true } : p));
  assert.deepEqual(depthGaps(r).map((g) => [g.pos, g.kind, g.side]), [["QB", "thin", "offense"]]);
});

test("short of starters, and a line with no sixth man", () => {
  const r = full().filter((p) => !["CB0", "CB1", "CB2", "LT1", "RT1"].includes(p.id));
  const g = depthGaps(r);
  assert.ok(g.some((x) => x.pos === "CB" && x.kind === "short" && x.have === 2 && x.need === 3));
  assert.ok(g.some((x) => x.pos === "OL" && x.kind === "thin"));
  assert.ok(depthGaps(full().filter((p) => p.id !== "K0")).some((x) => x.pos === "K" && x.kind === "short"));
});
