// Game simulation, drive by drive. Each team gets about 11 possessions; each ends in a
// touchdown, field goal, punt, turnover, turnover on downs or (rarely) a safety, with odds set
// by the offense's starters against the defense's. Rates are tuned to the modern NFL (about
// 22 points a team, 22% of drives end in a TD). Team totals are then split across players by
// role and snap share, so the box score always adds up to the final score.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const gauss = (rand) => { let u = 0, v = 0; while (!u) u = rand(); while (!v) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const avg = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 60);

// Starters' ratings for each unit. order(pos) lists a team's healthy players in depth order.
export function unitRatings(order) {
  const top = (pos, n) => order(pos).slice(0, n).map((p) => p.ovr);
  const ol = avg([...top("LT", 1), ...top("LG", 1), ...top("C", 1), ...top("RG", 1), ...top("RT", 1)]);
  const qb = avg(top("QB", 1)), rb = avg(top("RB", 1));
  const rec = avg([...top("WR", 3), ...top("TE", 1)]);
  const dl = avg(top("DL", 4)), lb = avg(top("LB", 3)), db = avg([...top("CB", 2), ...top("S", 2)]);
  return {
    pass: qb * 0.5 + rec * 0.3 + ol * 0.2,
    run: rb * 0.4 + ol * 0.45 + qb * 0.15,
    passD: db * 0.55 + dl * 0.3 + lb * 0.15,
    runD: dl * 0.45 + lb * 0.4 + db * 0.15,
    rush: dl * 0.7 + lb * 0.3, // pass rush, for sacks
    ol, qb, k: avg(top("K", 1)),
  };
}

// One team's possessions against a defense. edge > 0 favours the offense; each point of edge is
// worth roughly 2.5 points on the scoreboard.
export function simDrives(off, def, edge = 0, rand = Math.random) {
  const passEdge = (off.pass - def.passD) / 4, runEdge = (off.run - def.runD) / 4;
  const e = clamp(passEdge * 0.65 + runEdge * 0.35 + edge, -4, 4);
  const drives = Math.round(clamp(11 + gauss(rand) * 1.1, 8, 14));
  const pTD = clamp(0.22 + 0.03 * e, 0.07, 0.42);
  const pFG = clamp(0.165 + 0.006 * e, 0.09, 0.22);
  const pTO = clamp(0.115 - 0.012 * e, 0.04, 0.2);
  const pDowns = 0.045, pSafety = 0.004;
  const kAcc = clamp(0.84 + (off.k - 70) * 0.004, 0.7, 0.95);
  const passShare = clamp(0.63 + (off.pass - off.run) * 0.01, 0.45, 0.8);
  const r = { pts: 0, passTD: 0, rushTD: 0, fgA: 0, fgM: 0, xpA: 0, xpM: 0, twoPt: 0, ints: 0, fumLost: 0, downs: 0, punts: 0, safeties: 0, drives };
  for (let d = 0; d < drives; d++) {
    const x = rand();
    if (x < pTD) {
      if (rand() < passShare) r.passTD++; else r.rushTD++;
      if (rand() < 0.05) { r.twoPt++; if (rand() < 0.48) r.pts += 2; }
      else { r.xpA++; if (rand() < 0.955) { r.xpM++; r.pts += 1; } }
      r.pts += 6;
    } else if (x < pTD + pFG) {
      r.fgA++; if (rand() < kAcc) { r.fgM++; r.pts += 3; }
    } else if (x < pTD + pFG + pTO) {
      if (rand() < 0.62) r.ints++; else r.fumLost++;
    } else if (x < pTD + pFG + pTO + pDowns) r.downs++;
    else if (x < pTD + pFG + pTO + pDowns + pSafety) r.safeties++;
    else r.punts++;
  }
  // Yardage follows how well the drives went.
  const scoreY = r.passTD * 22 + r.rushTD * 14 + r.fgA * 14;
  r.passAtt = Math.round(clamp(33 + gauss(rand) * 5 + (passShare - 0.63) * 20, 18, 55));
  r.rushAtt = Math.round(clamp(26 + gauss(rand) * 4.5 - (passShare - 0.63) * 15 + e, 12, 45));
  r.comp = Math.round(r.passAtt * clamp(0.645 + (off.pass - def.passD) * 0.004 + gauss(rand) * 0.05, 0.42, 0.85));
  r.passYds = Math.max(40, Math.round(r.passAtt * clamp(5.2 + (off.pass - def.passD) * 0.05, 3.5, 8.5) + scoreY * 0.6 + gauss(rand) * 30));
  r.rushYds = Math.max(15, Math.round(r.rushAtt * clamp(4.15 + (off.run - def.runD) * 0.03, 3, 6) + scoreY * 0.12 + gauss(rand) * 18));
  r.sacks = Math.max(0, Math.round(2.4 + (def.rush - off.ol) * 0.06 + gauss(rand) * 1.4));
  return r;
}

