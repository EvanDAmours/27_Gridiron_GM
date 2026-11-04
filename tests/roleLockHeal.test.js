// A man you put at a role while a teammate is hurt stays in that role when the teammate heals, and a
// locked share stays the number it was (the Giants: Arvell Reese placed at MIKE during LB injuries
// went back to SAM or WILL once they healed, and his snaps changed with the spot).
import test from "node:test";
import assert from "node:assert/strict";
import { depthOrderFor } from "../src/depth.js";
import { positionSnaps } from "../src/snaps.js";
import { initTeams, calibrateLeague, gameSetup } from "../src/league.js";
import { createGame, step } from "../src/playsim.js";

const LB = (id, name, ovr) => ({ id, name, pos: "LB", ovr, age: 26 });
const roster = (hurtId) => [LB("l1", "Sam Guy", 78), LB("l2", "Mike Guy", 84), LB("l3", "Will Guy", 80), LB("reese", "Arvell Reese", 79), LB("l5", "Backup", 66)]
  .map((p) => (p.id === hurtId ? { ...p, injured: true, injWk: 2 } : p));

test("placed at MIKE while the MIKE is hurt: still MIKE after he heals", () => {
  const hurt = roster("l2");
  const order = depthOrderFor(hurt, {}, "LB", null), ids = order.map((p) => p.id);
  // the depth chart's swap, as the field does it: the MIKE card is whoever plays MIKE on game day
  // (the hurt man sits out), and the swap is made at his place in the order
  const at = ids.indexOf(order.filter((p) => !p.injured)[1].id), i = ids.indexOf("reese");
  [ids[at], ids[i]] = [ids[i], ids[at]];
  const depthOrder = { LB: ids };
  assert.equal(depthOrderFor(hurt, depthOrder, "LB", null)[1].id, "reese", "MIKE while the starter is out");
  const healed = roster(null);
  assert.equal(depthOrderFor(healed, depthOrder, "LB", null)[1].id, "reese", "still MIKE once he's back");
});

test("a locked share is his own number: a depth change doesn't move it", () => {
  const healthy = roster(null);
  const d1 = { LB: ["l1", "reese", "l3", "l2", "l5"] };
  const order1 = depthOrderFor(healthy, d1, "LB", null);
  const v = positionSnaps("LB", order1, {}, null).reese;
  const pinned = { reese: v }; // what locking saves
  const order2 = depthOrderFor(healthy, { LB: ["l1", "l2", "reese", "l3", "l5"] }, "LB", null);
  assert.equal(positionSnaps("LB", order2, pinned, null).reese, v);
});

test("a safety is credited to the defender who made it", () => {
  const teams = initTeams(-1); calibrateLeague(teams);
  const nyg = teams.find((t) => t.ab === "NYG"), ind = teams.find((t) => t.ab === "IND");
  let found = 0;
  for (let seed = 1; seed < 400 && found < 3; seed++) {
    const su = gameSetup(ind, nyg, null, null, "clear");
    let s = seed; const rand = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const g = createGame(su.home, su.away, { wx: su.wx, rand });
    g.koNext = false; g.qtr = 2; g.clock = 600; g.poss = "a"; g.yard = 1; g.down = 1; g.toGo = 10; g.running = false;
    const ev = step(g, seed % 2 ? "run_inside" : "pass_short");
    if (ev.type !== "safety" || !ev.tkl) continue;
    found++;
    const line = Object.values(g.box.h).find((l) => l.name === ev.tkl.name);
    assert.equal(line?.safety, 1, `${ev.text}`);
  }
  assert.ok(found > 0, "no safety in 400 tries");
});
