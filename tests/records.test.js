import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { makeSide, createGame, playGame, boxOf } from "../src/playsim.js";
import { teamSnaps } from "../src/snaps.js";

const d = JSON.parse(fs.readFileSync(new URL("../src/data/madden27.json", import.meta.url)));
const team = (ab) => { const t = d.teams.find((x) => x.ab === ab); return { ...t, roster: t.roster.map((p, i) => ({ ...p, id: `${ab}${i}`, posAttrs: p.attrs })) }; };
const side = (t, over = {}, season = 2026) => { const ord = (pos) => t.roster.filter((p) => p.pos === pos).sort((a, b) => (a.dk ?? 99) - (b.dk ?? 99) || b.ovr - a.ovr); return makeSide({ team: t, order: ord, snaps: teamSnaps(ord, over), season }); };

test("a back on 100% of the snaps has workhorse seasons; a record one only now and then", () => {
  const atl = team("ATL");
  const bijan = atl.roster.find((p) => p.name === "Bijan Robinson");
  const seasons = [];
  for (let season = 2026; season < 2034; season++) {
    let att = 0, yds = 0;
    for (const o of d.teams.filter((x) => x.ab !== "ATL").slice(0, 17)) {
      const g = createGame(side(atl, { [bijan.id]: 100 }, season), side(team(o.ab), {}, season));
      playGame(g);
      att += boxOf(g).h[bijan.id]?.rushAtt || 0; yds += boxOf(g).h[bijan.id]?.rushYds || 0;
    }
    seasons.push({ att, yds });
  }
  const med = (k) => [...seasons].map((x) => x[k]).sort((a, b) => a - b)[seasons.length >> 1];
  assert.ok(med("att") >= 280 && med("att") <= 390, `median ${med("att")} carries`);
  assert.ok(seasons.every((x) => x.att <= 430), "never far past the carries record");
  assert.ok(seasons.filter((x) => x.yds > 2105).length <= 3, `record seasons: ${seasons.map((x) => x.yds).join(", ")}`);
});

test("season form: fixed per player and season, mostly small, now and then a career year", async () => {
  const { seasonForm } = await import("../src/playsim.js");
  assert.equal(seasonForm("p1", 2026), seasonForm("p1", 2026));
  const f = Array.from({ length: 4000 }, (_, i) => seasonForm(`p${i}`, 2027));
  const small = f.filter((x) => Math.abs(x) <= 3).length / f.length;
  const big = f.filter((x) => x >= 6).length / f.length;
  assert.ok(small > 0.65, `most players play to their rating (${small})`);
  assert.ok(big > 0.01 && big < 0.08, `career years are rare (${big})`);
  assert.ok(Math.max(...f) <= 8 && Math.min(...f) >= -8);
});

test("franchise records: every club starts with its real marks, and a player who passes his club's mark takes it", async () => {
  const { newRecordBook, updateFranchiseRecords, franchiseWatch, loadRecordBook } = await import("../src/records.js");
  const book = newRecordBook();
  assert.equal(Object.keys(book.franchise).length, 32);
  assert.equal(book.franchise.NYG.sacks.val, 22.5);
  const nyg = { ab: "NYG", w: 10, l: 6, roster: [{ id: "a", name: "Abdul Carter", ss: { sacks: 23 } }] };
  const r = updateFranchiseRecords(book, [nyg], 2026);
  assert.equal(r.broken.length, 1);
  assert.equal(r.book.franchise.NYG.sacks.name, "Abdul Carter");
  assert.equal(r.book.franchise.NYG.sacks.prev.name, "Michael Strahan");
  // adding to his own record isn't news again
  nyg.roster[0].ss.sacks = 24;
  assert.equal(updateFranchiseRecords(r.book, [nyg], 2026).broken.length, 0);
  // on pace for one
  const watch = franchiseWatch(newRecordBook(), { ab: "NYG", w: 5, l: 3, roster: [{ id: "b", name: "Malik Nabers", ss: { rec: 60 } }] });
  assert.ok(watch.some((x) => x.key === "rec"));
  // old saves get the franchise marks
  assert.equal(loadRecordBook({ best: {}, history: [] }).franchise.DET.recYds.val, 1964);
});
