// Contracts as NFL front offices write them (contractSchedule.js): front- and back-loading,
// guarantees at signing, March vesting, roster bonuses, and what each does to dead money.
import test from "node:test";
import assert from "node:assert/strict";
import { buildSchedule, valueFactor, scheduledTerms, schedHit, advanceSchedule } from "../src/contractSchedule.js";
import { deadMoney, restructure, tradeAway, newLeagueYear } from "../src/bonus.js";
import { capHit } from "../src/league.js";
import { hitIn } from "../src/capProjection.js";

const sum = (xs) => Math.round(xs.reduce((a, b) => a + b, 0) * 10) / 10;

test("a schedule adds up to the deal, and its shape moves cash between years", () => {
  for (const shape of ["flat", "front", "back"]) {
    const st = buildSchedule(30, 4, { shape, bonus: 0.2, minSal: 1.1 });
    assert.equal(Math.round((st.bonus + sum(st.years.map((y) => y.cash))) * 10) / 10, 120, shape);
    for (const y of st.years) assert.equal(y.hit, Math.round((y.cash + st.sb) * 10) / 10);
  }
  const f = buildSchedule(30, 4, { shape: "front" }), b = buildSchedule(30, 4, { shape: "back" });
  assert.ok(f.years[0].hit > f.years[3].hit && b.years[0].hit < b.years[3].hit);
});

test("players value guaranteed money and money up front", () => {
  const flat = buildSchedule(20, 3, {});
  assert.equal(valueFactor(20, 3, flat), 1);
  const gtd = buildSchedule(20, 3, { gtdYrs: 3 }), vest = buildSchedule(20, 3, { vest: true }), front = buildSchedule(20, 3, { shape: "front" }), back = buildSchedule(20, 3, { shape: "back" });
  assert.ok(valueFactor(20, 3, gtd) > valueFactor(20, 3, vest) && valueFactor(20, 3, vest) > 1);
  assert.ok(valueFactor(20, 3, front) > 1 && valueFactor(20, 3, back) < 1);
});

const signed = (opts) => ({ id: 1, name: "X", pos: "WR", contract: 3, cy: 2027, ...scheduledTerms(20, 3, { minSal: 1, ...opts }, 2027) });

test("dead money: guaranteed years count, March-vesting years only once they've vested", () => {
  const full = signed({ gtdYrs: 2 });
  // in the 2027 season (a year 1 cut): half this year's base is still owed, plus all of year 2
  const d = deadMoney(full, { yr: 2027, sp: "regular" });
  assert.equal(d.total, Math.round((full.sched[0].base * 0.5 + full.sched[1].base) * 10) / 10);
  const v = signed({ vest: true });
  // a new league year (2028): cut during re-sign week, before it vests, costs nothing
  const v2 = advanceSchedule({ ...v, sched: [...v.sched] }, 2028);
  assert.equal(deadMoney({ ...v2, contract: 3, cy: 2027 }, { yr: 2027, sp: "resign" }).total, 0);
  // once free agency opens it has vested: this year's salary is owed
  assert.ok(deadMoney({ ...v2, contract: 3, cy: 2027 }, { yr: 2027, sp: "freeagency" }).total >= v2.sched[0].base);
  const none = signed({});
  assert.equal(deadMoney(none, { yr: 2027, sp: "regular" }).total, 0, "nothing guaranteed, no bonus: free to cut");
});

test("a roster bonus is only dead money once it's been paid in March", () => {
  const p = advanceSchedule({ ...signed({ roster: 0.5 }) }, 2028);
  assert.ok(p.sched[0].rb > 0);
  const q = { ...p, contract: 3, cy: 2027 };
  assert.equal(deadMoney(q, { yr: 2027, sp: "resign" }).total, 0);
  assert.equal(deadMoney(q, { yr: 2027, sp: "freeagency" }).total, p.sched[0].rb);
});

test("the league year moves a scheduled deal on, and its cap hit follows the schedule", () => {
  const p = signed({ shape: "back" });
  const t = { roster: [p], ir: [] };
  const y1 = p.salary, y2 = schedHit(p, 1), y3 = schedHit(p, 2);
  newLeagueYear([t], 2028);
  assert.equal(t.roster[0].salary, y2);
  assert.ok(t.roster[0].salary > y1, "back-loaded: next year costs more");
  assert.equal(hitIn(t.roster[0], 1, 2).hit, y3);
});

