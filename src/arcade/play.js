// The on-field play: 22 men moving with real acceleration, the throw you aim, the catch, the run
// after it and the tackle, all decided on the field. Units are yards: x from the offense's own
// goal line (0) toward the far goal line (100), y across the field (-26.65 near sideline .. 26.65).
//
// The engine (playsim.js) still books every play: once the field knows what happened, bridge.js
// asks it for a play of that kind gaining about those yards, so the box score, grades, clock and
// log are the engine's, and the field never shows something the box score contradicts.
import { resolvePlay } from "./bridge.js";

// Calibration: the knobs that set how hard the field is, tuned so an average player's numbers come
// out where the engine's own do for the same matchup (scripts/arcade-playtest.mjs against
// scripts/arcade-baseline.mjs). Better play beats them; worse play falls short. rush: seconds added
// to how long the line holds; lag/trail: how far a cover man plays off his receiver (1 = as built);
// open: yards of separation that count as open at the catch; yac: the chance a carrier breaks or
// jukes a tackle on a run (1 = as built), yacCatch after a catch; hands: the catch chance (1 = as built).
export const CAL = { rush: 1.1, lag: 0.8, trail: 1, open: 0, yac: 1.15, yacCatch: 0.35, hands: 0.87 };
import * as K from "./ratings.js";

export const FIELD_W = 53.3, HALF = FIELD_W / 2;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const hyp = (dx, dy) => Math.hypot(dx, dy);
const rnd = (S) => (S.g?.rand || Math.random)(); // the game's own RNG, so a seeded game replays the same

// Yards per second at full speed from a speed rating (a 60 jogs ~6.3, a 99 flies ~9.8), and how
// hard he accelerates (yd/s²) from his acceleration rating. Linemen are capped: they don't sprint.
// (a player's form this season and any playing-hurt penalty shift these too, at a third of the rate)
export const topSpeed = (p) => 6.3 + (clamp((p?.spd ?? 70) + (p?.form || 0) / 3, 40, 99) - 60) / 39 * 3.5;
const accelOf = (p) => 9 + (clamp((p?.acc ?? 70) + (p?.form || 0) / 3, 40, 99) - 60) / 39 * 9;

// Pre-snap spots: [yards behind the line (-), lateral]. The offense's right is +y.
const OFF_SPOTS = { LT: [-1, -7.2], LG: [-1, -3.6], C: [-1, 0], RG: [-1, 3.6], RT: [-1, 7.2], TE: [-1.2, 10.8], X: [-1, -18], Z: [-1, 18], SLOT: [-2.5, -11.5], QB: [-5, 0], RB: [-7, 1.8] };
const DEF_SPOTS = { DL0: [1.6, -5.8], DL1: [1.6, -1.8], DL2: [1.6, 1.8], DL3: [1.6, 5.8], LB0: [5.5, 5], LB1: [5.5, -4], CB0: [6, -18], CB1: [6, 18], CB2: [5, -11.5], S0: [15, 0], S1: [10, 9] };
const OL_VS = { DL0: "LT", DL1: "LG", DL2: "RG", DL3: "RT" };
export const ELIGIBLE = ["X", "Z", "SLOT", "TE", "RB"];
const LINE = ["LT", "LG", "C", "RG", "RT"];

// Routes: legs of [yards up the field, yards sideways], sideways +1 toward the middle (the same
// route mirrors on either side). `stop` ends in a settle; otherwise he keeps running the last leg.
// `more`: how far he keeps running his last leg before he eases up and looks back for the ball
const ROUTES = {
  slant: { legs: [[1.5, 0], [4.5, 4.5]], more: 3 }, hitch: { legs: [[5, 0], [-1, 0.5]], stop: true }, out: { legs: [[6, 0], [0.5, -7]], more: 3 },
  dig: { legs: [[12, 0], [0, 10]], more: 6 }, deepout: { legs: [[11, 0], [-0.5, -7]], more: 2 }, curl: { legs: [[9, 0], [-1.5, 1]], stop: true }, comeback: { legs: [[14, 0], [-2.5, -2]], stop: true }, corner: { legs: [[10, 0], [8, -7]], more: 8 },
  post: { legs: [[10, 0], [14, 8]], more: 12 }, go: { legs: [[45, 0]], more: 40 }, seam: { legs: [[4, 0], [30, 1.5]], more: 15 }, drag: { legs: [[2, 0], [2, 16]], more: 5 },
  stick: { legs: [[6, 0], [0, 1]], stop: true }, spot: { legs: [[6, 0], [-1, 2.5]], stop: true }, qin: { legs: [[6, 0], [0, 8]], more: 4 },
  arrow: { legs: [[1, 0], [4, -8]], more: 3 }, fade: { legs: [[30, -2]], more: 15 }, xing: { legs: [[8, 0], [12, 16]], more: 8 },
  wheel: { legs: [[-1, -4], [3, -3], [25, 0]], more: 10 }, angle: { legs: [[2, -3], [4, 5]], more: 4 },
  flat: { legs: [[0.5, 0], [2, -9]], more: 3 }, swing: { legs: [[-1, -3], [3, -8]], more: 4 }, check: { legs: [[4, 0], [1, 0]], stop: true, delay: 0.9 },
};
// NFL pass concepts (X wide left, SLOT inside left, TE inline right, Z wide right, RB behind
// the QB; "check" = the back stays in to block unless nobody comes). Each is filed under the
// engine's play family (quick / medium / deep), which drives the drop and the engine's odds.
export const CONCEPTS = {
  slant_flat: { cat: "pass_quick", name: "SLANT-FLAT", routes: { X: "slant", SLOT: "flat", TE: "stick", Z: "slant", RB: "check" }, reads: ["X", "Z", "SLOT", "TE"] },
  stick: { cat: "pass_quick", name: "STICK", routes: { X: "fade", SLOT: "stick", TE: "stick", Z: "hitch", RB: "swing" }, reads: ["SLOT", "TE", "RB", "Z", "X"] },
  snag: { cat: "pass_quick", name: "SNAG", routes: { X: "spot", SLOT: "corner", TE: "flat", Z: "slant", RB: "check" }, reads: ["X", "SLOT", "TE", "Z"] },
  quick_outs: { cat: "pass_quick", name: "QUICK OUTS", routes: { X: "out", SLOT: "out", TE: "flat", Z: "out", RB: "check" }, reads: ["X", "Z", "SLOT", "TE"] },
  hitch_seam: { cat: "pass_quick", name: "HITCH-SEAM", routes: { X: "hitch", SLOT: "seam", TE: "seam", Z: "hitch", RB: "check" }, reads: ["X", "Z", "SLOT", "TE"] },
  curl_flat: { cat: "pass_medium", name: "CURL-FLAT", routes: { X: "curl", SLOT: "arrow", TE: "flat", Z: "curl", RB: "check" }, reads: ["X", "SLOT", "Z", "TE"] },
  dagger: { cat: "pass_medium", name: "DAGGER", routes: { X: "dig", SLOT: "seam", TE: "drag", Z: "go", RB: "check" }, reads: ["X", "TE", "SLOT", "Z"] },
  smash: { cat: "pass_medium", name: "SMASH", routes: { X: "hitch", SLOT: "corner", TE: "corner", Z: "hitch", RB: "swing" }, reads: ["SLOT", "X", "TE", "Z", "RB"] },
  levels: { cat: "pass_medium", name: "LEVELS", routes: { X: "dig", SLOT: "qin", TE: "drag", Z: "go", RB: "check" }, reads: ["X", "SLOT", "TE", "Z"] },
  mesh: { cat: "pass_medium", name: "MESH", routes: { X: "corner", SLOT: "drag", TE: "drag", Z: "dig", RB: "angle" }, reads: ["SLOT", "TE", "Z", "X", "RB"] },
  flood: { cat: "pass_medium", name: "FLOOD", routes: { X: "post", SLOT: "dig", TE: "deepout", Z: "go", RB: "swing" }, reads: ["TE", "Z", "RB", "SLOT", "X"] },
  four_verts: { cat: "pass_deep", name: "FOUR VERTS", routes: { X: "go", SLOT: "seam", TE: "seam", Z: "go", RB: "check" }, reads: ["SLOT", "TE", "X", "Z"] },
  mills: { cat: "pass_deep", name: "MILLS", routes: { X: "post", SLOT: "dig", TE: "drag", Z: "go", RB: "check" }, reads: ["X", "SLOT", "Z", "TE"] },
  yankee: { cat: "pass_deep", name: "YANKEE", routes: { X: "xing", SLOT: "flat", TE: "check", Z: "post", RB: "check" }, reads: ["Z", "X", "SLOT"] },
  post_wheel: { cat: "pass_deep", name: "POST-WHEEL", routes: { X: "fade", SLOT: "post", TE: "corner", Z: "fade", RB: "wheel" }, reads: ["SLOT", "RB", "TE", "X"] },
  shot: { cat: "pass_deep", name: "GO-POST", routes: { X: "go", SLOT: "corner", TE: "seam", Z: "post", RB: "check" }, reads: ["X", "Z", "TE", "SLOT"] },
};
// a few concepts from each family, picked fresh for the play card screen
export function conceptChoices(rand = Math.random) {
  const by = (cat) => Object.keys(CONCEPTS).filter((k) => CONCEPTS[k].cat === cat).sort(() => rand() - 0.5);
  const q = by("pass_quick"), m = by("pass_medium"), d = by("pass_deep");
  return [q[0], m[0], m[1], d[0]];
}
const ROUTES_OF = (call) => PLAYS[call] || {};
const PLAYS = {
  pass_quick: { X: "slant", Z: "hitch", SLOT: "drag", TE: "flat", RB: "check" },
  pass_medium: { X: "dig", Z: "deepout", SLOT: "curl", TE: "drag", RB: "swing" },
  pass_deep: { X: "go", Z: "post", SLOT: "corner", TE: "seam", RB: "check" },
};
// A play's diagram for the play card: each receiver's route from his spot, in yards (x up the
// field from the line, y across), and an arrow for a run.
export function playDiagram(call) {
  const lines = [];
  const plan = CONCEPTS[call]?.routes || PLAYS[call];
  if (plan) for (const r of ELIGIBLE) {
    const R = ROUTES[plan[r]], [dx, dy] = OFF_SPOTS[r], inward = dy < 0 ? 1 : -1;
    let x = dx, y = dy; const pts = [{ x, y }];
    for (const [up, side] of R.legs) { x += up; y = clamp(y + side * inward, -25, 25); pts.push({ x, y }); }
    if (!R.stop && R.more) { const a = pts[pts.length - 2], b = pts[pts.length - 1], d = hyp(b.x - a.x, b.y - a.y) || 1; pts.push({ x: b.x + (b.x - a.x) / d * R.more * 0.5, y: b.y + (b.y - a.y) / d * R.more * 0.5 }); }
    lines.push({ who: r, pts, stop: !!R.stop });
  } else if (call === "run_inside") lines.push({ who: "RB", pts: [{ x: -7, y: 1.8 }, { x: -1, y: 3.5 }, { x: 8, y: 3.5 }], run: true });
  else if (call === "run_outside") lines.push({ who: "RB", pts: [{ x: -7, y: 1.8 }, { x: -4, y: 9 }, { x: 0, y: 14 }, { x: 8, y: 15 }], run: true });
  return { lines, spots: OFF_SPOTS };
}
export const playName = (k) => CONCEPTS[k]?.name || PLAY_NAMES[k]?.toUpperCase() || "";
export const PLAY_NAMES = { pass_quick: "Quick", pass_medium: "Medium", pass_deep: "Deep", run_inside: "Inside run", run_outside: "Outside run" };

