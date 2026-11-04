// The real-time half of a play: 22 players moving in yards, the drag-and-throw, and the
// choreography of the engine's verdict. Units are yards: x runs from the offense's own goal line
// (0) to the far goal line (100), y is lateral from the middle (-26.65 left sideline, +26.65 right).
//
// Who's open, how well you threw it and when the rush gets home are measured here, then handed to
// playsim.step() as its `pick` and `bonus`. The engine decides catch / incomplete / interception /
// sack / yards; this file then acts that result out so the field agrees with the box score.
import { runPlay } from "./bridge.js";

export const FIELD_W = 53.3, HALF = FIELD_W / 2;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const hyp = (dx, dy) => Math.hypot(dx, dy);

// yards per second from a speed rating: a 60 jogs ~6.5, a 99 flies ~9.9
export const ydsPerSec = (p, mult = 1) => (6.5 + (clamp(p?.spd ?? 70, 40, 99) - 60) / 39 * 3.4) * mult;

// Pre-snap spots: [yards behind the line (-), lateral]. Right side of the offense is +y.
const OFF_SPOTS = { LT: [-1, -5.5], LG: [-1, -2.75], C: [-1, 0], RG: [-1, 2.75], RT: [-1, 5.5], TE: [-1.2, 8.5], X: [-1, -22], Z: [-1, 22], SLOT: [-2.5, -14], QB: [-5.5, 0], RB: [-7, 1.5] };
const DEF_SPOTS = { DL0: [1.5, -4.5], DL1: [1.5, -1.5], DL2: [1.5, 1.5], DL3: [1.5, 4.5], LB0: [5.5, 4], LB1: [5.5, -3], CB0: [6, -22], CB1: [6, 22], CB2: [5, -14], S0: [14, 0], S1: [10, 9] };
const OL_VS = { DL0: "LT", DL1: "LG", DL2: "RG", DL3: "RT" };

// Routes: segments of [yards up the field, yards sideways] where sideways +1 means toward the
// middle of the field (so the same route mirrors for a receiver on either side). `stop` ends in a
// settle; otherwise the receiver keeps running the last leg.
const ROUTES = {
  slant: { legs: [[3, 0], [9, 7]] },
  hitch: { legs: [[6, 0], [-1, 0.5]], stop: true },
  out: { legs: [[8, 0], [0.5, -8]] },
  dig: { legs: [[12, 0], [0, 10]] },
  comeback: { legs: [[14, 0], [-2.5, -2]], stop: true },
  corner: { legs: [[10, 0], [12, -8]] },
  post: { legs: [[10, 0], [14, 8]] },
  go: { legs: [[45, 0]] },
  seam: { legs: [[4, 0], [30, 1.5]] },
  drag: { legs: [[2, 0], [2, 16]] },
  flat: { legs: [[0.5, 0], [2, -9]] },
  swing: { legs: [[-1, -3], [3, -8]] },
  check: { legs: [[4, 0], [1, 0]], stop: true, delay: 1.0 },
};
const PLAYS = {
  pass_quick: { X: "slant", Z: "hitch", SLOT: "out", TE: "flat", RB: "check" },
  pass_medium: { X: "dig", Z: "out", SLOT: "corner", TE: "drag", RB: "swing" },
  pass_deep: { X: "go", Z: "post", SLOT: "corner", TE: "seam", RB: "check" },
};
export const PLAY_NAMES = { pass_quick: "Quick", pass_medium: "Medium", pass_deep: "Deep", run_inside: "Inside run", run_outside: "Outside run" };
export const ELIGIBLE = ["X", "Z", "SLOT", "TE", "RB"];

const mk = (key, p, side, x, y) => ({ key, p, side, x, y, vx: 0, vy: 0, face: side === "off" ? 1 : -1, spd: ydsPerSec(p), ball: false, path: null, mode: "idle" });