test("restructure and trade work on scheduled deals", () => {
  const p = signed({ shape: "flat" });
  const r = restructure({ ...p }, { yr: 2027, sp: "preseason", minSal: 1 });
  assert.ok(r && r.p.salary < p.salary && r.p.sb > 0);
  const traded = tradeAway({ ...p, sb: 2 }, { deadCap: 0 }, { yr: 2027, sp: "regular" });
  assert.equal(traded.sb, 0);
  assert.equal(traded.salary, Math.round((p.sched[0].base + p.sched[0].rb) * 10) / 10);
});

test("coaches are off the cap", () => {
  const t = { roster: [{ salary: 10 }], ir: [], coach: { oc: { salary: 5 }, dc: { salary: 4 } } };
  assert.equal(capHit(t), 10);
});

test("a deal signed once the league year is open: a first year that vests in March already has", () => {
  const fa = buildSchedule(20, 3, { vest: true, opened: true }), rs = buildSchedule(20, 3, { vest: true });
  assert.equal(fa.years[0].g, "full");
  assert.equal(rs.years[0].g, "vest", "re-sign week: it vests when the league year opens");
  assert.ok(fa.gtd > rs.gtd);
});

import { extensionSchedule, yearHit, extensionDead } from "../src/contractSchedule.js";
import { applyExtensions } from "../src/extensions.js";

test("an extension's bonus is prorated from this season over the old and new years, five at most", () => {
  const st = extensionSchedule(30, 4, { bonus: 0.2, minSal: 1 }, 2);
  assert.equal(st.bonus, 24);
  assert.equal(st.sb, 4.8); // 24 over five years: this season, next (the old deal), then three new ones
  assert.deepEqual(st.years.map((y) => y.pr), [4.8, 4.8, 4.8, 0]);
  assert.equal(st.nowAdd, 4.8);
});

test("a structured extension takes over at the new league year with its schedule", () => {
  const st = extensionSchedule(20, 3, { shape: "front", gtdYrs: 1, vest: true, bonus: 0.1, minSal: 1 }, 1);
  const ext = { sal: st.years[0].hit, apy: 20, yrs: 3, yr: 2026, sb: st.sb, sched: st.years.map(({ base, rb, g, pr }) => ({ base, rb, g, pr })), gtd: st.gtd, total: st.total };
  const t = { roster: [{ id: 7, name: "E", pos: "WR", contract: 1, salary: 8, ext }] };
  applyExtensions([t], 2026);
  const p = t.roster[0];
  assert.equal(p.schedYr, 2027);
  assert.equal(p.salary, yearHit(ext.sched[0], ext.sb));
  assert.equal(p.contract, 4);
  assert.ok(!p.ext);
});

test("cutting a player before his extension starts leaves its bonus and guarantees as dead money", () => {
  const st = extensionSchedule(20, 3, { gtdYrs: 2, bonus: 0.2, minSal: 1 }, 1);
  const ext = { yrs: 3, sb: st.sb, sched: st.years.map(({ base, rb, g, pr }) => ({ base, rb, g, pr })) };
  const p = { id: 8, contract: 1, cy: 2026, salary: 10, ext };
  const dead = deadMoney(p, { yr: 2026, sp: "regular" }).total;
  const own = deadMoney({ ...p, ext: undefined }, { yr: 2026, sp: "regular" }).total; // his current deal's own bonus
  assert.equal(dead, Math.round((own + extensionDead(ext)) * 10) / 10);
  assert.ok(dead >= st.years[0].cash + st.years[1].cash);
});

test("the cap projection reads an extension's own years", () => {
  const st = extensionSchedule(20, 3, { shape: "back", minSal: 1 }, 1);
  const p = { id: 9, contract: 1, salary: 10, ext: { yrs: 3, sb: st.sb, sched: st.years.map(({ base, rb, g, pr }) => ({ base, rb, g, pr })) } };
  assert.equal(hitIn(p, 1, 1).hit, st.years[0].hit);
  assert.equal(hitIn(p, 3, 1).hit, st.years[2].hit);
  assert.ok(hitIn(p, 3, 1).hit > hitIn(p, 1, 1).hit, "back-loaded");
});
