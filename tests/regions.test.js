import { test } from "node:test";
import assert from "node:assert/strict";
import { genDC } from "../src/league.js";
import { scoutRegion, regionOf, prospectRead, regionRead, creditWeeks, startScoutingYear, RTRIP_COST, MAX_TRIPS } from "../src/scouting.js";

const cls = genDC(2030);
const sec = cls.filter((p) => regionOf(p) === "SEC");

test("a trip gives a rough read on every prospect in the region, and only there", () => {
  let sc = startScoutingYear({}, 2030);
  assert.ok(sec.every((p) => prospectRead(sc, p).pot === "??"));
  const r = scoutRegion(sc, "regular", "SEC", 2030, 2030);
  assert.ok(r.ok); sc = r.sc;
  assert.equal(sc.rpts, 2 - RTRIP_COST);
  assert.ok(sec.every((p) => prospectRead(sc, p).pot !== "??" && prospectRead(sc, p).regional));
  assert.ok(cls.filter((p) => regionOf(p) === "B1G").every((p) => prospectRead(sc, p).pot === "??"));
});

test("more trips sharpen the reads and find the region's sleepers", () => {
  const err = (t) => { const sc = { regionsYr: 2030, regions: { SEC: t, B1G: t, ACC: t, B12: t, PAC: t, G5: t } }; const ps = cls.filter((p) => regionRead(sc, p)); return ps.reduce((s, p) => s + Math.abs(regionRead(sc, p).pot - p.truePot), 0) / ps.length; };
  assert.ok(err(1) > err(MAX_TRIPS) + 1.5, `${err(1)} vs ${err(MAX_TRIPS)}`);
  let gems = 0, found = 0;
  for (let y = 0; y < 10; y++) for (const p of genDC(2100 + y)) if (p.gem && regionOf(p) !== "OTH") { gems++; const r = regionRead({ regionsYr: p.draftYear, regions: { [regionOf(p)]: MAX_TRIPS } }, p); if (r.hunch) found++; }
  assert.ok(found / gems > 0.5, `${found}/${gems}`);
});

test("area points come in weekly, trips are limited, and nothing after the draft starts", () => {
  let sc = creditWeeks(startScoutingYear({}, 2030), 6);
  assert.equal(sc.rpts, 8);
  for (let i = 0; i < MAX_TRIPS; i++) sc = scoutRegion(sc, "regular", "ACC", 2030, 2030).sc;
  assert.ok(!scoutRegion(sc, "regular", "ACC", 2030, 2030).ok);
  assert.ok(!scoutRegion(sc, "draft", "SEC", 2030, 2030).ok);
});
