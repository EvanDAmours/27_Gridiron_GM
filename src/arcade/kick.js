// Kicks, Retro Bowl style: the kicking team lines up, you flick up the field. The flick's angle is
// the direction and its length the power. A field goal is good when the flick is long enough for
// the distance and straight enough for the uprights (and the engine agrees); a punt flies by the
// engine's own distance and the flick picks the side. Units as in play.js.
import { resolvePlay, bookPat } from "./bridge.js";
import { HALF, windNow, wxField } from "./play.js";
import * as K from "./ratings.js";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// The kicking team: a line, two wings, the long snapper's man... kept to the eleven we have. The
// holder kneels seven back, the kicker beside him; on a punt the punter stands fifteen back.
export function setupKick(g, L, kind, { pat = false } = {}) {
  const los = pat ? 85 : g.yard, /* the try: snapped from the 15 */ ents = {}, mk = (key, p, side, x, y) => ({ key, p, side, x, y, vx: 0, vy: 0, face: side === "off" ? 1 : -1, top: 7, acc: 12, mode: "idle", down: 0 });
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
  return { g, L, kind, pat, los, firstDown: 100, t: 0, phase: "presnap", ents, cover: {}, ball: { x: ents.K.x + 0.5, y: kind === "fg" ? 0.6 : 0, h: 0, holder: "K", flight: null }, aim: null, steer: null, text: "", ev: null, result: null, pick: null, log: [], dist, kicker: k, flick: null, endAt: 0 };
}

