// The on-field play: 22 men moving with real acceleration, the throw you aim, the catch, the run
// after it and the tackle, all decided on the field. Units are yards: x from the offense's own
// goal line (0) toward the far goal line (100), y across the field (-26.65 near sideline .. 26.65).
//
// The engine (playsim.js) still books every play: once the field knows what happened, bridge.js
// asks it for a play of that kind gaining about those yards, so the box score, grades, clock and
// log are the engine's, and the field never shows something the box score contradicts.
import { resolvePlay } from "./bridge.js";

export const FIELD_W = 53.3, HALF = FIELD_W / 2;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const hyp = (dx, dy) => Math.hypot(dx, dy);
const R = (p, k, d = 70) => p?.posAttrs?.[k] ?? d;
const rnd = (S) => (S.g?.rand || Math.random)(); // the game's own RNG, so a seeded game replays the same

// Yards per second at full speed from a speed rating (a 60 jogs ~6.3, a 99 flies ~9.8), and how
// hard he accelerates (yd/s²) from his acceleration rating. Linemen are capped: they don't sprint.
export const topSpeed = (p) => 6.3 + (clamp(p?.spd ?? 70, 40, 99) - 60) / 39 * 3.5;
const accelOf = (p) => 9 + (clamp(p?.acc ?? 70, 40, 99) - 60) / 39 * 9;

// Pre-snap spots: [yards behind the line (-), lateral]. The offense's right is +y.
const OFF_SPOTS = { LT: [-1, -7.2], LG: [-1, -3.6], C: [-1, 0], RG: [-1, 3.6], RT: [-1, 7.2], TE: [-1.2, 10.8], X: [-1, -21.5], Z: [-1, 21.5], SLOT: [-2.5, -15], QB: [-5, 0], RB: [-7, 1.8] };
const DEF_SPOTS = { DL0: [1.6, -5.8], DL1: [1.6, -1.8], DL2: [1.6, 1.8], DL3: [1.6, 5.8], LB0: [5.5, 5], LB1: [5.5, -4], CB0: [6, -21.5], CB1: [6, 21.5], CB2: [5, -15], S0: [14, 0], S1: [10, 9] };
const OL_VS = { DL0: "LT", DL1: "LG", DL2: "RG", DL3: "RT" };
export const ELIGIBLE = ["X", "Z", "SLOT", "TE", "RB"];
const LINE = ["LT", "LG", "C", "RG", "RT"];

// Routes: legs of [yards up the field, yards sideways], sideways +1 toward the middle (the same
// route mirrors on either side). `stop` ends in a settle; otherwise he keeps running the last leg.
// `more`: how far he keeps running his last leg before he eases up and looks back for the ball
const ROUTES = {
  slant: { legs: [[2, 0], [6, 5]], more: 4 }, hitch: { legs: [[5, 0], [-1, 0.5]], stop: true }, out: { legs: [[6, 0], [0.5, -7]], more: 3 },
  dig: { legs: [[12, 0], [0, 10]], more: 6 }, comeback: { legs: [[14, 0], [-2.5, -2]], stop: true }, corner: { legs: [[10, 0], [12, -8]], more: 10 },
  post: { legs: [[10, 0], [14, 8]], more: 12 }, go: { legs: [[45, 0]], more: 40 }, seam: { legs: [[4, 0], [30, 1.5]], more: 15 }, drag: { legs: [[2, 0], [2, 16]], more: 5 },
  flat: { legs: [[0.5, 0], [2, -9]], more: 3 }, swing: { legs: [[-1, -3], [3, -8]], more: 4 }, check: { legs: [[4, 0], [1, 0]], stop: true, delay: 0.9 },
};
const PLAYS = {
  pass_quick: { X: "slant", Z: "hitch", SLOT: "out", TE: "flat", RB: "check" },
  pass_medium: { X: "dig", Z: "out", SLOT: "corner", TE: "drag", RB: "swing" },
  pass_deep: { X: "go", Z: "post", SLOT: "corner", TE: "seam", RB: "check" },
};
export const PLAY_NAMES = { pass_quick: "Quick", pass_medium: "Medium", pass_deep: "Deep", run_inside: "Inside run", run_outside: "Outside run" };

const mk = (key, p, side, x, y) => ({ key, p, side, x, y, vx: 0, vy: 0, face: side === "off" ? 1 : -1, top: topSpeed(p), acc: accelOf(p), mode: "idle", path: null, down: 0 });

