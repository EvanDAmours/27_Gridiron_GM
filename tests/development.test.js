import test from "node:test";
import assert from "node:assert/strict";
import { focusChance, perSeason, runFocusWeeks } from "../src/development.js";

const player = (o) => ({ id: "p" + Math.random(), pos: "DL", age: 22, ovr: 80, pot: 90, dev: "superstar", ...o });

test("young, high-trait players gain fastest; veterans slowly", () => {
  const kid = player({});
  assert.ok(focusChance(player({ dev: "generational" })) > focusChance(kid));
  assert.ok(focusChance(kid) > focusChance(player({ dev: "normal" })));
  assert.ok(focusChance(kid) > focusChance(player({ age: 31 })));
  assert.ok(perSeason(kid) >= 2.5 && perSeason(kid) <= 5, `young superstar ~${perSeason(kid)}/season`);
  assert.ok(perSeason(player({ age: 31, dev: "normal" })) < 1);
});

test("only the focused players gain, and never past 99", () => {
  const off = player({ pos: "QB", ovr: 98, pot: 99, dev: "generational" });
  const def = player();
  const other = player();
  let total = 0;
  for (let i = 0; i < 40; i++) total += runFocusWeeks([off, def, other], { off: off.id, def: def.id }, 17).length;
  assert.ok(total > 0);
  assert.equal(other.ovr, 80);
  assert.ok(off.ovr <= 99);
  assert.ok(def.pot >= def.ovr);
  assert.ok(def.labGains > 0);
});

test("injured or missing players don't train", () => {
  const p = player({ injured: true });
  assert.deepEqual(runFocusWeeks([p], { off: p.id, def: "gone" }, 17), []);
  assert.equal(p.ovr, 80);
});
