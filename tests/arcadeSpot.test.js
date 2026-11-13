// The arcade field decides where a play ends: the engine books the yards the field shows (a runner
// brought down at the 1 is spotted at the 1, not wherever the engine's own roll would have put him).
import test from "node:test";
import assert from "node:assert/strict";
import { newGame, resolvePlay } from "../src/arcade/bridge.js";

const fresh = (i, yard = 40) => { const { g } = newGame(i % 32, (i * 7 + 3) % 32, {}); g.koNext = false; g.poss = "h"; g.yard = yard; g.down = 1; g.toGo = 10; g.qtr = 1; g.clock = 600; return g; };

test("a run and a catch are booked at the field's yards, long or short", () => {
  for (const [call, type, yards] of [["run_inside", "run", 7], ["run_outside", "run", 38], ["pass_medium", "pass", 23], ["pass_deep", "pass", 58]]) {
    let hit = 0;
    for (let i = 0; i < 20 && hit < 3; i++) {
      const g = fresh(i), start = g.yard;
      const r = resolvePlay(g, call, { types: [type], yards, tol: 0 }, { yards, inBounds: true }, 40);
      if (r.ev?.type !== type) continue;
      hit++; assert.equal(r.ev.yards, yards, `${call}: ${r.ev.yards}`); if (!r.ev.pen) assert.equal(g.yard, start + yards); else assert.ok(g.yard >= start + yards); // (a flag after the play, roughness or a face mask, tacks yards on: the spot is still where he went down)
    }
    assert.ok(hit >= 1, `${call}: no ${type} came up`);
  }
});

test("a sack is booked at the loss the field shows", () => {
  let hit = 0;
  for (let i = 0; i < 40 && hit < 3; i++) {
    const g = fresh(i), start = g.yard;
    const r = resolvePlay(g, "pass_deep", { types: ["sack"], yards: -3, tol: 0 }, { sackLoss: 3 }, 60);
    if (r.ev?.type !== "sack") continue;
    hit++; assert.equal(r.ev.yards, -3); assert.equal(g.yard, start - 3);
  }
  assert.ok(hit >= 1, "no sack came up");
});

// ...and who made the play: the sack, the tackle (and the man who helped), the pick and the breakup go to
// the defenders who made them on the field, not to whoever the engine's own dice picked
import { lineups } from "../src/arcade/bridge.js";
const defMan = (g, pos, k = 0) => lineups(g).def[pos][k];

test("the sack, the tackle, the assist, the pick and the breakup are credited to the field's men", () => {
  // the tackle (and an assist) on a run
  { let hit = 0;
    for (let i = 0; i < 20 && hit < 3; i++) {
      const g = fresh(i), lb = defMan(g, "LB", 1), cb = defMan(g, "CB", 0);
      const r = resolvePlay(g, "run_inside", { types: ["run"], yards: 4, tol: 0 }, { yards: 4, inBounds: true, tackleBy: lb.id, astBy: cb.id }, 30);
      if (r.ev?.type !== "run") continue;
      hit++; assert.equal(r.ev.tkl?.id, lb.id); assert.equal(r.ev.ast?.id, cb.id);
    }
    assert.ok(hit >= 1); }
  // the sack (all his: no half sack for a helper the field didn't show)
  { let hit = 0;
    for (let i = 0; i < 40 && hit < 3; i++) {
      const g = fresh(i), lb = defMan(g, "LB", 0);
      const r = resolvePlay(g, "pass_deep", { types: ["sack"], yards: -6, tol: 0 }, { sackLoss: 6, sackBy: lb.id, defBy: null }, 60);
      if (r.ev?.type !== "sack") continue;
      hit++; assert.equal(r.ev.rusher?.id, lb.id);
    }
    assert.ok(hit >= 1); }
  // the pick and the breakup: the man on the ball; a ball nobody touched: no breakup at all
  { let ints = 0, pds = 0, none = 0;
    for (let i = 0; i < 60 && (ints < 1 || pds < 2 || none < 2); i++) {
      const g = fresh(i), s = defMan(g, "S", 1);
      const r = resolvePlay(g, "pass_medium", { types: [i % 3 === 0 ? "int" : "inc"] }, { open: false, defBy: i % 3 === 2 ? null : s.id }, 60);
      if (r.ev?.type === "int") { ints++; assert.equal(r.ev.db?.id, s.id); }
      else if (r.ev?.type === "inc" && i % 3 === 2) { none++; assert.equal(r.ev.db ?? null, null); }
      else if (r.ev?.type === "inc") { pds++; assert.equal(r.ev.db?.id, s.id); }
    }
    assert.ok(ints >= 1 && pds >= 1 && none >= 1, `${ints} ${pds} ${none}`); }
});
