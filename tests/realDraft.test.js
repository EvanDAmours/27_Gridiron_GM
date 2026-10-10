import { test } from "node:test";
import assert from "node:assert/strict";
import REAL from "../src/data/realProspects.json" with { type: "json" };
import { genRealDC, REAL_DC_YEARS } from "../src/league.js";
import { publicPot } from "../src/scouting.js";

test("real draft classes cover the first two drafts", () => {
  assert.deepEqual(REAL_DC_YEARS, [2026, 2027]);
  assert.ok(REAL[2026].length >= 100 && REAL[2027].length >= 50);
  const names = new Set(REAL[2026].map((d) => d.name));
  assert.ok(REAL[2027].every((d) => !names.has(d.name)), "no prospect is in both classes");
});

test("a real class: 240 prospects, the real names on top in the real boards' order", () => {
  for (const yr of REAL_DC_YEARS) {
    const dc = genRealDC(yr);
    const real = REAL[yr];
    assert.equal(dc.length, 240);
    const byName = new Map(dc.map((p) => [p.name, p]));
    for (const d of real) {
      const p = byName.get(d.name);
      assert.ok(p, d.name);
      assert.equal(p.cons.mid, d.rank, `${d.name} keeps his board rank`);
      assert.equal(p.bio.college, d.college);
      assert.equal(publicPot(p), d.pot, "the board sees his listed ceiling");
    }
    assert.ok(dc.filter((p) => !p.real).every((p) => p.cons.mid > real.length), "generated depth stays below the real names");
  }
});

test("Claude's boom and bust calls are hidden gems and red flags", () => {
  const dc = genRealDC(2026);
  const real = REAL[2026];
  const booms = real.filter((d) => d.boom), busts = real.filter((d) => d.bust);
  assert.ok(booms.length >= 4 && busts.length >= 4);
  for (const d of booms) {
    const p = dc.find((x) => x.name === d.name);
    assert.ok(p.gem && p.truePot > d.pot && p.truePot === d.truePot);
  }
  for (const d of busts) {
    const p = dc.find((x) => x.name === d.name);
    assert.ok(p.bust && p.truePot < d.pot);
    assert.ok(p.trueOvr < p.truePot);
    assert.ok(["character", "medical", "oneyear", "system", "workout"].includes(p.bust.kind) && p.bust.why && !p.bust.why.endsWith("."));
  }
  assert.equal(dc.filter((p) => p.gem).length, booms.length, "no random gems on top of Claude's calls");
  assert.equal(dc.filter((p) => p.bust).length, busts.length, "no random busts on top of Claude's calls");
});