// A play ready at the line: everyone in his spot, nobody moving.
export function setupPlay(g, L, call) {
  const los = g.yard, ents = {};
  for (const [k, [dx, dy]] of Object.entries(OFF_SPOTS)) { const p = L.off[k]; if (p) ents[k] = mk(k, p, "off", los + dx, dy); }
  const dl = L.def.DL, lb = L.def.LB, cb = L.def.CB, s = L.def.S;
  const defList = { DL0: dl[0], DL1: dl[1], DL2: dl[2], DL3: dl[3], LB0: lb[0], LB1: lb[1], CB0: cb[0], CB1: cb[1], CB2: cb[2], S0: s[0], S1: s[1] };
  for (const [k, p] of Object.entries(defList)) { const [dx, dy] = DEF_SPOTS[k]; if (p) ents[k] = mk(k, p, "def", los + dx, dy); }
  // man assignments: the engine's cover man for each receiver, found among the defenders out there
  const cover = {};
  for (const r of ELIGIBLE) { const cm = L.cover[r]; const k = cm && Object.keys(defList).find((d) => defList[d]?.id === cm.id); if (k) cover[r] = k; }
  // a receiver's engine cover man is a corner lined up on the other side: move the corners so the
  // picture matches the matchup
  for (const r of ["X", "Z", "SLOT"]) { const k = cover[r]; if (k && ents[k] && ents[r]) { ents[k].y = ents[r].y + (ents[r].y < 0 ? 1 : -1) * 0.8; } }
  if (ents[cover.TE] && ents.TE && cover.TE.startsWith("LB")) ents[cover.TE].y = ents.TE.y;
  return {
    g, L, call, los, firstDown: los + g.toGo, t: 0, phase: "presnap", ents, cover,
    ball: { x: ents.QB?.x ?? los - 5, y: 0, h: 0, holder: "QB", flight: null },
    ev: null, text: "", aim: null, result: null, shed: {}, pressure: 0, holdAt: 0, thrownAt: 0, endAt: 0, handoffAt: 0, lane: 0,
  };
}

// Hike: receivers get their routes, rushers their men, the defense its assignments.
export function snap(S) {
  const { ents, los, call } = S;
  S.phase = "live"; S.t = 0;
  const isPass = call.startsWith("pass");
  const routes = PLAYS[call];
  for (const r of ELIGIBLE) {
    const e = ents[r]; if (!e) continue;
    if (isPass) {
      const R = ROUTES[routes[r]], inward = e.y < 0 ? 1 : -1;
      let x = e.x, y = e.y; const pts = [];
      for (const [up, side] of R.legs) { x += up; y = clamp(y + side * inward, -HALF + 1, HALF - 1); pts.push({ x, y }); }
      e.path = pts; e.prev = { x: e.x, y: e.y }; e.stop = !!R.stop; e.delay = R.delay || 0; e.mode = "route";
    } else { e.mode = r === "RB" ? "carry" : "block"; }
  }
  // the line holds; each rusher sheds his man after a time set by the matchup (and some luck)
  for (const k of ["DL0", "DL1", "DL2", "DL3"]) {
    const d = ents[k], o = ents[OL_VS[k]]; if (!d) continue;
    const rush = d.p.posAttrs?.passRush ?? d.p.ovr ?? 70, blk = o?.p.posAttrs?.passBlock ?? o?.p.ovr ?? 70;
    S.shed[k] = clamp(2.2 + (blk - rush) * 0.035 + Math.random() * 2.2, 1.3, 7);
    d.mode = "rush";
  }
  for (const k of ["LB0", "LB1", "CB0", "CB1", "CB2", "S0", "S1"]) if (ents[k]) ents[k].mode = "cover";
  for (const k of ["LT", "LG", "C", "RG", "RT"]) if (ents[k]) ents[k].mode = "block";
  ents.QB.mode = isPass ? "dropback" : "handoff";
  if (!isPass) {
    // the engine's verdict on the run is known at the snap; the back runs to it
    S.ev = runPlay(S.g, call, 1);
    S.handoffAt = 0.6;
    S.lane = call === "run_outside" ? (Math.random() < 0.5 ? -13 : 13) : (Math.random() < 0.5 ? -2 : 2);
  }
}

// Steer an entity toward a point at its speed; returns the distance left.
function moveTo(e, tx, ty, dt, mult = 1) {
  const dx = tx - e.x, dy = ty - e.y, d = hyp(dx, dy), v = e.spd * mult;
  if (d < 0.05) { e.vx = e.vy = 0; return 0; }
  const step = Math.min(d, v * dt);
  e.vx = (dx / d) * v; e.vy = (dy / d) * v;
  e.x += (dx / d) * step; e.y += (dy / d) * step;
  if (Math.abs(dx) > 0.2) e.face = dx > 0 ? 1 : -1;
  return d - step;
}
const receiverAhead = (e, T) => ({ x: e.x + e.vx * T * 0.9, y: clamp(e.y + e.vy * T * 0.9, -HALF + 0.5, HALF - 0.5) });
export const separation = (S, r) => { const e = S.ents[r], c = S.ents[S.cover[r]]; return c ? hyp(e.x - c.x, e.y - c.y) : 9; };