// The kick you're lining up, without the luck: where it's headed and whether it's long enough.
// dxYd/dyYd: the drag up the field and across it, in field yards; a drag of 11 yards is a full kick.
// Used by the aim preview (so the arc you see is the kick you get) and by the kick itself.
export const POSTS_X = 110, POST_HALF = 3.08; // the uprights stand on the end line, 18 ft 6 in apart
export function kickPlan(S, dxYd, dyYd) {
  const len = Math.hypot(dxYd, dyYd), angle = Math.atan2(dyYd, Math.max(0.5, dxYd)) * 0.55; // radians off straight (he squares it up some)
  const legStr = K.kickLeg(S.kicker), wd = windNow(S.g), W = wxField(S.g), x0 = S.ball.x, y0 = S.ball.y;
  const strength = clamp(len / 11, 0, 1.15);
  if (S.kind !== "fg") return { angle, strength, wd, x0, y0, len };
  // the distance this kick is good for: a full drag reaches his range (a wind at his back adds yards,
  // one in his face takes them; a bad day takes some too)
  const range = 50 + (legStr - 70) * 0.6 + wd.x * 0.6 - (W.kick || 0) * 0.5, power = strength * range, need = S.dist;
  const toPosts = POSTS_X - x0, drift = wd.y * clamp(need / 26, 1.2, 2.6) * 0.35; // a crosswind pushes it as it flies
  const yAtPosts = y0 + Math.tan(angle) * toPosts + drift;
  // his spread (one standard deviation, in radians): his accuracy, worse from long range and, for a
  // shaky kicker, with the game on the line late
  const acc = K.kickAccuracy(S.kicker), g = S.g, late = g && g.qtr >= 4 && g.clock <= 120 && Math.abs((g.score?.h ?? 0) - (g.score?.a ?? 0)) <= 3;
  const spread = (0.028 + Math.max(0, 95 - acc) * 0.0014) * (0.6 + need / 45) * (late ? 1 + Math.max(0, 80 - K.kickClutch(S.kicker)) * 0.012 : 1);
  return { angle, strength, power, need, range, wd, x0, y0, len, drift, yAtPosts, spread, late, short: power < need - 1, wide: Math.abs(yAtPosts) > POST_HALF + 0.4 };
}
// The kick meter: a needle sweeps an arc and you stop it. The green band in the middle (straight
// through) is as wide as his accuracy allows, narrower from long range and, for a shaky kicker, late
// in a close game; the orange beside it still sneaks inside an upright; red misses. good: the
// needle's reach (0..1 from the middle) that's still good.
export function meterZones(S) {
  const acc = K.kickAccuracy(S.kicker), need = S.kind === "fg" ? S.dist : 40, g = S.g;
  const late = g && g.qtr >= 4 && g.clock <= 120 && Math.abs((g.score?.h ?? 0) - (g.score?.a ?? 0)) <= 3;
  const clutch = late ? Math.max(0.7, 1 - Math.max(0, 80 - K.kickClutch(S.kicker)) * 0.012) : 1;
  const green = clamp((0.035 + Math.max(0, acc - 55) * 0.0045) * (1.3 - Math.min(0.85, need / 70)) * clutch, 0.025, 0.26);
  return { green, good: Math.min(0.7, green * 1.45) };
}
// The leg is his, not yours: a field goal gets what the distance needs (if he has it), a punt all of it.
export function meterStrength(S) {
  if (S.kind !== "fg") return 1;
  const p = kickPlan(S, 11, 0);
  return clamp((p.need + 2.5) / Math.max(1, p.range), 0.25, 1.15);
}
export const outOfRange = (S) => S.kind === "fg" && kickPlan(S, 11 * 1.15, 0).power < S.dist - 1;
// Where the needle stopped (m: -1 left .. 1 right) as a kick: the angle that puts it there at the posts.
export function kickMeter(S, m, ev = null) {
  if (S.phase !== "presnap") return null;
  const strength = meterStrength(S), len = 11 * strength;
  if (S.kind !== "fg") { const a = m * 0.32 / 0.55; return kickFlick(S, len * Math.cos(a), len * Math.sin(a), { exact: true, ev }); }
  const base = kickPlan(S, len, 0), { good } = meterZones(S), a = Math.abs(m), sg = m < 0 ? -1 : 1;
  const yAt = a <= good ? sg * (a / good) * (POST_HALF - 0.45) : sg * (POST_HALF + 0.9 + (a - good) * 11);
  const angle = Math.atan((yAt - base.y0 - base.drift) / Math.max(1, POSTS_X - base.x0)), raw = angle / 0.55;
  return kickFlick(S, len * Math.cos(raw), len * Math.sin(raw), { exact: true, ev });
}
// The computer's kick: the engine kicks it (its own make rate), and the field shows that kick.
export function kickAuto(S) {
  if (S.phase !== "presnap") return null;
  if (S.kind !== "fg") return kickMeter(S, (Math.random() - 0.5) * 0.6);
  const r = resolvePlay(S.g, "fg", { types: ["fg", "fg_miss"] }, null, 1), made = r.ev?.type === "fg", { good } = meterZones(S);
  const m = made ? (Math.random() * 2 - 1) * good * 0.8 : (Math.random() < 0.5 ? -1 : 1) * Math.min(1, good + 0.08 + Math.random() * 0.3);
  return kickMeter(S, m, r.ev);
}

