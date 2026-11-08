// The arcade mode's bridge to the real engine (playsim.js). Nothing here decides a play: the
// engine does, through step(). This file builds the two sides from the shipped rosters, picks who's
// on the field for the formation, and runs the engine for the drives you don't play.
import { makeSide, createGame, step, playPat } from "../playsim.js";
import { teamSnaps } from "../snaps.js";
import M from "../data/madden27.json" with { type: "json" };
import SP from "../data/special.json" with { type: "json" };

export const TEAMS = M.teams.map((t) => ({ ab: t.ab, city: t.city, name: t.name, clr: t.clr, ac: t.ac }));

const rosterOf = (ti) => {
  const t = M.teams[ti];
  const punter = SP.punters.filter((p) => p.team === t.ab).slice(0, 1);
  return [...t.roster, ...punter].map((p, i) => ({ ...p, id: `${t.ab}-${i}`, posAttrs: p.attrs || p.posAttrs || {} }));
};

export function buildSide(ti) {
  const team = M.teams[ti], roster = rosterOf(ti);
  const order = (pos) => roster.filter((p) => p.pos === pos).sort((a, b) => b.ovr - a.ovr); // the arcade: the best man starts
  const side = makeSide({ team, order, snaps: teamSnaps(order, {}) });
  return { side, team, roster, order };
}

// The standalone arcade's game, set up exactly as the franchise sets up a game (league.js gameSetup on
// the franchise's own league: its depth charts, calibrated ratings, injury replacements, the emergency
// quarterback), so the arcade plays the same football as the franchise and picks up every fix to it.
let LEAGUE = null;
export async function franchiseGame(userTi, oppTi, { rand = Math.random, qLen = null, wx = "clear", wind = null, playoff = false } = {}) {
  const L = await import("../league.js"), { createGame: mk } = await import("../playsim.js");
  if (!LEAGUE) {
    LEAGUE = L.initTeams(-1); L.calibrateLeague(LEAGUE);
    // the arcade plays every club's best men, all healthy: the highest overall starts at each spot
    // (no real-life depth chart order, no injuries)
    for (const t of LEAGUE) { t.roster = [...t.roster, ...(t.ir || [])]; t.ir = []; for (const p of t.roster) { delete p.dk; p.injured = false; p.injWk = 0; p.hurt = undefined; p.holdout = false; p.suspended = false; } }
  }
  L.setInjuries?.(false);
  const pick = (ti) => LEAGUE.find((t) => t.ab === M.teams[ti].ab) || LEAGUE[ti];
  const su = L.gameSetup(pick(userTi), pick(oppTi), null, null, wx);
  const g = mk(su.home, su.away, { rand, rec: true, qLen, wx: su.wx || wx, playoff }); // playoff: a Super Bowl is never a tie (overtime periods until someone wins)
  g.arcade = true;
  if (wind) g.wind = wind;
  return g;
}

// A new game: you are always the home side ("h") so the field reads left to right for your drives.
export function newGame(userTi, oppTi, { rand = Math.random, pat = false, qLen = null, wx = "clear", wind = null, playoff = false } = {}) {
  const h = buildSide(userTi), a = buildSide(oppTi);
  const g = createGame(h.side, a.side, { rand, rec: true, qLen, wx, playoff });
  g.arcade = true;
  if (wind) g.wind = wind; // { x, y, mph }: yards a second along and across the field, in the first quarter // qLen: quarter length in seconds (null: 15 minutes)
  if (pat) g.patDefer = { h: true }; // you play your own extra points and two-point tries
  return { g, user: "h", home: h, away: a };
}

