// Kicks, Retro Bowl style: the kicking team lines up, you flick up the field. The flick's angle is
// the direction and its length the power. A field goal is good when the flick is long enough for
// the distance and straight enough for the uprights (and the engine agrees); a punt flies by the
// engine's own distance and the flick picks the side. Units as in play.js.
import { resolvePlay, bookPat } from "./bridge.js";
import { HALF, windNow, wxField, topSpeed } from "./play.js";
import { rebookPunt, rebookKickoff } from "../playsim.js";
import * as K from "./ratings.js";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// The kicking team: a line, two wings, the long snapper's man... kept to the eleven we have. The
// holder kneels seven back, the kicker beside him; on a punt the punter stands fifteen back.
export function setupKick(g, L, kind, { pat = false } = {}) {
  const los = pat ? 85 : g.yard, /* the try: snapped from the 15 */ ents = {}, mk = (key, p, side, x, y) => ({ key, p, side, x, y, vx: 0, vy: 0, face: side === "off" ? 1 : -1, top: p ? topSpeed(p) : 7, acc: 12, mode: "idle", down: 0 });
  const line = [["LT", -7.2], ["LG", -3.6], ["C", 0], ["RG", 3.6], ["RT", 7.2]];
  for (const [k, y] of line) if (L.off[k]) ents[k] = mk(k, L.off[k], "off", los - 1, y);
  // (a punt: the tight end and the back are the gunners, split out wide to get down the field first)
  if (L.off.TE) ents.TE = mk("TE", L.off.TE, "off", los - 1.2, kind === "punt" ? 21 : 10.8);
  if (L.off.RB) ents.RB = mk("RB", L.off.RB, "off", los - 1.2, kind === "punt" ? -21 : -10.8);
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
  S.ball.flight = { from: { x: S.ball.x, y: S.ball.y }, to: { x: land, y: endY }, t0: 0.9, T: clamp(gross / 12.5, 2.4, 4.6) /* (NFL hang time: about four and a half seconds on a good one) */, arc: 6, target: null, kick: true, ret: r.ev?.ret || 0, spot: r.ev?.spot };
  S.endAt = 0.9 + S.ball.flight.T + 1.6;
  return r.ev;
}