// One tick. Returns true while the play is still going.
export function tick(S, dt) {
  if (S.phase === "presnap" || S.phase === "done") return false;
  S.t += dt;
  const { ents, ball } = S;
  const carrierKey = ball.holder;
  const carrier = carrierKey ? ents[carrierKey] : null;

  // receivers run their routes
  for (const r of ELIGIBLE) {
    const e = ents[r]; if (!e || e.mode !== "route") continue;
    if (S.t < e.delay) continue;
    if (e.path.length) {
      const left = moveTo(e, e.path[0].x, e.path[0].y, dt);
      if (left <= 0.1) {
        const reached = e.path.shift();
        if (!e.path.length) {
          if (e.stop) { e.mode = "settle"; e.vx = e.vy = 0; }
          else { e.dir = { x: reached.x - e.prev.x, y: reached.y - e.prev.y }; e.mode = "stride"; }
        }
        e.prev = reached;
      }
    }
  }
  for (const r of ELIGIBLE) {
    const e = ents[r]; if (!e || e.mode !== "stride") continue;
    const d = hyp(e.dir.x, e.dir.y) || 1;
    moveTo(e, e.x + (e.dir.x / d) * 5, clamp(e.y + (e.dir.y / d) * 5, -HALF + 1, HALF - 1), dt);
    if (e.x > 109) { e.mode = "settle"; }
  }

  // blockers hold their ground and drift back with the pocket
  for (const k of ["LT", "LG", "C", "RG", "RT"]) { const o = ents[k]; if (o && o.mode === "block") moveTo(o, S.los - 2.2 + (k === "C" ? 0.3 : 0), OFF_SPOTS[k][1] * 1.15, dt, 0.5); }
  if (ents.TE?.mode === "block") moveTo(ents.TE, S.los - 1.5, OFF_SPOTS.TE[1], dt, 0.5);

  // the quarterback drops and sets
  const qb = ents.QB;
  if (qb.mode === "dropback") { if (moveTo(qb, S.los - (S.call === "pass_quick" ? 5.5 : 7.5), 0, dt, 0.8) <= 0) qb.mode = "set"; }

  // the rush: stuck on his blocker until he sheds, then straight at the ball
  for (const k of ["DL0", "DL1", "DL2", "DL3"]) {
    const d = ents[k]; if (!d || d.mode !== "rush") continue;
    const o = ents[OL_VS[k]];
    if (S.t < S.shed[k] && o) moveTo(d, o.x + 1.1, o.y + (d.y > o.y ? 0.4 : -0.4), dt, 0.6);
    else { d.mode = "free"; }
  }
  const chase = (d, tx, ty, mult = 1) => moveTo(d, tx, ty, dt, mult);
  const liveBall = S.phase === "live";
  for (const k of ["DL0", "DL1", "DL2", "DL3"]) {
    const d = ents[k]; if (!d || d.mode !== "free") continue;
    if (liveBall && carrier) { const left = chase(d, carrier.x, carrier.y, 0.92); if (left < 1.1 && carrierKey === "QB" && !S.pressure) S.pressure = S.t; }
    else if (S.phase === "run" && carrier) chase(d, carrier.x, carrier.y, 0.92);
  }

  // coverage: man on his receiver, the safeties over the top, everyone to the ball once it's out
  for (const k of ["LB0", "LB1", "CB0", "CB1", "CB2", "S0", "S1"]) {
    const d = ents[k]; if (!d) continue;
    const mine = Object.keys(S.cover).find((r) => S.cover[r] === k);
    if (S.phase === "live") {
      if (S.t < 0.25) continue; // the read
      if (mine && ents[mine]) {
        const r = ents[mine], q = clamp(1 + ((d.p.ovr || 70) - (r.p.ovr || 70)) * 0.004, 0.86, 1.08);
        // trail the man by a step and a half, shaded to the inside
        const lead = r.mode === "settle" ? 0 : 0.35;
        chase(d, r.x - (mine === "RB" || mine === "TE" ? 0.6 : 1.2) + r.vx * lead, r.y + (r.y > 0 ? -0.8 : 0.8) + r.vy * lead, q);
      } else if (k === "S0") chase(d, S.los + 16 + Math.min(10, S.t * 3), 0, 0.8);
      else if (k === "S1") chase(d, S.los + 9, 8, 0.7);
      else chase(d, S.los + 5, DEF_SPOTS[k][1], 0.7); // a short zone
    } else if (S.phase === "ball" && ball.flight) {
      const f = ball.flight; chase(d, f.to.x, f.to.y, 0.95);
    } else if ((S.phase === "run" || S.phase === "yac") && carrier) {
      chase(d, S.tackleAt.x, S.tackleAt.y, 1);
    }
  }

  // the throw in the air
  if (S.phase === "ball" && ball.flight) {
    const f = ball.flight, u = clamp((S.t - f.t0) / f.T, 0, 1);
    ball.x = f.from.x + (f.to.x - f.from.x) * u; ball.y = f.from.y + (f.to.y - f.from.y) * u; ball.h = f.arc * 4 * u * (1 - u);
    const tgt = ents[f.target];
    if (tgt && tgt.mode !== "settle") moveTo(tgt, f.to.x, f.to.y, dt, 1); // the receiver adjusts to the ball
    if (u >= 1) arrive(S);
  }

  // the handoff and the run
  if (S.phase === "live" && !S.call.startsWith("pass")) {
    const rb = ents.RB;
    if (S.t < S.handoffAt) moveTo(rb, qb.x + 0.8, qb.y - 0.5, dt, 0.9);
    else { ball.holder = "RB"; beginRun(S); }
  }
  if ((S.phase === "run" || S.phase === "yac") && carrier) {
    const T = S.tackleAt;
    // weave: head up the lane, bend away from the nearest defender
    let nd = null, nb = 99;
    for (const k of Object.keys(ents)) { const d = ents[k]; if (d.side !== "def") continue; const dd = hyp(d.x - carrier.x, d.y - carrier.y); if (dd < nb) { nb = dd; nd = d; } }
    const dodge = nd && nb < 3 && carrier.x < T.x - 2 ? (carrier.y > nd.y ? 1.5 : -1.5) : 0;
    const left = moveTo(carrier, T.x, clamp(T.y + dodge, -HALF + 1, HALF - 1), dt, 1);
    if (left <= 0.05) finishRun(S);
  }
  if (S.phase === "tackle" || S.phase === "fall") { if (S.t >= S.endAt) S.phase = "done"; }
  if (S.phase === "live" && carrierKey === "QB") {
    // the rush gets home, or he's held it too long: it comes out hurried
    if (S.pressure && S.t - S.pressure > 0.35) forcedThrow(S, "hurried");
    else if (S.t > 6.5) forcedThrow(S, "late");
  }
  if (carrier && S.phase !== "ball") { ball.x = carrier.x + carrier.face * 0.4; ball.y = carrier.y; ball.h = 0; }
  return S.phase !== "done";
}

