// Play in Arcade: a franchise game on the arcade field. You always play side "h" there, so a road
// game is built the other way round and turned back before it's booked; home field stays with the
// real home team; the franchise's own sides (depth charts, injuries) line up on the field.
import test from "node:test";
import assert from "node:assert/strict";
import { initTeams, calibrateLeague, gameSetup } from "../src/league.js";
import { createGame, step, homeEdge, HOME_EDGE } from "../src/playsim.js";
import { franchiseGame, finishWithEngine, toSeason, flipSides, logFromPlays } from "../src/arcade/franchise.js";
import { lineups, simOpponentDrive } from "../src/arcade/bridge.js";
import { setupPlay, snap, tick } from "../src/arcade/play.js";

const seeded = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);
const league = () => { const t = initTeams(-1); calibrateLeague(t); return t; };
const ids = (team) => new Set(team.roster.map((p) => String(p.id)));

test("on the road: you play side h, and the box score, stats and score go back to the right clubs", () => {
  const teams = league(), nyg = teams.find((t) => t.ab === "NYG"), dal = teams.find((t) => t.ab === "DAL");
  const game = { wk: 9, h: teams.indexOf(dal), a: teams.indexOf(nyg) }; // the Giants (you) at Dallas
  const su = gameSetup(dal, nyg, null, null, "clear");
  const g = franchiseGame(su, game, false, { rand: seeded(7) });
  assert.equal(g.sides.h.team.ab ?? g.sides.h.team.name, nyg.ab ?? nyg.name, "you're side h on the field");
  assert.equal(g.homeSide, "a", "home field stays with Dallas");
  // your drives on the field (the engine books each), theirs by the engine, as the arcade does
  let n = 0;
  while (!g.done && n++ < 400) {
    if (g.patPending) { step(g); continue; }
    if (g.koNext || g.poss !== "h") { simOpponentDrive(g); continue; }
    const P = setupPlay(g, lineups(g), n % 3 ? "pass_quick" : "run_inside");
    snap(P); for (let i = 0; i < 1800 && P.phase !== "done"; i++) tick(P, 1 / 60);
  }
  finishWithEngine(g);
  assert.ok(g.done);
  const final = { ...g.score }, lastS = g.pl[g.pl.length - 1].s, homeTds = (g.stats.a.passTD || 0) + (g.stats.a.rushTD || 0);
  toSeason(g, false);
  assert.deepEqual(g.score, { h: final.a, a: final.h }, "the score the real way round");
  assert.equal((g.stats.h.passTD || 0) + (g.stats.h.rushTD || 0), homeTds, "stats the real way round");
  for (const id of Object.keys(g.box.h)) assert.ok(ids(dal).has(String(id)), `home box has a Cowboy (${id})`);
  for (const id of Object.keys(g.box.a)) assert.ok(ids(nyg).has(String(id)), `away box has a Giant (${id})`);
  assert.deepEqual(g.pl[g.pl.length - 1].s, [lastS[1], lastS[0]], "play log scores read [home, away]");
  assert.equal(g.patDefer, undefined); assert.equal(g.homeSide, "h");
  assert.ok(logFromPlays(g).length > 50);
});

test("the franchise's own sides line up on the arcade field, injuries and all", () => {
  const teams = league(), nyg = teams.find((t) => t.ab === "NYG"), hou = teams.find((t) => t.ab === "HOU");
  // hurt the Giants' top receiver and quarterback: gameSetup leaves them out
  const qb = nyg.roster.filter((p) => p.pos === "QB").sort((a, b) => b.ovr - a.ovr)[0];
  const wr = nyg.roster.filter((p) => p.pos === "WR").sort((a, b) => b.ovr - a.ovr)[0];
  qb.injured = true; qb.injWk = 2; wr.injured = true; wr.injWk = 2;
  const su = gameSetup(nyg, hou, null, null, "clear");
  const g = franchiseGame(su, { wk: 9, h: teams.indexOf(nyg), a: teams.indexOf(hou) }, true, { rand: seeded(11) });
  g.koNext = false; g.poss = "h"; g.yard = 30;
  const L = lineups(g);
  const on = Object.values(L.off);
  assert.equal(on.filter(Boolean).length, 11, "eleven on offense");
  assert.ok(!on.some((p) => p.id === qb.id || p.id === wr.id), "nobody hurt plays");
  assert.ok(Object.values(L.cover).every(Boolean), "every receiver has a cover man");
  const before = g.plays;
  const P = setupPlay(g, L, "pass_medium"); snap(P);
  for (let i = 0; i < 1800 && P.phase !== "done"; i++) tick(P, 1 / 60);
  assert.equal(P.phase, "done"); assert.equal(g.plays, before + 1, "one engine play booked");
});