// The kick: the plan, plus his accuracy's wobble (opt.exact: no wobble, the meter was the accuracy;
// opt.ev: the engine already booked it, the field just shows it).
export function kickFlick(S, dxYd, dyYd, opt = {}) {
  if (S.phase !== "presnap") return null;
  const plan = kickPlan(S, dxYd, dyYd), angle = plan.angle;
  S.phase = "live"; S.t = 0;
  if (S.kind === "fg") {
    const { need, x0, y0, drift, spread } = plan, toPosts = POSTS_X - x0, gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 1.41;
    const wobble = opt.exact ? 0 : gauss() * spread; // where his accuracy puts it, around where you aimed
    // and how well he struck it: an inconsistent kicker comes up a few yards light now and then
    const power = opt.exact ? plan.power : plan.power * (1 + gauss() * (0.012 + Math.max(0, 90 - K.kickConsistency(S.kicker)) * 0.0011) - (Math.random() < Math.max(0, 85 - K.kickConsistency(S.kicker)) * 0.004 ? 0.06 : 0));
    const yAtPosts = y0 + Math.tan(angle + wobble) * toPosts + drift, short = power < need - 1, wide = Math.abs(yAtPosts) > POST_HALF + 0.4;
    const good = !short && !wide;
    // an extra point is all yours (the engine books what the kick did); a field goal the engine has to agree with
    const r = opt.ev ? { ev: opt.ev } : S.pat ? { ev: bookPat(S.g, false, good) } : resolvePlay(S.g, "fg", { types: [good ? "fg" : "fg_miss"], fallback: [good ? "fg_miss" : "fg"] }, null, 12);
    S.ev = S.result = r.ev; S.text = r.ev?.text || "";
    const made = S.pat ? good : r.ev?.type === "fg";
    S.flick = { angle: angle + wobble, power, need, short: !made && short, wide: !made && !short, made };
    // the flight, honest about what happened: a good kick clears the bar between the uprights; a
    // short one comes down in front of them; a wide one goes by outside an upright
    let postY = made ? clamp(yAtPosts, -POST_HALF + 0.6, POST_HALF - 0.6) : !short ? (yAtPosts >= 0 ? 1 : -1) * Math.max(Math.abs(yAtPosts), POST_HALF + 1.4) : yAtPosts;
    const endX = made || !short ? POSTS_X + 7 : Math.min(POSTS_X - 1, x0 + Math.max(10, power + 4)), u = (POSTS_X - x0) / Math.max(1, endX - x0);
    const hPost = made ? 5.5 + Math.random() * 2 : 4.5 + Math.random() * 2;
    const arc = !short || made ? hPost / Math.max(0.05, 4 * u * (1 - u)) : clamp(need / 8, 3, 7);
    const endY = clamp(y0 + (postY - y0) * ((endX - x0) / toPosts), -HALF - 4, HALF + 4);
    const T = clamp((endX - x0) / 24, 1.1, 2.8);
    S.ball.flight = { from: { x: x0, y: y0 }, to: { x: endX, y: endY }, t0: 0.7, T, arc, target: null, kick: true, fg: true };
    S.endAt = 0.7 + T + 1.3;
    return r.ev;
  }
  // a punt: the engine's distance; the flick's side sends it toward that sideline
  const r = resolvePlay(S.g, "punt", { types: ["punt"] }, null, 4);
  S.ev = S.result = r.ev; S.text = r.ev?.text || "";
  const gross = r.ev?.gross ?? 42, land = Math.min(109, S.los + gross);
  const endY = clamp(S.ball.y + Math.tan(angle) * gross * 0.5, -HALF + 1, HALF - 1);
  S.flick = { angle, power: plan.len };
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
    ball.x = f.from.x + (f.to.x - f.from.x) * u; ball.y = f.from.y + (f.to.y - f.from.y) * u; ball.h = f.arc * 4 * u * (1 - u);
    if (S.kind === "punt" && ents.S0) { const ret = ents.S0; const tx = f.to.x, ty = f.to.y; const d = Math.hypot(tx - ret.x, ty - ret.y); if (d > 0.3) { ret.x += ((tx - ret.x) / d) * Math.min(d, 7 * dt); ret.y += ((ty - ret.y) / d) * Math.min(d, 7 * dt); } }
    if (u >= 1 && !S.landed) {
      S.landed = true;
      if (S.kind === "punt") { const ret = ents.S0; S.caughtAt = S.t; if (ret) { ball.holder = "S0"; ret.mode = "carry"; S.retTo = f.spot != null ? 100 - f.spot : f.to.x - (f.ret || 0); } }
    }
  }
  if (S.kind === "punt" && ball.holder === "S0" && S.retTo != null) { const ret = ents.S0; const d = S.retTo - ret.x; if (Math.abs(d) > 0.2) ret.x += Math.sign(d) * Math.min(Math.abs(d), 8 * dt); ball.x = ret.x; ball.y = ret.y; ball.h = 0; }
  if (S.t >= S.endAt) { S.phase = "done"; return false; }
  return true;
}
