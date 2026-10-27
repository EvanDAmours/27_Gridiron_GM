import test from "node:test";
import assert from "node:assert/strict";
import { genDC, initTeams } from "../src/league.js";
import { scoutsPicks, currentOvr, survival } from "../src/draftScouts.js";
import { csRank, newScouting } from "../src/scouting.js";

const setup = () => {
  const teams = initTeams(0);
  const cls = genDC(2030);
  const picks = [];
  for (let rd = 1; rd <= 2; rd++) teams.forEach((t, i) => picks.push({ id: `p${rd}-${i}`, rd, overall: (rd - 1) * 32 + i + 1, owner: i, orig: i }));
  return { teams, cls, picks, sc: newScouting ? newScouting() : {} };
};

test("the scouts bring five players for your pick, each with a reason and the scouts' votes", () => {
  const { teams, cls, picks, sc } = setup();
  const at = picks.findIndex((pk) => pk.owner === 0);
  const r = scoutsPicks({ sc, teams, ui: 0, picks, pool: cls, at, now: at, capRoom: 40 });
  assert.equal(r.five.length, 5);
  for (const x of r.five) { assert.ok(x.why.lead[0][0]); assert.ok(x.later >= 0 && x.later <= 1); }
  assert.ok(r.five.reduce((s, x) => s + x.votes.length, 0) <= 4);
  assert.equal(r.next.overall, 33);
});

test("a player the whole league rates goes early; one far down every board is still there", () => {
  const { teams, cls, picks } = setup();
  const sorted = [...cls].sort((a, b) => csRank(a) - csRank(b));
  const s = survival(cls, picks, 0, 31, teams, 31, 12);
  assert.ok(s.get(sorted[0].id) < 0.2, "the top of the board is gone after 31 picks");
  assert.equal(s.get(sorted[sorted.length - 1].id), 1, "the bottom of the board is untouched");
});

test("current overall: a range before anyone has scouted him, exact after a workup", () => {
  const p = genDC(2031)[5];
  const est = currentOvr({}, p);
  assert.equal(est.kind, "estimate");
  assert.ok(est.hi > est.lo && est.lo <= p.trueOvr + 4 && est.hi >= p.trueOvr - 4);
  p.scout = { lvl: 2, eOvr: p.trueOvr, ePot: p.truePot, exact: true };
  assert.deepEqual(currentOvr({}, p), { v: p.trueOvr, lo: p.trueOvr, hi: p.trueOvr, kind: "workup" });
});
