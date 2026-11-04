// Real contract extensions signed during the 2026 season (realExtensions.js): Greg Newsome II's
// 3-year, $46M extension with the Giants (Nov 3, 2026).
import test from "node:test";
import assert from "node:assert/strict";
import { initTeams } from "../src/league.js";
import { applyRealExtensionsToSave } from "../src/realExtensions.js";
import { applyExtensions } from "../src/extensions.js";
import { deadMoney } from "../src/bonus.js";

const newsome = (teams) => teams.find((t) => t.ab === "NYG").roster.find((p) => p.name === "Greg Newsome II");

test("a new league starts with Newsome's extension signed: 3 years, $46M, $32M guaranteed, after his current deal", () => {
  const p = newsome(initTeams(-1));
  assert.equal(p.contract, 1, "his current deal still runs through 2026");
  assert.equal(p.ext.yrs, 3);
  assert.equal(p.ext.total, 46);
  assert.ok(Math.abs(p.ext.gtd - 32) < 1, `guaranteed ${p.ext.gtd}`);
  assert.deepEqual(p.ext.sched.map((y) => y.g === "full"), [true, true, false]);
});

test("it takes over at the new league year: three more years at about $15M a hit", () => {
  const teams = initTeams(-1);
  applyExtensions(teams, 2026);
  const p = newsome(teams);
  assert.ok(!p.ext);
  assert.equal(p.sched.length, 3);
  assert.equal(p.schedYr, 2027);
  assert.ok(p.salary > 14 && p.salary < 16.5, `cap hit ${p.salary}`);
  // cut before 2027: the guarantees and the bonus left are dead money
  assert.ok(deadMoney(p, { yr: 2027, sp: "preseason" }).total > 25);
});

test("a 2026 save gets it once; a later season, a released or already-extended player doesn't", () => {
  const save = () => { const teams = initTeams(-1); const p = newsome(teams); delete p.ext; delete p.realExt; p.salary = 6.5; delete p.sb; return { teams, yr: 2026, sp: "regular", p }; };
  const d = save();
  assert.equal(applyRealExtensionsToSave(d).length, 1);
  assert.equal(applyRealExtensionsToSave(d).length, 0, "only once");
  const later = save(); later.yr = 2027;
  assert.equal(applyRealExtensionsToSave(later).length, 0);
  const playoffs = save(); playoffs.sp = "playoffs";
  assert.equal(applyRealExtensionsToSave(playoffs).length, 0);
  const extended = save(); extended.p.ext = { sal: 10, yrs: 2 };
  assert.equal(applyRealExtensionsToSave(extended).length, 0, "your own extension stands");
  const gone = save(); gone.teams.find((t) => t.ab === "NYG").roster = gone.teams.find((t) => t.ab === "NYG").roster.filter((x) => x !== gone.p);
  assert.equal(applyRealExtensionsToSave(gone).length, 0);
});