// Your throw: aim at a spot on the field. Who you threw to is whoever will be nearest that spot
// when the ball gets there; how open he is and how close you put it go to the engine.
export function throwTo(S, P, why = null) {
  if (S.phase !== "live" || S.ball.holder !== "QB") return null;
  const { ents } = S, qb = ents.QB;
  const dist = hyp(P.x - qb.x, P.y - qb.y), T = clamp(dist / 21, 0.45, 2.4);
  let best = null, bestD = 99;
  for (const r of ELIGIBLE) {
    const e = ents[r]; if (!e || e.mode === "block" || e.mode === "idle" || (e.delay && S.t < e.delay)) continue;
    const a = receiverAhead(e, T), d = hyp(a.x - P.x, a.y - P.y);
    if (d < bestD) { bestD = d; best = r; }
  }
  if (!best) return null;
  const e = ents[best], sep = separation(S, best);
  const open = sep >= (e.x - S.los > 18 ? 3 : 2.1) && bestD < 5;
  const bonus = why ? 0.75 : clamp(1.22 - bestD * 0.06 + (open ? 0.05 : 0), 0.72, 1.25);
  const pick = { target: e.p.id, open };
  const ev = runPlay(S.g, S.call, bonus, pick);
  S.ev = ev; S.thrownAt = S.t; S.pick = { ...pick, sep: +sep.toFixed(1), err: +bestD.toFixed(1), bonus: +bonus.toFixed(2), why };
  if (!ev) { S.phase = "done"; return null; }
  // a sack rolled by the engine: the rush got there first, the ball never comes out
  if (ev.type === "sack" || (ev.type === "fumble" && ev.rusher && !ev.tgt)) { sackPlay(S, ev); return ev; }
  if (ev.type === "penalty" && !ev.tgt) { S.text = ev.text; S.phase = "fall"; S.endAt = S.t + 0.6; return ev; }
  // where the ball goes: at the man on a catch or a pick, where you aimed when it falls incomplete
  const to = ev.type === "inc" ? { x: P.x, y: P.y } : receiverAhead(e, T);
  const land = { x: clamp(to.x, S.los - 12, 110), y: clamp(to.y, -HALF + 0.5, HALF - 0.5) };
  S.ball.holder = null; S.ball.flight = { from: { x: qb.x, y: qb.y }, to: land, t0: S.t, T, arc: clamp(dist / 12, 0.8, 4), target: best };
  S.phase = "ball"; qb.mode = "set";
  // an interception: the engine's man (or the cover man) breaks on it
  if (ev.type === "int") { const dbKey = Object.keys(ents).find((k) => ents[k].side === "def" && ents[k].p.id === ev.db?.id) || S.cover[best] || "S0"; S.ball.flight.db = dbKey; }
  return ev;
}