const mk = (key, p, side, x, y) => ({ key, p, side, x, y, vx: 0, vy: 0, face: side === "off" ? 1 : -1, top: topSpeed(p), acc: accelOf(p), mode: "idle", path: null, down: 0 });

// ---------- setting up ----------
export function setupPlay(g, L, call) {
  const concept = CONCEPTS[call] ? call : null; if (concept) call = CONCEPTS[concept].cat; // a named concept plays as its family
  const los = g.yard, ents = {};
  for (const [k, [dx, dy]] of Object.entries(OFF_SPOTS)) { const p = L.off[k]; if (p) ents[k] = mk(k, p, "off", los + dx, dy); }
  const dl = L.def.DL, lb = L.def.LB, cb = L.def.CB, s = L.def.S;
  const defList = { DL0: dl[0], DL1: dl[1], DL2: dl[2], DL3: dl[3], LB0: lb[0], LB1: lb[1], CB0: cb[0], CB1: cb[1], CB2: cb[2], S0: s[0], S1: s[1] };
  // (near the goal line the secondary can't line up as deep: everyone fits in front of the end line)
  for (const [k, p] of Object.entries(defList)) { const [dx, dy] = DEF_SPOTS[k]; if (p) ents[k] = mk(k, p, "def", Math.min(los + dx, 106.5 - (k === "S0" ? 0 : 2)), dy); }
  for (const k of [...LINE, "DL0", "DL1", "DL2", "DL3"]) if (ents[k]) { ents[k].top *= 0.72; ents[k].acc *= 0.8; }
  { const W = wxField(g), snow = W.snow || 0, rain = W.rain || 0; if (snow || rain) for (const e of Object.values(ents)) { e.top *= 1 - 0.035 * snow - 0.01 * rain; e.acc *= 1 - 0.12 * snow - 0.05 * rain; } } // bad footing
  // man assignments: the engine's cover man for each receiver, if he's out there
  const cover = {};
  for (const r of ELIGIBLE) { const cm = L.cover[r]; const k = cm && Object.keys(defList).find((d) => defList[d]?.id === cm.id); if (k) cover[r] = k; }
  for (const r of ["X", "Z", "SLOT"]) { const k = cover[r]; if (k && ents[k] && ents[r]) ents[k].y = ents[r].y + (ents[r].y < 0 ? 1 : -1) * 0.8; }
  if (ents[cover.TE] && ents.TE && cover.TE.startsWith("LB")) ents[cover.TE].y = ents.TE.y;
  // the routes, laid out now so the field can show them before the snap
  const routes = concept ? CONCEPTS[concept].routes : PLAYS[call];
  if (routes) for (const r of ELIGIBLE) {
    const e = ents[r]; if (!e) continue;
    const Rt = ROUTES[routes[r]], inward = e.y < 0 ? 1 : -1;
    let x = e.x, y = e.y; const pts = [];
    for (const [up, side] of Rt.legs) { x = Math.min(107, x + up); y = clamp(y + side * inward, -HALF + 2.5, HALF - 2.5); pts.push({ x, y }); }
    e.path = pts; e.stop = !!Rt.stop; e.delay = Rt.delay || 0; e.more = Rt.more || 0;
  }
  return {
    g, L, call, concept, routes: concept ? CONCEPTS[concept].routes : PLAYS[call], los, firstDown: Math.min(100, los + g.toGo), t: 0, phase: "presnap", ents, cover,
    ball: { x: ents.QB.x, y: 0, h: 0, holder: "QB", flight: null },
    aim: null, steer: null, slideTo: null, text: "", ev: null, result: null, pick: null, shed: {}, pressureAt: 0, thrownAt: 0, endAt: 0, lane: 0, handoffAt: 0, tackler: null, broke: 0, log: [],
  };
}

