// Trades and contract structure: what a club leaves behind when it trades a player (only his
// signing bonus), and how the AI prices guaranteed money and that dead money.
import test from "node:test";
import assert from "node:assert/strict";
import { scheduledTerms } from "../src/contractSchedule.js";
import { tradeAway, tradeDead } from "../src/bonus.js";
import { playerValue, contractMult, moveCost, evaluateTrade, gtdShare } from "../src/trade.js";
import { askingPrice } from "../src/offseason.js";
import { pkV } from "../src/league.js";
import { setLeagueYear, setCapPhase } from "../src/cap.js";

setLeagueYear(2027); setCapPhase(2027, "regular");
const deal = (sal, yrs, opts, extra = {}) => {
  const p = { id: extra.name || "p", name: "Player", pos: "WR", ovr: 86, pot: 86, age: 27, contract: yrs, cy: 2027, ...extra, ...scheduledTerms(sal, yrs, { minSal: 1, ...opts }, 2027) };
  p.tradeVal = playerValue(p);
  return p;
};

test("a traded player's guaranteed salary goes with him; only his bonus stays behind", () => {
  const p = deal(30, 4, { bonus: 0.3, gtdYrs: 2 });
  const d = tradeDead(p, { yr: 2027, sp: "regular" });
  assert.equal(d.total, Math.round(p.sb * 4 * 10) / 10, "the bonus proration, not the guarantees");
  const from = { deadCap: 0 };
  const moved = tradeAway(p, from, { yr: 2027, sp: "regular" });
  assert.equal(from.deadCap + (from.deadNext || 0), d.total);
  assert.ok(moved.sched.filter((y) => y.g === "full").length >= 2, "his new club owes the guaranteed years");
});

test("void years' dead money stays with the club that gave them, not the player", () => {
  const p = deal(30, 3, { bonus: 0.3, voidYrs: 2 });
  assert.ok(p.voidDead > 0);
  const from = { deadCap: 0 };
  const moved = tradeAway(p, from, { yr: 2026, sp: "freeagency" });
  assert.equal(moved.voidDead, undefined);
  assert.equal(from.deadCap, Math.round((p.sb * 3 + p.voidDead) * 10) / 10);
});

test("an overpaid deal weighs less when his new club could cut him for free", () => {
  const fair = askingPrice({ pos: "WR", ovr: 80, age: 29, contract: 3 });
  const base = { pos: "WR", ovr: 80, pot: 80, age: 29 };
  const loose = deal(fair * 1.6, 3, {}, base), locked = deal(fair * 1.6, 3, { gtdYrs: 3 }, base);
  assert.ok(gtdShare(loose) === 0 && gtdShare(locked) === 1);
  assert.ok(contractMult(loose) > contractMult(locked), `${contractMult(loose)} vs ${contractMult(locked)}`);
  assert.ok(contractMult(locked) < 1);
});

test("a club that just gave a big bonus wants more to move him", () => {
  const plain = deal(40, 5, { bonus: 0 }, { name: "a" }), bonus = deal(40, 5, { bonus: 0.4 }, { name: "b" });
  assert.equal(moveCost(plain).prem, 0);
  assert.ok(moveCost(bonus).prem > 0.1);
  const them = { roster: [plain, bonus], w: 4, l: 4 };
  const ask = (p) => evaluateTrade({ sendPk: [{ rd: 1, overall: 20 }], get: [p], them, pick: pkV, season: true }).ask;
  assert.ok(ask(bonus) > ask(plain));
  assert.match(evaluateTrade({ sendPk: [{ rd: 1, overall: 20 }], get: [bonus], them, pick: pkV, season: true }).why || "", /dead money/);
});

test("the cap check counts the dead money a deal leaves them", () => {
  const p = deal(40, 5, { bonus: 0.4 }, { name: "c" });
  const them = { roster: [p], w: 4, l: 4 };
  // they give him up for a cheap player: his salary leaves, but this year's dead money stays
  const cheap = { id: "x", name: "X", pos: "WR", ovr: 70, age: 26, contract: 2, salary: 1, tradeVal: 5 };
  const ev = evaluateTrade({ send: [cheap], get: [p], them, pick: pkV, capRoom: 0, season: false });
  assert.ok(!ev.noRoom, "moving a big salary frees room even after the dead money");
  setCapPhase(2027, "freeagency");
  const ev2 = evaluateTrade({ send: [{ ...cheap, salary: 30 }], get: [p], them, pick: pkV, capRoom: 0 });
  setCapPhase(2027, "regular");
  assert.ok(ev2.noRoom, "in the off-season all the dead money lands now");
});
