// A play you call late in a half is the play that runs: down three with 20 seconds left in field
// goal range, a called deep pass is thrown, not turned into a field goal. With no call the coach
// still takes the kick there (the AI and coach-called plays are unchanged).
import test from "node:test";
import assert from "node:assert/strict";
import { initTeams, calibrateLeague, gameSetup } from "../src/league.js";
import { createGame, step } from "../src/playsim.js";

const late = (seed) => {
  const teams = initTeams(-1); calibrateLeague(teams);
  const nyg = teams.find((t) => t.ab === "NYG"), ind = teams.find((t) => t.ab === "IND");
  const su = gameSetup(ind, nyg, null, null, "clear");
  let s = seed; const rand = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const g = createGame(su.home, su.away, { wx: su.wx, rand });
  // past the opening kickoff, then: Giants (away) ball at the Colts' 30, down 26-23, 0:20 left
  g.koNext = false; g.qtr = 4; g.clock = 20; g.poss = "a"; g.score = { h: 26, a: 23 }; g.yard = 70; g.down = 2; g.toGo = 10; g.running = false;
  return g;
};

test("down three with 20 seconds left: the deep pass you call is thrown", () => {
  for (const seed of [7, 11, 23, 42, 99]) {
    const ev = step(late(seed), "pass_deep");
    assert.ok(!["fg", "fg_miss"].includes(ev.type), `seed ${seed}: ${ev.type} ${ev.text}`);
  }
});

test("the same spot with no call: the coach still kicks to tie", () => {
  const ev = step(late(7));
  assert.ok(["fg", "fg_miss"].includes(ev.type), `${ev.type} ${ev.text}`);
});

test("calling the field goal yourself still kicks it", () => {
  const ev = step(late(7), "fg");
  assert.ok(["fg", "fg_miss"].includes(ev.type));
});
