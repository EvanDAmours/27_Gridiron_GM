// Situational specialists (specialists.js): they're on the field for their downs, so they get those
// carries, targets and sacks and the snaps that go with them, and a better specialist wins more of
// those downs.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makeSide, createGame, step } from "../src/playsim.js";
import { teamSnaps } from "../src/snaps.js";
import { specialistOrder, resolveSpecs, specFit, applySubSnaps, isSpec, powerOf } from "../src/specialists.js";

const M = JSON.parse(readFileSync(new URL("../src/data/madden27.json", import.meta.url)));
let seed = 3;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const club = (ab, depthOrder = {}, tweak = (r) => r) => {
  const t = M.teams.find((x) => x.ab === ab);
  const roster = tweak(t.roster.map((p, i) => ({ ...p, posAttrs: p.attrs, id: `${ab}-${i}` })));
  const order = (pos) => (isSpec(pos) ? specialistOrder(roster, depthOrder, pos) : roster.filter((p) => p.pos === pos).sort((a, b) => (a.dk ?? 99) - (b.dk ?? 99) || b.ovr - a.ovr));
  const snaps = teamSnaps(order, {});
  return { roster, order, snaps, side: makeSide({ team: t, order, snaps }) };
};
// play n games, calling see(ev, before, side) for every snap; returns the games
function games(home, away, n, see) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const g = createGame(home.side, away.side, { rand });
    while (!g.done) { const b = { down: g.down, toGo: g.toGo, yard: g.yard, poss: g.poss }; const ev = step(g); if (ev && see) see(ev, b); }
    out.push(g);
  }
  return out;
}

test("the staff picks the right man for each job, and only when he's better at it than the starter", () => {
  const phi = club("PHI");
  const specs = resolveSpecs((r) => phi.order(r), phi.order);
  for (const role of ["PWHB", "RB3D"]) if (specs[role]) assert.ok(specFit(specs[role], role) >= specFit(specs.rb1, role) + 3, `${role} ${specs[role].name}`);
  // a back built for the pile beats a scatback at power back, and the other way round at 3rd down
  const thumper = { pos: "RB", ovr: 72, str: 88, spd: 82, posAttrs: { breakTkl: 92, stiffArm: 90, balance: 88, receiving: 45, passBlock: 50 } };
  const scat = { pos: "RB", ovr: 76, str: 60, spd: 93, posAttrs: { breakTkl: 70, stiffArm: 55, balance: 75, receiving: 85, passBlock: 72 } };
  assert.ok(specFit(thumper, "PWHB") > specFit(scat, "PWHB") + 8);
  assert.ok(specFit(scat, "RB3D") > specFit(thumper, "RB3D") + 8);
});

test("specialists get their downs: the power back's short-yardage carries, the 3rd-down back's targets, and their snaps", () => {
  // Philadelphia with its backups in the specialist spots
  const rbs = M.teams.find((x) => x.ab === "PHI").roster.map((p, i) => ({ ...p, id: `PHI-${i}` })).filter((p) => p.pos === "RB").sort((a, b) => (a.dk ?? 99) - (b.dk ?? 99));
  const [rb1, pw, third] = rbs;
  const phi = club("PHI", { PWHB: [pw.id], RB3D: [third.id] });
  const opp = club("DAL");
  const short = {}, thirdLong = {}, early = {};
  const gs = games(phi, opp, 40, (ev, b) => {
    if (b.poss !== "h" || !ev.player || !["run", "pass", "td"].includes(ev.type === "td" ? ev.k : ev.type)) return;
    if (ev.player.pos !== "RB") return;
    const bucket = b.down >= 3 && b.toGo <= 2 ? short : b.down >= 3 && b.toGo >= 6 ? thirdLong : b.down === 1 ? early : null;
    if (bucket) bucket[ev.player.id] = (bucket[ev.player.id] || 0) + 1;
  });
  const share = (o, id) => (o[id] || 0) / Math.max(1, Object.values(o).reduce((a, b) => a + b, 0));
  assert.ok(share(short, pw.id) > 0.7, `power back's share of short-yardage touches ${share(short, pw.id).toFixed(2)}`);
  assert.ok(share(thirdLong, third.id) > 0.7, `3rd-down back's share of 3rd-and-long touches ${share(thirdLong, third.id).toFixed(2)}`);
  assert.ok(share(early, rb1.id) > 0.5, `the starter still carries on first down ${share(early, rb1.id).toFixed(2)}`);
  // the snaps they played: the specialists gain, the starter gives some up
  const snaps = { ...phi.snaps };
  applySubSnaps(snaps, gs[0], "h");
  assert.ok((snaps[pw.id] || 0) + (snaps[third.id] || 0) > (phi.snaps[pw.id] || 0) + (phi.snaps[third.id] || 0), "specialists' snaps go up");
  assert.ok(snaps[rb1.id] < phi.snaps[rb1.id], "the starter's go down");
});

test("a real power back converts more short yardage, and a rush package gets home more on passing downs", () => {
  const conv = (power) => {
    const strong = (r) => r.map((p) => (p.pos === "RB" && p.dk === 2 ? { ...p, str: power ? 92 : 55, posAttrs: { ...p.posAttrs, breakTkl: power ? 95 : 50, stiffArm: power ? 92 : 50, balance: power ? 92 : 50 } } : p));
    const rb = M.teams.find((x) => x.ab === "PHI").roster.findIndex((p) => p.pos === "RB" && p.dk === 2);
    const phi = club("PHI", { PWHB: [`PHI-${rb}`] }, strong), opp = club("DAL");
    let n = 0, made = 0;
    games(phi, opp, 120, (ev, b) => { if (b.poss === "h" && b.toGo <= 2 && b.down >= 3 && ev.type !== "punt" && ev.k === "run" && !ev.keeper) { n++; if (ev.yards >= b.toGo || ev.td) made++; } });
    return made / n;
  };
  const hi = conv(true), lo = conv(false);
  assert.ok(hi > lo + 0.06, `short-yardage conversions with a power back ${hi.toFixed(2)} vs a weak one ${lo.toFixed(2)}`);
  assert.ok(powerOf({ str: 92, posAttrs: { breakTkl: 95, stiffArm: 92, balance: 92 } }) > 90);

  const sacks = (rush) => {
    // a pure pass rusher off the bench at both ends on passing downs, or no rush package
    const tweak = (r) => [...r, ...[0, 1].map((i) => ({ name: `Rusher ${i}`, pos: "DL", mpos: "DE", ovr: 70, spd: 90, str: 70, dk: 9, id: `X-${i}`, posAttrs: { passRush: rush ? 97 : 60, getOff: rush ? 95 : 60, runStop: 50 } }))];
    const dal = club("DAL", rush ? { RLE: ["X-0"], RRE: ["X-1"] } : { RLE: ["X-0"], RRE: ["X-1"] }, tweak), phi = club("PHI");
    let n = 0, s = 0;
    games(phi, dal, 120, (ev, b) => { if (b.poss === "h" && b.down >= 3 && b.toGo >= 6 && (ev.type === "pass" || ev.type === "inc" || ev.type === "sack" || ev.type === "int" || ev.k === "sack" || ev.k === "pass" || ev.k === "inc")) { n++; if (ev.k === "sack" || ev.type === "sack") s++; } });
    return s / n;
  };
  const withRush = sacks(true), without = sacks(false);
  assert.ok(withRush > without + 0.01, `sack rate on passing downs with a rush package ${withRush.toFixed(3)} vs ${without.toFixed(3)}`);
});