// ---------- setting up ----------
export function setupPlay(g, L, call) {
  const los = g.yard, ents = {};
  for (const [k, [dx, dy]] of Object.entries(OFF_SPOTS)) { const p = L.off[k]; if (p) ents[k] = mk(k, p, "off", los + dx, dy); }
  const dl = L.def.DL, lb = L.def.LB, cb = L.def.CB, s = L.def.S;
  const defList = { DL0: dl[0], DL1: dl[1], DL2: dl[2], DL3: dl[3], LB0: lb[0], LB1: lb[1], CB0: cb[0], CB1: cb[1], CB2: cb[2], S0: s[0], S1: s[1] };
  // (near the goal line the secondary can't line up as deep: everyone fits in front of the end line)
  for (const [k, p] of Object.entries(defList)) { const [dx, dy] = DEF_SPOTS[k]; if (p) ents[k] = mk(k, p, "def", Math.min(los + dx, 106.5 - (k === "S0" ? 0 : 2)), dy); }
  for (const k of [...LINE, "DL0", "DL1", "DL2", "DL3"]) if (ents[k]) { ents[k].top *= 0.72; ents[k].acc *= 0.8; }
  // man assignments: the engine's cover man for each receiver, if he's out there
  const cover = {};
  for (const r of ELIGIBLE) { const cm = L.cover[r]; const k = cm && Object.keys(defList).find((d) => defList[d]?.id === cm.id); if (k) cover[r] = k; }
  for (const r of ["X", "Z", "SLOT"]) { const k = cover[r]; if (k && ents[k] && ents[r]) ents[k].y = ents[r].y + (ents[r].y < 0 ? 1 : -1) * 0.8; }
  if (ents[cover.TE] && ents.TE && cover.TE.startsWith("LB")) ents[cover.TE].y = ents.TE.y;
  // the routes, laid out now so the field can show them before the snap
  const routes = PLAYS[call];
  if (routes) for (const r of ELIGIBLE) {
    const e = ents[r]; if (!e) continue;
    const Rt = ROUTES[routes[r]], inward = e.y < 0 ? 1 : -1;
    let x = e.x, y = e.y; const pts = [];
    for (const [up, side] of Rt.legs) { x = Math.min(107, x + up); y = clamp(y + side * inward, -HALF + 1, HALF - 1); pts.push({ x, y }); }
    e.path = pts; e.stop = !!Rt.stop; e.delay = Rt.delay || 0; e.more = Rt.more || 0;
  }
  return {
    g, L, call, los, firstDown: Math.min(100, los + g.toGo), t: 0, phase: "presnap", ents, cover,
    ball: { x: ents.QB.x, y: 0, h: 0, holder: "QB", flight: null },
    aim: null, steer: null, slideTo: null, text: "", ev: null, result: null, pick: null, shed: {}, pressureAt: 0, thrownAt: 0, endAt: 0, lane: 0, handoffAt: 0, tackler: null, broke: 0, log: [],
  };
}

export function snap(S) {
  const { ents, call } = S;
  S.phase = "live"; S.t = 0;
  const isPass = call.startsWith("pass");
  for (const r of ELIGIBLE) { const e = ents[r]; if (!e) continue; e.mode = isPass ? "route" : r === "RB" ? "back" : "block"; }
  for (const k of LINE) ents[k].mode = "block";
  for (const k of ["DL0", "DL1", "DL2", "DL3"]) {
    const d = ents[k], o = ents[OL_VS[k]]; if (!d) continue;
    const rush = isPass ? R(d.p, "passRush", d.p.ovr) : R(d.p, "runStop", d.p.ovr), blk = isPass ? R(o?.p, "passBlock", o?.p?.ovr) : R(o?.p, "runBlock", o?.p?.ovr);
    S.shed[k] = clamp(2.0 + (blk - rush) * 0.045 + rnd(S) * 2.6, 1.2, 7);
    d.mode = "rush";
  }
  for (const k of ["LB0", "LB1", "CB0", "CB1", "CB2", "S0", "S1"]) if (ents[k]) ents[k].mode = "cover";
  ents.QB.mode = isPass ? "dropback" : "handoff";
  if (!isPass) { S.handoffAt = 0.7; S.lane = call === "run_outside" ? (rnd(S) < 0.5 ? -14 : 14) : (rnd(S) < 0.5 ? -4.2 : 4.2); }
}

// ---------- movement ----------
// Accelerate toward a point: velocity bends toward the target at his acceleration, capped at his
// top speed (`mult` scales it). Returns the distance still to go.
function steer(e, tx, ty, dt, mult = 1, through = false) {
  const dx = tx - e.x, dy = ty - e.y, d = hyp(dx, dy), top = e.top * mult;
  if (d < 0.08) { if (!through) brake(e, dt); else { e.x += e.vx * dt; e.y += e.vy * dt; } return 0; }
  const want = through ? top : Math.min(top, d / Math.max(dt, 0.001) * 0.5 + 1.5); // ease in as he arrives (unless he's running through it)
  const wx = (dx / d) * want, wy = (dy / d) * want;
  const ax = wx - e.vx, ay = wy - e.vy, a = hyp(ax, ay), cap = e.acc * dt;
  if (a <= cap) { e.vx = wx; e.vy = wy; } else { e.vx += (ax / a) * cap; e.vy += (ay / a) * cap; }
  const sp = hyp(e.vx, e.vy); if (sp > top) { e.vx *= top / sp; e.vy *= top / sp; }
  e.x += e.vx * dt; e.y += e.vy * dt;
  if (Math.abs(e.vx) > 0.8) e.face = e.vx > 0 ? 1 : -1;
  return hyp(tx - e.x, ty - e.y);
}
// Mirror a moving man: run at his velocity, bending toward a point on him (his hip), so a cover
// man stays in step instead of settling on a spot and watching him run by.
function mirror(e, r, px, py, dt, mult = 1, gain = 2.2, rv = r) {
  const top = e.top * mult;
  let wx = rv.vx + (px - e.x) * gain, wy = rv.vy + (py - e.y) * gain;
  const w = hyp(wx, wy); if (w > top) { wx *= top / w; wy *= top / w; }
  const ax = wx - e.vx, ay = wy - e.vy, a = hyp(ax, ay), cap = e.acc * dt;
  if (a <= cap) { e.vx = wx; e.vy = wy; } else { e.vx += (ax / a) * cap; e.vy += (ay / a) * cap; }
  e.x += e.vx * dt; e.y += e.vy * dt;
  if (Math.abs(e.vx) > 0.8) e.face = e.vx > 0 ? 1 : -1;
}
function brake(e, dt) { const k = Math.max(0, 1 - 12 * dt); e.vx *= k; e.vy *= k; e.x += e.vx * dt; e.y += e.vy * dt; }
const aheadOf = (e, T) => ({ x: e.x + e.vx * T, y: clamp(e.y + e.vy * T, -HALF + 0.5, HALF - 0.5) });
// where to run to meet a moving man: the point he reaches when the chaser, at full speed, can
// be there too (the usual quadratic); if he can't be caught, cut off his lane up the field
function intercept(d, c) {
  const rx = c.x - d.x, ry = c.y - d.y, v = Math.max(d.top * 0.98, 1);
  if (hyp(rx, ry) < 3.5) return { x: c.x + c.vx * 0.15, y: c.y + c.vy * 0.15 }; // on him: go get him
  const a = c.vx * c.vx + c.vy * c.vy - v * v, b = 2 * (rx * c.vx + ry * c.vy), cc = rx * rx + ry * ry;
  let T;
  if (Math.abs(a) < 1e-6) T = -cc / (b || -1);
  else { const disc = b * b - 4 * a * cc; if (disc < 0) T = -1; else { const q = Math.sqrt(disc), t1 = (-b - q) / (2 * a), t2 = (-b + q) / (2 * a); T = Math.min(...[t1, t2].filter((t) => t > 0)); } }
  if (!(T > 0) || !Number.isFinite(T)) T = clamp(hyp(rx, ry) / v, 0, 2.5) + 0.4; // can't get there: aim ahead of him anyway
  T = Math.min(T, 3);
  return { x: c.x + c.vx * T, y: clamp(c.y + c.vy * T, -HALF, HALF) };
}
export const separation = (S, r) => { const e = S.ents[r], c = S.ents[S.cover[r]]; return c ? hyp(e.x - c.x, e.y - c.y) : 9; };
// the nearest defender who could make a play (a lineman still tied up with his blocker can't)
const nearestDef = (S, x, y, skip = null) => { let best = null, bd = 99; for (const k of Object.keys(S.ents)) { const d = S.ents[k]; if (d.side !== "def" || d.down > 0 || k === skip || d.mode === "rush" || d.heldUntil > S.t) continue; const dd = hyp(d.x - x, d.y - y); if (dd < bd) { bd = dd; best = d; } } return [best, bd]; };