// Home-field advantage, in drive edge (about 1.5 points).
export const HOME_EDGE = 0.6;

// Overtime for a tied game (modified sudden death): usually someone wins it with a field goal
// or touchdown, the better offense more often; about one in twelve stays a tie.
export function overtime(h, a, hEdge = 0, rand = Math.random) {
  if (rand() < 0.08) return null;
  const e = ((h.pass + h.run - a.passD - a.runD) - (a.pass + a.run - h.passD - h.runD)) / 8 + hEdge;
  const homeWins = rand() < clamp(0.5 + e * 0.06, 0.2, 0.8);
  const pts = rand() < 0.55 ? 3 : 6;
  return { side: homeWins ? "h" : "a", pts };
}

// Integer shares of `total` in proportion to `weights` that always add up to `total`.
export function allocate(total, weights, rand = Math.random) {
  const sum = weights.reduce((s, w) => s + Math.max(0, w), 0);
  if (!sum || total <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (Math.max(0, w) / sum) * total);
  const out = raw.map(Math.floor);
  let left = total - out.reduce((s, x) => s + x, 0);
  const order = raw.map((x, i) => [x - Math.floor(x) + rand() * 0.3, i]).sort((a, b) => b[0] - a[0]);
  for (let k = 0; left > 0; k = (k + 1) % order.length, left--) out[order[k][1]]++;
  return out;
}
// Hand out `n` single events (touchdowns, interceptions) one at a time by weight.
function scatter(n, weights, rand) {
  const out = weights.map(() => 0), sum = weights.reduce((s, w) => s + Math.max(0, w), 0);
  for (let i = 0; i < n && sum > 0; i++) {
    let x = rand() * sum, k = 0;
    while (k < weights.length - 1 && x > Math.max(0, weights[k])) { x -= Math.max(0, weights[k]); k++; }
    out[k]++;
  }
  return out;
}

