import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { unitRatings, simDrives, boxScore, allocate, overtime, HOME_EDGE } from "../src/gamesim.js";

const M = JSON.parse(readFileSync(new URL("../src/data/madden27.json", import.meta.url)));
let seed = 11;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const teams = M.teams.map((t, ti) => {
  const roster = t.roster.map((p, i) => ({ ...p, id: `${ti}-${i}` }));
  const order = (pos) => roster.filter((p) => p.pos === pos).sort((a, b) => (a.dk ?? 99) - (b.dk ?? 99) || b.ovr - a.ovr);
  return { ab: t.ab, order, u: unitRatings(order) };
});
const STARTERS = { QB: 1, RB: 2, WR: 4, TE: 2, LT: 1, LG: 1, C: 1, RG: 1, RT: 1, DL: 5, LB: 3, CB: 3, S: 2, K: 1 };
const snapsFor = (t) => { const s = {}; for (const [pos, n] of Object.entries(STARTERS)) t.order(pos).slice(0, n).forEach((p, i) => (s[p.id] = pos === "RB" && i ? 35 : 100)); return s; };

function season(games = 4000) {
  const pts = [], tot = { passYds: 0, rushYds: 0, ints: 0, sacks: 0, passTD: 0, rushTD: 0 };
  let ties = 0, homeW = 0, close = 0;
  for (let g = 0; g < games; g++) {
    const h = teams[g % 32], a = teams[(g * 7 + 3) % 32 === g % 32 ? (g + 1) % 32 : (g * 7 + 3) % 32];
    const hr = simDrives(h.u, a.u, HOME_EDGE, rand), ar = simDrives(a.u, h.u, 0, rand);
    if (hr.pts === ar.pts) { const ot = overtime(h.u, a.u, HOME_EDGE, rand); if (ot) (ot.side === "h" ? hr : ar).pts += ot.pts; }
    pts.push(hr.pts, ar.pts);
    if (hr.pts === ar.pts) ties++; if (hr.pts > ar.pts) homeW++; if (Math.abs(hr.pts - ar.pts) <= 8) close++;
    for (const r of [hr, ar]) for (const k in tot) tot[k] += r[k];
  }
  const n = pts.length, mean = pts.reduce((s, x) => s + x, 0) / n;
  return { mean, sd: Math.sqrt(pts.reduce((s, x) => s + (x - mean) ** 2, 0) / n), ties: ties / games, homeW: homeW / games, close: close / games, per: Object.fromEntries(Object.entries(tot).map(([k, v]) => [k, v / n])), shut: pts.filter((x) => x === 0).length / n };
}

test("league scoring looks like the NFL", () => {
  const s = season();
  console.log(JSON.stringify({ ...s, per: Object.fromEntries(Object.entries(s.per).map(([k, v]) => [k, +v.toFixed(2)])) }));
  assert.ok(s.mean > 20 && s.mean < 25, `points/team ${s.mean}`);
  assert.ok(s.sd > 8 && s.sd < 12, `spread ${s.sd}`);
  assert.ok(s.ties < 0.03, `ties ${s.ties}`);
  assert.ok(s.homeW > 0.5 && s.homeW < 0.6, `home wins ${s.homeW}`);
  assert.ok(s.per.passYds > 190 && s.per.passYds < 245 && s.per.rushYds > 95 && s.per.rushYds < 135);
  assert.ok(s.per.ints > 0.5 && s.per.ints < 1.1 && s.per.sacks > 1.8 && s.per.sacks < 3.2);
});

test("better teams score more", () => {
  const best = [...teams].sort((x, y) => y.u.pass + y.u.run - x.u.pass - x.u.run)[0];
  const worst = [...teams].sort((x, y) => x.u.pass + x.u.run - y.u.pass - y.u.run)[0];
  const avgPts = (t) => { let s = 0; for (let i = 0; i < 2000; i++) s += simDrives(t.u, teams[i % 32].u, 0, rand).pts; return s / 2000; };
  const b = avgPts(best), w = avgPts(worst);
  console.log(best.ab, b.toFixed(1), worst.ab, w.toFixed(1));
  assert.ok(b - w > 5, `${b} vs ${w}`);
});

test("the box score adds up to the team totals", () => {
  const h = teams[0], a = teams[1];
  const own = simDrives(h.u, a.u, 0, rand), opp = simDrives(a.u, h.u, 0, rand);
  const box = Object.values(boxScore(h.order, snapsFor(h), own, opp, rand));
  const sum = (k) => box.reduce((s, l) => s + (l[k] || 0), 0);
  assert.equal(sum("passTD"), own.passTD); assert.equal(sum("recTD"), own.passTD); assert.equal(sum("rushTD"), own.rushTD);
  assert.equal(sum("passYds"), own.passYds); assert.equal(sum("recYds"), own.passYds); assert.equal(sum("rushYds"), own.rushYds);
  assert.equal(sum("rec"), own.comp); assert.equal(sum("passInt"), own.ints); assert.equal(sum("ints"), opp.ints); assert.equal(sum("sacks"), opp.sacks);
  assert.equal(sum("fgM") * 3 + sum("xpM") + 6 * (own.passTD + own.rushTD) + (own.pts - (own.fgM * 3 + own.xpM + 6 * (own.passTD + own.rushTD))), own.pts);
  assert.deepEqual(allocate(10, [1, 1, 1], rand).reduce((s, x) => s + x, 0), 10);
});
