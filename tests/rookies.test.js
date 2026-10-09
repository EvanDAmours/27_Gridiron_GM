import { test } from "node:test";
import assert from "node:assert/strict";
import { seasonAwardWinners, tagRookieYears, pastRookieAwards, rookieSeason } from "../src/awards.js";

const pl = (id, pos, extra = {}) => ({ id, name: `P${id}`, pos, age: 22, ss: { gp: 17 }, ...extra });
const team = (roster) => ({ ab: "T", w: 9, roster });

test("real 2026 rookies on the opening rosters win the first season's Rookie of the Year awards", () => {
  const teams = [team([
    pl(1, "WR", { rkYr: 2026, draftYr: 2026, draftPk: 0, ss: { gp: 17, recYds: 900, rec: 60 } }),
    pl(2, "WR", { rkYr: 2025, draftYr: 2025, draftPk: 0, ss: { gp: 17, recYds: 1400, rec: 90 } }),
    pl(3, "DL", { rkYr: 2026, draftYr: 2026, draftPk: 0, ss: { gp: 16, sacks: 8, tkl: 40 } }),
  ])];
  const w = seasonAwardWinners(teams, 2026);
  assert.equal(w.oroy.name, "P1");
  assert.equal(w.droy.name, "P3");
});

test("old saves: real rookies are found by name and position", () => {
  const teams = [team([pl(1, "WR", { name: "Kenyon Sadiq", pos: "TE", draftYr: 0, draftPk: 0 }), pl(2, "LB", { name: "Justin Jefferson", draftYr: 0, draftPk: 0 })])];
  const t = tagRookieYears(teams, { "Kenyon Sadiq|TE": 2026, "Justin Jefferson|WR": 2020, "Justin Jefferson|LB": 2026 });
  assert.equal(t[0].roster[0].rkYr, 2026);
  assert.equal(t[0].roster[1].rkYr, 2026);
});

test("players drafted in the league are rookies the season after their draft", () => {
  assert.equal(rookieSeason({ draftYr: 2026, draftPk: 12 }), 2027);
  const [t] = tagRookieYears([team([{ id: 1, name: "X", pos: "QB", draftYr: 2026, draftPk: 12 }])]);
  assert.equal(t.roster[0].rkYr, 2027);
});

test("last season's rookies are judged from their career stats after the rollover", () => {
  const teams = [team([
    pl(1, "RB", { rkYr: 2026, ss: { gp: 0 }, cs: { gp: 17, rushYds: 1100, rushTD: 9 } }),
    pl(2, "RB", { rkYr: 2024, ss: { gp: 0 }, cs: { gp: 50, rushYds: 4000, rushTD: 30 } }),
    pl(3, "CB", { rkYr: 2026, ss: { gp: 0 }, cs: { gp: 17, ints: 4, tkl: 55 } }),
  ])];
  const w = pastRookieAwards(teams, 2026);
  assert.equal(w.oroy.name, "P1");
  assert.equal(w.droy.name, "P3");
});
