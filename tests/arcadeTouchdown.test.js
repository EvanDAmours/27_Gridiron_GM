// The arcade field decides touchdowns: a carrier down short of the goal line is never booked as a
// touchdown by the engine, and one who reaches the end zone always is.
import test from "node:test";
import assert from "node:assert/strict";
import { newGame, lineups } from "../src/arcade/bridge.js";
import { setupPlay, __bookForTest } from "../src/arcade/play.js";

test("down short of the goal line is never a touchdown; into the end zone always is", () => {
  let short = 0, scored = 0, n = 0;
  for (let i = 0; i < 160; i++) {
    const { g } = newGame(i % 32, (i * 5 + 1) % 32, {}); g.koNext = false; g.poss = "h"; g.yard = 55 + (i % 35); g.down = 1; g.toGo = 10;
    const S = setupPlay(g, lineups(g), i % 2 ? "run_inside" : "pass_quick");
    if (S.call.startsWith("pass")) S.catchAt = 0.5;
    S.ball.holder = S.call.startsWith("pass") ? "X" : "RB";
    __bookForTest(S, Math.max(1, 100 - S.los - (1 + (i % 6))));
    n++; if (S.ev?.td) short++;
    const { g: g2 } = newGame(i % 32, (i * 5 + 1) % 32, {}); g2.koNext = false; g2.poss = "h"; g2.yard = 80; g2.down = 1; g2.toGo = 10;
    const S2 = setupPlay(g2, lineups(g2), "run_inside"); S2.ball.holder = "RB";
    __bookForTest(S2, 100 - S2.los); if (S2.ev?.td || S2.ev?.type === "penalty") scored++;
  }
  assert.equal(short, 0, `${short} of ${n} plays down short were booked as touchdowns`);
  assert.ok(scored >= n * 0.95, `only ${scored} of ${n} end-zone runs were touchdowns`);
});
