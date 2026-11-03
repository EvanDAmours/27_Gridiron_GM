// Rookie contracts on the wage scale (contractSchedule.js rookieTerms): four years, a big signing
// bonus, rising base salaries, guarantees by round.
import test from "node:test";
import assert from "node:assert/strict";
import { rookieTerms } from "../src/contractSchedule.js";
import { deadMoney } from "../src/bonus.js";
import { rookieSalary } from "../src/cap.js";

const deal = (overall) => ({ id: overall, contract: 4, cy: 2027, ...rookieTerms(rookieSalary(overall, 300), overall, 2027, { minSal: 1 }) });

test("the slot's total over four years, most of it up front at the top of the draft", () => {
  const p = deal(1);
  assert.equal(p.sched.length, 4);
  assert.ok(Math.abs(p.dealTotal - rookieSalary(1, 300) * 4) < 0.3);
  assert.ok(p.signBonus / p.dealTotal > 0.6, "about two thirds is signing bonus");
  for (let i = 1; i < 4; i++) assert.ok(p.sched[i].base > p.sched[i - 1].base, "base salaries climb");
  assert.ok(p.salary < rookieSalary(1, 300), "his first cap hit is below the deal's average");
});

test("guarantees by round: all of a first-rounder's deal, part of an early second-rounder's, only the bonus after", () => {
  assert.ok(deal(20).sched.every((y) => y.g === "full"));
  assert.deepEqual(deal(40).sched.map((y) => y.g === "full"), [true, true, false, false]);
  assert.deepEqual(deal(60).sched.map((y) => y.g === "full"), [true, false, false, false]);
  assert.ok(deal(150).sched.every((y) => !y.g));
});

test("cutting a rookie: a first-rounder is all dead money, a late pick only what's left of his bonus", () => {
  const r1 = deal(10), r6 = deal(190);
  assert.ok(Math.abs(deadMoney(r1, { yr: 2027, sp: "preseason" }).total - r1.dealTotal) < 0.3);
  assert.ok(Math.abs(deadMoney(r6, { yr: 2027, sp: "preseason" }).total - r6.sb * 4) < 0.05, "just the bonus proration");
});

test("late picks never go below the league minimum", () => {
  for (const o of [120, 180, 224, 257]) assert.ok(deal(o).sched.every((y) => y.base + y.rb >= 1), `pick ${o}`);
});

test("a rookie's base salary never drops from one year to the next", () => {
  for (const o of [1, 33, 70, 90, 130, 200, 250]) { const b = deal(o).sched.map((y) => y.base); for (let i = 1; i < 4; i++) assert.ok(b[i] >= b[i - 1], `pick ${o}: ${b}`); }
});
