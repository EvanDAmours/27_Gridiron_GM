import { test } from "node:test";
import assert from "node:assert/strict";
import { moveDB, canMoveDB } from "../src/positions.js";

const benford = { id: "cb", name: "Christian Benford", pos: "CB", mpos: "CB", ovr: 80, pot: 82, age: 25, spd: 90, posAttrs: { manCov: 77, zoneCov: 81, press: 86, ballSkills: 75, tackling: 74, recovery: 89, footwork: 82, playRec: 83 } };
const bishop = { id: "s", name: "Cole Bishop", pos: "S", mpos: "FS", ovr: 79, pot: 84, age: 23, spd: 86, posAttrs: { range: 91, runSupport: 74, coverage: 80, tackling: 70, ballHawk: 66, blitzing: 53, comms: 79, versatility: 73 } };

test("a corner moves to safety with safety skills and a re-figured rating", () => {
  const s = moveDB(benford);
  assert.equal(s.pos, "S"); assert.equal(s.mpos, "FS");
  assert.deepEqual(Object.keys(s.posAttrs).sort(), Object.keys(bishop.posAttrs).sort());
  assert.ok(Math.abs(s.ovr - benford.ovr) <= 6, `80 CB -> ${s.ovr} S`);
  assert.ok(s.pot >= s.ovr);
});

test("a slow safety loses more moving to corner than a fast one", () => {
  const slow = moveDB({ ...bishop, spd: 80 }), fast = moveDB({ ...bishop, spd: 93 });
  assert.equal(slow.pos, "CB");
  assert.ok(slow.ovr < fast.ovr);
});

test("moving back restores the original position, skills and rating", () => {
  const back = moveDB(moveDB(benford));
  assert.equal(back.pos, "CB"); assert.equal(back.mpos, "CB");
  assert.deepEqual(back.posAttrs, benford.posAttrs);
  assert.equal(back.ovr, benford.ovr); assert.equal(back.pot, benford.pot);
  assert.equal(back.posFrom, undefined);
  assert.equal(canMoveDB({ pos: "LB" }), false);
  assert.equal(moveDB({ pos: "WR", ovr: 70 }).pos, "WR");
});
