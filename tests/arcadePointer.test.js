// A click on the arcade canvas lands where it looks like it does, whatever size the canvas is shown at
// (the app scales the whole page with a CSS zoom for the window and the Display setting).
import test from "node:test";
import assert from "node:assert/strict";
import { ArcadeGame } from "../src/arcade/game.js";

const fake = (shown, laid) => ({ cv: { getBoundingClientRect: () => ({ left: 100, top: 50, width: shown.w, height: shown.h }) }, cam: { W: laid.w, H: laid.h } });

test("unscaled: the spot on the screen is the spot in the game", () => {
  const p = ArcadeGame.prototype.pt.call(fake({ w: 975, h: 548 }, { w: 975, h: 548 }), { clientX: 400, clientY: 150 });
  assert.deepEqual(p, { px: 300, py: 100 });
});

test("a page zoomed down (0.92) or up (1.15): the click is scaled back to the game's units", () => {
  for (const z of [0.92, 1.15, 1.2]) {
    const G = fake({ w: 804 * z, h: 452 * z }, { w: 804, h: 452 });
    // the far corner of a button at (740,4)-(798,32) in the game, clicked where it shows on the screen
    const p = ArcadeGame.prototype.pt.call(G, { clientX: 100 + 795 * z, clientY: 50 + 30 * z });
    assert.ok(Math.abs(p.px - 795) < 1e-6 && Math.abs(p.py - 30) < 1e-6, `zoom ${z}: ${JSON.stringify(p)}`);
  }
});
