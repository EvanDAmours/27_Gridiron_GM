// Penalties follow the NFL's enforcement rules (playsim.js), and the arcade never books a foul that
// couldn't have happened on the play it showed (bridge.js resolvePlay).
import test from "node:test";
import assert from "node:assert/strict";
import { newGame, resolvePlay } from "../src/arcade/bridge.js";
import { step } from "../src/playsim.js";

const half = (d, n) => Math.min(n, Math.floor(d / 2));

test("penalties: half the distance to the goal, personal fouls, interference at the 1", () => {
  let flags = 0;
  for (let i = 0; i < 120; i++) {
    const { g } = newGame(i % 32, (i * 7 + 3) % 32, {});
    let n = 0;
    while (!g.done && n++ < 4000) {
      const before = { yard: g.yard, down: g.down, toGo: g.toGo };
      const ev = step(g);
      const p = ev?.pen; if (!p || !p.accepted || ev.type === "kickoff") continue;
      flags++;
      const tag = `${p.kind} from the ${before.yard}: ${ev.text}`;
      if (p.pre) {
        // no play: offense back at most half the distance to its goal, defense up at most half the distance to the other one
        if (p.side === "off") assert.ok(-ev.yards <= half(before.yard, 5), tag);
        else assert.ok(ev.yards <= half(100 - before.yard, 5), tag);
      } else if (ev.type === "penalty" && p.side === "def" && p.kind !== "dpi") {
        assert.ok(ev.yards <= half(100 - before.yard, p.yds), tag); // walked off from the previous spot
        assert.equal(g.down, 1, `an automatic first down: ${tag}`);
      } else if (ev.type === "penalty" && p.kind === "dpi") {
        assert.ok(before.yard + ev.yards <= 99, `interference never past the 1: ${tag}`);
        assert.equal(g.down, 1, tag);
      }
      // a personal foul tacked on after the play only when the play gained ground
      if (p.tack) assert.ok((p.play?.yards || 0) > 0 && p.play?.type !== "inc" && p.play?.type !== "sack", `tacked on after ${p.play?.type}: ${tag}`);
    }
  }
  assert.ok(flags > 50, `only ${flags} flags in 120 games`);
});

test("arcade: a play that was played out is never booked as a false start (or any foul before the snap)", () => {
  let pre = 0, n = 0;
  for (let i = 0; i < 400; i++) {
    const { g } = newGame(i % 32, (i * 5 + 1) % 32, {}); g.koNext = false; g.poss = "h"; g.yard = 20 + (i % 60); g.down = 1 + (i % 3); g.toGo = 10;
    const r = resolvePlay(g, i % 2 ? "run_inside" : "pass_quick", { types: [i % 2 ? "run" : "pass"], yards: 12, tol: 3 }, null, 30);
    n++; if (r?.ev?.pen?.pre) pre++;
  }
  assert.equal(pre, 0, `${pre} of ${n} played-out plays came back as a foul before the snap`);
});
