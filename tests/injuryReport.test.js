import { test } from "node:test";
import assert from "node:assert/strict";
import { applyLiveInjuries } from "../src/liveStart.js";

const team = (ab, ...names) => ({ ab, roster: names.map((name, i) => ({ id: `${ab}${i}`, name })) });
const report = (injuries) => ({ updated: "2026-10-28T16:00:00Z", injuries });

test("a player on the real injured reserve sits until his return date (Jalen Hurts, out for the season)", () => {
  const teams = [team("PHI", "Jalen Hurts", "Tanner McKee")];
  const r = applyLiveInjuries(teams, report([{ team: "PHI", name: "Jalen Hurts", status: "Injured Reserve", type: "Calf", ret: "2027-02-15" }]));
  const [hurts, mckee] = teams[0].roster;
  assert.equal(r.injured, 1);
  assert.ok(hurts.injured && hurts.injWk >= 15, `out ${hurts.injWk} weeks`);
  assert.equal(hurts.injType, "Calf");
  assert.ok(!mckee.injured);
});

test("a newer report never heals anyone or shortens a longer injury", () => {
  const teams = [team("DAL", "A", "B")];
  Object.assign(teams[0].roster[0], { injured: true, injWk: 6, injRecWks: 6, injType: "Knee" });
  Object.assign(teams[0].roster[1], { injured: true, injWk: 2, injType: "Ankle" });
  applyLiveInjuries(teams, report([{ team: "DAL", name: "A", status: "Out", ret: null }, { team: "DAL", name: "B", status: "Questionable" }]));
  assert.equal(teams[0].roster[0].injWk, 6);
  assert.equal(teams[0].roster[0].injType, "Knee");
  assert.ok(teams[0].roster[1].injured && !teams[0].roster[1].hurt);
});

test("the shipped report lists the long-term injured reserve the league page leaves off", async () => {
  const live = (await import("../src/data/live2026.json", { with: { type: "json" } })).default;
  const ir = (live.injuries || []).filter((x) => x.status === "Injured Reserve");
  assert.ok(ir.length > 100, `${ir.length} on injured reserve`);
});
