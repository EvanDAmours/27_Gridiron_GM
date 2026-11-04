// Kicks, Retro Bowl style: the kicking team lines up, you flick up the field. The flick's angle is
// the direction and its length the power. A field goal is good when the flick is long enough for
// the distance and straight enough for the uprights (and the engine agrees); a punt flies by the
// engine's own distance and the flick picks the side. Units as in play.js.
import { resolvePlay } from "./bridge.js";
import { HALF } from "./play.js";
import * as K from "./ratings.js";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// The kicking team: a line, two wings, the long snapper's man... kept to the eleven we have. The
// holder kneels seven back, the kicker beside him; on a punt the punter stands fifteen back.
export function setupKick(g, L, kind) {
  const los = g.yard, ents = {}, mk = (key, p, side, x, y) => ({ key, p, side, x, y, vx: 0, vy: 0, face: side === "off" ? 1 : -1, top: 7, acc: 12, mode: "idle", down: 0 });
  const line = [["LT", -7.2], ["LG", -3.6], ["C", 0], ["RG", 3.6], ["RT", 7.2]];
  for (const [k, y] of line) if (L.off[k]) ents[k] = mk(k, L.off[k], "off", los - 1, y);
  if (L.off.TE) ents.TE = mk("TE", L.off.TE, "off", los - 1.2, 10.8);
  if (L.off.RB) ents.RB = mk("RB", L.off.RB, "off", los - 1.2, -10.8);
  const side = g.sides.h, k = kind === "fg" ? side.k : side.p || side.k, holder = kind === "fg" ? (side.p || side.qb) : null;
  if (kind === "fg") { ents.H = mk("H", holder, "off", los - 7, 0.6); ents.K = mk("K", k, "off", los - 9.5, -3); }
  else ents.K = mk("K", k, "off", los - 15, 0);
  for (const [i, p] of (L.def.DL || []).entries()) if (p) ents[`DL${i}`] = mk(`DL${i}`, p, "def", los + 1.6, [-5.8, -1.8, 1.8, 5.8][i]);
  for (const [i, p] of (L.def.LB || []).entries()) if (p) ents[`LB${i}`] = mk(`LB${i}`, p, "def", los + 1.6, [10, -10][i]);
  for (const [i, p] of (L.def.CB || []).entries()) if (p) ents[`CB${i}`] = mk(`CB${i}`, p, "def", kind === "punt" ? los + 2 : los + 1.6, [-21, 21, -14][i]);
  for (const [i, p] of (L.def.S || []).entries()) if (p) ents[`S${i}`] = mk(`S${i}`, p, "def", kind === "punt" ? (i ? los + 8 : Math.min(106, los + 45)) : los + 1.6, [0, 14][i]);
  const dist = kind === "fg" ? 100 - los + 17 : null;
  return { g, L, kind, los, firstDown: 100, t: 0, phase: "presnap", ents, cover: {}, ball: { x: ents.K.x + 0.5, y: kind === "fg" ? 0.6 : 0, h: 0, holder: "K", flight: null }, aim: null, steer: null, text: "", ev: null, result: null, pick: null, log: [], dist, kicker: k, flick: null, endAt: 0 };
}

