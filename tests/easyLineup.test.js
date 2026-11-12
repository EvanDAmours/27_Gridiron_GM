// Easy Mode's lineup (src/easyLineup.js): the staff start the best players, by rating, around your picks;
// the offensive line's best five play, each at the spot where he helps most.
import test from "node:test";
import assert from "node:assert/strict";
import { bestLine, easyDepth } from "../src/easyLineup.js";
import { depthOrderFor } from "../src/depth.js";
import { initTeams } from "../src/league.js";

const ol = (id, pos, ovr, extra = {}) => ({ id, pos, ovr, name: id, dk: 0, ...extra });

test("the staff start the higher-rated quarterback, whatever the real depth chart says", () => {
  const roster = [{ id: "w", pos: "QB", ovr: 72, dk: 0 }, { id: "d", pos: "QB", ovr: 78, dk: 2 }, { id: "m", pos: "QB", ovr: 71, dk: 1 }];
  const d = easyDepth(roster, {});
  assert.deepEqual(d.QB, ["d", "w", "m"]);
  assert.equal(depthOrderFor(roster, d, "QB")[0].id, "d");
});

test("your pick keeps its spot (and survives being saved and loaded); the staff fill around it", () => {
  const roster = [{ id: "a", pos: "RB", ovr: 85 }, { id: "b", pos: "RB", ovr: 80 }, { id: "c", pos: "RB", ovr: 70 }];
  const picks = JSON.parse(JSON.stringify({ RB: [null, "c"] })); // (your RB2: the third-best back)
  assert.deepEqual(easyDepth(roster, picks).RB, ["a", "c", "b"]);
  // a pick for a player who's gone (cut, traded) just falls away
  assert.deepEqual(easyDepth(roster, { RB: ["zz"] }).RB, ["a", "b", "c"]);
  // the role spots keep your picks by spot (the slot receiver, the nickel corner) and leave the rest to the fit-based fill
  const wr = [{ id: "x", pos: "WR", ovr: 90 }, { id: "y", pos: "WR", ovr: 85 }, { id: "s", pos: "WR", ovr: 75 }];
  assert.deepEqual(easyDepth(wr, { WR: [null, null, "s"] }).WR, [null, null, "s"]);
  assert.equal(easyDepth(wr, {}).WR, undefined);
});

test("two good right guards and a poor left guard: the better backup moves over to left guard", () => {
  const roster = [ol("lt", "LT", 85), ol("lg", "LG", 60), ol("c", "C", 75), ol("rg", "RG", 80), ol("rg2", "RG", 78, { dk: 1 }), ol("rt", "RT", 79), ol("lg2", "LG", 55, { dk: 1 })];
  const mv = bestLine(roster);
  assert.deepEqual(mv, [{ id: "rg2", to: "LG" }]);
  // made, the line is its best: nothing more to move (no shuffling back and forth)
  const after = roster.map((p) => (p.id === "rg2" ? { ...p, pos: "LG" } : p));
  assert.deepEqual(bestLine(after), []);
  // a hurt starter: the best healthy backup takes his spot
  const hurt = after.map((p) => (p.id === "rt" ? { ...p, injured: true } : p));
  assert.ok(bestLine(hurt).length >= 1);
});

test("every club's real line: the staff's line is never worse than the listed one, and settles in one go", async () => {
  const { moveOL, OL_POS } = await import("../src/positions.js");
  for (const t of initTeams()) {
    const healthy = t.roster.filter((p) => !p.injured);
    const listed = OL_POS.reduce((s, pos) => s + (healthy.filter((p) => p.pos === pos).sort((a, b) => b.ovr - a.ovr)[0]?.ovr || 0), 0);
    const mv = bestLine(t.roster);
    const moved = t.roster.map((p) => { const m = mv.find((x) => x.id === p.id); return m ? moveOL(p, m.to) : p; });
    const now = OL_POS.reduce((s, pos) => s + (moved.filter((p) => p.pos === pos && !p.injured).sort((a, b) => b.ovr - a.ovr)[0]?.ovr || 0), 0);
    assert.ok(now >= listed, `${t.ab}: ${now} < ${listed}`);
    assert.deepEqual(bestLine(moved), [], `${t.ab} keeps moving`);
  }
});