export function tickKick(S, dt) {
  if (S.phase === "presnap" || S.phase === "done") return false;
  S.t += dt;
  const { ball, ents } = S, f = ball.flight, ret = ents.S0, returning = S.kind === "punt" || S.kind === "ko";
  // the snap and the rush: the line holds, the edge men come, the returner waits (a kickoff has no snap)
  if (S.kind !== "ko") for (const e of Object.values(ents)) if (e.side === "def" && e.key !== "S0" && S.t > 0.25 && S.t < (f?.t0 ?? 1)) { const v = e.key.startsWith("CB") || e.key.startsWith("LB") ? 5 : 1.5; e.x -= v * dt; e.vx += (-v - e.vx) * Math.min(1, dt * 9); e.vy *= 0.8; } // (with his speed, so he's drawn coming, not sliding in a stance)
  // (his speed, as the picture reads it, is smoothed over about a tenth of a second: a blocker riding a man
  // who moves in fits and starts is a man shuffling, not one flicking between a sprint and a standstill)
  const move = (e, tx, ty, v) => { const d = Math.hypot(tx - e.x, ty - e.y); let vx = 0, vy = 0; if (d > 0.15) { const k = Math.min(d, v * dt) / d; vx = ((tx - e.x) * k) / dt; vy = ((ty - e.y) * k) / dt; e.x += (tx - e.x) * k; e.y += (ty - e.y) * k; } const a = Math.min(1, dt * 9); e.vx += (vx - e.vx) * a; e.vy += (vy - e.vy) * a; };
  // a kickoff: the kicker's run-up to the tee, the coverage starting with him
  if (S.kind === "ko" && f && S.t < f.t0) { const K = ents.K; if (K) move(K, f.from.x - 0.6, 0, Math.max(0.5, (f.from.x - 0.6 - K.x) / Math.max(0.05, f.t0 - S.t))); for (const e of Object.values(ents)) if (e.side === "off" && e.key !== "K" && S.t > f.t0 - 0.35) move(e, e.x + 3, e.y, 5); }
  if (f && S.t >= f.t0) {
    const u = clamp((S.t - f.t0) / f.T, 0, 1);
    if (ball.holder !== "S0") { ball.holder = null; ball.x = f.from.x + (f.to.x - f.from.x) * u; ball.y = f.from.y + (f.to.y - f.from.y) * u; ball.h = f.arc * 4 * u * (1 - u); }
    if (returning && ret && !S.landed) move(ret, f.to.x, f.to.y, 7);
    if (u >= 1 && !S.landed) {
      S.landed = true;
      if (returning && ret) { S.caughtAt = S.t; ball.holder = "S0"; ret.mode = "carry"; S.retTo = S.kind === "ko" ? S.koTo : !S.ev?.returned ? null : S.ev?.retTD ? -2 : (f.spot ?? f.to.x) - (f.ret || 0); if (S.kind === "punt") S.koTD = !!S.ev?.retTD; if (S.userRet) { S.retTo = null; S.koTD = false; } } // (a punt: a fair catch, or downed, has no return)
    }
    // and the return team: on a kickoff the front men drop back into a wall, then once he has it each
    // picks up a man in coverage and gets in his way
    if (S.kind === "punt") puntBlocks(S, dt, move);
    if (S.kind === "ko") for (const e of Object.values(ents)) {
      if (e.side !== "def" || e.key === "S0") continue;
      e.wy ??= e.y * 0.8;
      const m = ball.holder === "S0" && ents[`C${e.key.slice(1)}`];
      // (one block each: the blocker's run blocking against the cover man's shedding sets how long he holds him; then
      // the cover man is off it and after the ball, as on a punt)
      if (m && m.down <= 0) { const dx = m.x - e.x; move(e, m.x + 0.9, m.y, Math.abs(dx) < 3 ? 4 : 7.5); if (Math.hypot(m.x - e.x, m.y - e.y) < 1.4 && !e.blocked) { e.blocked = true; const win = K.skill(e.p, [["runBlock", 0.6], ["str", 0.3], ["tackling", 0.2]], 0.3) - K.skill(m.p, [["shedBlock", 0.5], ["spd", 0.3], ["tackling", 0.3]], 0.3); m.held = S.t + clamp(0.45 + win * 0.02, 0.15, 0.9); } }
      else move(e, Math.max(f.to.x - 16, e.x - 1), e.wy, 6);
    }
  }
  // the coverage: everyone on the kicking team runs down the field at the ball, then at the man with it
  // (slowed while a blocker has hold of him)
  if (returning && f && S.t > (S.kind === "ko" ? f.t0 : 0.35)) for (const e of Object.values(ents)) {
    if (e.side !== "off" || e.key === "K" || e.key === "H" || e.down > 0) continue;
    if (S.kind === "punt" && !GUNNERS.has(e.key) && S.t < 0.6) continue; // (the line blocks for the punter first, then releases)
    // lanes: each man stays in his own lane on the way down, squeezing in only as he gets close
    const lane = S.kind === "punt" && ball.holder !== "S0" ? clamp((e.y0 ??= e.y) * 0.45, -14, 14) : 0;
    // (on him: where he'll be a beat from now, so they meet him rather than run to where he was)
    const lead = ball.holder === "S0" ? clamp(Math.hypot(ret.x - e.x, ret.y - e.y) / 14, 0.1, 0.6) : 0;
    const tx = ball.holder === "S0" ? ret.x + (ret.vx || 0) * lead : f.to.x, ty = ball.holder === "S0" ? ret.y + (ret.vy || 0) * lead + ((e.y > ret.y ? 1 : -1) * 0.3) : f.to.y + lane + (e.y - f.to.y - lane) * 0.35;
    move(e, tx + (S.arrived == null ? 0.6 : 0), ty, (e.top || 7) * (S.kind === "ko" ? 0.92 : 1.15) * (e.held > S.t ? 0.3 : 1));
  }
  // nobody runs through a team-mate: men converging on the returner keep a body's width apart
  if (returning) { const L = Object.values(ents).filter((e) => e.key !== "S0" && e.down <= 0); for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const a = L[i], b = L[j]; if (a.side !== b.side) continue; const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy); if (d < 0.85 && d > 1e-6) { const k = (0.85 - d) * 0.5; a.x -= (dx / d) * k; a.y -= (dy / d) * k; b.x += (dx / d) * k; b.y += (dy / d) * k; } else if (d <= 1e-6) { a.y -= 0.4; b.y += 0.4; } } }
  if (S.userRet && S.kind === "punt" && ret && (S.ev?.tb || S.ev?.muff || S.ev?.retTD)) S.userRet = false; // (nothing to field: a touchback, or the engine's own big moment)
  if (S.userRet && S.kind === "ko" && (S.ev?.ko?.tb || S.ev?.ko?.td || S.ev?.ko?.muff || S.ev?.ko?.squib)) S.userRet = false; // (a kickoff: the same)
  if (S.userRet && (S.kind === "punt" || S.kind === "ko") && ret) userReturn(S, dt);
  // the return itself: he carries it back up the field, weaving, until the coverage gets to him where the engine says it ended
  else if (returning && ret && ball.holder === "S0" && S.retTo != null) {
    const d = S.retTo - ret.x;
    if (Math.abs(d) > 0.3) { ret.vx = Math.sign(d) * 8.6; ret.vy = Math.sin(S.t * 3.2) * 2.4; ret.x += Math.sign(d) * Math.min(Math.abs(d), 8.6 * dt); ret.y = clamp(ret.y + ret.vy * dt, -HALF + 1, HALF - 1); S.endAt = Math.max(S.endAt, S.t + 0.9); }
    else if (S.arrived == null && (S.koTD || (S.waitTk ??= S.t) + 1.4 < S.t || Object.values(ents).some((e) => e.side === "off" && e.key !== "K" && Math.hypot(e.x - ret.x, e.y - ret.y) < 2.2))) { S.arrived = S.t; ret.vx = 0; ret.vy = 0; S.endAt = S.t + (S.koTD ? 1.6 : 1.0);
      // brought down: the nearest man in coverage makes the tackle (unless he went all the way)
      if (!S.koTD) { let best = null, bd = 99; for (const e of Object.values(ents)) { if (e.side !== "off" || e.key === "K") continue; const dd = Math.hypot(e.x - ret.x, e.y - ret.y); if (dd < bd) { bd = dd; best = e; } } if (best) { best.x = ret.x + 0.7; best.y = ret.y; best.down = 0.6; S.tackler = best; ret.down = 0.9; } } }
    if (S.arrived == null && S.waitTk != null) { ret.vx = 0; ret.vy = 0; S.endAt = Math.max(S.endAt, S.t + 0.9); } // (he's stopped where the engine says: the coverage closes on him)
    ball.x = ret.x; ball.y = ret.y; ball.h = 0;
  }
  if (S.t >= S.endAt) { S.phase = "done"; return false; }
  return true;
}

