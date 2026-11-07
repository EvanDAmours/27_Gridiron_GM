// A playoff game is never a tie: overtime periods go on until someone wins, in the season's games
// (league.js) and in the arcade's Super Bowl mode (bridge.js newGame/franchiseGame with playoff).
import test from "node:test";
import assert from "node:assert/strict";
import { newGame } from "../src/arcade/bridge.js";
import { step } from "../src/playsim.js";

test("arcade playoff games (short quarters) never end tied", () => {
  let ot = 0;
  for (let i = 0; i < 200; i++) {
    const { g } = newGame(i % 32, (i * 7 + 3) % 32, { qLen: 120, playoff: true });
    let n = 0; while (!g.done && n++ < 4000) step(g);
    assert.ok(g.done, "game finished");
    assert.notEqual(g.score.h, g.score.a, `game ${i} ended tied ${g.score.h}-${g.score.a}`);
    if (g.ot) ot++;
  }
  assert.ok(ot > 0, "some went to overtime");
});
