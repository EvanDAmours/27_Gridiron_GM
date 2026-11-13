// Easy Mode's week in review (src/weekRecap.js).
import test from "node:test";
import assert from "node:assert/strict";
import { weekRecap } from "../src/weekRecap.js";

const team = (w, l, roster = []) => ({ w, l, t: 0, roster });
test("your stars, the players of the week, the upset, the game of the week and the milestones", () => {
  const back = { id: "rb1", name: "Big Back", pos: "RB", ss: { rushYds: 1040 } };
  const teams = [team(4, 6, [back]), team(8, 2), team(5, 5), team(5, 5)];
  const g1 = { h: 0, a: 1, hs: 24, as: 20, boxH: { rb1: { name: "Big Back", pos: "RB", rushAtt: 25, rushYds: 160, rushTD: 2 }, qb0: { name: "Our QB", pos: "QB", att: 30, comp: 20, passYds: 210, passTD: 1 } }, boxA: { lb9: { name: "Their LB", pos: "LB", tkl: 11, sacks: 2 } } };
  const g2 = { h: 2, a: 3, hs: 31, as: 30, boxH: { wr2: { name: "Wideout", pos: "WR", rec: 9, recYds: 140, recTD: 1 } }, boxA: { cb3: { name: "Corner", pos: "CB", tkl: 4, ints: 2, pd: 3 } } };
  const r = weekRecap([g1, g2], teams, 0);
  assert.equal(r.mine, g1);
  assert.equal(r.stars[0].name, "Big Back"); assert.equal(r.stars.length, 2);
  assert.equal(r.potw.off.name, "Big Back");
  assert.ok(["Their LB", "Corner"].includes(r.potw.def.name));
  // the 3-6 club beat the 8-1 club: the upset; the other game (by one) is the game of the week
  assert.equal(r.upset.w, 0); assert.equal(r.upset.l, 1); assert.equal(r.gotw, g2);
  // 1,040 rushing yards, 160 of them this week: over 1,000 this week
  assert.equal(r.milestones.length, 1); assert.match(r.milestones[0].text, /over 1,000 rushing yards \(1,040\)/);
});

test("one milestone line per kind of mark, at most three; exactly on the mark reads 'reached'", () => {
  const backs = [1, 2, 3, 4].map((i) => ({ id: `b${i}`, name: `Back ${i}`, pos: "RB", ss: { rushTD: 10 } }));
  const qb = { id: "q", name: "Q", pos: "QB", ss: { passYds: 4100 } };
  const teams = [team(5, 5, [...backs, qb]), team(5, 5)];
  const g = { h: 0, a: 1, hs: 20, as: 17, boxA: {}, boxH: Object.fromEntries([...backs.map((b) => [b.id, { name: b.name, pos: "RB", rushAtt: 10, rushYds: 40, rushTD: 1 }]), ["q", { name: "Q", pos: "QB", att: 30, passYds: 300 }]]) };
  const m = weekRecap([g], teams, 1).milestones;
  assert.equal(m.length, 2);
  assert.match(m[0].text, /Q went over 4,000 passing yards \(4,100\)/);
  assert.match(m[1].text, /reached 10 rushing touchdowns$/);
});

test("no milestone for a mark passed before this week; nothing to say about a week not played", () => {
  const p = { id: "q", name: "Q", pos: "QB", ss: { passYds: 3400 } };
  const teams = [team(1, 1, [p]), team(1, 1)];
  const g = { h: 0, a: 1, hs: 10, as: 7, boxH: { q: { name: "Q", pos: "QB", att: 30, passYds: 250 } }, boxA: {} };
  assert.equal(weekRecap([g], teams, 0).milestones.length, 0); // (3,150 before the game: 3,000 was last week's)
  assert.equal(weekRecap([{ h: 0, a: 1 }], teams, 0), null);
});

test("a playoff round: no milestones (the season totals are the regular season's), the records stand as they are", () => {
  const back = { id: "rb1", name: "Big Back", pos: "RB", ss: { rushYds: 1040 } };
  const teams = [{ w: 10, l: 7, roster: [back] }, { w: 15, l: 2, roster: [] }];
  const g = { h: 1, a: 0, hs: 20, as: 25, rd: 2, boxA: { rb1: { name: "Big Back", pos: "RB", rushAtt: 20, rushYds: 160 } }, boxH: {} };
  const r = weekRecap([g], teams, 0, { playoff: true });
  assert.equal(r.milestones.length, 0);
  assert.equal(r.upset.w, 0); assert.ok(Math.abs(r.upset.gap - (15 / 17 - 10 / 17)) < 1e-9);
});
