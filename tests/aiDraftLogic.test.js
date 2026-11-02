// The AI draft room: no first-round quarterback behind a good young starter, and no loading up on
// one position in a single draft.
import test from "node:test";
import assert from "node:assert/strict";
import { initTeams, calibrateLeague, genRealDC, aiBestPick } from "../src/league.js";
import { needGroup } from "../src/needs.js";

const league = () => { const T = initTeams(-1); calibrateLeague(T); return T; };

test("a club with a good young quarterback passes on the top QB early, but may take one late", () => {
  const T = league(), cls = genRealDC(2026);
  const qbTop = cls.filter((p) => p.pos === "QB").sort((a, b) => b.truePot - a.truePot)[0];
  // a club whose starter is good and young, offered that QB and the next few non-QBs on the board
  const t = T.find((x) => { const q = x.roster.filter((p) => p.pos === "QB").sort((a, b) => b.ovr - a.ovr)[0]; return q && q.ovr >= 80 && q.age <= 26; });
  assert.ok(t, "some club has a young starter");
  const pool = [qbTop, ...cls.filter((p) => p.pos !== "QB" && p.truePot >= qbTop.truePot - 6 && p.truePot <= qbTop.truePot + 1).slice(0, 4)];
  let qb1 = 0, qb6 = 0;
  for (let i = 0; i < 30; i++) {
    if (aiBestPick(t.roster, pool, t.gmStyle, { yr: 2026, rd: 1 }) === qbTop) qb1++;
    if (aiBestPick(t.roster, pool, t.gmStyle, { yr: 2026, rd: 6 }) === qbTop) qb6++;
  }
  assert.ok(qb1 <= 3, `round 1: took the QB ${qb1}/30 times`);
  assert.ok(qb6 >= qb1, `late rounds are more open to a developmental QB (${qb6} vs ${qb1})`);
});

test("a full simulated draft spreads each club's early picks across positions", () => {
  const T = league(), cls = [...genRealDC(2026)];
  const took = T.map(() => ({}));
  let doubles = 0;
  for (let rd = 1; rd <= 3; rd++) T.forEach((t, ti) => {
    const bp = aiBestPick(t.roster, cls, t.gmStyle, { yr: 2026, rd });
    cls.splice(cls.indexOf(bp), 1);
    const g = needGroup(bp);
    if ((took[ti][g] = (took[ti][g] || 0) + 1) === 2 && !["WR", "CB", "LB"].includes(g)) doubles++;
    t.roster.push({ ...bp, ovr: bp.trueOvr, draftYr: 2026, contract: 4 });
  });
  assert.ok(doubles <= 2, `${doubles} clubs doubled up at a one- or two-starter position in rounds 1-3`);
});