// The flick: from where the touch started to where it ended (field yards). Power from its length,
// direction from its angle off straight up the field.
export function kickFlick(S, dxYd, dyYd) {
  if (S.phase !== "presnap") return null;
  const len = Math.hypot(dxYd, dyYd), angle = Math.atan2(dyYd, Math.max(0.5, dxYd)) * 0.55; // radians off straight (he squares it up some)
  const legStr = K.kickLeg(S.kicker), acc = K.kickAccuracy(S.kicker);
  S.phase = "live"; S.t = 0;
  if (S.kind === "fg") {
    // the distance the flick is good for: full length (the whole pull) reaches his range
    const range = 44 + (legStr - 85) * 1.1 + 6; const power = clamp(len / 11, 0, 1.15) * range;
    const need = S.dist, short = power < need - 1;
    // the uprights are 18.5 feet wide: six yards; a wobble from his own accuracy adds to the angle
    const wobble = (Math.random() - 0.5) * (0.05 + Math.max(0, 92 - acc) * 0.004) * (need / 35);
    const off = Math.abs(Math.tan(angle + wobble) * need), wide = off > 4.2;
    const good = !short && !wide;
    const r = resolvePlay(S.g, "fg", { types: [good ? "fg" : "fg_miss"], fallback: [good ? "fg_miss" : "fg"] }, null, 12);
    S.ev = S.result = r.ev; S.text = r.ev?.text || "";
    const made = r.ev?.type === "fg";
    S.flick = { angle: angle + wobble, power, need, short, wide, made };
    const T = clamp(need / 26, 1.2, 2.6), endX = Math.min(110, S.los + (made ? need + 2 : short ? need - 6 - Math.random() * 6 : need)), endY = clamp(Math.tan(angle + wobble) * (endX - S.los) + S.ball.y, -HALF + 0.5, HALF - 0.5);
    S.ball.flight = { from: { x: S.ball.x, y: S.ball.y }, to: { x: endX, y: endY }, t0: 0.7, T, arc: clamp(need / 10, 2.5, 5.5), target: null, kick: true };
    S.endAt = 0.7 + T + 1.3;
    return r.ev;
  }
  // a punt: the engine's distance; the flick's side sends it toward that sideline
  const r = resolvePlay(S.g, "punt", { types: ["punt"] }, null, 4);
  S.ev = S.result = r.ev; S.text = r.ev?.text || "";
  const gross = r.ev?.gross ?? 42, land = Math.min(109, S.los + gross);
  const endY = clamp(S.ball.y + Math.tan(angle) * gross * 0.5, -HALF + 1, HALF - 1);
  S.flick = { angle, power: len };
  S.ball.flight = { from: { x: S.ball.x, y: S.ball.y }, to: { x: land, y: endY }, t0: 0.9, T: clamp(gross / 16, 2, 3.6), arc: 6, target: null, kick: true, ret: r.ev?.ret || 0, spot: r.ev?.spot };
  S.endAt = 0.9 + S.ball.flight.T + 1.6;
  return r.ev;
}

export function tickKick(S, dt) {
  if (S.phase === "presnap" || S.phase === "done") return false;
  S.t += dt;
  const { ball, ents } = S, f = ball.flight;
  // the snap and the rush: the line holds, the edge men come, the returner waits
  for (const e of Object.values(ents)) if (e.side === "def" && e.key !== "S0" && S.t > 0.25 && S.t < (f?.t0 ?? 1)) { e.x += (e.key.startsWith("CB") || e.key.startsWith("LB") ? 5 : 1.5) * dt * -1; }
  if (f && S.t >= f.t0) {
    const u = clamp((S.t - f.t0) / f.T, 0, 1);
    ball.holder = null;
    ball.x = f.from.x + (f.to.x - f.from.x) * u; ball.y = f.from.y + (f.to.y - f.from.y) * u; ball.h = f.arc * 4 * u * (1 - u) + (S.kind === "fg" ? u * 2.5 : 0);
    if (S.kind === "punt" && ents.S0) { const ret = ents.S0; const tx = f.to.x, ty = f.to.y; const d = Math.hypot(tx - ret.x, ty - ret.y); if (d > 0.3) { ret.x += ((tx - ret.x) / d) * Math.min(d, 7 * dt); ret.y += ((ty - ret.y) / d) * Math.min(d, 7 * dt); } }
    if (u >= 1 && !S.landed) {
      S.landed = true;
      if (S.kind === "punt") { const ret = ents.S0; if (ret) { ball.holder = "S0"; ret.mode = "carry"; S.retTo = f.spot != null ? 100 - f.spot : f.to.x - (f.ret || 0); } }
    }
  }
  if (S.kind === "punt" && ball.holder === "S0" && S.retTo != null) { const ret = ents.S0; const d = S.retTo - ret.x; if (Math.abs(d) > 0.2) ret.x += Math.sign(d) * Math.min(Math.abs(d), 8 * dt); ball.x = ret.x; ball.y = ret.y; ball.h = 0; }
  if (S.t >= S.endAt) { S.phase = "done"; return false; }
  return true;
}
