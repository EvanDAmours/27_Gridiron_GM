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