export function snap(S) {
  const { ents, call } = S;
  S.phase = "live"; S.t = 0;
  const isPass = call.startsWith("pass");
  for (const r of ELIGIBLE) { const e = ents[r]; if (!e) continue; e.mode = isPass ? "route" : r === "RB" ? "back" : "block"; }
  if (isPass) for (const r of ["X", "Z", "SLOT", "TE"]) {
    const e = ents[r], c = ents[S.cover[r]]; if (!e) continue;
    // a corner up on him jams him at the line: his release against the corner's press costs (or saves) a beat
    if (c && c.p.pos === "CB") e.delay = Math.max(e.delay || 0, clamp(0.12 + (K.press(c.p) - K.release(e.p)) * 0.012, 0, 0.45));
    e.deepTop = topSpeed({ ...e.p, spd: K.deepSpeed(e.p) }); // his speed once he's into his stride downfield
  }
  for (const k of LINE) if (ents[k]) ents[k].mode = "block";
  // the defense's call, from its own tendencies (the coordinator's scheme and game plan, as the engine uses them)
  const st = S.g.sides?.a?.dStyle || { blitz: 0.22, box: 0.2, cover: 0.2 }, u = rnd(S);
  S.dcall = u < st.blitz ? "blitz" : u < st.blitz + st.box ? "box" : u < st.blitz + st.box + st.cover ? "cover" : "base";
  S.drive = {}; S.flash = [];
  for (const k of ["DL0", "DL1", "DL2", "DL3"]) {
    const d = ents[k], o = ents[OL_VS[k]]; if (!d) continue;
    if (isPass) {
      // his best move against the part of the lineman's game that answers it: a swim against his hands,
      // a spin against his feet, a bull rush against his anchor
      const MOVES = [["swim", "handUse", "SWIM"], ["spin", "footwork", "SPIN"], ["bullRush", "anchor", "BULL RUSH"]];
      const [move, counter, label] = MOVES.reduce((b, m) => ((d.p.posAttrs?.[m[0]] ?? 0) > (d.p.posAttrs?.[b[0]] ?? 0) ? m : b));
      // half his pass-rush grade (and get-off), half his best move against the lineman's answer to it
      const rush = K.skill(d.p, [["passRush", 0.75], ["getOff", 0.25], ["blitzing", 1]], 0.15) * 0.5 + K.skill(d.p, [[move, 1]], 0.1) * 0.5;
      const blk = o ? K.passBlock(o.p) * 0.55 + K.skill(o.p, [[counter, 1]], 0.1) * 0.45 : 50;
      // (a blitz brings games up front too: twists and slants free a rusher a beat sooner; dropping eight gives the line time)
      S.shed[k] = clamp(1.95 + CAL.rush + (blk - rush) * 0.1 - K.edge(K.getOff(d.p)) * 0.02 + rnd(S) * 1.8 + (S.dcall === "cover" ? 0.35 : S.dcall === "blitz" ? -0.3 : 0), 1.05, 6.5);
      d.move = label;
    } else {
      // the run: who wins at the point of attack, and by how much: the line drives him back, or he walks it into the backfield
      const rush = K.runStop(d.p), blk = o ? K.runBlock(o.p) : 50;
      S.shed[k] = clamp(1.5 + (blk - rush) * 0.06 + rnd(S) * 1.8 - (S.dcall === "box" ? 0.25 : 0), 0.5, 5);
      S.drive[k] = clamp((blk - rush) * 0.12 + (rnd(S) - 0.5) * 0.8 - 0.45, -2.5, 2.4); // yards a second the pile moves
      d.penetrating = S.drive[k] < -0.7; // he's walking his man into the backfield: he can make the play from there
    }
    d.mode = "rush";
  }
  for (const k of ["LB0", "LB1", "CB0", "CB1", "CB2", "S0", "S1"]) if (ents[k]) ents[k].mode = "cover";
  if (S.dcall === "box" && !isPass && ents.S1) ents.S1.mode = "box"; // the eighth man down in the box
  // run blocking assignments: the uncovered center climbs to the MIKE, the tight end takes the SAM;
  // everyone else has the man over him, then climbs to whoever's next
  if (!isPass) { if (ents.C) ents.C.assign = ents.LB1 ? "LB1" : "LB0"; if (ents.TE) ents.TE.assign = ents.LB0 ? "LB0" : "S1"; }
  // the blitz: the MIKE (or SAM) comes; the safety takes his man; the back picks him up if he can
  if (S.dcall === "blitz" && isPass) {
    const bk = ents.LB1 ? "LB1" : ents.LB0 ? "LB0" : null;
    if (bk) {
      const bl = ents[bk]; bl.mode = "blitz"; bl.x = Math.min(bl.x, S.los + 2.5); // he walked up to the line
      for (const r of Object.keys(S.cover)) if (S.cover[r] === bk) S.cover[r] = ents.S1 ? "S1" : bk;
      const rb = ents.RB, staysIn = rb && (S.routes || ROUTES_OF(S.call)).RB === "check";
      if (staysIn && rnd(S) < clamp(0.65 + K.edge(K.passBlock(rb.p)) * 0.012, 0.3, 0.95)) { rb.mode = "protect"; rb.path = []; S.pickup = bk; }
      S.flash.push({ key: bk, text: "BLITZ", until: 1.2 });
    }
  }
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
// The day's weather on the field (g.wxE from weather.js; g.wind set by the arcade): snow takes the
// footing, rain the grip, and the wind carries the ball. The teams change ends every quarter, so
// a wind at your back in the first quarter is in your face in the second.
export const wxField = (g) => g?.wxE || {};
export function windNow(g) {
  const w = g?.wind; if (!w || !w.mph) return { x: 0, y: 0, mph: 0 };
  const flip = g.qtr % 2 === 0 ? -1 : 1; // (overtime keeps the fourth quarter's ends)
  return { x: w.x * flip, y: w.y * flip, mph: w.mph };
}
export const separation = (S, r) => { const e = S.ents[r], c = S.ents[S.cover[r]]; return c ? hyp(e.x - c.x, e.y - c.y) : 9; };
// the nearest defender who could make a play (a lineman still tied up with his blocker can't)
const nearestDef = (S, x, y, skip = null) => { let best = null, bd = 99; for (const k of Object.keys(S.ents)) { const d = S.ents[k]; if (d.side !== "def" || d.down > 0 || k === skip || (d.mode === "rush" && !d.penetrating) || d.heldUntil > S.t) continue; const dd = hyp(d.x - x, d.y - y); if (dd < bd) { bd = dd; best = d; } } return [best, bd]; };

// A blocker on a defender: he's tied up for a spell set by his run blocking against the
// defender's shedding, then gets off and can't be caught by the same man again for a moment.
function block(S, b, d) {
  const bl = K.runBlock(b.p), sh = K.runStop(d.p);
  d.heldUntil = S.t + clamp(0.9 + (bl - sh) * 0.05 + rnd(S) * 0.6, 0.25, 2.8); d.heldBy = b.key; d.freeOf = { key: b.key, until: d.heldUntil + 1.0 };
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
        const burst = e.cutAt != null && S.t - e.cutAt < 0.4 ? 1.3 + (K.routeSkill(e.p) - 50) * 0.016 : 1; // out of his break
        const acc0 = e.acc; e.acc *= burst;
        const left = steer(e, e.path[0].x, e.path[0].y, dt, e.deepTop && e.x - S.los > 10 ? e.deepTop / e.top : 1); e.acc = acc0;
        if (left < 0.7) { e.last = e.path.shift(); e.cutAt = S.t; if (!e.path.length) { e.mode = e.stop ? "settle" : "stride"; e.strideFrom = { x: e.x, y: e.y }; } }
      }
    } else if (e.mode === "stride") {
      const l = e.last || { x: e.x - 1, y: e.y }, dx = e.x - l.x || 1, dy = e.y - l.y, d = hyp(dx, dy);
      steer(e, Math.min(107, e.x + (dx / d) * 6), clamp(e.y + (dy / d) * 6, -HALF + 1.5, HALF - 1.5), dt, e.deepTop && e.x - S.los > 10 ? e.deepTop / e.top : 1);
      if (e.x > 105 || hyp(e.x - e.strideFrom.x, e.y - e.strideFrom.y) > e.more) e.mode = "settle";
    } else if (e.mode === "settle") { brake(e, dt); if (Math.abs(e.vx) < 0.5) e.face = 1; }
    else if (e.mode === "adjust") {
      // get to the spot as the ball does: flat out if it's far, otherwise pace it and run through it
      const left = ball.flight ? Math.max(0.05, ball.flight.t0 + ball.flight.T - S.t) : 0.05;
      if (ball.flight && left < 0.6) { e.tx = ball.flight.to.x; e.ty = ball.flight.to.y; } // now he can see where it's really coming down
      const far = hyp(e.tx - e.x, e.ty - e.y);
      const need = far / left; steer(e, e.tx, e.ty, dt, clamp(need / e.top, 0.75, 1), true); // never pulls up: he catches it running
    }
    else if (e.mode === "block") { if (isPass) brake(e, dt); }
  }

  // held defenders are driven by their blocker
  for (const d of Object.values(ents)) if (d.side === "def" && d.heldUntil > S.t && !over) { const b = ents[d.heldBy]; if (b) { steer(d, b.x + 0.9 * (d.x > b.x ? 1 : -1), b.y + (d.y > b.y ? 0.4 : -0.4), dt, 0.5); } }
  // blockers: the line keeps its pocket on a pass; on a run it drives, then climbs to the next man
  for (const k of LINE) {
    const o = ents[k]; if (!o || o.mode !== "block") continue;
    const mine = ["DL0", "DL1", "DL2", "DL3"].find((d) => OL_VS[d] === k), dl = mine && ents[mine];
    if (isPass) {
      // the center slides to the blitzer: his pass block against the linebacker's rush decides how long he holds him
      // (only when the protection slid his way: half the time he's turned the other way and the blitzer is the back's, or nobody's)
      if (k === "C" && S.slideC == null) S.slideC = rnd(S) < 0.5;
      const bz = k === "C" && S.slideC && Object.values(ents).find((q) => q.mode === "blitz" && !q.pickedUp && !(q.heldUntil > S.t));
      if (bz && hyp(bz.x - o.x, bz.y - o.y) < 1.6) { bz.pickedUp = true; bz.heldUntil = S.t + clamp(0.45 + (K.passBlock(o.p) - K.passRush(bz.p)) * 0.03 + rnd(S) * 0.6, 0.2, 1.6); bz.heldBy = "C"; }
      else if (bz && S.t > 0.2) { steer(o, (bz.x + ents.QB.x) / 2, (bz.y + ents.QB.y) / 2, dt, 0.8); continue; }
      steer(o, S.los - 2.6 + (k === "C" ? 0.3 : 0), OFF_SPOTS[k][1] * 1.15, dt, 0.6); continue;
    }
    if (o.assign && !mine) { seekBlock(S, o, dt, 14); continue; }
    // winning at the point of attack: he washes his man out of the play and climbs to the next level
    if (dl && dl.mode === "rush" && !o.climbed && (S.drive[mine] || 0) > 0 && S.t > 1.9 - (S.drive[mine] || 0) * 0.6) {
      o.climbed = true; dl.mode = "free"; dl.heldUntil = S.t + 0.5 + (S.drive[mine] || 0) * 0.35; dl.heldBy = k;
      // the most dangerous man still free: the one nearest the back's path
      const rb = ents.RB, lane = { x: S.los + 3, y: S.lane };
      const next = ["LB0", "S1", "LB1", "S0", "CB2"].map((q) => ents[q]).filter((q) => q && canBlock(S, o, q)).sort((p1, p2) => hyp(p1.x - lane.x, p1.y - lane.y) + hyp(p1.x - o.x, p1.y - o.y) * 0.5 - hyp(p2.x - lane.x, p2.y - lane.y) - hyp(p2.x - o.x, p2.y - o.y) * 0.5)[0];
      if (next) o.assign = next.key;
    }
    if (o.climbed) { seekBlock(S, o, dt, 12); continue; }
    if (dl && dl.mode === "rush") { const drv = S.drive[mine] || 0; steer(o, S.los + 0.6 + clamp(drv * S.t, -3.5, 4), OFF_SPOTS[k][1] * 1.05, dt, 0.7); continue; } // driving him (or being driven)
    seekBlock(S, o, dt, 10);
  }
  if (!isPass && !over) for (const r of ELIGIBLE) { const e = ents[r]; if (e && e.mode === "block") seekBlock(S, e, dt, 9); }

  // the quarterback: drops, sets, throws; on a run he hands off and watches
  if (qb.mode === "dropback") { if (steer(qb, S.los - (S.call === "pass_quick" ? 5.5 : 7.5), 0, dt, 0.85) < 0.3) qb.mode = "set"; }
  else if (qb.mode === "set" || qb.mode === "watch") brake(qb, dt);
  else if (qb.mode === "handoff") { brake(qb, dt); const rb = ents.RB; if (rb.mode === "back" && (hyp(rb.x - qb.x, rb.y - qb.y) < 2.0 || S.t >= 0.65)) handoff(S); } // (an early, clean exchange: the ball is the back's before he hits the line)
  if (ents.RB.mode === "back") steer(ents.RB, S.los + 1, S.lane * 0.6, dt, 0.95);
  if (ents.RB.mode === "protect") {
    const rb = ents.RB, bl = ents[S.pickup];
    if (bl && bl.mode === "blitz" && !(bl.heldUntil > S.t) && !bl.pickedUp) {
      if (hyp(bl.x - rb.x, bl.y - rb.y) < 1.2) { bl.pickedUp = true; bl.heldUntil = S.t + clamp(0.9 + (K.passBlock(rb.p) - K.passRush(bl.p)) * 0.03 + rnd(S) * 0.6, 0.3, 2.4); bl.heldBy = "RB"; S.flash.push({ key: "RB", text: "PICKED UP", until: S.t + 0.9 }); }
      else steer(rb, (bl.x + qb.x) / 2, (bl.y + qb.y) / 2, dt, 0.95);
    } else brake(rb, dt);
  }

  // the rush: engaged with his man until he sheds him, then after the ball
  for (const k of ["DL0", "DL1", "DL2", "DL3"]) {
    const d = ents[k]; if (!d || d.down > 0 || d === carrier || d.heldUntil > S.t) continue;
    const o = ents[OL_VS[k]];
    if (d.mode === "rush" && !o) d.mode = "free"; // (nobody across from him: he's through)
    if (d.mode === "rush") {
      if (S.t < S.shed[k]) steer(d, o.x + (isPass ? 1.0 : 1.1), o.y + (d.y > o.y ? 0.5 : -0.5), dt, 0.8);
      else { d.mode = "free"; if (isPass && ball.holder === "QB" && d.move) S.flash.push({ key: k, text: d.move, until: S.t + 1.0 }); }
    }
    if (d.mode === "free") { if (carrier && !over) steer(d, ...xy(intercept(d, carrier)), dt, clamp(1 + K.edge(K.pursuit(d.p)) * 0.002, 0.95, 1.04)); else brake(d, dt); }
  }
  // the pass rush gets home: a sack
  if (S.phase === "live" && isPass && ball.holder === "QB") {
    const [d, dd] = nearestDef(S, qb.x, qb.y);
    if (dd < 2.8 && !S.pressureAt) S.pressureAt = S.t;
    if (dd < 1.25 && d && (d.mode === "free" || d.mode === "blitz")) { sack(S, d); return true; }
  }

  // coverage: man trails his receiver; the safeties sit deep and break on the ball; once the ball's
  // out everyone nearby goes to where it's coming down; with a runner loose, everyone pursues
  for (const k of ["LB0", "LB1", "CB0", "CB1", "CB2", "S0", "S1"]) {
    const d = ents[k]; if (!d || d.down > 0 || d === carrier || d.heldUntil > S.t) continue;
    const mine = Object.keys(S.cover).find((r) => S.cover[r] === k);
    if (over) { brake(d, dt); continue; }
    if (d.mode === "blitz") { if (S.t > 0.12) { const tgt = carrier || qb; steer(d, ...xy(intercept(d, tgt)), dt, 1); } continue; } // straight at the quarterback
    if (d.mode === "box" && !ball.flight) { if (S.t > 0.45) { const tgt = carrier || ents.RB; steer(d, ...xy(intercept(d, tgt)), dt, 0.95); } else steer(d, S.los + 4, 5, dt, 0.8); continue; }
    if (ball.flight) {
      const f = ball.flight, near = hyp(f.to.x - d.x, f.to.y - d.y), left = f.t0 + f.T - S.t;
      // a cover man stays in his coverage (same lag, same trail) until the ball is nearly down,
      // then lunges for it; anyone else close enough breaks on the spot once he's seen it
      const tgt = f.target && ents[f.target];
      if (mine && ents[mine] && left > clamp(0.3 + K.edge(K.ballRead(d.p)) * 0.006 + (f.bullet ? 0 : 0.35), 0.12, 0.85)) { // (a lob he can read and play sooner) // a sharp reader breaks on it sooner
        const r = ents[mine], cov = K.coverMan(d.p), lag = (0.36 + Math.max(0, 90 - cov) * 0.012) * CAL.lag, kk = Math.min(1, dt / lag);
        d.rv ||= { vx: 0, vy: 0 }; d.rv.vx += (r.vx - d.rv.vx) * kk; d.rv.vy += (r.vy - d.rv.vy) * kk;
        // (a loose grip on him now: if he slows for the ball, his man is carried past him)
        mirror(d, r, r.x - 0.8, r.y + (r.y > 0 ? -0.6 : 0.6), dt, 1, 0.45, d.rv); continue;
      }
      if (S.t - f.t0 < clamp(0.6 - K.edge(K.ballRead(d.p)) * 0.01, 0.2, 0.85)) { brake(d, dt); continue; } // seeing it (his play recognition / instincts)
      if (left <= 0.3 || near < left * d.top * 0.9 + 1.0) steer(d, f.to.x, f.to.y, dt, 1);
      else if (tgt) steer(d, tgt.x + tgt.vx * 0.25, tgt.y + tgt.vy * 0.25, dt, 0.9);
      else brake(d, dt);
      continue;
    }
    if (carrier && carrier.key !== "QB") { const react = S.catchAt != null && false ? 0.85 : 1.0; steer(d, ...xy(intercept(d, carrier)), dt, react * clamp(1 + K.edge(K.pursuit(d.p)) * 0.002, 0.95, 1.04)); continue; }
    if (!isPass) { // the run: linebackers read it, then fill; the secondary comes late
      const read = k.startsWith("LB") ? 0.7 : k.startsWith("S") ? 1.0 : 1.4;
      if (S.t < read) { brake(d, dt); continue; }
      const tgt = carrier || ents.RB; const T = intercept(d, tgt); steer(d, T.x, T.y, dt, k.startsWith("LB") ? 0.95 : 0.9); continue;
    }
    if (S.t < 0.22) { brake(d, dt); continue; } // the read
    // (a man whose receiver stays in to block has nobody to cover: he drops into the hook zone and rallies)
    if (mine && ents[mine] && ents[mine].mode !== "protect" && ents[mine].mode !== "block") {
      // man: on his hip, shaded inside; a better cover man stays tighter and reads the break sooner
      const r = ents[mine], cov = K.coverMan(d.p);
      const q = clamp(0.96 + (cov - 78) * 0.003, 0.87, 1.02), trail = ((r.mode === "settle" ? 0.8 : 1.25) + clamp(85 - cov, 0, 30) * 0.025) * CAL.trail, in_ = r.y > 0 ? -0.7 : 0.7;
      // he reads the receiver's moves a beat late (later for a lesser cover man): what he mirrors is
      // a smoothed copy of the receiver's velocity, so a sharp cut opens a window before he reacts
      // leverage: shaded inside, he's already there for a break inside (a slant, a dig) and a step
      // late on one outside (an out, a corner); that's what the outside routes are for
      const lever = r.vy * in_ > 1 ? 0.55 : r.vy * in_ < -1 ? 1.25 : 1;
      const lag = (0.36 + Math.max(0, 90 - cov) * 0.012) * lever * CAL.lag, k = Math.min(1, dt / lag);
      d.rv ||= { vx: 0, vy: 0 }; d.rv.vx += (r.vx - d.rv.vx) * k; d.rv.vy += (r.vy - d.rv.vy) * k;
      const lx = r.x - r.vx * 0.05, ly = r.y - r.vy * 0.05;
      const beaten = r.x > d.x + 1 ? 1 + (K.recovery(d.p) - 75) * 0.003 : 1; // beaten: his recovery speed closes it back up
      const sp_ = hyp(r.vx, r.vy), along = sp_ > 1 ? clamp(Math.abs(r.vx) / sp_, 0.35, 1) : 1; // (a man running across the field is played on his hip, not from behind)
      mirror(d, r, lx - trail * along, ly + in_, dt, q * beaten, 0.9, d.rv);
    } else if (k === "S0" && S.dcall === "cover") { // two deep: he takes the other half
      let deep = null; for (const r of ELIGIBLE) { const e = ents[r]; if (e && e.mode !== "block" && e.mode !== "back" && e.y < 4 && (!deep || e.x > deep.x)) deep = e; }
      steer(d, Math.min(106, Math.max(S.los + 13, deep ? deep.x + 4.5 + Math.max(0, deep.vx) * 0.7 : 0)), deep ? Math.min(-4, deep.y * 0.8) : -11, dt, 1);
    } else if (k === "S0") {
      // the single-high free safety: deeper than the deepest route, but he stays in the middle of
      // the field so he can get to either sideline once the ball's in the air
      let deep = null; for (const r of ELIGIBLE) { const e = ents[r]; if (e && e.mode !== "block" && e.mode !== "back" && e.x > S.los + 4 && (!deep || e.x > deep.x)) deep = e; }
      const dx = deep ? Math.max(deep.x + 5.5 + Math.max(0, deep.vx) * 0.9, S.los + 13) : S.los + 14, dy = deep ? clamp(deep.y * 0.5, -10, 10) : 0;
      steer(d, Math.min(106, dx), dy, dt, 1);
    } else if (k === "S1" && S.dcall === "cover") { // two deep: he takes his half
      let deep = null; for (const r of ELIGIBLE) { const e = ents[r]; if (e && e.mode !== "block" && e.mode !== "back" && e.y > -4 && (!deep || e.x > deep.x)) deep = e; }
      steer(d, Math.min(106, Math.max(S.los + 13, deep ? deep.x + 4.5 + Math.max(0, deep.vx) * 0.7 : 0)), deep ? Math.max(4, deep.y * 0.8) : 11, dt, 1);
    } else if (k === "S1") {
      // the strong safety: with two men going deep he takes the second over the top; otherwise a
      // robber in the middle, jumping anything that comes through his zone
      const deepMen = ELIGIBLE.map((r) => ents[r]).filter((e) => e && e.mode !== "block" && e.mode !== "back" && e.x > S.los + 10).sort((a, b) => b.x - a.x);
      if (deepMen.length >= 2 && deepMen[1].x > S.los + 12) { const m = deepMen[1]; steer(d, Math.min(106, m.x + 2.5 + Math.max(0, m.vx) * 0.3), m.y * 0.85, dt, 1); continue; }
      let near = null, nb = 7; for (const r of ELIGIBLE) { const e = ents[r]; if (!e) continue; const dd = hyp(e.x - d.x, e.y - d.y); if (dd < nb) { nb = dd; near = e; } }
      if (near) steer(d, near.x - 0.6, near.y, dt, 0.95); else steer(d, Math.min(105, S.los + 10), 6, dt, 0.75);
    } else { // an unassigned linebacker: a short zone, driving on anyone who crosses it
      let near = null, nb = 7; for (const r of ELIGIBLE) { const e = ents[r]; if (!e || e.mode === "protect" || e.mode === "block") continue; const dd = hyp(e.x - d.x, e.y - d.y); if (dd < nb) { nb = dd; near = e; } }
      if (near) steer(d, near.x + near.vx * 0.3 - 0.6, near.y + near.vy * 0.3, dt, 0.95); else steer(d, S.los + 6.5, DEF_SPOTS[k][1] * 0.8, dt, 0.8);
    }
  }

  // the throw in the air
  if (ball.flight) {
    const f = ball.flight;
    // a bullet stays low: a defender standing in its lane can get a hand to it (a lob goes over him)
    if (f.bullet && !f.kick && !f.tipped && S.t - f.t0 > 0.12 && S.t - f.t0 < f.T - 0.12) {
      for (const d of Object.values(ents)) {
        if (d.side !== "def" || d.down > 0 || d.heldUntil > S.t || d.mode === "rush") continue;
        // (in between, not on the man: a cover man on the catch point plays it there)
        // (one chance each to get a hand on it: a rope gets by most of the time)
        if (ball.h < 1.0 && S.t - f.t0 < f.T * 0.8 && hyp(d.x - f.to.x, d.y - f.to.y) > 1.8 && hyp(d.x - ball.x, d.y - ball.y) < 0.55 + (K.ballSkills(d.p) - 70) * 0.006 && !(f.tried ||= {})[d.key] && (f.tried[d.key] = true) && rnd(S) < clamp(0.3 + (K.ballSkills(d.p) - 70) * 0.01, 0.12, 0.55)) { f.tipped = true; f.to = { x: ball.x, y: ball.y }; f.T = S.t - f.t0; S.log.push("in the lane"); break; }
      }
    }
    const u = clamp((S.t - f.t0) / f.T, 0, 1);
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
    const lean = S.steer == null && d && dd < 4 && d.x > carrier.x - 0.5 ? (carrier.y > d.y ? 2 : -2) * clamp((K.vision(carrier.p) - 45) / 40, 0.3, 1.3) : 0;
    // a receiver secures the catch before he's at full stride
    const fresh = S.catchAt != null && S.t - S.catchAt < 0.45 ? 0.7 : 1, stagger = S.stagger > S.t ? 0.7 : 1, burst = S.burstUntil > S.t ? 1.12 : 1;
    steer(carrier, carrier.x + 8, clamp(wantY + lean, -HALF + 0.3, HALF - 0.3), dt, 0.94 * fresh * stagger * burst); // (a man with the ball tucked is a step slower than running free)
    if (carrier.x >= 100) { score(S); return true; }
    if (Math.abs(carrier.y) >= HALF - 0.4) { outOfBounds(S); return true; }
    const closing = d ? ((d.vx - carrier.vx) * (carrier.x - d.x) + (d.vy - carrier.vy) * (carrier.y - d.y)) / Math.max(0.1, dd) : 0; // yards/s he's gaining
    const dSpeed = d ? hyp(d.vx, d.vy) : 0;
    if (d && dd < 1.1 + clamp(closing, 0, 4) * 0.1 + (dSpeed > 5 ? 0.45 : 0)) { // a man at full stride can lay out for him
      // the tackle, or a broken one: elusiveness against his tackling, and a man can't be broken twice
      const el = Math.max(K.power(carrier.p), K.afterCatch(carrier.p)), tk = K.tackling(d.p);
      // (a man who just caught it hasn't got his feet under him; a broken tackle still knocks him off stride)
      const pBreak = d.missed ? 0 : clamp((0.085 + (el - tk) * 0.005 + (S.broke ? -0.05 : 0)) * (S.catchAt != null ? CAL.yacCatch : CAL.yac), 0.03, 0.35);
      if (rnd(S) < pBreak) { d.down = 0.7; d.missed = true; S.broke++; const bal = clamp(1 - K.edge(K.balance(carrier.p)) * 0.012, 0.5, 1.4); S.stagger = S.t + 0.45 * bal; carrier.vx *= 1 - 0.45 * bal; carrier.vy *= 1 - 0.45 * bal; S.log.push(`${d.p.name} misses`); }
      else { tackle(S, d); return true; }
    } else if (d && dd < 2.3 && dSpeed > 6 && closing < 0.4 && !d.dove && !d.missed && /* (only when he isn't running him down anyway) */ (d.x - carrier.x) * Math.sign(carrier.vx || 1) < 0.3) { // (from behind or alongside: a man in front just tackles him)
      // a man closing from behind at full speed lays out for him: a shoestring tackle, or he's on the turf
      d.dove = true; const el = Math.max(K.power(carrier.p), K.afterCatch(carrier.p)), tk = K.tackling(d.p);
      if (rnd(S) < clamp(0.42 + (tk - el) * 0.006 - (S.broke ? 0.05 : 0), 0.15, 0.65)) { S.diveTackle = true; tackle(S, d); return true; }
      d.down = 0.8; d.missed = true; S.log.push(`${d.p.name} dives and misses`);
    }
  }
  // a defender with the ball (a pick) heads the other way for a moment
  // an interception return: he runs it back to the engine's spot, weaving, with the offense chasing
  if (carrier && carrier.side === "def" && !over) {
    const goal = S.retTo ?? carrier.x - 6;
    const [o, od] = Object.values(ents).filter((e) => e.side === "off" && e !== carrier).map((e) => [e, hyp(e.x - carrier.x, e.y - carrier.y)]).sort((a, b) => a[1] - b[1])[0] || [];
    const weave = o && od < 4 ? (carrier.y > o.y ? 3 : -3) : 0;
    steer(carrier, Math.max(goal - 3, -9), clamp(carrier.y + weave, -HALF + 1, HALF - 1), dt, 1);
    for (const e of Object.values(ents)) if (e.side === "off" && e.down <= 0) steer(e, ...xy(intercept(e, carrier)), dt, 0.95);
    if (carrier.x <= goal + 0.3) { S.tackler = o || null; const close = o && od < 2.5; if (!close) S.tackler = null; endAt(S, S.ev, carrier.x <= 0.5 || !close ? "fall" : "tackle", 1.2); return true; }
    if (S.t - S.pickAt > 8) { endAt(S, S.ev, "tackle"); return true; }
  }

  // brought down: he slides to a stop (to the engine's spot when it differs by a yard or two)
  if (over && carrier) { brake(carrier, dt); if (S.slideTo != null) { const k = Math.min(1, dt * 3); carrier.x += (S.slideTo - carrier.x) * k; if (S.tackler) S.tackler.x += (carrier.x - 0.6 - S.tackler.x) * k; } }
  if (over && S.t >= S.endAt) { S.phase = "done"; return false; }
  // the quarterback holds it too long
  if (S.phase === "live" && isPass && ball.holder === "QB" && S.t > 7) forcedThrow(S);
  if (carrier && !ball.flight) { ball.x = carrier.x; ball.y = carrier.y; ball.h = 0; }
  return true;
}
const xy = (p) => [p.x, p.y];
// where a blocker meets a defender: a step in front of him, on his line to the ball carrier
function cutOff(S, d) {
  const c = (S.ball.holder && S.ents[S.ball.holder]) || S.ents.RB || S.ents.QB;
  const dx = c.x - d.x, dy = c.y - d.y, n = hyp(dx, dy) || 1;
  return [d.x + (dx / n) * 1.2 + d.vx * 0.15, d.y + (dy / n) * 1.2 + d.vy * 0.15];
}
// a blocker with nobody to block looks for the nearest free defender ahead of him and ties him up
function seekBlock(S, b, dt, range) {
  const { ents } = S;
  const held = b.blocking && ents[b.blocking];
  if (held && held.heldUntil > S.t) { steer(b, held.x - 0.6, held.y, dt, 0.7); return; }
  b.blocking = null;
  const a = b.assign && S.ents[b.assign];
  if (a && canBlock(S, b, a) && a.down <= 0) { const ad = hyp(a.x - b.x, a.y - b.y); const c = (S.ball.holder && S.ents[S.ball.holder]) || S.ents.RB, between = c && hyp(c.x - b.x, c.y - b.y) < hyp(c.x - a.x, c.y - a.y);
    if (ad < 2.2 || (ad < 3.2 && between && S.t > 0.5)) { block(S, b, a); b.assign = null; } else { const [px, py] = cutOff(S, a); steer(b, px, py, dt, 1); } return; }
  let best = null, bd = range;
  for (const d of Object.values(ents)) { if (!canBlock(S, b, d) || d.x < b.x - 1.5) continue; const dd = hyp(d.x - b.x, d.y - b.y); if (dd < bd) { bd = dd; best = d; } }
  if (!best) { brake(b, dt); return; }
  if (bd < 1.8) block(S, b, best); else { const [px, py] = cutOff(S, best); steer(b, px, py, dt, 0.95); } // get in his path to the ball
}