// Turn a team's totals (and its defense's work against the other offense) into player lines.
// order(pos) gives depth order; snaps[id] is each player's share (0-100).
export function boxScore(order, snaps, own, opp, rand = Math.random) {
  const box = {};
  const line = (p) => (box[p.id] ||= {});
  const on = (pos) => order(pos).filter((p) => (snaps[p.id] || 0) > 0);
  const share = (p) => (snaps[p.id] || 0) / 100;
  const add = (p, k, v) => { if (v) line(p)[k] = (line(p)[k] || 0) + v; };

  // Passing (split between QBs by snaps).
  const qbs = on("QB");
  const qbW = qbs.map(share);
  const att = allocate(own.passAtt, qbW, rand), comp = allocate(own.comp, qbW, rand), pyds = allocate(own.passYds, qbW, rand);
  const ptd = scatter(own.passTD, qbW, rand), pint = scatter(own.ints, qbW, rand), sk = scatter(own.sacks, qbW, rand);
  qbs.forEach((p, i) => { const l = line(p); Object.assign(l, { att: att[i], comp: Math.min(comp[i], att[i]), passYds: pyds[i], passTD: ptd[i], passInt: pint[i], sk: sk[i], skYds: sk[i] * 7 }); });

  // Receiving: WR1 > TE1 > WR2 > WR3 > RB1, nudged by rating and snaps.
  const TGT = { WR: [0.24, 0.19, 0.14, 0.04, 0.02], TE: [0.15, 0.04, 0.02], RB: [0.09, 0.04, 0.02] };
  const recv = [];
  for (const pos of ["WR", "TE", "RB"]) on(pos).forEach((p, i) => recv.push([p, (TGT[pos][i] ?? 0.01) * share(p) * (1 + (p.ovr - 75) * 0.015)]));
  const rw = recv.map(([, w]) => w);
  const tgt = allocate(Math.round(own.passAtt * 0.94), rw, rand), rec = allocate(own.comp, rw, rand), ryd = allocate(own.passYds, rw.map((w, i) => w * (recv[i][0].pos === "RB" ? 0.55 : 1)), rand);
  const rtd = scatter(own.passTD, rw.map((w, i) => w * (recv[i][0].pos === "TE" ? 1.3 : 1)), rand);
  recv.forEach(([p], i) => { add(p, "tgt", Math.max(tgt[i], rec[i])); add(p, "rec", rec[i]); add(p, "recYds", ryd[i]); add(p, "recTD", rtd[i]); });

  // Rushing: RBs by snaps, the QB scrambles a few times.
  const rushers = [...on("RB").map((p, i) => [p, (i === 0 ? 1 : 0.45) * share(p)]), ...qbs.slice(0, 1).map((p) => [p, 0.13 + Math.max(0, (p.spd || 60) - 70) * 0.008])];
  const uw = rushers.map(([, w]) => w);
  const ratt = allocate(own.rushAtt, uw, rand), ruy = allocate(own.rushYds, uw, rand), rutd = scatter(own.rushTD, uw.map((w, i) => w * (rushers[i][0].pos === "QB" ? 0.6 : 1)), rand);
  rushers.forEach(([p], i) => { add(p, "rushAtt", ratt[i]); add(p, "rushYds", ruy[i]); add(p, "rushTD", rutd[i]); });
  const fumblers = rushers.length ? rushers : qbs.map((p) => [p, 1]);
  scatter(own.fumLost, fumblers.map(([, w]) => w), rand).forEach((n, i) => add(fumblers[i][0], "fum", n));

  // Defense against the other offense: tackles, sacks, interceptions, passes defended.
  const defs = [];
  const TK = { DL: [0.07, 0.07, 0.06, 0.06, 0.03, 0.02], LB: [0.14, 0.12, 0.08, 0.03], CB: [0.07, 0.06, 0.03], S: [0.09, 0.08, 0.02] };
  for (const pos of ["DL", "LB", "CB", "S"]) on(pos).forEach((p, i) => defs.push([p, (TK[pos][i] ?? 0.01) * share(p)]));
  const plays = opp.passAtt + opp.rushAtt;
  allocate(Math.round(plays * 0.62), defs.map(([, w]) => w), rand).forEach((n, i) => add(defs[i][0], "tkl", n));
  allocate(Math.round(plays * 0.22), defs.map(([, w]) => w), rand).forEach((n, i) => add(defs[i][0], "ast", n));
  const rushW = defs.map(([p, w]) => (p.pos === "DL" ? 1 : p.pos === "LB" ? 0.35 : 0.04) * w * (1 + (p.ovr - 75) * 0.04));
  scatter(opp.sacks, rushW, rand).forEach((n, i) => add(defs[i][0], "sacks", n));
  scatter(Math.round(opp.sacks * 1.6 + 2), rushW, rand).forEach((n, i) => add(defs[i][0], "qbH", n));
  scatter(Math.round(opp.rushAtt * 0.12), defs.map(([p, w]) => (p.pos === "CB" ? 0.3 : 1) * w), rand).forEach((n, i) => add(defs[i][0], "tfl", n));
  const cov = defs.map(([p, w]) => (p.pos === "CB" ? 1.4 : p.pos === "S" ? 1.1 : p.pos === "LB" ? 0.35 : 0.05) * w * (1 + (p.ovr - 75) * 0.03));
  scatter(opp.ints, cov, rand).forEach((n, i) => add(defs[i][0], "ints", n));
  scatter(Math.round(opp.passAtt * 0.12) + opp.ints, cov, rand).forEach((n, i) => add(defs[i][0], "pd", n));
  scatter(opp.fumLost, defs.map(([, w]) => w), rand).forEach((n, i) => add(defs[i][0], "ff", n));

  // Kicking.
  const k = on("K")[0] || order("K")[0];
  if (k) Object.assign(line(k), { fgM: own.fgM, fgA: own.fgA, xpM: own.xpM, xpA: own.xpA, pts: own.fgM * 3 + own.xpM, lng: own.fgM ? Math.round(30 + rand() * 22) : 0 });

  // Every player who saw the field gets a line, even an empty one (games played).
  for (const pos of Object.keys(snaps).length ? ["QB", "RB", "WR", "TE", "LT", "LG", "C", "RG", "RT", "DL", "LB", "CB", "S", "K"] : []) for (const p of on(pos)) line(p);
  return box;
}