// Who lines up for an 11-personnel snap on each side (nickel defense), with the engine's roles so
// the cover assignments match what step() will use.
export function lineups(g, { rb = null } = {}) {
  const o = g.sides.h, d = g.sides.a;
  const recv = o.recvBy?.["11"] || [];
  // always five on the line: a club with linemen hurt fills from its other linemen (and, at a pinch,
  // anyone big enough), so the formation is never a man short
  const ol = (o.ol || []).filter(Boolean);
  for (const pos of ["OL", "LT", "LG", "C", "RG", "RT", "G", "T", "OT", "OG", "DL", "TE"]) { if (ol.length >= 5) break; for (const p of o.order?.(pos) || []) { if (ol.length >= 5) break; if (p && !ol.includes(p)) ol.push(p); } }
  const byRole = (r) => recv.find(([, , role]) => role === r)?.[0];
  const wrs = o.oU?.["11"]?.on?.wr || o.order("WR").slice(0, 3);
  const off = {
    QB: o.qb, RB: rb || o.rushers[0]?.[0] || o.order("RB")[0], // (rb: the back the engine will give it to this snap, backForSnap)
    X: byRole("X") || wrs[0], Z: byRole("Z") || wrs[1], SLOT: byRole("SLOT") || wrs[2], TE: byRole("TE1") || o.order("TE")[0],
    LT: ol[0], LG: ol[1], C: ol[2], RG: ol[3], RT: ol[4],
  };
  // every spot filled: with the starter out (and no backup listed) the next man who can play it steps
  // in, at a pinch from another position, so the formation is never a man short
  const used = new Set(Object.values(off).filter(Boolean).map((p) => p.id));
  const fill = (key, poss) => { if (off[key]) return; for (const pos of poss) for (const p of o.order?.(pos) || []) if (p && !used.has(p.id)) { off[key] = p; used.add(p.id); return; } };
  fill("QB", ["QB", "RB", "WR", "TE"]); fill("RB", ["RB", "FB", "WR", "TE"]);
  for (const k of ["X", "Z", "SLOT"]) fill(k, ["WR", "TE", "RB"]);
  fill("TE", ["TE", "WR", "RB", "OL"]);
  const dOn = d.defBy?.nickel?.on || {};
  const DL = d.order("DL").slice(0, 4), LB = dOn.lbs || d.order("LB").slice(0, 2), CB = dOn.cbs || d.order("CB").slice(0, 3), S = d.order("S").slice(0, 2);
  const onWR = [off.X, off.Z, off.SLOT].filter(Boolean);
  // the engine's cover men in the nickel package
  const cover = {
    X: d.cover("nickel", "X", off.X, onWR, false), Z: d.cover("nickel", "Z", off.Z, onWR, false),
    SLOT: d.cover("nickel", "SLOT", off.SLOT, onWR, false), TE: d.cover("nickel", "TE1", off.TE, onWR, false), RB: d.cover("nickel", "RB", off.RB, onWR, false),
  };
  return { off, def: { DL, LB, CB, S }, cover, recvRoles: Object.fromEntries(recv.map(([p, , r]) => [p.id, r])) };
}

// One engine play. call: pass_quick | pass_medium | pass_deep | run_inside | run_outside | punt | fg | kneel.
export const runPlay = (g, call, bonus = 1, pick = null) => step(g, call, bonus, pick);

// The game's data between plays (everything but the sides and the RNG), so a play can be
// rolled again: the field plays out the physics first, then asks the engine for a play that
// matches what happened (its stats, grades, clock and log all stay the engine's).
const KEEP = ["sides", "rand"];
export function snapshot(g) { const o = {}; for (const k of Object.keys(g)) if (!KEEP.includes(k)) o[k] = structuredClone(g[k]); return o; }
export function restore(g, snap) { for (const k of Object.keys(g)) if (!KEEP.includes(k)) delete g[k]; Object.assign(g, snap); }