// A blocker on a defender: he's tied up for a spell set by his run blocking against the
// defender's shedding, then gets off and can't be caught by the same man again for a moment.
function block(S, b, d) {
  const bl = Math.max(R(b.p, "runBlock", b.p.ovr || 60), R(b.p, "blocking", 50), R(b.p, "passBlock", 50)), sh = Math.max(R(d.p, "shedBlock", 60), R(d.p, "handUse", 60), R(d.p, "runStop", 60));
  d.heldUntil = S.t + clamp(0.8 + (bl - sh) * 0.02 + rnd(S) * 0.7, 0.4, 2.2); d.heldBy = b.key; d.freeOf = { key: b.key, until: d.heldUntil + 1.0 };
  b.blocking = d.key;
}
const canBlock = (S, b, d) => d.side === "def" && d.down <= 0 && d.mode !== "rush" && !(d.heldUntil > S.t) && !(d.freeOf && d.freeOf.key === b.key && d.freeOf.until > S.t);

// ---------- the tick ----------
export function tick(S, dt) {
  if (S.phase === "presnap" || S.phase === "done") return false;
  S.t += dt;
  const { ents, ball } = S, qb = ents.QB, isPass = S.call.startsWith("pass");
  const carrier = ball.holder ? ents[ball.holder] : null;
  const over = S.phase === "tackle" || S.phase === "fall";

  // men on the ground get up after a moment; nobody runs out the back of the end zone or off the sideline
  for (const e of Object.values(ents)) {
    if (e.down > 0) { e.down -= dt; brake(e, dt); }
    if (e.x > 108.5) { e.x = 108.5; e.vx = Math.min(0, e.vx); } if (e.x < -8.5) { e.x = -8.5; e.vx = Math.max(0, e.vx); }
    if (e.y > HALF - 0.2 && e.key !== ball.holder) { e.y = HALF - 0.2; e.vy = Math.min(0, e.vy); } if (e.y < -HALF + 0.2 && e.key !== ball.holder) { e.y = -HALF + 0.2; e.vy = Math.max(0, e.vy); }
  }

  // receivers run their routes, then keep going; a settled man waits for the ball
  for (const r of ELIGIBLE) {
    const e = ents[r]; if (!e || e.down > 0) continue;
    if (e.mode === "route") {
      if (S.t < e.delay) { brake(e, dt); continue; }
      if (e.path.length) {
        const burst = e.cutAt != null && S.t - e.cutAt < 0.4 ? 1.3 + (R(e.p, "routeRun", R(e.p, "receiving", 60)) - 50) * 0.016 : 1; // out of his break
        const acc0 = e.acc; e.acc *= burst;
        const left = steer(e, e.path[0].x, e.path[0].y, dt); e.acc = acc0;
        if (left < 0.7) { e.last = e.path.shift(); e.cutAt = S.t; if (!e.path.length) { e.mode = e.stop ? "settle" : "stride"; e.strideFrom = { x: e.x, y: e.y }; } }
      }
    } else if (e.mode === "stride") {
      const l = e.last || { x: e.x - 1, y: e.y }, dx = e.x - l.x || 1, dy = e.y - l.y, d = hyp(dx, dy);
      steer(e, Math.min(107, e.x + (dx / d) * 6), clamp(e.y + (dy / d) * 6, -HALF + 1.5, HALF - 1.5), dt);
      if (e.x > 105 || hyp(e.x - e.strideFrom.x, e.y - e.strideFrom.y) > e.more) e.mode = "settle";
    } else if (e.mode === "settle") { brake(e, dt); if (Math.abs(e.vx) < 0.5) e.face = 1; }
    else if (e.mode === "adjust") {
      // get to the spot as the ball does: flat out if it's far, otherwise pace it and run through it
      const far = hyp(e.tx - e.x, e.ty - e.y), left = ball.flight ? Math.max(0.05, ball.flight.t0 + ball.flight.T - S.t) : 0.05;
      const need = far / left; steer(e, e.tx, e.ty, dt, clamp(need / e.top, 0.75, 1), true); // never pulls up: he catches it running
    }
    else if (e.mode === "block") { if (isPass) brake(e, dt); }
  }

  // held defenders are driven by their blocker
  for (const d of Object.values(ents)) if (d.side === "def" && d.heldUntil > S.t && !over) { const b = ents[d.heldBy]; if (b) { steer(d, b.x + 0.9 * (d.x > b.x ? 1 : -1), b.y + (d.y > b.y ? 0.4 : -0.4), dt, 0.5); } }
  // blockers: the line keeps its pocket on a pass; on a run it drives, then climbs to the next man
  for (const k of LINE) {
    const o = ents[k]; if (o.mode !== "block") continue;
    const mine = ["DL0", "DL1", "DL2", "DL3"].find((d) => OL_VS[d] === k), dl = mine && ents[mine];
    if (isPass) { steer(o, S.los - 2.6 + (k === "C" ? 0.3 : 0), OFF_SPOTS[k][1] * 1.15, dt, 0.6); continue; }
    if (dl && dl.mode === "rush") { steer(o, S.los + 0.6, OFF_SPOTS[k][1] * 1.05, dt, 0.6); continue; }
    seekBlock(S, o, dt, 10);
  }
  if (!isPass && !over) for (const r of ELIGIBLE) { const e = ents[r]; if (e && e.mode === "block") seekBlock(S, e, dt, 9); }

  // the quarterback: drops, sets, throws; on a run he hands off and watches
  if (qb.mode === "dropback") { if (steer(qb, S.los - (S.call === "pass_quick" ? 5.5 : 7.5), 0, dt, 0.85) < 0.3) qb.mode = "set"; }
  else if (qb.mode === "set" || qb.mode === "watch") brake(qb, dt);
  else if (qb.mode === "handoff") { brake(qb, dt); const rb = ents.RB; if (rb.mode === "back" && (hyp(rb.x - qb.x, rb.y - qb.y) < 1.4 || S.t >= 1.0)) handoff(S); }
  if (ents.RB.mode === "back") steer(ents.RB, S.los + 1, S.lane * 0.6, dt, 0.95);

  // the rush: engaged with his man until he sheds him, then after the ball
  for (const k of ["DL0", "DL1", "DL2", "DL3"]) {
    const d = ents[k]; if (!d || d.down > 0 || d === carrier || d.heldUntil > S.t) continue;
    const o = ents[OL_VS[k]];
    if (d.mode === "rush") { if (S.t < S.shed[k]) steer(d, o.x + (isPass ? 1.0 : 1.3), o.y + (d.y > o.y ? 0.5 : -0.5), dt, 0.7); else d.mode = "free"; }
    if (d.mode === "free") { if (carrier && !over) steer(d, ...xy(intercept(d, carrier)), dt, 1.0); else brake(d, dt); }
  }
  // the pass rush gets home: a sack
  if (S.phase === "live" && isPass && ball.holder === "QB") {
    const [d, dd] = nearestDef(S, qb.x, qb.y);
    if (dd < 2.8 && !S.pressureAt) S.pressureAt = S.t;
    if (dd < 1.25 && d && d.mode === "free") { sack(S, d); return true; }
  }

  // coverage: man trails his receiver; the safeties sit deep and break on the ball; once the ball's
  // out everyone nearby goes to where it's coming down; with a runner loose, everyone pursues
  for (const k of ["LB0", "LB1", "CB0", "CB1", "CB2", "S0", "S1"]) {
    const d = ents[k]; if (!d || d.down > 0 || d === carrier || d.heldUntil > S.t) continue;
    const mine = Object.keys(S.cover).find((r) => S.cover[r] === k);
    if (over) { brake(d, dt); continue; }
    if (ball.flight) {
      const f = ball.flight, near = hyp(f.to.x - d.x, f.to.y - d.y), left = f.t0 + f.T - S.t;
      // a cover man stays in his coverage (same lag, same trail) until the ball is nearly down,
      // then lunges for it; anyone else close enough breaks on the spot once he's seen it
      const tgt = f.target && ents[f.target];
      if (mine && ents[mine] && left > 0.3) {
        const r = ents[mine], cov = Math.max(R(d.p, "manCov", 0), R(d.p, "coverage", 0), d.p.ovr || 70), lag = 0.23 + Math.max(0, 90 - cov) * 0.025, kk = Math.min(1, dt / lag);
        d.rv ||= { vx: 0, vy: 0 }; d.rv.vx += (r.vx - d.rv.vx) * kk; d.rv.vy += (r.vy - d.rv.vy) * kk;
        // (a loose grip on him now: if he slows for the ball, his man is carried past him)
        mirror(d, r, r.x - 0.8, r.y + (r.y > 0 ? -0.6 : 0.6), dt, 1, 0.45, d.rv); continue;
      }
      if (S.t - f.t0 < 0.45) { brake(d, dt); continue; } // seeing it
      if (left <= 0.3 || near < left * d.top * 0.9 + 1.0) steer(d, f.to.x, f.to.y, dt, 1);
      else if (tgt) steer(d, tgt.x + tgt.vx * 0.25, tgt.y + tgt.vy * 0.25, dt, 0.9);
      else brake(d, dt);
      continue;
    }
    if (carrier && carrier.key !== "QB") { const react = S.catchAt != null && S.t - S.catchAt < 0.35 && hyp(d.x - carrier.x, d.y - carrier.y) > 2 ? 0.85 : 1.0; steer(d, ...xy(intercept(d, carrier)), dt, react); continue; }
    if (!isPass) { // the run: linebackers read it, then fill; the secondary comes late
      const read = k.startsWith("LB") ? 0.7 : k.startsWith("S") ? 1.0 : 1.4;
      if (S.t < read) { brake(d, dt); continue; }
      const tgt = carrier || ents.RB; const T = intercept(d, tgt); steer(d, T.x, T.y, dt, k.startsWith("LB") ? 0.95 : 0.9); continue;
    }
    if (S.t < 0.22) { brake(d, dt); continue; } // the read
    if (mine && ents[mine]) {
      // man: on his hip, shaded inside; a better cover man stays tighter and reads the break sooner
      const r = ents[mine], cov = Math.max(R(d.p, "manCov", 0), R(d.p, "coverage", 0), d.p.ovr || 70);
      const q = clamp(0.96 + (cov - 78) * 0.003, 0.87, 1.02), trail = (r.mode === "settle" ? 0.8 : 1.25) + Math.max(0, 85 - cov) * 0.03, in_ = r.y > 0 ? -0.7 : 0.7;
      // he reads the receiver's moves a beat late (later for a lesser cover man): what he mirrors is
      // a smoothed copy of the receiver's velocity, so a sharp cut opens a window before he reacts
      const lag = 0.23 + Math.max(0, 90 - cov) * 0.025, k = Math.min(1, dt / lag);
      d.rv ||= { vx: 0, vy: 0 }; d.rv.vx += (r.vx - d.rv.vx) * k; d.rv.vy += (r.vy - d.rv.vy) * k;
      const lx = r.x - r.vx * 0.05, ly = r.y - r.vy * 0.05;
      mirror(d, r, lx - trail, ly + in_, dt, q, 0.9, d.rv);
    } else if (k === "S0") {
      // the free safety: deeper than the deepest route, drifting toward it
      let deep = null; for (const r of ELIGIBLE) { const e = ents[r]; if (e && e.mode !== "block" && e.mode !== "back" && e.x > S.los + 4 && (!deep || e.x > deep.x)) deep = e; }
      const dx = deep ? Math.max(deep.x + 3 + Math.max(0, deep.vx) * 0.35, S.los + 12) : S.los + 14, dy = deep ? deep.y * 0.75 : 0;
      steer(d, Math.min(106, dx), dy, dt, 1);
    } else if (k === "S1") {
      // the strong safety: with two men going deep he takes the second over the top; otherwise a
      // robber in the middle, jumping anything that comes through his zone
      const deepMen = ELIGIBLE.map((r) => ents[r]).filter((e) => e && e.mode !== "block" && e.mode !== "back" && e.x > S.los + 10).sort((a, b) => b.x - a.x);
      if (deepMen.length >= 2 && deepMen[1].x > S.los + 12) { const m = deepMen[1]; steer(d, Math.min(106, m.x + 2.5 + Math.max(0, m.vx) * 0.3), m.y * 0.85, dt, 1); continue; }
      let near = null, nb = 7; for (const r of ELIGIBLE) { const e = ents[r]; if (!e) continue; const dd = hyp(e.x - d.x, e.y - d.y); if (dd < nb) { nb = dd; near = e; } }
      if (near) steer(d, near.x - 0.6, near.y, dt, 0.95); else steer(d, Math.min(105, S.los + 10), 6, dt, 0.75);
    } else { // an unassigned linebacker: a short zone, driving on anyone who crosses it
      let near = null, nb = 5; for (const r of ELIGIBLE) { const e = ents[r]; if (!e) continue; const dd = hyp(e.x - d.x, e.y - d.y); if (dd < nb) { nb = dd; near = e; } }
      if (near) steer(d, near.x - 0.6, near.y, dt, 0.9); else steer(d, S.los + 5, DEF_SPOTS[k][1], dt, 0.7);
    }
  }

  // the throw in the air
  if (ball.flight) {
    const f = ball.flight, u = clamp((S.t - f.t0) / f.T, 0, 1);
    ball.x = f.from.x + (f.to.x - f.from.x) * u; ball.y = f.from.y + (f.to.y - f.from.y) * u; ball.h = f.arc * 4 * u * (1 - u);
    if (u >= 1) { arrive(S); return S.phase !== "done"; }
  }

  // a loose ball on the turf bounces once and settles
  if (!ball.holder && !ball.flight && ball.h > -1) { ball.vh = (ball.vh ?? 4) - 30 * dt; ball.h += ball.vh * dt; if (ball.h < 0) { ball.h = 0; ball.vh = ball.vh < -2 ? -ball.vh * 0.35 : 0; } ball.x += 1.5 * dt; }

  // the man with the ball: a back or a receiver runs with your steering, and gets tackled
  if (carrier && carrier.key !== "QB" && carrier.side === "off" && !over) {
    const wantY = S.steer != null ? S.steer : S.lane != null && !isPass ? S.lane : carrier.y;
    const [d, dd] = nearestDef(S, carrier.x, carrier.y);
    // a loose runner leans away from a tackler in his path when you aren't steering
    const lean = S.steer == null && d && dd < 4 && d.x > carrier.x - 0.5 ? (carrier.y > d.y ? 2 : -2) : 0;
    // a receiver secures the catch before he's at full stride
    const fresh = 1, stagger = S.stagger > S.t ? 0.7 : 1, burst = S.burstUntil > S.t ? 1.12 : 1;
    steer(carrier, carrier.x + 8, clamp(wantY + lean, -HALF + 0.3, HALF - 0.3), dt, fresh * stagger * burst);
    if (carrier.x >= 100) { score(S); return true; }
    if (Math.abs(carrier.y) >= HALF - 0.4) { outOfBounds(S); return true; }
    const closing = d ? ((d.vx - carrier.vx) * (carrier.x - d.x) + (d.vy - carrier.vy) * (carrier.y - d.y)) / Math.max(0.1, dd) : 0; // yards/s he's gaining
    const dSpeed = d ? hyp(d.vx, d.vy) : 0;
    if (d && dd < 1.0 + clamp(closing, 0, 4) * 0.1 + (dSpeed > 5 ? 0.25 : 0)) { // a man at full stride can lay out for him
      // the tackle, or a broken one: elusiveness against his tackling, and a man can't be broken twice
      const el = Math.max(R(carrier.p, "elusiveness", 60), R(carrier.p, "breakTkl", 60), R(carrier.p, "yac", 60)), tk = R(d.p, "tackling", d.p.ovr || 70);
      // (a man who just caught it hasn't got his feet under him; a broken tackle still knocks him off stride)
      const pBreak = d.missed ? 0 : clamp(0.09 + (el - tk) * 0.005 + (S.broke ? -0.05 : 0), 0.05, 0.35);
      if (rnd(S) < pBreak) { d.down = 0.7; d.missed = true; S.broke++; S.stagger = S.t + 0.45; carrier.vx *= 0.55; carrier.vy *= 0.55; S.log.push(`${d.p.name} misses`); }
      else { tackle(S, d); return true; }
    }
  }
  // a defender with the ball (a pick) heads the other way for a moment
  if (carrier && carrier.side === "def" && !over) { steer(carrier, carrier.x - 8, carrier.y, dt, 1); const [o] = [Object.values(ents).filter((e) => e.side === "off").sort((a, b) => hyp(a.x - carrier.x, a.y - carrier.y) - hyp(b.x - carrier.x, b.y - carrier.y))[0]]; if (o && hyp(o.x - carrier.x, o.y - carrier.y) < 1.2) { endAt(S, S.ev, "tackle"); return true; } if (S.t - S.pickAt > 2.2) { endAt(S, S.ev, "tackle"); return true; } }

  // brought down: he slides to a stop (to the engine's spot when it differs by a yard or two)
  if (over && carrier) { brake(carrier, dt); if (S.slideTo != null) { const k = Math.min(1, dt * 3); carrier.x += (S.slideTo - carrier.x) * k; if (S.tackler) S.tackler.x += (carrier.x - 0.6 - S.tackler.x) * k; } }
  if (over && S.t >= S.endAt) { S.phase = "done"; return false; }
  // the quarterback holds it too long
  if (S.phase === "live" && isPass && ball.holder === "QB" && S.t > 7) forcedThrow(S);
  if (carrier && !ball.flight) { ball.x = carrier.x; ball.y = carrier.y; ball.h = 0; }
  return true;
}
const xy = (p) => [p.x, p.y];
// a blocker with nobody to block looks for the nearest free defender ahead of him and ties him up
function seekBlock(S, b, dt, range) {
  const { ents } = S;
  const held = b.blocking && ents[b.blocking];
  if (held && held.heldUntil > S.t) { steer(b, held.x - 0.6, held.y, dt, 0.7); return; }
  b.blocking = null;
  let best = null, bd = range;
  for (const d of Object.values(ents)) { if (!canBlock(S, b, d) || d.x < b.x - 1.5) continue; const dd = hyp(d.x - b.x, d.y - b.y); if (dd < bd) { bd = dd; best = d; } }
  if (!best) { brake(b, dt); return; }
  if (bd < 1.2) block(S, b, best); else steer(b, best.x - 0.5 + best.vx * 0.3, best.y + best.vy * 0.3, dt, 0.9); // cut him off where he's going
}

