// The depth chart's snap editors (snapEdit.js): the budget stays full, nothing sticks, locks hold.
import test from "node:test";
import assert from "node:assert/strict";
import { sharesOf, linkedSet, transfer, laneSplit } from "../src/snapEdit.js";
import { snapBudget } from "../src/snaps.js";

const rbs = [{ id: "a", pos: "RB", ovr: 96 }, { id: "b", pos: "RB", ovr: 74 }, { id: "c", pos: "RB", ovr: 70 }];
const wrs = ["w1", "w2", "w3", "w4", "w5"].map((id, i) => ({ id, pos: "WR", ovr: 90 - i * 4 }));
const sum = (o, ps) => ps.reduce((t, p) => t + (o[p.id] || 0), 0);

test("linked sliders: raising the starter takes from the deepest bench man first; the total stays full", () => {
  const o = linkedSet("RB", rbs, {}, null, "a", 90);
  assert.equal(o.a, 90);
  assert.equal(sum(o, rbs), 100);
  assert.equal(o.c, 0, "RB3 gives up his snaps first");
  // all the way: the starter plays every snap
  const all = linkedSet("RB", rbs, o, null, "a", 100);
  assert.deepEqual([all.a, all.b, all.c], [100, 0, 0]);
  // lowering him hands the snaps to the next man down first
  const down = linkedSet("RB", rbs, all, null, "a", 70);
  assert.deepEqual([down.a, down.b, down.c], [70, 30, 0]);
});

test("linked sliders: a locked player never moves, and a slider can't take what isn't there", () => {
  const o = linkedSet("RB", rbs, { a: 60, b: 30, c: 10 }, null, "c", 25, new Set(["b"]));
  assert.equal(o.b, 30, "locked");
  assert.deepEqual([o.a, o.c], [45, 25]);
  // with everyone else locked, he can't move at all
  const stuck = linkedSet("RB", rbs, { a: 60, b: 30, c: 10 }, null, "c", 50, new Set(["a", "b"]));
  assert.equal(stuck.c, 10);
  // receivers: three spots' worth, still full after any move
  const w = linkedSet("WR", wrs, {}, null, "w4", 60);
  assert.equal(sum(w, wrs), snapBudget("WR"));
  assert.equal(w.w4, 60);
});

test("split bars: one bar per spot on the field, each starter in his own; a handle trades between two players only", () => {
  const lanes = laneSplit("WR", wrs, {}, null);
  assert.equal(lanes.length, 3);
  lanes.forEach((l) => assert.equal(l.segs.reduce((t, x) => t + x.v, 0) + l.other + l.open, 100));
  assert.deepEqual(lanes.map((l) => l.segs[0].id), ["w1", "w2", "w3"]);
  const before = sharesOf("WR", wrs, {}, null);
  const o = transfer("WR", wrs, {}, null, "w3", "w4", 10);
  assert.equal(o.w3, before.w3 - 10);
  assert.equal(o.w4, before.w4 + 10);
  assert.equal(o.w1, before.w1, "nobody else moves");
  // clamped: can't take more than he has, can't push anyone past 100
  const t = transfer("RB", rbs, { a: 95, b: 5, c: 0 }, null, "b", "a", 50);
  assert.deepEqual([t.a, t.b], [100, 0]);
  // a two-tight-end club's third receiver spot is partly "other personnel"
  const shape = { WR: [93, 88, 50, 20, 6] };
  const l2 = laneSplit("WR", wrs, {}, shape);
  assert.ok(l2[2].other > 0, `slot lane other: ${l2[2].other}`);
});

test("injured players are out of it", () => {
  const hurt = [{ ...rbs[0], injured: true }, rbs[1], rbs[2]];
  const o = linkedSet("RB", hurt, {}, null, "b", 80);
  assert.equal(o.a, undefined);
  assert.equal(o.b + o.c, 100);
});