// A juke (a quick flick while running): a burst, and the nearest tackler within reach may lunge
// at nothing, his tackling against the runner's elusiveness. One every so often.
export function juke(S) {
  const c = S.ball.holder && S.ents[S.ball.holder]; if (!c || c.side !== "off" || S.phase !== "carry") return false;
  if (S.jukeAt != null && S.t - S.jukeAt < 0.9) return false;
  S.jukeAt = S.t; S.burstUntil = S.t + 0.35;
  const [d, dd] = nearestDef(S, c.x, c.y);
  if (d && dd < 2.6 && !d.missed) {
    const el = K.elusive(c.p), tk = K.tackling(d.p);
    // a well-timed one works; each one after that on the same run is easier to read
    S.jukes = (S.jukes || 0) + 1;
    if (rnd(S) < clamp((0.3 + (el - tk) * 0.006 - (S.jukes - 1) * 0.08) * (S.catchAt != null ? CAL.yacCatch : CAL.yac), 0.05, 0.5)) { d.down = 0.6; d.missed = true; S.broke++; S.log.push(`${d.p.name} juked`); return true; }
    S.stagger = S.t + 0.3; // he bit on nothing: the cut costs the runner a step
  }
  return false;
}

// A dive: the runner gives himself up for the last yard or two (Retro Bowl's swipe forward).
// Up to ~2 yards, less with a tackler square in front of him; the play ends where he lands.
export function dive(S) {
  const c = S.ball.holder && S.ents[S.ball.holder];
  if (!c || c.side !== "off" || c.key === "QB" && S.phase === "live" || S.phase !== "carry" || S.dived) return false;
  S.dived = true;
  let reach = 1.4 + clamp(hyp(c.vx, c.vy) / c.top, 0, 1) * 0.8; // a man at full speed goes further
  for (const d of Object.values(S.ents)) if (d.side === "def" && d.down <= 0 && d.x > c.x && d.x - c.x < reach + 0.5 && Math.abs(d.y - c.y) < 1.0) reach = Math.max(0.4, d.x - c.x - 0.3); // stopped by the man in front
  c.x = Math.min(101, c.x + reach); c.vx = Math.max(c.vx, 4); c.vy *= 0.3; S.log.push("dives");
  if (c.x >= 100) score(S); else book(S, Math.round(c.x - S.los), "fall", 1.1);
  return true;
}