// A juke (a quick flick while running): a burst, and the nearest tackler within reach may lunge
// at nothing, his tackling against the runner's elusiveness. One every so often.
export function juke(S) {
  const c = S.ball.holder && S.ents[S.ball.holder]; if (!c || c.side !== "off" || S.phase !== "carry") return false;
  if (S.jukeAt != null && S.t - S.jukeAt < 0.9) return false;
  S.jukeAt = S.t; S.burstUntil = S.t + 0.35;
  const [d, dd] = nearestDef(S, c.x, c.y);
  if (d && dd < 2.6 && !d.missed) {
    const el = Math.max(R(c.p, "elusiveness", 60), R(c.p, "agility", 60), c.p.agi || 60), tk = R(d.p, "tackling", d.p.ovr || 70);
    if (rnd(S) < clamp(0.35 + (el - tk) * 0.006, 0.15, 0.6)) { d.down = 0.6; d.missed = true; S.broke++; S.log.push(`${d.p.name} juked`); return true; }
  }
  return false;
}

// ---------- the throw ----------
// You aimed at a spot. The ball takes off for it; the receiver who can best get there adjusts to
// it. Nothing is decided until it comes down.
export function throwTo(S, P, why = null) {
  if (S.phase !== "live" || S.ball.holder !== "QB") return null;
  const { ents } = S, qb = ents.QB;
  const arm = R(qb.p, "armStr", 80), accu = R(qb.p, "accuracy", 80), reach = 38 + (arm - 70) * 0.55; // how far he can put it
  let land = { x: clamp(P.x, S.los - 12, 109), y: clamp(P.y, -HALF + 0.3, HALF - 0.3) };
  let dist = hyp(land.x - qb.x, land.y - qb.y);
  if (dist > reach) { const k = reach / dist; land = { x: qb.x + (land.x - qb.x) * k, y: qb.y + (land.y - qb.y) * k }; dist = reach; } // falls short of a spot he can't reach
  // his accuracy: the ball drifts from the spot, more on a long throw
  const sig = (0.3 + Math.max(0, 92 - accu) * 0.05) * (0.5 + dist / 18), g1 = () => (rnd(S) + rnd(S) + rnd(S) - 1.5) * 1.6;
  land = { x: clamp(land.x + g1() * sig, S.los - 12, 109), y: clamp(land.y + g1() * sig, -HALF + 0.3, HALF - 0.3) };
  // underneath it's a bullet (flat and fast); downfield it's lofted over the coverage, still quicker than a moonball
  const bullet = dist < 20;
  const vel = bullet ? 27 + (arm - 70) * 0.2 : 22 + (arm - 70) * 0.15; // yards per second through the air
  const T = clamp(dist / vel, 0.22, 2.0);
  let best = null, bestD = 99;
  for (const r of ELIGIBLE) {
    const e = ents[r]; if (!e || e.mode === "block" || e.mode === "back" || (e.delay && S.t < e.delay)) continue;
    const reach = e.top * T * 0.9, a = aheadOf(e, T * 0.6), d = Math.max(0, hyp(a.x - land.x, a.y - land.y) - reach * 0.5);
    if (d < bestD) { bestD = d; best = r; }
  }
  if (bestD > 5) best = null; // nobody can get there: a throwaway, nobody chases it
  const tgt = best ? ents[best] : null;
  if (tgt) { tgt.mode = "adjust"; tgt.tx = land.x; tgt.ty = land.y; }
  const [rusher, near] = nearestDef(S, qb.x, qb.y);
  const hurried = why || (rusher && near < 1.5 ? "hurried" : null); // a man in his face as he lets it go
  S.ball.holder = null; S.thrownAt = S.t; qb.mode = "watch";
  S.ball.flight = { from: { x: qb.x, y: qb.y }, to: land, t0: S.t, T, arc: bullet ? clamp(dist / 40, 0.15, 0.45) : clamp(dist / 13, 1.2, 3.5), target: best, hurried, bullet };
  // a hurried or wild throw sails: the spot drifts
  if (hurried) { const k = why === "late" ? 3 : 2; S.ball.flight.to = { x: land.x + (rnd(S) - 0.5) * k, y: clamp(land.y + (rnd(S) - 0.5) * k * 2, -HALF + 0.3, HALF - 0.3) }; }
  S.pick = { target: tgt?.p.id, sep: tgt ? +separation(S, best).toFixed(1) : null, why: hurried };
  return S.ball.flight;
}
function forcedThrow(S) {
  const { ents } = S, qb = ents.QB; let best = "RB", bs = -99;
  for (const r of ELIGIBLE) { const e = ents[r]; if (!e || e.mode === "block" || e.mode === "back") continue; const sc = separation(S, r) - hyp(e.x - qb.x, e.y - qb.y) * 0.15; if (sc > bs) { bs = sc; best = r; } }
  throwTo(S, aheadOf(ents[best], 0.5), "late");
}

