// Situational specialists: the players a club subs in for the downs they're built for, the way NFL
// teams do (and Madden's Specialists tab). Each role has a fit rating from the skills it needs;
// you pick each one in the depth chart, or leave it to the staff (auto: the best fit on the roster,
// and only when he's better at the job than the starter he'd replace).
//   PWHB   power back: short yardage and the goal line. Strength and tackle-breaking for the last yard.
//   RB3D   3rd-down back: 3rd and long and the two-minute drill. Hands and pass protection.
//   RLE    rush left end, RRE rush right end, RDT rush tackle: passing downs. Pass rush and get-off.
//   SUBLB  sub linebacker: nickel and dime on passing downs. Coverage and speed.
// The engine (playsim.js) puts them on the field in their situations, so they get those carries,
// targets, sacks and coverage snaps, and the game books the snaps they actually played.
import { naturalDL } from "./dline.js";
import { lbCover } from "./gamesim.js";

export const SPEC_ROLES = {
  PWHB: { label: "Power back", pos: "RB", side: "off", when: "Short yardage and the goal line", wants: "Strength, tackle-breaking and balance: the back who falls forward for the last yard." },
  RB3D: { label: "3rd-down back", pos: "RB", side: "off", when: "3rd and long and the two-minute drill", wants: "Hands and pass protection: catches it out of the backfield and picks up the blitz." },
  RLE: { label: "Rush left end", pos: "DL", side: "def", when: "Passing downs", wants: "Pass rush, get-off and speed off the edge." },
  RDT: { label: "Rush tackle", pos: "DL", side: "def", when: "Passing downs", wants: "Pass rush from inside: get-off and power to push the pocket." },
  RRE: { label: "Rush right end", pos: "DL", side: "def", when: "Passing downs", wants: "Pass rush, get-off and speed off the edge." },
  SUBLB: { label: "Sub linebacker", pos: "LB", side: "def", when: "Nickel and dime on passing downs", wants: "Coverage and speed: the linebacker who can run with a back or a tight end." },
};
export const SPEC_KEYS = Object.keys(SPEC_ROLES);
export const isSpec = (k) => !!SPEC_ROLES[k];

const at = (p, k, d = 65) => p?.posAttrs?.[k] ?? d;
// How well a player fits a role (about a 40-99 scale, like a rating).
export function specFit(p, role) {
  if (!p) return 0;
  const ovr = p.ovr ?? 70;
  switch (role) {
    case "PWHB": return Math.round(0.3 * at(p, "breakTkl") + 0.2 * at(p, "stiffArm") + 0.15 * at(p, "balance") + 0.2 * (p.str ?? 65) + 0.15 * ovr);
    case "RB3D": return Math.round(0.35 * at(p, "receiving") + 0.3 * at(p, "passBlock") + 0.15 * (p.spd ?? 80) + 0.2 * ovr);
    case "RLE": case "RRE": return Math.round(0.45 * at(p, "passRush") + 0.2 * at(p, "getOff") + 0.15 * (p.spd ?? 75) + 0.2 * ovr) - (naturalDL(p) === "DT" ? 6 : 0);
    case "RDT": return Math.round(0.45 * at(p, "passRush") + 0.2 * at(p, "getOff") + 0.15 * at(p, "bullRush") + 0.2 * ovr) - (naturalDL(p) === "EDGE" ? 4 : 0);
    case "SUBLB": return Math.round(0.8 * lbCover(p) + 0.2 * ovr);
    default: return ovr;
  }
}
// a lineman's pass rush on its own (what a rush package is worth), and a back's power and blocking
export const passRushOf = (p) => 0.6 * at(p, "passRush") + 0.25 * at(p, "getOff") + 0.15 * (p?.spd ?? 75);
export const powerOf = (p) => 0.35 * at(p, "breakTkl") + 0.2 * at(p, "stiffArm") + 0.2 * at(p, "balance") + 0.25 * (p?.str ?? 65);
export const passBlockOf = (p) => at(p, "passBlock", 50);

