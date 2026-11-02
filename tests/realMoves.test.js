// Real NFL transactions (realMoves.js) reach saves already in the 2026 season: AI clubs only,
// once each, rosters kept at 53, and your own roster is never touched.
import test from "node:test";
import assert from "node:assert/strict";
import { applyRealMoves } from "../src/realMoves.js";

const P = (name, pos, ovr) => ({ id: name, name, pos, ovr });
const club = (ab, extra = []) => ({ ab, roster: [...extra, ...Array.from({ length: 53 - extra.length }, (_, i) => P(`${ab} guy ${i}`, i % 2 ? "LB" : "WR", 60 + (i % 10)))], ps: [P(`${ab} ps LG`, "LG", 58), P(`${ab} ps DL`, "DL", 59)] });
const MOVES = [
  { id: "m1", name: "Quenton Nelson", pos: "LG", from: "IND", to: "SEA" },
  { id: "m2", name: "Najee Harris", pos: "RB", from: "NYG", to: "FA" },
  { id: "m3", name: "Andy Dalton", pos: "QB", from: "FA", to: "ATL" },
];
const save = (ui = 0) => ({ yr: 2026, sp: "regular", ui, fa: [P("Andy Dalton", "QB", 71), P("Depth OL", "LG", 64)], teams: [club("BUF"), club("IND", [P("Quenton Nelson", "LG", 95)]), club("SEA"), club("NYG", [P("Najee Harris", "RB", 77)]), club("ATL")] });
const where = (d, name) => d.teams.find((t) => t.roster.some((p) => p.name === name))?.ab ?? (d.fa.some((p) => p.name === name) ? "FA" : null);

test("a save before the deadline gets the real trades, releases and signings, once", () => {
  const d = save();
  const lines = applyRealMoves(d, () => null, MOVES, 2026);
  assert.equal(lines.length, 3);
  assert.equal(where(d, "Quenton Nelson"), "SEA");
  assert.equal(where(d, "Najee Harris"), "FA");
  assert.equal(where(d, "Andy Dalton"), "ATL");
  for (const t of d.teams) assert.equal(t.roster.length, 53, `${t.ab} keeps 53`);
  // the Colts call up their practice-squad guard for the guard they lost
  assert.ok(d.teams[1].roster.some((p) => p.name === "IND ps LG"));
  assert.equal(applyRealMoves(d, () => null, MOVES, 2026).length, 0, "only once");
});

test("your own club is left alone, and noted; a player already moved in your league stays put", () => {
  const d = save(1); // you're the Colts
  const lines = applyRealMoves(d, () => null, MOVES, 2026);
  assert.equal(where(d, "Quenton Nelson"), "IND");
  assert.match(lines[0], /In real life: Quenton Nelson .* Your roster is yours/);
  const e = save();
  const nelson = e.teams[1].roster.find((p) => p.name === "Quenton Nelson");
  e.teams[1].roster = e.teams[1].roster.filter((p) => p !== nelson); e.teams[0].roster.push(nelson); // you traded for him
  applyRealMoves(e, () => null, MOVES, 2026);
  assert.equal(where(e, "Quenton Nelson"), "BUF");
  assert.equal(applyRealMoves({ ...save(), yr: 2027 }, () => null, MOVES, 2026).length, 0, "a later season keeps its own rosters");
});

test("the data itself: the deadline deals are in, every club has 53 and one kicker", async () => {
  const M = (await import("../src/data/madden27.json", { with: { type: "json" } })).default;
  const ab = (n) => M.teams.find((t) => t.roster.some((p) => p.name === n))?.ab;
  assert.equal(ab("Quenton Nelson"), "SEA");
  assert.equal(ab("DeForest Buckner"), "SF");
  assert.equal(ab("Jeffery Simmons"), "CHI");
  for (const t of M.teams) { assert.equal(t.roster.length, 53, t.ab); assert.equal(t.roster.filter((p) => p.pos === "K").length, 1, `${t.ab} kicker`); }
});

test("a new league already has every real move: loading it changes nothing, even its preseason cuts", async () => {
  const { initTeams, initialFA } = await import("../src/league.js");
  const teams = initTeams(3), fa = initialFA();
  const d = { yr: 2026, ui: 3, teams: teams.map((t) => ({ ...t, roster: [...t.roster], ps: [...t.ps] })), fa: [...fa] };
  assert.deepEqual(applyRealMoves(d), []);
});

test("not in the playoffs or the off-season: the league's rosters have moved on", () => {
  for (const sp of ["playoffs", "draft", "free_agency"]) assert.equal(applyRealMoves({ ...save(), sp }, () => null, MOVES, 2026).length, 0, sp);
});

test("a real signing who has since gone on injured reserve isn't signed a second time", () => {
  const d = save();
  d.fa = d.fa.filter((p) => p.name !== "Andy Dalton");
  const k = { ...P("Zane Gonzalez", "K", 70), rm: [] };
  d.teams[4].ir = [k]; // he signed with Atlanta in this league and got hurt
  let made = 0;
  const lines = applyRealMoves(d, (name, pos) => { made++; return P(name, pos, 70); }, [{ id: "k1", name: "Zane Gonzalez", pos: "K", from: "FA", to: "ATL" }], 2026);
  assert.equal(made, 0, "no new copy of him");
  assert.equal(lines.length, 0);
  assert.equal(d.teams.flatMap((t) => [...t.roster, ...(t.ir || [])]).filter((p) => p.name === "Zane Gonzalez").length, 1);
});
