import test from "node:test";
import assert from "node:assert/strict";
import { initTeams, TEAMS } from "../src/league.js";
import { REAL_STAFF } from "../src/data/realCoaches.js";
import { repairSave } from "../src/repair.js";

test("every club has a real 2026 staff", () => {
  for (const t of TEAMS) assert.equal(REAL_STAFF[t.ab]?.length, 4, t.ab);
});

test("new leagues start with real head coaches and coordinators", () => {
  const teams = initTeams(0);
  const kc = teams.find((t) => t.ab === "KC");
  assert.equal(kc.coach.hc.name, "Andy Reid");
  assert.equal(kc.coach.dc.name, "Steve Spagnuolo");
  assert.equal(kc.coach.dc.scheme, "Zone Blitz");
  for (const t of teams) for (const r of ["hc", "oc", "dc", "st"]) assert.ok(t.coach[r]?.name && t.coach[r].rating > 0, `${t.ab} ${r}`);
});

test("old saves get a head coach and keep their coordinators", () => {
  const d = { teams: [{ ab: "SF", roster: [], ps: [], ir: [], coach: { oc: { name: "Old OC", rating: 70 } } }] };
  repairSave(d);
  assert.equal(d.teams[0].coach.hc.name, "Kyle Shanahan");
  assert.equal(d.teams[0].coach.oc.name, "Old OC");
});