// The ball comes down: a catch if the receiver's there and the defender isn't on it, a pick if
// the defender beat him to it, otherwise it falls. Then the engine books it.
function arrive(S) {
  const { ents, ball } = S, f = ball.flight, tgt = f.target ? ents[f.target] : null;
  const dR = tgt ? hyp(tgt.x - ball.x, tgt.y - ball.y) : 99;
  const [d, dD] = nearestDef(S, ball.x, ball.y);
  const catchR = tgt ? 1.9 + (R(tgt.p, "catching", R(tgt.p, "receiving", 70)) - 70) * 0.015 : 0;
  ball.flight = null; ball.h = 0;
  if (S.booked) { endAt(S, S.ev, "fall", 0.8); S.log.push("thrown away"); return; }
  S.pick = { ...S.pick, err: +dR.toFixed(1), def: +dD.toFixed(1), defKey: d?.key, defCover: d && tgt ? S.cover[f.target] === d.key : null };
  // a defender chasing from behind (short of the catch along the throw, with the ball going over
  // his head to the man in front of him) can't play it unless he's right on him
  const ux = ball.x - f.from.x, uy = ball.y - f.from.y, un = hyp(ux, uy) || 1;
  const trailing = tgt && d && ((d.x - tgt.x) * ux + (d.y - tgt.y) * uy) / un < -0.6;
  const open = dD > 1.8 || (trailing && dD > 1.0);
  let want;
  if (tgt && dR <= catchR + 1.3) {
    // on his hands: an open man catches it (the odd drop); a covered one wins it on his hands
    // against the defender's ball skills, or it's knocked away
    const hands = R(tgt.p, "catching", R(tgt.p, "receiving", 70)), ballSk = d ? Math.max(R(d.p, "ballSkills", 60), R(d.p, "ballHawk", 60), R(d.p, "coverage", 60)) : 50;
    const dive = dR > catchR ? 1 - (dR - catchR) : 1; // one just out of reach: a dive, less likely the further
    const first = tgt && d && dR < dD - 0.4 ? 0.12 : 0; // he got to it first
    const pCatch = (open ? clamp(0.985 - (85 - hands) * 0.003, 0.9, 0.995) : clamp(0.32 + first + (hands - ballSk) * 0.006 + (dD - 0.8) * 0.15 - (dR > 1 ? 0.1 : 0), 0.1, 0.85)) * clamp(dive, 0, 1);
    if (rnd(S) < pCatch) {
      ball.x = tgt.x; ball.y = tgt.y; ball.holder = f.target; tgt.mode = "carry"; S.catchAt = S.t; S.phase = "carry";
      S.pick.open = open; S.log.push(`caught ${open ? "open" : "contested"}`);
      return;
    }
    if (open) { S.log.push("dropped"); S.pick.drop = true; }
  }
  if (d && dD < 1.2 && (!tgt || dD < dR || !open)) {
    // the defender got there first: a pick if he makes the play on it (his ball skills) and the
    // engine agrees, a pass broken up if not
    const ballSk = Math.max(R(d.p, "ballSkills", 60), R(d.p, "ballHawk", 60), R(d.p, "coverage", 60));
    const pInt = dD < 0.8 && dD < dR ? clamp(0.2 + (ballSk - 70) * 0.01, 0.08, 0.5) : 0.05;
    want = { types: rnd(S) < pInt ? ["int"] : ["inc"], fallback: ["inc"] }; S.pick.open = false;
    const r = resolvePlay(S.g, S.call, want, { target: S.pick.target, open: false }, 10);
    S.ev = r.ev; S.mismatch = r.ev && !["int", "inc", "penalty"].includes(r.ev.type);
    if (r.ev?.type === "int") { ball.x = d.x; ball.y = d.y; ball.holder = d.key; d.mode = "carry"; S.pickAt = S.t; S.phase = "carry"; S.log.push("picked"); return; }
    endAt(S, r.ev, "fall", 0.8); S.log.push("broken up"); return;
  }
  // it falls incomplete (the engine's call stays "inc"; a flag is accepted)
  S.pick.open = tgt ? open : false;
  const r = resolvePlay(S.g, S.call, { types: ["inc"] }, { target: S.pick.target, open: false }, 16);
  S.ev = r.ev; S.mismatch = r.ev && !["inc", "penalty"].includes(r.ev.type); endAt(S, r.ev, "fall", 0.8); S.log.push("incomplete");
}

