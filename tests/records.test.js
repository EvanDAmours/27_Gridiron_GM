import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { makeSide, createGame, playGame, boxOf } from "../src/playsim.js";
import { teamSnaps } from "../src/snaps.js";

const d = JSON.parse(fs.readFileSync(new URL("../src/data/madden27.json", import.meta.url)));
const team = (ab) => { const t = d.teams.find((x) => x.ab === ab); return { ...t, roster: t.roster.map((p, i) => ({ ...p, id: `${ab}${i}`, posAttrs: p.attrs })) }; };
const side = (t, over = {}) => { const ord = (pos) => t.roster.filter((p) => p.pos === pos).sort((a, b) => (a.dk ?? 99) - (b.dk ?? 99) || b.ovr - a.ovr); return makeSide({ team: t, order: ord, snaps: teamSnaps(ord, over) }); };

test("a back on 100% of the snaps has a workhorse season, not a record one", () => {
  const atl = team("ATL");
  const bijan = atl.roster.find((p) => p.name === "Bijan Robinson");
  let att = 0, yds = 0;
  for (const o of d.teams.filter((x) => x.ab !== "ATL").slice(0, 17)) {
    const g = createGame(side(atl, { [bijan.id]: 100 }), side(team(o.ab)));
    playGame(g);
    att += boxOf(g).h[bijan.id]?.rushAtt || 0; yds += boxOf(g).h[bijan.id]?.rushYds || 0;
  }
  assert.ok(att >= 280 && att <= 400, `${att} carries`);
  assert.ok(yds < 2300, `${yds} yards`);
});
