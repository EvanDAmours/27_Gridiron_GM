// Training camp and the staff budget (camp.js): every club gets the same camp, it pays off in the
// off-season within each player's age and ceiling, and a full camp is worth a few points across a
// young core, not a jump for the whole roster.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { staffBudget, campSessions, campGain, expectedGain, autoCamp, runCamps, campOf, applyCamp, sessionOdds, MAX_PER_PLAYER } from "../src/camp.js";

const M = JSON.parse(readFileSync(new URL("../src/data/madden27.json", import.meta.url)));
let seed = 9;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const roster = (ab) => M.teams.find((t) => t.ab === ab).roster.map((p, i) => ({ ...p, id: `${ab}-${i}`, pot: p.ovr + (p.age <= 24 ? 8 : p.age <= 27 ? 3 : 0), truePot: p.ovr + (p.age <= 24 ? 8 : p.age <= 27 ? 3 : 0) }));

test("the staff budget is a fixed yearly amount from the staff, not from winning", () => {
  assert.equal(staffBudget({ coach: { hc: { rating: 75 }, oc: { rating: 75 }, dc: { rating: 75 } } }), 12);
  assert.ok(staffBudget({ coach: { hc: { rating: 95 }, oc: { rating: 95 }, dc: { rating: 95 } } }) <= 18);
  assert.ok(staffBudget({ coach: { hc: { rating: 55 }, oc: { rating: 55 }, dc: { rating: 55 } } }) >= 8);
  assert.equal(campSessions({ coach: { hc: { rating: 70 } } }), 8);
  assert.equal(campSessions({ coach: { hc: { rating: 90, spec: "Player Developer" } } }), 12);
});

test("camp work is capped by age and ceiling", () => {
  const kid = { id: 1, pos: "WR", age: 22, ovr: 70, pot: 82, truePot: 82, camp: { yr: 2026, n: 3 } };
  const capped = { ...kid, ovr: 82 };
  const vet = { id: 2, pos: "RB", age: 31, ovr: 80, pot: 80, camp: { yr: 2026, n: 3 } };
  let k = 0, v = 0, vUp = 0;
  for (let i = 0; i < 2000; i++) { k += campGain(kid, 0, 2026, rand); assert.equal(campGain(capped, 0, 2026, rand), 0); const g = campGain(vet, -3, 2026, rand); v += g; if (campGain(vet, 1, 2026, rand) > 0) vUp++; }
  assert.ok(k / 2000 > 0.8 && k / 2000 < 1.3, `a young player's three sessions are worth ${(k / 2000).toFixed(2)}`);
  assert.ok(v / 2000 > 0.3 && v / 2000 < 1, `a veteran's hold off ${(v / 2000).toFixed(2)} of decline`);
  assert.equal(vUp, 0, "a veteran past his prime never grows from camp");
  assert.equal(campGain({ ...kid, camp: { yr: 2025, n: 3 } }, 0, 2026, rand), 0, "last year's camp doesn't count");
  // diminishing returns: the third session is worth half the first
  assert.ok(expectedGain(kid, 3) < 3 * expectedGain(kid, 1));
});

test("a full camp is worth a few points across a club's young core, the same for every club", () => {
  for (const ab of ["DET", "KC", "NYG", "CHI"]) {
    const r = roster(ab), n = campSessions({ coach: { hc: { rating: 80 } } });
    const alloc = autoCamp(r, n);
    const total = Object.values(alloc).reduce((a, b) => a + b, 0);
    assert.equal(total, n, `${ab} uses every session`);
    assert.ok(Object.values(alloc).every((x) => x <= MAX_PER_PLAYER));
    const gain = Object.entries(alloc).reduce((t, [id, x]) => t + expectedGain(r.find((p) => p.id === id), x), 0);
    assert.ok(gain > 1.5 && gain < 4.6, `${ab}: a full camp is worth ${gain.toFixed(1)} points`);
    // the staff spends it on the young players with room to grow
    const young = Object.keys(alloc).filter((id) => r.find((p) => p.id === id).age <= 25).length;
    assert.ok(young >= Object.keys(alloc).length / 2, `${ab}: mostly young players (${young}/${Object.keys(alloc).length})`);
  }
});

test("your sessions stay where you put them; the staff fills the rest at kickoff, and every club gets a camp", () => {
  const teams = ["DET", "KC", "NYG"].map((ab) => ({ ab, coach: { hc: { rating: 70 } }, roster: roster(ab) }));
  const mine = teams[1].roster.find((p) => sessionOdds(p) > 0);
  teams[1].roster = applyCamp(teams[1].roster, { [mine.id]: 2 }, 2026);
  const filled = runCamps(teams, 1, 2026);
  assert.equal(filled, 6);
  assert.equal(campOf(teams[1].roster, 2026)[mine.id] >= 2, true);
  for (const t of teams) assert.equal(Object.values(campOf(t.roster, 2026)).reduce((a, b) => a + b, 0), 8, `${t.ab} ran a full camp`);
});