function forcedThrow(S, why) {
  // dump it to the nearest open-ish receiver, or at the feet of the closest one
  const { ents } = S, qb = ents.QB;
  let best = null, bestScore = -99;
  for (const r of ELIGIBLE) { const e = ents[r]; if (!e || e.mode === "block" || e.mode === "idle") continue; const sc = separation(S, r) - hyp(e.x - qb.x, e.y - qb.y) * 0.1; if (sc > bestScore) { bestScore = sc; best = r; } }
  const e = ents[best || "RB"];
  throwTo(S, receiverAhead(e, 0.6), why);
}

function sackPlay(S, ev) {
  const { ents } = S;
  const k = Object.keys(ents).find((x) => ents[x].side === "def" && ents[x].p.id === ev.rusher?.id) || ["DL0", "DL1", "DL2", "DL3"].sort((a, b) => hyp(ents[a].x - ents.QB.x, ents[a].y - ents.QB.y) - hyp(ents[b].x - ents.QB.x, ents[b].y - ents.QB.y))[0];
  const d = ents[k]; d.mode = "free";
  const x = S.los + (ev.yards || -7);
  S.tackleAt = { x, y: ents.QB.y }; ents.QB.x = x; d.x = x - 0.8; d.y = ents.QB.y;
  S.text = ev.text; S.phase = "tackle"; S.endAt = S.t + 1.1; S.result = ev;
}

function arrive(S) {
  const { ents, ball, ev } = S, f = ball.flight, tgt = ents[f.target];
  ball.flight = null; ball.h = 0;
  if (ev.type === "inc") { S.text = ev.text; S.phase = "fall"; S.endAt = S.t + 0.9; S.result = ev; return; }
  if (ev.type === "int") {
    const db = ents[f.db] || ents.S0; db.x = ball.x; db.y = ball.y; ball.holder = f.db || "S0";
    S.text = ev.text; S.phase = "tackle"; S.endAt = S.t + 1.2; S.result = ev; return;
  }
  // caught: the catch spot counts for the yards after it
  tgt.x = ball.x; tgt.y = ball.y; ball.holder = f.target; tgt.mode = "carry";
  const end = Math.min(100, S.los + ev.yards);
  if (end <= tgt.x + 0.3) { S.tackleAt = { x: tgt.x, y: tgt.y }; finishRun(S); return; }
  S.tackleAt = { x: end, y: tgt.y }; S.phase = "yac";
}

function beginRun(S) {
  const { ents, ev, los } = S;
  ents.QB.mode = "set"; ents.RB.mode = "carry";
  const end = Math.min(100, los + (ev?.yards ?? 2));
  // the lane: through the hole, then straight up the field
  S.tackleAt = { x: end, y: ev?.yards > 3 ? S.lane : S.lane * 0.5 };
  S.phase = "run";
  if (!ev || (ev.type !== "run" && ev.type !== "td" && ev.type !== "fumble")) { S.text = ev?.text || ""; S.phase = "fall"; S.endAt = S.t + 0.8; S.result = ev; }
}

function finishRun(S) {
  const { ev } = S;
  S.result = ev; S.text = ev.text;
  if (ev.td) { S.phase = "fall"; S.endAt = S.t + 1.4; }
  else { S.phase = "tackle"; S.endAt = S.t + 1.0; }
}