const GUNNERS = new Set(["TE", "RB"]);
// The punt return team: the front rushes the punt, then turns and finds a man; the corners jam the
// gunners from the snap. Each blocker gets between his man and the returner and rides him (a better
// blocker holds him longer), so the coverage has to beat blocks to get there.
function puntBlocks(S, dt, move) {
  const { ents, ball } = S, ret = ents.S0, cov = Object.values(ents).filter((e) => e.side === "off" && e.key !== "K" && e.down <= 0), used = new Set();
  const blockers = Object.values(ents).filter((e) => e.side === "def" && e.key !== "S0").sort((a, b) => (a.key.startsWith("CB") ? 0 : 1) - (b.key.startsWith("CB") ? 0 : 1));
  for (const b of blockers) {
    if (S.t < 0.9 && !b.key.startsWith("CB")) continue; // (the front is rushing the punt)
    let m = b.mark && ents[b.mark]; if (!m || m.down > 0 || used.has(m.key) || (b.done?.has(m.key) && !(m.held > S.t))) { m = null; let bd = 1e9; for (const c of cov) { if (used.has(c.key) || b.done?.has(c.key)) continue; const d = Math.hypot(c.x - b.x, c.y - b.y) + (b.key.startsWith("CB") && !GUNNERS.has(c.key) ? 20 : 0); if (d < bd) { bd = d; m = c; } } b.mark = m?.key; }
    if (!m) continue; used.add(m.key);
    // between him and the returner (or the ball, before the catch), a yard off him
    const tx0 = ball.holder === "S0" ? ret.x : ball.flight?.to.x ?? m.x, ty0 = ball.holder === "S0" ? ret.y : ball.flight?.to.y ?? m.y, dx = tx0 - m.x, dy = ty0 - m.y, dd = Math.hypot(dx, dy) || 1;
    move(b, m.x + (dx / dd) * 0.9, m.y + (dy / dd) * 0.9, b.top || 7);
    // one block per pair: once his man gets off it, that blocker has lost him (he finds another)
    if (Math.hypot(m.x - b.x, m.y - b.y) < 1.3 && !(m.held > S.t) && !(b.done ||= new Set()).has(m.key)) { const win = K.skill(b.p, [["runBlock", 0.6], ["str", 0.3], ["tackling", 0.2]], 0.3) - K.skill(m.p, [["shedBlock", 0.5], ["spd", 0.3], ["tackling", 0.3]], 0.3); m.held = S.t + clamp(0.3 + win * 0.015, 0.12, 0.6); b.done.add(m.key); }
  }
}
// Your punt return: call a fair catch (a tap while the ball's up) or catch it and run. You steer him
// up and down the field; he runs back up it on his own. The coverage has to get off its blocks and
// make the tackle (a shifty returner breaks the odd one). Where he's brought down is the spot.
function userReturn(S, dt) {
  const { ents, ball } = S, ret = ents.S0, f = S.flightRef || (S.flightRef = ball.flight);
  if (S.retDone) return false;
  if (S.fair && S.landed && !S.retDone) { S.retDone = true; ret.vx = 0; ret.vy = 0; rebookPunt(S.g, S.ev, 0, { fair: true }); S.result = S.ev; S.text = S.ev?.text || ""; S.endAt = S.t + 0.9; return true; }
  if (ball.holder !== "S0") return false;
  S.catchX ??= ret.x;
  const top = topSpeed(ret.p) * (S.t - (S.caughtAt ?? S.t) < 0.35 ? 0.6 : 1), wantY = S.steer ?? ret.y;
  const vx = -top, vy = clamp((wantY - ret.y) * 3, -top * 0.8, top * 0.8), k = Math.min(1, dt * 9);
  ret.vx += (vx - ret.vx) * k; ret.vy += (vy - ret.vy) * k; ret.x += ret.vx * dt; ret.y += ret.vy * dt;
  ball.x = ret.x; ball.y = ret.y; ball.h = 0; S.endAt = Math.max(S.endAt, S.t + 0.9);
  const end = (why) => { S.retDone = true; ret.vx = 0; ret.vy = 0; if (S.kind === "ko") rebookKickoff(S.g, S.ev, 100 - Math.max(ret.x, 0)); else rebookPunt(S.g, S.ev, S.catchX - Math.max(ret.x, -1), {}); S.result = S.ev; S.text = S.ev?.text || ""; S.endAt = S.t + (why === "td" ? 1.6 : 1.0); if (why === "td") S.koTD = true; };
  if (ret.x <= 0) { end("td"); return true; }
  if (Math.abs(ret.y) >= HALF) { ret.y = clamp(ret.y, -HALF, HALF); end("oob"); return true; }
  for (const e of Object.values(ents)) {
    if (e.side !== "off" || e.down > 0 || e.held > S.t) continue;
    if (Math.hypot(e.x - ret.x, e.y - ret.y) > 1.35) continue;
    const pBreak = clamp(0.07 + (K.elusive(ret.p) - K.tackling(e.p)) * 0.004 - (S.broke || 0) * 0.04, 0.02, 0.22);
    if (Math.random() < pBreak) { e.down = 0.8; S.broke = (S.broke || 0) + 1; ret.vx *= 0.6; continue; }
    e.x = ret.x + 0.7; e.y = ret.y; e.down = 0.6; S.tackler = e; ret.down = 0.9; S.arrived = S.t; end("tackle"); return true;
  }
  return true;
}

