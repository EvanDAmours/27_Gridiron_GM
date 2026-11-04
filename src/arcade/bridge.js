// The arcade mode's bridge to the real engine (playsim.js). Nothing here decides a play: the
// engine does, through step(). This file builds the two sides from the shipped rosters, picks who's
// on the field for the formation, and runs the engine for the drives you don't play.
import { makeSide, createGame, step } from "../playsim.js";
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
  const order = (pos) => roster.filter((p) => p.pos === pos).sort((a, b) => (a.dk ?? 99) - (b.dk ?? 99) || b.ovr - a.ovr);
  const side = makeSide({ team, order, snaps: teamSnaps(order, {}) });
  return { side, team, roster, order };
}

// A new game: you are always the home side ("h") so the field reads left to right for your drives.
export function newGame(userTi, oppTi, { rand = Math.random } = {}) {
  const h = buildSide(userTi), a = buildSide(oppTi);
  const g = createGame(h.side, a.side, { rand, rec: true });
  return { g, user: "h", home: h, away: a };
}

// Who lines up for an 11-personnel snap on each side (nickel defense), with the engine's roles so
// the cover assignments match what step() will use.
export function lineups(g) {
  const o = g.sides.h, d = g.sides.a;
  const recv = o.recvBy?.["11"] || [];
  const byRole = (r) => recv.find(([, , role]) => role === r)?.[0];
  const wrs = o.oU?.["11"]?.on?.wr || o.order("WR").slice(0, 3);
  const off = {
    QB: o.qb, RB: o.rushers[0]?.[0] || o.order("RB")[0],
    X: byRole("X") || wrs[0], Z: byRole("Z") || wrs[1], SLOT: byRole("SLOT") || wrs[2], TE: byRole("TE1") || o.order("TE")[0],
    LT: o.ol[0], LG: o.ol[1], C: o.ol[2], RG: o.ol[3], RT: o.ol[4],
  };
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
    if (ev.type === "penalty") { if (n === 0) return { ev, tries: 1, exact: true }; continue; }
    const typeOk = want.types.includes(ev.type), fallbackOk = !typeOk && (want.fallback || []).includes(ev.type);
    const dy = want.yards == null || !typeOk ? 0 : Math.abs((ev.yards || 0) - want.yards);
    const score = (typeOk ? 0 : fallbackOk ? 500 : 1000) + dy;
    if (score < bestScore) { bestScore = score; best = { ev, snapAfter: snapshot(g), bonus }; }
    if (typeOk && (want.yards == null || dy <= (want.tol ?? 1))) break;
    // steer the next roll's yards toward the mark (the bonus scales positive yardage)
    if (typeOk && want.yards != null && ev.yards > 0 && want.yards > 0) bonus = Math.max(0.3, Math.min(6, bonus * want.yards / ev.yards));
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
