// The defensive line with snap shares and swaps (dline.js dlOrder, depth.js): edge rushers stay
// on the edge, and the real depth chart's column order doesn't scramble the line.
import test from "node:test";
import assert from "node:assert/strict";
import { initTeams } from "../src/league.js";
import { depthOrderFor } from "../src/depth.js";
import { naturalDL } from "../src/dline.js";
import { positionSnaps } from "../src/snaps.js";

const giants = () => initTeams(-1).find((t) => t.ab === "NYG");
const line = (t, depth = {}, snaps) => depthOrderFor(t.roster, depth, "DL", snaps);
const name = (p) => p.name.split(" ").pop();

test("a snap share on one lineman doesn't push an edge rusher inside or bench the best end", () => {
  const t = giants(), id = (n) => t.roster.find((p) => p.name === n).id;
  for (const snaps of [{}, { [id("Kayvon Thibodeaux")]: 46 }, { [id("Shelby Harris")]: 60 }, { [id("Kayvon Thibodeaux")]: 85 }]) {
    const o = line(t, {}, snaps);
    assert.deepEqual(o.slice(0, 4).map(naturalDL), ["EDGE", "DT", "DT", "EDGE"], JSON.stringify(snaps) + " " + o.slice(0, 4).map(name));
    assert.ok(o.slice(0, 4).some((p) => p.name === "Brian Burns"), "Burns starts");
  }
  // a third edge rusher given a big share starts on the edge; Carter rotates, still an end
  const o = line(t, {}, { [id("Kayvon Thibodeaux")]: 85 });
  assert.ok(o.slice(0, 4).some((p) => p.name === "Kayvon Thibodeaux"));
  assert.ok(!o.slice(1, 3).some((p) => p.name === "Abdul Carter"), "Carter never plays tackle");
});

test("swapping two linemen leaves everyone else's place and snap share alone", () => {
  const t = giants();
  const before = line(t).filter((p) => !p.injured);
  // swap the left end with the first backup, the way the depth chart does
  const ids = before.map((p) => p.id);
  [ids[0], ids[4]] = [ids[4], ids[0]];
  const after = line(t, { DL: ids }).filter((p) => !p.injured);
  const s0 = positionSnaps("DL", before, {}), s1 = positionSnaps("DL", after, {});
  const moved = new Set([before[0].id, before[4].id]);
  for (const p of before.filter((q) => !moved.has(q.id))) {
    assert.equal(after.indexOf(p), before.indexOf(p), `${p.name} kept his place`);
    assert.equal(s1[p.id], s0[p.id], `${p.name} kept his snaps`);
  }
  assert.equal(s1[before[4].id], s0[before[0].id], "the new starter takes the old one's share");
});
