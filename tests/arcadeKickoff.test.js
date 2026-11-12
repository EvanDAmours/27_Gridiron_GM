// Kickoffs after a score, as the engine (playsim.js) books them: the arcade asks for the other team's
// kickoff to you to be its own play (g.koDefer), and a score that runs out the half leaves the second
// half's kickoff to the team the half-time setup chose.
import test from "node:test";
import assert from "node:assert/strict";
import { newGame, resolvePlay } from "../src/arcade/bridge.js";
import { step } from "../src/playsim.js";

const fresh = (i = 0) => { const { g } = newGame(i % 32, (i * 7 + 3) % 32, {}); g.koNext = false; g.poss = "h"; g.yard = 70; g.down = 1; g.toGo = 10; g.qtr = 1; g.clock = 600; return g; };

test("with g.koDefer, the kicking side's kickoff after a field goal waits as the next play", () => {
  let made = 0;
  for (let i = 0; i < 30 && made < 6; i++) {
    const g = fresh(i); g.koDefer = { h: true };
    const ev = resolvePlay(g, "fg", { types: ["fg"] }).ev;
    if (ev?.type !== "fg") continue;
    made++;
    assert.equal(ev.ko, undefined, "the field goal's own play holds no kickoff");
    assert.equal(g.koNext, true); assert.equal(g.poss, "h"); assert.equal(g.yard, 35);
    const ko = step(g, "run_inside");
    assert.equal(ko.type, "kickoff"); assert.equal(ko.poss, "h"); if (!ko.retTD) assert.equal(g.poss, "a", "the other team has it after the kick"); // (a return all the way: they kick it back)
  }
  assert.ok(made >= 4, `only ${made} field goals made`);
});

test("without g.koDefer (or for the other side) the kickoff is booked inside the scoring play, as before", () => {
  for (const defer of [null, { a: true }]) {
    let made = 0;
    for (let i = 0; i < 30 && made < 4; i++) {
      const g = fresh(i); g.koDefer = defer;
      const ev = resolvePlay(g, "fg", { types: ["fg"] }).ev;
      if (ev?.type !== "fg") continue;
      made++; assert.ok(ev.ko); assert.equal(g.koNext, false); if (!ev.retTD) assert.equal(g.poss, "a"); // (a return all the way: they kick it back)
    }
    assert.ok(made >= 3);
  }
});

test("a score that runs out the half leaves the second-half kickoff to the team half-time chose", () => {
  let n = 0;
  for (let i = 0; i < 40 && n < 6; i++) {
    const g = fresh(i); g.qtr = 2; g.clock = 3; g.firstPoss = "a"; g.yard = 75;
    const ev = resolvePlay(g, "fg", { types: ["fg"] }).ev;
    if (ev?.type !== "fg" || g.qtr !== 3) continue;
    n++;
    assert.equal(g.koNext, true); assert.equal(g.poss, "a", "the half-time kicker"); assert.equal(ev.ko, undefined, "no kickoff tacked onto the last play of the half");
  }
  assert.ok(n >= 4, `only ${n} half-ending field goals`);
});