test("home field goes to the real home team when you're the away side", () => {
  const teams = league(), su = gameSetup(teams[0], teams[1], null, null, "clear");
  const road = createGame(su.away, su.home, { rand: seeded(5), homeSide: "a" }); // you (the visitors) as h
  road.poss = "h"; assert.equal(homeEdge(road), 0, "no home edge for you on the road");
  road.poss = "a"; assert.equal(homeEdge(road), HOME_EDGE, "the hosts keep theirs");
  const home = createGame(su.home, su.away, { rand: seeded(5) });
  home.poss = "h"; assert.equal(homeEdge(home), HOME_EDGE, "a normal game is unchanged");
  const sb = createGame(su.home, su.away, { rand: seeded(5), neutral: true, homeSide: "a" });
  sb.poss = "a"; assert.equal(homeEdge(sb), 0, "nobody's at a neutral site");
  const su2 = gameSetup(teams[1], teams[0], null, null, "clear");
  assert.equal(franchiseGame(su2, { wk: 3, h: 1, a: 0 }, false).homeSide, "a");
  assert.equal(franchiseGame(su2, { wk: 3, h: 1, a: 0 }, true).homeSide, "h");
});

test("a saved game turns round and back unchanged", () => {
  const teams = league(), a = teams[3], b = teams[20];
  const su = gameSetup(a, b, null, null, "clear");
  const g = createGame(su.home, su.away, { rand: seeded(3), rec: true });
  for (let i = 0; i < 60; i++) step(g);
  const fields = ["score", "box", "stats", "to", "poss", "firstPoss", "pl"];
  const pick = () => Object.fromEntries(fields.map((k) => [k, structuredClone(g[k])]));
  const orig = pick(), r = pick();
  flipSides(r);
  assert.deepEqual(r.score, { h: orig.score.a, a: orig.score.h });
  assert.equal(r.poss, orig.poss === "h" ? "a" : "h");
  flipSides(r);
  assert.deepEqual(r, orig);
});

test("a club with linemen hurt still lines up five, and the snap doesn't trip on it", () => {
  const teams = league(), kc = teams.find((t) => t.ab === "KC"), nyj = teams.find((t) => t.ab === "NYJ");
  // three starting linemen out
  const ol = kc.roster.filter((p) => ["LT", "LG", "C", "RG", "RT", "OL", "G", "T"].includes(p.pos)).sort((a, b) => b.ovr - a.ovr).slice(0, 3);
  for (const p of ol) { p.injured = true; p.injWk = 3; }
  const su = gameSetup(kc, nyj, null, null, "clear");
  const g = franchiseGame(su, { wk: 9, h: teams.indexOf(kc), a: teams.indexOf(nyj) }, true, { rand: seeded(19) });
  g.koNext = false; g.poss = "h"; g.yard = 30;
  const L = lineups(g);
  assert.equal(["LT", "LG", "C", "RG", "RT"].filter((k) => L.off[k]).length, 5, "five on the line");
  assert.ok(!["LT", "LG", "C", "RG", "RT"].some((k) => ol.some((p) => p.id === L.off[k].id)), "nobody hurt plays");
  const P = setupPlay(g, L, "pass_medium"); snap(P);
  for (let i = 0; i < 1800 && P.phase !== "done"; i++) tick(P, 1 / 60);
  assert.equal(P.phase, "done");
});

test("with every quarterback out, someone still takes the snap", () => {
  const teams = league(), bal = teams.find((t) => t.ab === "BAL"), cin = teams.find((t) => t.ab === "CIN");
  for (const p of bal.roster.filter((x) => x.pos === "QB")) { p.injured = true; p.injWk = 2; }
  const su = gameSetup(bal, cin, null, null, "clear");
  const g = franchiseGame(su, { wk: 9, h: teams.indexOf(bal), a: teams.indexOf(cin) }, true, { rand: seeded(23) });
  g.koNext = false; g.poss = "h"; g.yard = 30;
  const L = lineups(g);
  for (const k of ["QB", "RB", "X", "Z", "SLOT", "TE", "LT", "LG", "C", "RG", "RT"]) assert.ok(L.off[k], `${k} filled`);
  const P = setupPlay(g, L, "run_inside"); snap(P);
  for (let i = 0; i < 1800 && P.phase !== "done"; i++) tick(P, 1 / 60);
  assert.equal(P.phase, "done");
});

test("the engine puts an emergency quarterback under center when every QB is hurt", () => {
  const teams = league(), bal = teams.find((t) => t.ab === "BAL"), cin = teams.find((t) => t.ab === "CIN");
  for (const p of bal.roster.filter((x) => x.pos === "QB")) { p.injured = true; p.injWk = 2; }
  const su = gameSetup(bal, cin, null, null, "clear");
  assert.ok(su.home.qb && su.home.qb.emergencyQB && su.home.qb.ovr <= 52, "an emergency QB, rated like one");
  const g = createGame(su.home, su.away, { rand: seeded(29) });
  while (!g.done) step(g);
  const passer = Object.values(g.box.h).find((l) => (l.att || 0) > 0);
  assert.ok(passer && passer.name && passer.name !== "QB", "his passes are his");
});