// Ask the engine for a play of the kinds in `want.types` (e.g. ["pass", "td"]) gaining about
// `want.yards`. Rolls up to `tries` times, steering the yardage bonus toward the mark, and keeps
// the closest; a penalty is always accepted (the field shows the flag). Returns { ev, tries, exact }.
export function resolvePlay(g, call, want, pick = null, tries = 12) {
  const snap = snapshot(g);
  let best = null, bestScore = Infinity, bonus = want.bonus ?? 1, n = 0;
  for (; n < tries; n++) {
    if (n) restore(g, structuredClone(snap));
    const ev = step(g, call, bonus, pick);
    if (!ev) return { ev, tries: n + 1, exact: false };
    // a flag on the first roll is the engine's own rate; on a later roll it is just rolled again
    // (and only a flag on the play you saw: one whose play underneath is the
    // play that happened on the field; never a flag on a catch when the ball fell incomplete)
    if (ev.type === "penalty") { if (ev.pen?.pre) continue; /* a foul before the snap means no play: never the result of one that was played */ const pl = ev.pen?.play, same = !pl || (want.types.includes(pl.td ? "td" : pl.type) && (want.yards == null || Math.abs((pl.yards || 0) - want.yards) <= Math.max(2, (want.tol ?? 1) * 2))); if (n === 0 && same) return { ev, tries: 1, exact: true }; continue; }
    const typeOk = want.types.includes(ev.type), fallbackOk = !typeOk && (want.fallback || []).includes(ev.type);
    const dy = want.yards == null || !typeOk ? 0 : Math.abs((ev.yards || 0) - want.yards);
    const score = (typeOk ? 0 : fallbackOk ? 500 : 1000) + dy;
    if (score < bestScore) { bestScore = score; best = { ev, snapAfter: snapshot(g), bonus }; }
    if (typeOk && (want.yards == null || dy <= (want.tol ?? 1))) break;
    // steer the next roll's yards toward the mark (the bonus scales positive yardage)
    // (and for a touchdown the field already scored, steer the yards up to the goal line even while the rolls fall short)
    if ((typeOk || want.types[0] === "td") && want.yards != null && ev.yards > 0 && want.yards > 0) bonus = Math.max(0.3, Math.min(want.types[0] === "td" ? 12 : 6, bonus * want.yards / ev.yards * (typeOk ? 1 : 1.3)));
  }
  if (best && n >= tries) restore(g, best.snapAfter); // the loop ran out: put the closest roll back
  return { ev: best?.ev, tries: Math.min(n + 1, tries), exact: bestScore <= (want.tol ?? 1) };
}

// The other team's drive, played out by the engine until the ball comes back (or the game ends).
export function simOpponentDrive(g, user = "h", max = 40) {
  const evs = [];
  for (let i = 0; i < max && !g.done && (g.poss !== user || g.koNext); i++) {
    const ev = step(g);
    if (!ev) break;
    evs.push(ev);
  }
  return evs;
}

export const situation = (g) => ({ yard: g.yard, down: g.down, toGo: g.toGo, qtr: g.qtr, clock: g.clock, score: { ...g.score }, poss: g.poss, done: g.done, koNext: g.koNext, ot: g.ot });

// After your touchdown: is the try waiting on you, and book it once the field has decided.
export const patWaiting = (g) => !!g.patPending;
export function bookPat(g, two, good) { return playPat(g, two, good); }

const flip = (s) => (s === "h" ? "a" : s === "a" ? "h" : s);
const isSides = (v) => v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 2 && "h" in v && "a" in v;

// Turn a game (or the saved fields of one) the other way round: everything kept per side (score,
// box score, stats, timeouts, the day's form, the specialists' snaps, the two sides themselves),
// whose ball it is, and the play log (whose ball, and the score as [home, away]).
export function flipSides(g) {
  if (!g) return g;
  for (const k of Object.keys(g)) {
    const v = g[k];
    if (isSides(v)) g[k] = { h: v.a, a: v.h };
    else if (typeof v === "string" && (v === "h" || v === "a") && k !== "wx") g[k] = flip(v);
  }
  if (g.patPending?.off) g.patPending = { ...g.patPending, off: flip(g.patPending.off) };
  if (Array.isArray(g.pl)) g.pl = g.pl.map((e) => ({ ...e, p: flip(e.p), s: e.s ? [e.s[1], e.s[0]] : e.s }));
  return g;
}

