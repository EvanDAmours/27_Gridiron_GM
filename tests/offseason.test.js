import test from "node:test";
import assert from "node:assert/strict";
import { openFreeAgency, aiSignings, fillRosters, ROSTER_MIN, ROSTER_TARGET } from "../src/offseason.js";
import { leagueCap } from "../src/cap.js";

let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const POS = Object.keys(ROSTER_MIN);
let id = 0;
function league() {
  return Array.from({ length: 32 }, (_, i) => ({
    id: i,
    roster: POS.flatMap((pos) => Array.from({ length: ROSTER_MIN[pos] + 1 }, () => ({ id: `p${id++}`, pos, ovr: 50 + Math.floor(rand() * 45), age: 22 + Math.floor(rand() * 14), contract: 1 + Math.floor(rand() * 4), salary: 2 }))),
  }));
}
const capSpace = (t) => leagueCap() - t.roster.reduce((s, p) => s + p.salary, 0);

test("free agency: contracts lose a year, expiring players re-sign, retire or hit the market", () => {
  const teams = league();
  const before = teams.flatMap((t) => t.roster).length;
  const r = openFreeAgency(teams, 0, 2026, rand);
  const after = r.teams.flatMap((t) => t.roster);
  assert.equal(after.length + r.pool.length + r.retired.length, before, "nobody appears or vanishes");
  assert.ok(after.every((p) => p.contract >= 1 && p.cy === 2027));
  assert.ok(r.pool.every((p) => p.contract === 0 && p.formerTeam != null));
  assert.ok(r.resigned.every(({ team }) => team !== 0), "only AI clubs auto-re-sign");
  assert.deepEqual(r.mine.map((p) => p.id).sort(), r.pool.filter((p) => p.formerTeam === 0).map((p) => p.id).sort());
});

test("signings and roster fill only use players from the pool", () => {
  const teams = league();
  const r = openFreeAgency(teams, 0, 2026, rand);
  const ids = new Set(r.pool.map((p) => p.id));
  const kept = new Set(r.teams.flatMap((t) => t.roster).map((p) => p.id));
  const s1 = aiSignings(r.teams, r.pool, 0, { capSpace, cy: 2027, skip: (p) => p.formerTeam === 0, rand });
  assert.ok(s1.length > 0);
  assert.ok(s1.every(({ p, from }) => ids.has(p.id) && from !== 0));
  const s2 = fillRosters(r.teams, r.pool, 0, { capSpace, cy: 2027, rand });
  assert.ok([...s1, ...s2].every(({ p }) => ids.has(p.id)), "no invented players");
  for (const [i, t] of r.teams.entries()) {
    assert.equal(new Set(t.roster.map((p) => p.id)).size, t.roster.length, "no duplicates");
    if (i !== 0 && r.pool.length) assert.ok(t.roster.length >= ROSTER_TARGET || (t.roster.length >= 48 && capSpace(t) < 15), `team ${i}: ${t.roster.length} players, cap space ${capSpace(t)}`); // full, or trimmed to fit the cap
    assert.ok(t.roster.every((p) => kept.has(p.id) || ids.has(p.id)));
  }
});

test("the best free agents sign where they'd start; cut-down day trims AI clubs to 53", async () => {
  const { starterSignings } = await import("../src/offseason.js");
  const teams = league();
  const r = openFreeAgency(teams, 0, 2026, rand);
  r.pool.unshift({ id: "star", pos: "QB", ovr: 99, age: 27, salary: 5, contract: 0 });
  const s = starterSignings(r.teams, r.pool, 0, { capSpace, cy: 2027, rand });
  assert.ok(s.some(({ p }) => p.id === "star"), "a 99 QB gets signed");
  r.teams[1].roster.push(...Array.from({ length: 20 }, (_, k) => ({ id: `x${k}`, pos: "WR", ovr: 40, age: 25, contract: 2, salary: 1 })));
  fillRosters(r.teams, r.pool, 0, { capSpace, cy: 2027, rand });
  // 53 each, unless a club had to trim to get back under the cap (never below 48).
  assert.ok(r.teams.slice(1).every((t) => t.roster.length === ROSTER_TARGET || (t.roster.length >= 48 && capSpace(t) < 15)));
  assert.ok(r.teams.slice(1).every((t) => t.roster.length <= ROSTER_TARGET), "never more than 53");
});

test("AI clubs keep their young stars; veterans and cap-strapped stars reach the market", async () => {
  const { keepChance } = await import("../src/offseason.js");
  assert.ok(keepChance({ pos: "DL", ovr: 94, age: 24 }) >= 0.95, "Will Anderson-type stays");
  assert.ok(keepChance({ pos: "TE", ovr: 99, age: 26 }) >= 0.95, "Trey McBride-type stays");
  assert.ok(keepChance({ pos: "QB", ovr: 92, age: 30 }) >= 0.95, "QBs age later");
  assert.ok(keepChance({ pos: "DL", ovr: 95, age: 35 }) <= 0.25, "aging stars often hit the market");
  // A young star on a club right at the cap: the club makes cap casualties to keep him.
  const star = { id: "s", pos: "DL", ovr: 95, age: 24, contract: 1, salary: 5 };
  const filler = Array.from({ length: 50 }, (_, k) => ({ id: `f${k}`, pos: "WR", ovr: 70, age: 27, contract: 3, salary: 5 }));
  let kept = 0;
  for (let n = 0; n < 50; n++) {
    const r = openFreeAgency([{ id: 0, roster: [] }, { id: 1, roster: [star, ...filler.map((f) => ({ ...f }))] }], 0, 2026, rand, { cap: 301.2 });
    if (r.teams[1].roster.some((p) => p.id === "s")) kept++;
  }
  assert.ok(kept >= 45, `kept ${kept}/50`);
  // Truly cap-strapped (every dollar committed to non-stars): he reaches the market.
  const broke = openFreeAgency([{ id: 0, roster: [] }, { id: 1, roster: [star, ...filler.map((f) => ({ ...f, salary: 5.9 }))] }], 0, 2026, rand, { cap: 301.2 });
  assert.ok(broke.pool.some((p) => p.id === "s"));
});