// ---------- runs, tackles, the end of the play ----------
function handoff(S) { const rb = S.ents.RB; S.ball.holder = "RB"; rb.mode = "carry"; S.ents.QB.mode = "watch"; S.phase = "carry"; S.steer = S.steer ?? null; }
function sack(S, d) {
  const { ents } = S, qb = ents.QB, loss = Math.round(S.los - qb.x);
  const r = resolvePlay(S.g, S.call, { types: ["sack", "fumble"], fallback: ["inc"], yards: -loss, tol: 3 }, null, 16);
  S.ev = r.ev; S.booked = true; S.mismatch = r.ev && !["sack", "fumble", "inc", "penalty"].includes(r.ev.type);
  if (r.ev && r.ev.type === "inc") {
    // the engine has him getting rid of it: a wobbler thrown away as he's hit, falling incomplete
    S.pick = { why: "hurried" }; const to = { x: clamp(qb.x + 6 + rnd(S) * 10, S.los - 10, 108), y: clamp(qb.y + (rnd(S) - 0.5) * 20, -HALF + 0.5, HALF - 0.5) };
    S.ball.holder = null; S.thrownAt = S.t; qb.mode = "watch"; qb.vx = qb.vy = 0; d.down = 0.6;
    S.ball.flight = { from: { x: qb.x, y: qb.y }, to, t0: S.t, T: 0.7, arc: 1.5, target: null, hurried: "hurried" };
    return;
  }
  S.tackler = d; d.vx = d.vy = 0; qb.vx = qb.vy = 0; S.pick = { why: "sacked" };
  endAt(S, r.ev, "tackle", 1.1);
}
function tackle(S, d) {
  const c = S.ents[S.ball.holder]; S.tackler = d; d.vx = d.vy = 0;
  const yards = Math.round(c.x - S.los);
  book(S, yards, "tackle");
}
function outOfBounds(S) { const c = S.ents[S.ball.holder]; book(S, Math.round(c.x - S.los), "fall"); }
function score(S) { book(S, 100 - S.los, "fall", 1.5); }
function book(S, yards, how, hold = 1.0) {
  // (a catch or run into the end zone is a completion or run of `room` yards: the engine caps it there and calls it the touchdown)
  const isPass = S.call.startsWith("pass"), td = S.los + yards >= 100;
  const types = isPass ? ["pass", "td"] : ["run", "td"];
  const tol = td ? 0 : Math.max(1, Math.round(Math.abs(yards) * 0.1));
  const r = resolvePlay(S.g, S.call, { types, yards, tol, fallback: isPass ? ["inc"] : [] }, isPass ? { target: S.pick?.target, open: !!S.pick?.open } : null, 12);
  S.ev = r.ev; S.exact = r.exact; S.mismatch = r.ev && !types.includes(r.ev.type) && r.ev.type !== "penalty";
  // the field follows the engine's number when it differs (a yard or two): the spot moves with it
  if (r.ev && (r.ev.type === "pass" || r.ev.type === "run" || r.ev.type === "td") && r.ev.yards !== yards && Math.abs(r.ev.yards - yards) <= 3) S.slideTo = S.los + r.ev.yards;
  endAt(S, r.ev, how, hold);
}
function endAt(S, ev, how, hold = 1.0) { S.result = ev; S.text = ev?.text || ""; S.phase = how; S.endAt = S.t + hold; const c = S.ball.holder && S.ents[S.ball.holder]; if (c) { c.vx *= 0.25; c.vy *= 0.25; } }