// A kickoff, played out on the field after the engine has booked it (ev.ko: the touchback, where it was
// caught and where the return ended). The kicking team lines up across its 35 and runs it down the field
// left to right; the return team waits with its front line near midfield and the returner deep.
export function setupKickoff(g, L, ev) {
  const ko = ev.ko || {}, los = 35, ents = {}, mk = (key, p, side, x, y) => ({ key, p, side, x, y, vx: 0, vy: 0, face: side === "off" ? 1 : -1, top: p ? 6.3 + (Math.max(40, Math.min(99, p.spd ?? 75)) - 60) / 39 * 3.5 : 7, acc: 12, mode: "idle", down: 0 });
  const offs = [...new Set(Object.values(L.off).filter(Boolean))].slice(0, 10), ys = [-22, -17.5, -13, -8.5, -4, 4, 8.5, 13, 17.5, 22];
  offs.forEach((p, i) => { ents[`C${i}`] = mk(`C${i}`, p, "off", los - 1, ys[i]); });
  const kicker = ko.kicker || g.sides.h?.k || offs[0]; ents.K = mk("K", kicker, "off", los - 7, 0);
  const defs = [...(L.def.DL || []), ...(L.def.LB || []), ...(L.def.CB || []), ...(L.def.S || [])].filter(Boolean).slice(0, 10);
  const spots = [[47, -16], [47, -6], [47, 6], [47, 16], [58, -11], [58, 0], [58, 11], [70, -8], [70, 8], [80, 0]];
  defs.forEach((p, i) => { const [x, y] = spots[i] || [60, 0]; ents[`R${i}`] = mk(`R${i}`, p, "def", x, y); });
  const land = ko.tb ? 104 : 100 - (ko.catchAt ?? 3), ly = ((ev.clock || 0) % 7) - 3;
  ents.S0 = mk("S0", ko.kr || defs[defs.length - 1] || offs[0], "def", Math.min(land, 99), ly);
  const S = { g, L, kind: "ko", pat: false, los, firstDown: 100, t: 0, phase: "live", ents, cover: {}, ball: { x: los - 0.5, y: 0, h: 0, holder: null, flight: null }, aim: null, steer: null, text: ev.text || "", ev, result: ev, pick: null, log: [], dist: null, kicker, flick: null };
  S.ball.flight = { from: { x: los, y: 0 }, to: { x: land, y: ly }, t0: 0.9, T: 2.5, arc: 11, target: null, kick: true };
  S.koTo = ko.tb ? null : ko.td ? -2 : 100 - (ko.spot ?? 25); S.koTD = !!ko.td;
  S.endAt = 0.9 + 2.5 + (ko.tb ? 1.4 : 1.0);
  return S;
}