// ---------- the throw ----------
// Two kinds of throw. A BULLET is fired flat and fast: it beats the coverage to a man underneath
// but can't get over a defender, and it gets wilder the further it goes. A LOB (touch pass) is
// lofted: slower, so the coverage closes, but it drops over the top and is the deep ball. AUTO
// picks a bullet inside BULLET_RANGE yards and a lob beyond it. passPlan is shared with the
// renderer, so the arc you see while aiming is the throw you get.
export const BULLET_RANGE = 18; // AUTO throws a bullet to a spot short of this many yards past the line
export const BULLET_MAX = 28; // ...and never one further than this; a bullet past it sprays
export const PASS_KINDS = ["auto", "bullet", "lob"];
export function passPlan(S, P, kind = "auto") {
  const qb = S.ents.QB, arm = K.qbArm(qb.p), reach = 38 + (arm - 70) * 0.55; // how far he can put it
  let land = { x: clamp(P.x, S.los - 12, 109), y: clamp(P.y, -HALF + 0.3, HALF - 0.3) };
  let dist = hyp(land.x - qb.x, land.y - qb.y);
  const short = dist > reach; // he can't get it there: it dies short of the spot
  if (short) { const k = reach / dist; land = { x: qb.x + (land.x - qb.x) * k, y: qb.y + (land.y - qb.y) * k }; dist = reach; }
  const bullet = kind === "bullet" || (kind === "auto" && land.x - S.los < BULLET_RANGE && dist < BULLET_MAX); // AUTO: a rope underneath, touch over the top
  const vel = bullet ? 27 + (arm - 70) * 0.2 : 22 + (arm - 70) * 0.15 - (dist < 12 ? 3 : 0); // yards a second (a short lob floats)
  const T = clamp(dist / vel, 0.22, 2.0);
  const arc = bullet ? clamp(10.7 * T * T / 8, 0.15, 3) : clamp(dist / 12, 1.4, 4); // a bullet still has to climb over the middle (g*T^2/8, in yards)
  // the wind carries it, a lob (up in it longer) far more than a rope; the aim shows where it'll come down
  const wd = windNow(S.g), carry = (bullet ? 0.05 : 0.22) * T;
  if (wd.mph) land = { x: clamp(land.x + wd.x * carry, S.los - 12, 109), y: clamp(land.y + wd.y * carry, -HALF + 0.3, HALF - 0.3) };
  return { land, dist, bullet, T, arc, short, reach, kind: bullet ? "bullet" : "lob", auto: kind === "auto" };
}
export function throwTo(S, P, why = null, kind = "auto") {
  if (S.phase !== "live" || S.ball.holder !== "QB" || !S.call?.startsWith("pass")) return null; // (on a run he's handing it off: a tap or a flick then isn't a throw)
  const { ents } = S, qb = ents.QB;
  const plan = passPlan(S, P, kind);
  let { land } = plan; const { dist, bullet, T } = plan;
  const aimed = { ...land };
  // his accuracy (and touch, on a lofted ball): the ball drifts from the spot, more on a long throw
  // (a bullet fired a long way is hard to put on a man: past BULLET_MAX it sprays)
  const accu = K.qbAccuracy(qb.p, !bullet), wild = bullet && dist > BULLET_MAX ? 1 + (dist - BULLET_MAX) / 10 : 1;
  const sig = (0.25 + Math.max(0, 95 - accu) * 0.05) * (0.5 + dist / 18) * wild * (bullet ? 1 : 1 + Math.max(0, dist - 22) / 30) * (1 + 0.08 * ((wxField(S.g).rain || 0) + (wxField(S.g).snow || 0))), /* a long lob is the hardest ball to drop in a bucket */ g1 = () => (rnd(S) + rnd(S) + rnd(S) - 1.5) * 1.6;
  land = { x: clamp(land.x + g1() * sig, S.los - 12, 109), y: clamp(land.y + g1() * sig, -HALF + 0.3, HALF - 0.3) };
  let best = null, bestD = 99;
  for (const r of ELIGIBLE) {
    const e = ents[r]; if (!e || e.mode === "block" || e.mode === "back" || (e.delay && S.t < e.delay)) continue;
    const reach = e.top * T * 0.9, a = aheadOf(e, T * 0.6), d = Math.max(0, hyp(a.x - land.x, a.y - land.y) - reach * 0.5);
    if (d < bestD) { bestD = d; best = r; }
  }
  if (bestD > 5) best = null; // nobody can get there: a throwaway, nobody chases it
  const tgt = best ? ents[best] : null;
  if (tgt) { tgt.mode = "adjust"; tgt.tx = aimed.x; tgt.ty = aimed.y; }
  const [rusher, near] = nearestDef(S, qb.x, qb.y);
  const hurried = why || (rusher && near < 1.5 ? "hurried" : null); // a man in his face as he lets it go
  S.ball.holder = null; S.thrownAt = S.t; qb.mode = "watch";
  S.ball.flight = { from: { x: qb.x, y: qb.y }, to: land, t0: S.t, T, arc: plan.arc, target: best, hurried, bullet };
  // a hurried or wild throw sails: the spot drifts
  // (how much it sails depends on his poise in the pocket)
  if (hurried) { const k = (why === "late" ? 3 : 2) * clamp(1 + (80 - K.qbPoise(qb.p)) * 0.025, 0.45, 1.8); S.ball.flight.to = { x: land.x + (rnd(S) - 0.5) * k, y: clamp(land.y + (rnd(S) - 0.5) * k * 2, -HALF + 0.3, HALF - 0.3) }; }
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
  const catchR = tgt ? 1.9 + (K.hands(tgt.p) - 70) * 0.015 : 0, reachR = tgt ? 1.0 + (K.bodyCtrl(tgt.p) - 70) * 0.012 : 0; // a dive reaches further with body control
  ball.flight = null; ball.h = 0;
  if (S.booked) { endAt(S, S.ev, "fall", 0.8); S.log.push("thrown away"); return; }
  S.pick = { ...S.pick, err: +dR.toFixed(1), def: +dD.toFixed(1), defKey: d?.key, defCover: d && tgt ? S.cover[f.target] === d.key : null };
  // a defender chasing from behind (short of the catch along the throw, with the ball going over
  // his head to the man in front of him) can't play it unless he's right on him
  const ux = ball.x - f.from.x, uy = ball.y - f.from.y, un = hyp(ux, uy) || 1;
  const trailing = tgt && d && ((d.x - tgt.x) * ux + (d.y - tgt.y) * uy) / un < -0.6;
  // a deep lob hangs: a cover man in phase (even a step behind) gets to play it
  const deepLob = !f.bullet && hyp(f.to.x - f.from.x, f.to.y - f.from.y) > 18;
  const open = dD > (deepLob ? 2.5 : 1.6) + CAL.open || (trailing && !deepLob && dD > 0.9 + CAL.open);
  let want;
  if (tgt && dR <= catchR + reachR) {
    // on his hands: an open man catches it (the odd drop); a covered one wins it on his hands
    // against the defender's ball skills, or it's knocked away
    const hands = K.hands(tgt.p), traffic = K.contested(tgt.p), ballSk = d ? K.ballSkills(d.p) : 50;
    const dive = dR > catchR ? 1 - (dR - catchR) / Math.max(0.5, reachR) : 1; // one just out of reach: a dive, less likely the further
    const first = tgt && d && dR < dD - 0.4 ? (deepLob ? 0.05 : 0.12) : 0; // he got to it first
    const pCatch = (open ? clamp(0.985 - (85 - hands) * 0.003, 0.9, 0.995) : clamp((deepLob ? 0.44 : 0.7) + first + (traffic - ballSk) * 0.007 + (dD - 0.8) * (deepLob ? 0.1 : 0.22) - (dR > 1.2 ? 0.08 : 0), 0.18, 0.9)) * clamp(dive, 0, 1);
    if (rnd(S) < pCatch * CAL.hands * (f.bullet && hyp(f.to.x - f.from.x, f.to.y - f.from.y) > 24 ? 0.85 : 1) * (1 - 0.035 * (wxField(S.g).rain || 0) - 0.02 * (wxField(S.g).snow || 0))) { // (a wet ball is a slippery one) // (a long rope is a hard ball to hang on to)
      ball.x = tgt.x; ball.y = tgt.y; ball.holder = f.target; tgt.mode = "carry"; S.catchAt = S.t; S.phase = "carry";
      if (d && dD < 2.5) { d.down = Math.max(d.down, clamp(0.4 - (dD < 0.8 ? 0.2 : 0) - K.edge(K.tackling(d.p)) * 0.005, 0.15, 0.6)); d.vx *= 0.3; d.vy *= 0.3; } // he played the ball, not the man
      S.pick.open = open; S.log.push(`caught ${open ? "open" : "contested"}`);
      return;
    }
    if (open) { S.log.push("dropped"); S.pick.drop = true; }
  }
  if (d && dD < 1.4 && (!tgt || dD < dR || !open)) {
    // the defender got there first: a pick if he makes the play on it (his ball skills) and the
    // engine agrees, a pass broken up if not
    const ballSk = K.ballSkills(d.p);
    // a lofted ball hangs for him; one he beat the receiver to is his to lose
    const pInt = clamp(0.03 + (ballSk - 70) * 0.006 + (f.bullet ? 0 : 0.07) + (deepLob ? 0.07 : 0) + (f.tipped ? 0.08 : 0) + (dD < dR ? 0.07 : 0) - (dD > 1 ? 0.04 : 0), 0.02, 0.55);
    want = { types: rnd(S) < pInt ? ["int"] : ["inc"], fallback: ["inc"] }; S.pick.open = false;
    const r = resolvePlay(S.g, S.call, want, { target: S.pick.target, open: false }, want.types[0] === "int" ? 60 : 10); // a pick is rare in the engine: give it the rolls to find one
    S.ev = r.ev; S.mismatch = r.ev && !["int", "inc", "penalty"].includes(r.ev.type);
    if (r.ev?.type === "int") {
      ball.x = d.x; ball.y = d.y; ball.holder = d.key; d.mode = "carry"; S.pickAt = S.t; S.phase = "carry"; S.log.push("picked");
      for (const e of Object.values(ents)) if (e.side === "off") e.mode = "pursue"; // routes are over: everyone chases
      // where the engine put the ball: the new offense's yard line, seen from ours
      S.retTo = S.g.poss === "a" ? clamp(100 - S.g.yard, -5, d.x) : d.x - 5;
      return;
    }
    endAt(S, r.ev, "fall", 0.8); S.log.push("broken up"); return;
  }
  // it falls incomplete (the engine's call stays "inc"; a flag is accepted)
  S.pick.open = tgt ? open : false;
  const r = resolvePlay(S.g, S.call, { types: ["inc"] }, { target: S.pick.target, open: false }, 16);
  S.ev = r.ev; S.mismatch = r.ev && !["inc", "penalty"].includes(r.ev.type); endAt(S, r.ev, "fall", 0.8); S.log.push("incomplete");
}

