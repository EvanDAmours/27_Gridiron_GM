// Play the moments (src/arcade/moments.js): the director that picks which drives of a franchise game
// you play on the arcade field.
import test from "node:test";
import assert from "node:assert/strict";
import { pickMoment, driveEnd, driveLine } from "../src/arcade/moments.js";

// a game's possessions, roughly as they come: about six a quarter, alternating, a score now and then
function game(seed, { lead = 0 } = {}) {
  let s = seed; const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const h = [], qLen = 900; let me = 0, them = lead > 0 ? 0 : -lead, mine = true; me = Math.max(0, lead);
  for (let q = 1; q <= 4; q++) for (let k = 0; k < 6; k++) {
    const clock = Math.round(qLen - (k + 0.5) * (qLen / 6));
    const r = pickMoment({ qtr: q, clock, qLen, me, them, mine, yard: rand() < 0.15 ? 55 : 25 }, h, rand);
    h.push({ q, play: r.play, mine, why: r.why, clock, diff: me - them });
    if (rand() < 0.35) { if (mine) me += rand() < 0.6 ? 7 : 3; else them += rand() < 0.6 ? 7 : 3; }
    mine = !mine;
  }
  return h;
}

test("the opening drive is always yours", () => {
  for (let i = 1; i < 50; i++) { const h = game(i * 7919); assert.equal(h[0].play, true); assert.equal(h[0].why, "The opening drive"); }
});

test("about two drives a quarter, at least one in every quarter, never more than the quota early", () => {
  let total = 0;
  for (let i = 1; i <= 300; i++) {
    const h = game(i * 104729);
    for (let q = 1; q <= 3; q++) {
      const n = h.filter((x) => x.q === q && x.play).length;
      assert.ok(n >= 1, `quarter ${q} of game ${i} had no moment`);
      assert.ok(n <= (q === 2 ? 3 : 2), `quarter ${q} of game ${i} had ${n}`);
    }
    total += h.filter((x) => x.play).length;
  }
  const avg = total / 300;
  assert.ok(avg >= 7 && avg <= 11, `a game averages ${avg.toFixed(1)} moments`);
});

test("a one-score fourth quarter late is always yours; a blowout's fourth gets one", () => {
  const close = pickMoment({ qtr: 4, clock: 200, qLen: 900, me: 17, them: 20, mine: true, yard: 25 }, [{ q: 4, play: true, mine: false }, { q: 4, play: true, mine: true }, { q: 4, play: true, mine: false }]);
  assert.equal(close.play, true); assert.match(close.why, /answer/);
  const hold = pickMoment({ qtr: 4, clock: 100, qLen: 900, me: 24, them: 20, mine: false }, [{ q: 4, play: true, mine: true }]);
  assert.equal(hold.play, true); assert.match(hold.why, /lead/i);
  const blow = pickMoment({ qtr: 4, clock: 500, qLen: 900, me: 38, them: 7, mine: true }, [{ q: 4, play: true, mine: false }, { q: 4, play: true, mine: true }]);
  assert.equal(blow.play, false);
  assert.equal(pickMoment({ qtr: 5, ot: true, clock: 500, qLen: 900, me: 20, them: 20, mine: false }, [{ q: 4, play: true }]).play, true);
});

test("offense and defense both come up", () => {
  let off = 0, def = 0;
  for (let i = 1; i <= 200; i++) for (const x of game(i * 31337)) if (x.play) { if (x.mine) off++; else def++; }
  const share = off / (off + def);
  assert.ok(share > 0.35 && share < 0.65, `offense share ${share.toFixed(2)}`);
});

test("a drive's read-out says how it ended", () => {
  assert.equal(driveEnd({ td: true }), "TOUCHDOWN");
  assert.equal(driveEnd({ type: "punt" }), "punt");
  assert.equal(driveEnd({ type: "int", turnover: true }), "interception");
  assert.equal(driveEnd({ type: "run", text: "Stuffed. Turnover on downs." }), "turnover on downs");
  assert.equal(driveEnd({ type: "run", yards: 4 }), null);
  assert.equal(driveLine({ plays: 1, yds: 1, end: "punt" }, "Jets"), "Jets: 1 play, 1 yard, punt");
});