// The depth chart's list for a role: your pick first (depthOrder[role]), then everyone else at the
// position by fit. list.chosen: whether you picked (or the staff does).
export function specialistOrder(roster, depthOrder, role) {
  const pool = roster.filter((p) => p.pos === SPEC_ROLES[role]?.pos);
  const chosen = ((depthOrder || {})[role] || []).map((id) => pool.find((p) => p.id === id)).filter(Boolean);
  const list = [...chosen, ...pool.filter((p) => !chosen.includes(p)).sort((a, b) => specFit(b, role) - specFit(a, role))];
  Object.defineProperty(list, "chosen", { value: chosen.length > 0, enumerable: false });
  return list;
}

// Who actually subs in. depth(role): the role's list (specialistOrder, healthy players); order(pos):
// the players at each position as they line up (DL as [LE, DT1, DT2, RE], LB as [SAM, MIKE, WILL]).
// A specialist only comes on for someone else (a starter who fits the job best stays on), and the
// staff's own picks only when the fit is clearly better; yours always.
// Returns { PWHB, RB3D, rb1, rush: [[on, off, role], ...], subLB: { nickel: [on, off], dime: [on, off] } }.
export function resolveSpecs(depth, order) {
  const out = { rush: [], subLB: {}, cur: {} }; // cur: the starter each role would spell
  const want = (role, cur, taken) => {
    const list = depth(role) || [];
    const p = list.find((x) => !taken.has(x.id));
    if (!p || !cur || p.id === cur.id) return null;
    return list.chosen && list[0] === p ? p : specFit(p, role) >= specFit(cur, role) + 3 ? p : null;
  };
  const rb1 = order("RB")[0];
  out.rb1 = rb1; out.cur.PWHB = out.cur.RB3D = rb1;
  out.PWHB = want("PWHB", rb1, new Set());
  out.RB3D = want("RB3D", rb1, new Set());
  // the rush package: each spot's starter or someone off the bench (never another starter up front)
  const dl = order("DL").slice(0, 4), used = new Set(dl.map((p) => p?.id));
  for (const [role, idx] of [["RLE", 0], ["RRE", 3], ["RDT", null]]) {
    // the rush tackle replaces the weaker pass rusher of the two inside
    const i = idx ?? ([1, 2].filter((j) => dl[j]).sort((a, b) => passRushOf(dl[a]) - passRushOf(dl[b]))[0]);
    const cur = dl[i];
    out.cur[role] = cur;
    const p = cur && want(role, cur, used);
    if (p) { out.rush.push([p, cur, role]); used.add(p.id); }
  }
  // the sub linebacker comes on for the weaker cover man of the linebackers left in nickel (MIKE,
  // WILL) or dime (MIKE); the SAM, off the field in nickel, can be him
  const L = order("LB");
  for (const [pkg, on] of [["nickel", [L[1], L[2]]], ["dime", [L[1]]]]) {
    const field = on.filter(Boolean);
    if (!field.length) continue;
    const cur = [...field].sort((a, b) => lbCover(a) - lbCover(b))[0];
    if (pkg === "nickel") out.cur.SUBLB = cur;
    const p = want("SUBLB", cur, new Set(field.map((x) => x.id)));
    if (p) out.subLB[pkg] = [p, cur];
  }
  return out;
}

// The snaps each specialist played (and the starters he spelled), from the game's count of his
// snaps (g.sub, kept by playsim's subBook). Adds them to a game's snap shares, in place.
export function applySubSnaps(snaps, g, side) {
  const s = g?.sub?.[side];
  if (!s || !snaps) return snaps;
  for (const unit of ["o", "d"]) {
    const n = s[`${unit}N`] || 0;
    if (!n) continue;
    for (const [id, c] of Object.entries(s[unit] || {})) snaps[id] = Math.max(0, Math.min(100, Math.round((snaps[id] || 0) + (100 * c) / n)));
  }
  return snaps;
}