// ---------- runs, tackles, the end of the play ----------
function handoff(S) { S.handAt = S.t; const rb = S.ents.RB; rb.acc *= clamp(1 + K.edge(K.burst(rb.p)) * 0.008, 0.8, 1.25); S.ball.holder = "RB"; rb.mode = "carry"; S.ents.QB.mode = "watch"; S.phase = "carry"; S.steer = S.steer ?? null; }
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
  const r = resolvePlay(S.g, S.call, { types, yards, tol, fallback: isPass && S.catchAt == null ? ["inc"] : [] }, isPass ? { target: S.pick?.target, open: !!S.pick?.open } : { carrier: S.ents.RB?.p?.id }, isPass && S.catchAt != null ? 40 : 12); // (a ball that was caught gets the rolls it needs to be booked a catch)
  S.ev = r.ev; S.exact = r.exact; S.mismatch = r.ev && !types.includes(r.ev.type) && r.ev.type !== "penalty";
  // the field follows the engine's number when it differs (a yard or two): the spot moves with it
  if (r.ev && (r.ev.type === "pass" || r.ev.type === "run" || r.ev.type === "td") && r.ev.yards !== yards && Math.abs(r.ev.yards - yards) <= 3) S.slideTo = S.los + r.ev.yards;
  endAt(S, r.ev, how, hold);
}
function endAt(S, ev, how, hold = 1.0) { S.result = ev; S.text = ev?.text || ""; S.phase = how; S.endAt = S.t + hold; const c = S.ball.holder && S.ents[S.ball.holder]; if (c) { c.vx *= 0.25; c.vy *= 0.25; } }
