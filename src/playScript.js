// The live field acting out one play: where each of the 22 men goes, and the ball, from the snap to
// the whistle. It's built from what the engine already decided (who threw it, who caught it, who
// made the tackle, how many yards), so the play is settled before the snap and this only shows it.
// Positions are in yards: x from the offense's own goal line (it drives toward 100), y from the
// middle of the field (+ toward the near sideline). Times are in seconds from the snap.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, u) => a + (b - a) * u;
const ease = (u) => u * u * (3 - 2 * u);
// the same play always plays out the same way (a re-render mid-play mustn't change it)
function rng(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// a route through keyframes [t, x, y], straight lines between them
const path = (...k) => (t) => {
  if (t <= k[0][0]) return [k[0][1], k[0][2]];
  for (let i = 1; i < k.length; i++) {
    if (t <= k[i][0]) { const [a, ax, ay] = k[i - 1], [b, bx, by] = k[i]; const u = b > a ? (t - a) / (b - a) : 1; return [lerp(ax, bx, u), lerp(ay, by, u)]; }
  }
  const l = k[k.length - 1];
  return [l[1], l[2]];
};
// from t0 on, leave f and head for a spot, getting there at t1
const toward = (f, t0, [x, y], t1) => (t) => {
  if (t <= t0) return f(t);
  const [ax, ay] = f(t0), u = ease(clamp((t - t0) / Math.max(0.05, t1 - t0), 0, 1));
  return [lerp(ax, x, u), lerp(ay, y, u)];
};
// the field's playable area, so nobody runs off the edge of the picture
const LAT = 22.8;
const onField = ([x, y]) => [clamp(x, -2.5, 106), clamp(y, -LAT, LAT)];

// The two lines lock up the way they do on a field goal: each defensive lineman takes the blocker
// straight across from him (never two on one man) and squares up to him chest to chest, a couple of
// yards apart, so the line is one row of pairs. mate: lineman's key -> his blocker.
function pairLine(ol, dl) {
  const mate = {}, used = new Set(), d = (a, b) => Math.abs(a.y - b.y);
  const gap = (s) => Math.min(...ol.map((o) => d(o, s)));
  for (const s of [...dl].sort((a, b) => gap(a) - gap(b))) {
    const free = ol.filter((o) => !used.has(o)), o = (free.length ? free : ol).reduce((b, o) => (!b || d(o, s) < d(b, s) ? o : b), null);
    if (o) { used.add(o); mate[s.key] = o; }
  }
  return mate;
}
const lockOn = (s, of) => (t) => { const [ox, oy] = of(t); const u = ease(clamp(t / 0.32, 0, 1)); return [lerp(s.x, ox + 2.4, u), lerp(s.y, lerp(oy, s.y, 0.12), u)]; };

export const SPEED = 9; // yards a second a pursuer covers

// ev: the engine's play (with k, qb, tgt, cm, rusher, db, tkl, yac, deep, quick, screen, keeper,
// scramble, edge). slots: the 22 men as drawn at the snap, [{ key, side: "off"|"def", pos, id, x, y }].
// Returns { T, f: { key: t -> [x, y] }, ball: t -> { x, y, h, held }, down: { key: t }, hop: { key, at },
// stars: [keys to name on the field] }.
export function buildPlay(ev, slots, seed = 1) {
  const R = rng(seed);
  if (ev.k === "fg" || ev.k === "punt") return buildSpecial(ev, slots, R);
  if (ev.k === "ko") return buildKickoff(ev, slots, R);
  const los = ev.yard, k = ev.k, room = 100 - los;
  const fumble = ev.type === "fumble", td = !!ev.td;
  const Y = td ? room : ev.yards || 0;
  const off = slots.filter((s) => s.side === "off"), def = slots.filter((s) => s.side === "def");
  const byId = (list, p) => (p ? list.find((s) => s.id != null && s.id === p.id) : null);
  const near = (list, x, y, not = []) => list.filter((s) => !not.includes(s)).reduce((b, s) => (!b || Math.hypot(s.x - x, s.y - y) < Math.hypot(b.x - x, b.y - y) ? s : b), null);
  const is = (s, ...ps) => ps.includes(s.pos);
  const sideOf = (y) => (y < 0 ? -1 : 1);
  const F = {}, down = {}, stars = [];
  const qbS = off.find((s) => s.pos === "QB") || off[0];
  const qx = qbS.x, qy = qbS.y;
  const recvs = off.filter((s) => is(s, "WR", "TE"));
  const passPlay = k === "pass" || k === "inc" || k === "int" || k === "sack";

  // The line: pass protection steps back and holds; on a run it fires off the ball.
  // The lines meet: the offensive line sets (pass) or fires out (run) and the defensive line comes
  // into it, the two close enough to be locked together (about 4 yards between them, hands on chests).
  // Only a rusher who gets loose (the sack, the tackle behind the line) leaves the pile.
  // On a pass the pocket gives ground as the rush pushes into it; on a run the line drives forward.
  for (const s of off) if (is(s, "LT", "LG", "C", "RG", "RT")) F[s.key] = passPlay ? path([0, s.x, s.y], [0.3, s.x - 0.4, s.y], [3, s.x - 1.2, s.y]) : path([0, s.x, s.y], [0.4, s.x + 1.1, s.y], [3, s.x + 2.1, s.y]);
  // A defensive lineman takes on the blocker in front of him and stays on him, chest to chest (as
  // in the All-22: the two lines meet in one tangle at the line, not two rows with a gap).
  const olSlots = off.filter((o) => is(o, "LT", "LG", "C", "RG", "RT"));
  const mate = pairLine(olSlots, def.filter((s) => is(s, "DL")));
  const engage = (s) => (mate[s.key] ? lockOn(s, F[mate[s.key].key]) : path([0, s.x, s.y]));
  // Receivers not getting the ball run their routes and settle.
  const route = (s) => { const dx = 8 + R() * 9, dy = (R() - 0.5) * 8; return path([0, s.x, s.y], [1.1, s.x + dx * 0.75, s.y + dy * 0.3], [2.2, s.x + dx + 3, s.y + dy], [3.2, s.x + dx + 4, s.y + dy]); };
  const block = (s) => path([0, s.x, s.y], [1, s.x + 3 + R() * 2, s.y + (R() - 0.5) * 2], [3, s.x + 4 + R() * 2, s.y + (R() - 0.5) * 3]);

  let carrier = null, tE = 0, tEnd = 0, end = null, T = 2, tackler = null, ballF = null, catchAt = null;
  let tH = 0.45, holeY = 0;
  // when each thing happens, for the poses (LivePlay.jsx picks a frame from these)
  const m = { k, td, qb: qbS.key, tS: null, tThrow: null, tC: null, tgt: null, handoff: null, swat: null, recov: null, recovT: null };

  if (passPlay) {
    for (const s of recvs) F[s.key] = route(s);
    const rb = off.find((s) => s.pos === "RB");
    if (rb) F[rb.key] = path([0, rb.x, rb.y], [0.5, rb.x + 1, rb.y - sideOf(rb.y) * 2], [3, rb.x + 1.2, rb.y - sideOf(rb.y) * 2]);
  }

  if (k === "spike") {
    // the hurry-up snap and straight into the ground: the line barely gets out of its stance
    for (const s of off) if (is(s, "LT", "LG", "C", "RG", "RT")) F[s.key] = path([0, s.x, s.y], [0.3, s.x - 0.3, s.y]);
    for (const s of off) if (!F[s.key] && s !== qbS) F[s.key] = path([0, s.x, s.y], [0.5, s.x + 1.2, s.y]);
    for (const s of def) F[s.key] = is(s, "DL") ? engage(s) : path([0, s.x, s.y], [0.8, s.x - 0.8, s.y]);
    F[qbS.key] = path([0, qx, qy], [0.3, qx - 0.4, qy]);
    const tS = 0.5, gx = qx + 1.2;
    m.tThrow = tS;
    ballF = (t) => {
      if (t < 0.25) return { x: lerp(los, qx, t / 0.25), y: lerp(0, qy, t / 0.25), h: 0.6 };
      if (t < tS) return { held: qbS.key };
      const u = clamp((t - tS) / 0.9, 0, 1);
      return { x: lerp(qx - 0.2, gx + 2.5, u), y: qy, h: u < 0.15 ? 1.4 * (1 - u / 0.15) : Math.abs(Math.sin((u - 0.15) * Math.PI * 2.2)) * 1.1 * (1 - u) };
    };
    tE = 1; tEnd = 1; T = 2;
  } else if (k === "kneel") {
    // Victory formation: the snap, he drops to a knee where he took it, and nobody really plays
    // (the lines lean on each other; everyone else watches)
    for (const s of off) if (is(s, "LT", "LG", "C", "RG", "RT")) F[s.key] = path([0, s.x, s.y], [0.3, s.x - 0.3, s.y]);
    for (const s of off) if (!F[s.key] && s !== qbS) F[s.key] = path([0, s.x, s.y], [0.6, s.x + 0.6, s.y]);
    for (const s of def) F[s.key] = is(s, "DL") ? engage(s) : path([0, s.x, s.y], [0.8, s.x - 1, s.y]);
    F[qbS.key] = path([0, qx, qy], [0.3, qx - 0.6, qy]);
    ballF = (t) => (t < 0.25 ? { x: lerp(los, qx, t / 0.25), y: lerp(0, qy, t / 0.25), h: 0.6 } : { held: qbS.key });
    tE = 0.9; tEnd = 0.9; T = 2.1;
  } else if (k === "sack") {
    const tS = 1.35 + R() * 0.45, sx = los + Y, sy = qy + (R() - 0.5) * 3;
    F[qbS.key] = path([0, qx, qy], [0.5, qx - 1.5, qy], [tS - 0.3, lerp(qx - 1.5, sx, 0.5), lerp(qy, sy, 0.6)], [tS, sx, sy]);
    const rs = byId(def, ev.rusher) || near(def.filter((s) => is(s, "DL", "LB")), qx, qy);
    const wide = rs.y + sideOf(rs.y) * 3;
    F[rs.key] = path([0, rs.x, rs.y], [0.45, los + 2, wide], [tS - 0.35, sx + 2.2, lerp(wide, sy, 0.6)], [tS, sx + 0.8, sy + 0.3], [tS + 0.4, sx - 0.2, sy + 0.4]);
    carrier = qbS; tackler = rs; tE = tS; tEnd = tS; end = [sx, sy]; m.tS = tS;
    stars.push(rs.key, qbS.key);
    ballF = (t) => (t < 0.25 ? { x: lerp(los, qx, t / 0.25), y: lerp(0, qy, t / 0.25), h: 0.6 } : { held: qbS.key });
    T = tS + 0.95;
    // everyone else on defense: the line locks up with the blockers (only the sacker gets loose),
    // the linebackers drop and the secondary runs with the receivers
    for (const s of def) {
      if (F[s.key]) continue;
      if (is(s, "DL")) F[s.key] = engage(s);
      else if (is(s, "LB")) F[s.key] = path([0, s.x, s.y], [0.9, s.x + 3, s.y * 0.85], [3, s.x + 3.5, s.y * 0.85]);
      else { const man = near(recvs, s.x - 6, s.y), mf = man && F[man.key]; F[s.key] = mf ? (t) => { const [mx, my] = mf(Math.max(0, t - 0.3)); const u = clamp(t / 0.5, 0, 1); return [lerp(s.x, mx + (is(s, "S") ? 4 : 1.8), u), lerp(s.y, my * 0.9 + s.y * 0.1, u)]; } : path([0, s.x, s.y]); }
    }
  } else if (passPlay) {
    // where the throw is caught: the air yards, then what he did after the catch
    const tgt = byId(off, ev.tgt) || (ev.screen ? off.find((s) => s.pos === "RB") : null) || near(recvs, los + 8, (R() - 0.5) * 30) || off[0];
    const air = k === "pass"
      ? (ev.screen ? -1 - R() : ev.yac ? Math.max(1, Y - ev.yac - Math.round(R() * 3)) : Y <= 3 ? Y : ev.deep ? Math.max(14, Y - 2 - R() * 5) : clamp(Math.round(Y * (0.55 + R() * 0.3)), 1, Y))
      : ev.deep ? 20 + R() * 16 : ev.quick ? 4 + R() * 4 : 7 + R() * 9;
    const cx = Math.min(los + air, 108), cy = ev.screen ? clamp(tgt.y * 0.6 + sideOf(tgt.y) * 6, -LAT, LAT) : clamp(tgt.y * 0.7 + (R() - 0.5) * 7, -LAT + 1, LAT - 1);
    const tThrow = ev.screen ? 0.55 : ev.quick ? 0.85 : ev.deep ? 1.5 : 1.15 + R() * 0.15;
    const throwX = qx - 1.5, flight = 0.22 + Math.hypot(cx - throwX, cy - qy) * 0.021, tC = tThrow + flight;
    m.tThrow = tThrow; m.tC = tC; m.tgt = tgt.key;
    F[qbS.key] = path([0, qx, qy], [0.5, throwX, qy], [tThrow + 0.3, throwX + 0.5, qy], [3, throwX + 0.5, qy]);
    // the target's route ends at the ball
    F[tgt.key] = path([0, tgt.x, tgt.y], [Math.max(0.3, tC * 0.6), lerp(tgt.x, cx, 0.7), lerp(tgt.y, cy, 0.25)], [tC, cx, cy]);
    catchAt = tC;
    stars.push(qbS.key, tgt.key);
    const thrown = (t) => { const u = clamp((t - tThrow) / flight, 0, 1); return { x: lerp(throwX + 0.5, cx, u), y: lerp(qy, cy, u), h: 1.2 + Math.sin(Math.PI * u) * (1 + Math.abs(air) * 0.14) }; };
    ballF = (t) => (t < 0.25 ? { x: lerp(los, qx, t / 0.25), y: lerp(0, qy, t / 0.25), h: 0.6 } : t < tThrow ? { held: qbS.key } : thrown(t));
    // whoever's covering him
    const cover = byId(def, ev.cm) || near(def.filter((s) => is(s, "CB", "S")), tgt.x + 6, tgt.y);
    if (k === "inc") {
      const db = byId(def, ev.db) || cover; m.swat = ev.db ? db.key : null;
      F[db.key] = path([0, db.x, db.y], [Math.max(0.4, tC * 0.6), lerp(db.x, cx + 2, 0.7), lerp(db.y, cy, 0.5)], [tC, cx + 0.8, cy + 0.5], [tC + 0.5, cx + 1.2, cy + 0.8]);
      F[tgt.key] = ((f) => (t) => (t <= tC ? f(t) : [cx + Math.min(t - tC, 0.5) * 2, cy]))(F[tgt.key]);
      // the ball gets there and falls to the turf
      const thrownInc = ballF;
      ballF = (t) => (t <= tC ? thrownInc(t) : { x: cx + Math.min(t - tC, 0.6) * 5, y: cy + Math.min(t - tC, 0.6) * 1.5, h: Math.max(0, 1.2 * (1 - (t - tC) / 0.35)) + (t - tC > 0.35 && t - tC < 0.6 ? Math.sin(((t - tC - 0.35) / 0.25) * Math.PI) * 0.4 : 0) });
      if (ev.db) stars.push(db.key);
      tE = tC; tEnd = tC; T = tC + 1;
    } else if (k === "int") {
      const db = byId(def, ev.db) || cover;
      const ret = 3 + R() * 14, ex = cx - ret, ey = clamp(cy + (R() - 0.5) * 10, -LAT, LAT), dur = clamp(ret / 7.5, 0.4, 2);
      F[db.key] = path([0, db.x, db.y], [Math.max(0.4, tC - 0.45), lerp(db.x, cx + 1, 0.8), lerp(db.y, cy, 0.6)], [tC, cx - 0.6, cy + 0.2], [tC + dur, ex, ey]);
      F[tgt.key] = ((f) => (t) => (t <= tC ? f(t) : f(tC)))(F[tgt.key]);
      carrier = db; tE = tC; tEnd = tC + dur; end = [ex, ey];
      tackler = near(off.filter((s) => s !== qbS && !is(s, "LT", "LG", "C", "RG", "RT")), ex, ey) || tgt;
      stars.push(db.key);
      const thrownInt = ballF;
      ballF = (t) => (t < tC ? thrownInt(t) : { held: db.key });
      T = tEnd + 0.9;
    } else {
      // caught: then a run after the catch, with a cut or two on a long one
      const ex = los + Y + (td ? 2 + R() * 4 : 0), ey = clamp(cy + (R() - 0.5) * (Y - air > 12 ? 16 : 6), -LAT, LAT);
      const run = Math.abs(ex - cx), dur = clamp(run / (7 + run * 0.09), 0.25, 3.4);
      const mid = [lerp(cx, ex, 0.5), clamp(lerp(cy, ey, 0.5) + (R() - 0.5) * (run > 12 ? 9 : 2), -LAT, LAT)];
      const toCatch = F[tgt.key];
      F[tgt.key] = (t) => (t <= tC ? toCatch(t) : path([tC, cx, cy], [tC + dur * 0.5, mid[0], mid[1]], [tC + dur, ex, ey])(t));
      carrier = tgt; tE = tC; tEnd = tC + dur; end = [ex, ey];
      const thrownC = ballF;
      ballF = (t) => (t < tC ? thrownC(t) : { held: tgt.key });
      T = tEnd + (td ? 1.2 : 0.85);
    }
    // the secondary shadows the receivers until the ball's out; linebackers drop
    for (const s of def) {
      if (F[s.key]) continue;
      if (is(s, "CB", "S")) {
        const man = s === cover ? tgt : near(recvs, s.x - 6, s.y) || tgt, mf = F[man.key], lag = s === cover ? 0.15 : 0.35, deep = is(s, "S") ? 4 : 1.8;
        F[s.key] = (t) => { const [mx, my] = mf(Math.max(0, t - lag)); const u = clamp(t / 0.5, 0, 1); return [lerp(s.x, mx + deep, u), lerp(s.y, my * 0.9 + s.y * 0.1, u)]; };
      } else if (is(s, "LB")) F[s.key] = path([0, s.x, s.y], [0.9, s.x + 3, s.y * 0.85], [3, s.x + 3.5, s.y * 0.85]);
      else F[s.key] = engage(s);
    }
  } else {
    // A run: the handoff (or the quarterback keeps it), through the hole, then out into the open.
    const rb = off.find((s) => s.pos === "RB");
    const qbRun = ev.keeper || ev.scramble || !rb;
    carrier = qbRun ? qbS : byId(off, ev.player) || rb;
    if (!qbRun) m.handoff = 0;
    const sgn = R() < 0.5 ? -1 : 1;
    holeY = ev.edge ? sgn * (10 + R() * 6) : (R() - 0.5) * 7;
    const ex = los + Y + (td ? 2 + R() * 4 : 0);
    const ey = clamp(holeY + (R() - 0.5) * (Y > 10 ? 16 : 5), -LAT, LAT);
    const hole = Y <= 0 ? [ex, ey] : [los + 0.6 + Math.min(Y, 2), holeY];
    if (ev.scramble) {
      tH = 1.3;
      const out = [los - 3.5, clamp(qy + sgn * 7, -LAT, LAT)];
      const run = Math.abs(ex - out[0]), dur = clamp(run / (6.5 + run * 0.09), 0.25, 3.4);
      F[qbS.key] = path([0, qx, qy], [0.5, qx - 1.5, qy], [1, qx - 1.5, qy + sgn * 0.6], [tH, out[0], out[1]], [tH + dur, ex, ey]);
      tE = 1; tEnd = tH + dur; holeY = out[1];
    } else {
      const mesh = [los - 5, qbRun ? qy + sgn * 1.5 : qy + sideOf(carrier.y) * 1];
      const tHole = tH + 0.35 + (ev.edge ? 0.3 : 0);
      const run = Math.max(0, ex - hole[0]), dur = Y <= 0 ? 0 : clamp(run / (6.5 + run * 0.09), 0.15, 3.4);
      const mid = [lerp(hole[0], ex, 0.5), clamp(lerp(hole[1], ey, 0.5) + (R() - 0.5) * (run > 10 ? 10 : 2), -LAT, LAT)];
      F[carrier.key] = path([0, carrier.x, carrier.y], [tH, mesh[0], mesh[1]], [tHole, hole[0], hole[1]], ...(dur ? [[tHole + dur * 0.5, mid[0], mid[1]], [tHole + dur, ex, ey]] : []));
      if (!qbRun) F[qbS.key] = path([0, qx, qy], [tH, los - 5.5, qy - sideOf(carrier.y) * 0.5], [tH + 0.6, los - 6.5, qy - sideOf(carrier.y) * 2.5], [3, los - 7, qy - sideOf(carrier.y) * 3]);
      tE = tH + 0.15; tEnd = tHole + dur;
    }
    end = [ex, ey];
    stars.push(carrier.key);
    for (const s of recvs) if (!F[s.key]) F[s.key] = is(s, "TE") ? path([0, s.x, s.y], [0.45, s.x + 1.6, s.y], [3, s.x + 2.4, s.y]) : block(s);
    if (rb && !F[rb.key]) F[rb.key] = path([0, rb.x, rb.y], [0.6, los - 3, holeY * 0.5], [3, los - 1, holeY * 0.6]);
    const c = carrier;
    ballF = (t) => (t < 0.25 ? { x: lerp(los, qx, t / 0.25), y: lerp(0, qy, t / 0.25), h: 0.6 } : c === qbS || t >= tH ? { held: c.key } : { held: qbS.key });
    // the front attacks the hole; the back seven come up
    for (const s of def) {
      if (F[s.key]) continue;
      if (is(s, "DL")) F[s.key] = engage(s);
      else if (is(s, "LB")) F[s.key] = path([0, s.x, s.y], [tH + 0.35, los + 3.2, lerp(s.y, holeY, 0.55)]);
      else F[s.key] = path([0, s.x, s.y], [1, s.x - (is(s, "S") ? 3 : 1), s.y * 0.92]);
    }
    T = tEnd + (td ? 1.2 : 0.85);
  }

  // Everyone else who hasn't moved yet holds his ground.
  for (const s of slots) if (!F[s.key]) F[s.key] = path([0, s.x, s.y]);

  // After the catch or the handoff the defense runs him down: the tackler gets there as the play
  // ends; the rest close in at full speed and pull up around the pile. A touchdown outruns them.
  if (carrier && end && k !== "sack") {
    const chasers = carrier.side === "off" ? def : off.filter((s) => !is(s, "LT", "LG", "C", "RG", "RT") && s !== qbS);
    if (!tackler) tackler = byId(def, ev.tkl) || near(def, end[0] + 3, end[1]);
    if (!chasers.includes(tackler)) tackler = null;
    // the man who makes the tackle has to be able to get there: on a long gain it's whoever's
    // closest to where it ends when the chase starts (a safety, usually), not a lineman 40 yards away
    const reach = (s) => Math.hypot(F[s.key](tE)[0] - end[0], F[s.key](tE)[1] - end[1]) / SPEED;
    if (!tackler || reach(tackler) > (tEnd - tE) * 1.3 + 0.3) tackler = chasers.filter((s) => s !== carrier).reduce((b, s) => (!b || reach(s) < reach(b) ? s : b), null);
    const dir = carrier.side === "off" ? 1 : -1;
    // the linemen stay locked in the pile unless the play breaks well past the line
    const pile = Math.abs(end[0] - los) < 10;
    for (const s of chasers) {
      if (s === carrier || (pile && s !== tackler && is(s, "DL"))) continue;
      const from = F[s.key](tE), lag = s === tackler ? (td ? 0.45 : 0) : 0.2 + R() * 1.1;
      const spot = s === tackler ? [end[0] + dir * (td ? 2.5 : 0.8), end[1] + (R() - 0.5) * 0.8] : [end[0] + dir * (1.5 + R() * 3), end[1] + (R() - 0.5) * 6];
      const t1 = s === tackler ? tEnd + lag : Math.max(tEnd + lag, tE + Math.hypot(spot[0] - from[0], spot[1] - from[1]) / SPEED);
      F[s.key] = toward(F[s.key], tE, spot, t1);
    }
    if (tackler) stars.push(tackler.key);
  }
  if (!td && carrier && k !== "inc") down[carrier.key] = tEnd;
  if (!td && tackler && k !== "inc") down[tackler.key] = tEnd + 0.08;

  // A fumble: the ball squirts loose at the hit and the defense falls on it.
  if (fumble && carrier && end) {
    const held = ballF, loose = [end[0] + (carrier.side === "off" ? 1.8 : -1.8), clamp(end[1] + (R() - 0.5) * 4, -LAT, LAT)];
    const rec = near(def.filter((s) => s !== tackler), loose[0], loose[1]) || tackler;
    if (rec) { m.recov = rec.key; m.recovT = tEnd + 0.55; }
    if (rec) { const from = F[rec.key]; F[rec.key] = toward(from, tEnd, loose, tEnd + 0.55); down[rec.key] = tEnd + 0.55; }
    ballF = (t) => { if (t < tEnd) return held(t); const u = clamp((t - tEnd) / 0.5, 0, 1); return { x: lerp(end[0], loose[0], u), y: lerp(end[1], loose[1], u), h: Math.abs(Math.sin(u * Math.PI * 2)) * 0.9 * (1 - u) }; };
    T = Math.max(T, tEnd + 1.2);
  }

  // freeze the picture a beat after the whistle, and keep everyone on the field
  const freeze = tEnd + (td ? 1.5 : 0.45);
  const f = {};
  for (const s of slots) { const g = F[s.key]; f[s.key] = (t) => onField(g(Math.min(t, freeze))); }
  const ball = (t) => { const b = ballF(Math.min(t, freeze + 0.6)); return b.held ? b : { ...b, ...((([x, y]) => ({ x, y }))(onField([b.x, b.y]))) }; };
  // who each key man really is (the engine's choice: a back spelling the starter, a blitzing
  // linebacker), so the names over their heads match the play-by-play
  const who = {};
  const name = (s, p) => { if (s && p) who[s.key] = p; };
  name(qbS, ev.qb);
  name(carrier, k === "int" ? ev.db : k === "sack" ? ev.qb : ev.player);
  if (k === "inc" || k === "int") name(byId(off, ev.tgt) || null, ev.tgt);
  if (k === "sack") name(tackler, ev.rusher);
  else if (tackler && ev.tkl && byId(slots, ev.tkl) === tackler) name(tackler, ev.tkl);
  if (m.handoff === 0) m.handoff = tH;
  Object.assign(m, { carrier: carrier?.key ?? null, tackler: tackler?.key ?? null, tE, tEnd, fumble });
  return { T, f, ball, down, who, m, hop: td && carrier ? { key: carrier.key, at: tEnd } : null, stars: [...new Set(stars)], catchAt, tEnd };
}

// A field goal or a punt acted out (the same shape as buildPlay's result). The field puts the
// special teams units out (LiveField.jsx SPECIAL): snapper, holder and kicker, or the punter fifteen
// back with his gunners split wide and the returner waiting deep.
function buildSpecial(ev, slots, R) {
  const los = ev.yard, off = slots.filter((s) => s.side === "off"), def = slots.filter((s) => s.side === "def");
  const by = (list, pos, i = 0) => list.filter((s) => s.pos === pos)[i] || null;
  const near = (list, x, y) => list.reduce((b, s) => (!b || Math.hypot(s.x - x, s.y - y) < Math.hypot(b.x - x, b.y - y) ? s : b), null);
  const F = {}, down = {}, who = {}, stars = [];
  const snapper = by(off, "C");
  const olSlots = off.filter((s) => ["LT", "LG", "C", "RG", "RT"].includes(s.pos));
  // the lines meet for the kick, then (on a punt) everyone leaves to cover or to set up the return
  for (const s of olSlots) F[s.key] = path([0, s.x, s.y], [0.3, s.x - 0.4, s.y], [3, s.x - 0.8, s.y]);
  const mate = pairLine(olSlots, def.filter((s) => s.pos === "DL"));
  for (const s of def) if (mate[s.key]) F[s.key] = lockOn(s, F[mate[s.key].key]);
  let T, ball, m, hop = null, tEnd = 0;
  if (ev.k === "fg") {
    const holder = by(off, "P") || by(off, "QB"), kicker = by(off, "K") || holder;
    const hx = holder.x, hy = holder.y, tKick = 1.05;
    F[kicker.key] = path([0, kicker.x, kicker.y], [0.4, kicker.x, kicker.y], [0.95, hx - 2, hy - 2.6], [1.3, hx - 1.2, hy - 2.1], [3, hx - 1.1, hy - 2.1]);
    // (he plants beside the hold and kicks from there, never on top of the holder)
    const ty = ev.made ? (R() - 0.5) * 1.6 : (R() < 0.5 ? -1 : 1) * (3.8 + R() * 2.5);
    const flight = 0.9 + ev.dist * 0.012;
    ball = (t) => (t < 0.3 ? { held: snapper.key } : t < tKick ? { held: holder.key } : (() => { const u = clamp((t - tKick) / flight, 0, 1); return { x: lerp(hx + 0.4, 110, u), y: lerp(hy, ty, u), h: 1 + Math.sin(Math.PI * Math.min(1, u * 0.85)) * 7 }; })());
    T = tKick + flight + 0.7; tEnd = tKick + flight;
    who[kicker.key] = ev.player; who[holder.key] = ev.holder; stars.push(kicker.key);
    m = { k: "fg", special: { k: "fg", holder: holder.key, kicker: kicker.key, snapper: snapper?.key, tKick, release: 99 } };
  } else {
    const punter = by(off, "P") || by(off, "QB"), ret = by(def, "S") || def[def.length - 1];
    const px = punter.x, py = punter.y, tKick = 0.95;
    F[punter.key] = path([0, px, py], [0.5, px, py], [0.95, px + 1.2, py], [3, px + 1.4, py]);
    const ly = (R() - 0.5) * 14, sx = ev.tb ? 104 : Math.min(ev.spot ?? los + ev.gross, 108);
    const flight = 1.4 + (ev.gross || 45) * 0.02, tLand = tKick + flight;
    const catches = ev.returned || (!ev.tb && (ev.spot ?? 0) < 88);
    who[punter.key] = ev.punter; who[ret.key] = ev.pr; stars.push(ret.key);
    // the returner gets under it (or lets it go: into the end zone, or rolling dead deep)
    const rx = catches ? sx : Math.min(sx - 6, 98), ry = catches ? ly : ly + 4;
    let carrierF = path([0, ret.x, ret.y], [Math.max(0.6, tLand - 0.15), rx, ry]);
    const flightPos = (t) => { const u = clamp((t - tKick) / flight, 0, 1); return { x: lerp(px + 1, sx, u), y: lerp(py, ly, u), h: 1 + Math.sin(Math.PI * u) * 9 }; };
    let carrier = null, tackler = null, endP = null;
    const cover = off.filter((s) => s !== punter && s !== snapper);
    const gunners = off.filter((s) => s.pos === "WR");
    if (ev.returned && !ev.muff) {
      const rr = ev.retTD ? sx + 4 : ev.ret || 0, ex = ev.retTD ? -4 : sx - rr, ey = clamp(ly + (R() - 0.5) * 14, -LAT, LAT);
      const run = Math.abs(sx - ex), dur = clamp(run / (7 + run * 0.09), 0.4, 3.6);
      const mid = [lerp(sx, ex, 0.5), clamp(lerp(ly, ey, 0.5) + (R() - 0.5) * 10, -LAT, LAT)];
      const toCatch = carrierF;
      carrierF = (t) => (t <= tLand ? toCatch(t) : path([tLand, sx, ly], [tLand + dur * 0.5, mid[0], mid[1]], [tLand + dur, ex, ey])(t));
      carrier = ret; tEnd = tLand + dur; endP = [ex, ey];
      if (ev.retTD) hop = { key: ret.key, at: tEnd };
    }
    F[ret.key] = carrierF;
    // coverage: the gunners sprint at the catch from the snap; everyone else releases after the kick
    for (const s of cover) {
      const gun = gunners.includes(s), t0 = gun ? 0.2 : tKick, dist = 3 + R() * (gun ? 2 : 12);
      const spot = [sx - dist, clamp(ly + (R() - 0.5) * (gun ? 8 : 26), -LAT, LAT)];
      const arrive = Math.max(tLand + (gun ? 0.15 : 0.5 + R() * 0.6), t0 + Math.hypot(spot[0] - s.x, spot[1] - s.y) / SPEED);
      const base = F[s.key] || path([0, s.x, s.y]);
      F[s.key] = toward(base, t0, spot, arrive);
    }
    // the return team: the jammers run with the gunners, the rest peel back to wall it off
    for (const s of def) {
      if (s === ret) continue;
      if (s.pos === "CB") { const g = near(gunners, s.x, s.y); F[s.key] = (t) => { const [gx, gy] = F[g.key](t); const u = clamp(t / 0.4, 0, 1); return [lerp(s.x, gx + 1.6, u), lerp(s.y, gy + (gy < 0 ? 0.8 : -0.8), u)]; }; continue; }
      const back = [sx - 10 - R() * 10, clamp(ly + (R() - 0.5) * 24, -LAT, LAT)], from = F[s.key] || path([0, s.x, s.y]);
      F[s.key] = toward(from, s.pos === "DL" ? tKick : 0.4, back, tLand + 0.4 + R() * 0.5);
    }
    if (carrier) {
      // the coverage runs him down (or a return touchdown leaves them behind)
      tackler = ev.retTD ? null : cover.reduce((b, s) => (!b || Math.hypot(F[s.key](tLand)[0] - endP[0], F[s.key](tLand)[1] - endP[1]) < Math.hypot(F[b.key](tLand)[0] - endP[0], F[b.key](tLand)[1] - endP[1]) ? s : b), null);
      for (const s of cover) {
        const lag = s === tackler ? 0 : 0.3 + R() * 1.1, spot = s === tackler ? [endP[0] - 0.8, endP[1]] : [endP[0] - 1.5 - R() * 3, endP[1] + (R() - 0.5) * 6];
        F[s.key] = toward(F[s.key], tLand, spot, Math.max(tEnd + lag, tLand + Math.hypot(spot[0] - F[s.key](tLand)[0], spot[1] - F[s.key](tLand)[1]) / SPEED));
      }
      if (tackler) { down[carrier.key] = tEnd; down[tackler.key] = tEnd + 0.08; stars.push(tackler.key); }
    }
    let muffRec = null;
    if (ev.muff) muffRec = near(gunners.length ? gunners : cover, sx, ly);
    if (muffRec) { const from = F[muffRec.key]; F[muffRec.key] = toward(from, tLand, [sx - 1.5, ly + 2], tLand + 0.6); down[muffRec.key] = tLand + 0.6; }
    ball = (t) => {
      if (t < 0.5) return t < 0.05 ? { held: snapper.key } : { x: lerp(snapper.x + 1, px, t / 0.5), y: lerp(snapper.y, py, t / 0.5), h: 0.8 };
      if (t < tKick) return { held: punter.key };
      if (t < tLand) return flightPos(t);
      if (carrier) return { held: carrier.key };
      if (catches && !ev.muff) return { held: ret.key };
      // a muff, or a punt left to bounce: it skips along and settles
      const u = clamp((t - tLand) / 0.8, 0, 1), dx = ev.muff ? -1.5 : ev.tb ? 3 : 2.5;
      return { x: sx + dx * u, y: ly + (ev.muff ? 2 : 0.6) * u, h: Math.abs(Math.sin(u * Math.PI * 2.2)) * 1.2 * (1 - u) };
    };
    T = carrier ? tEnd + (ev.retTD ? 1.4 : 0.9) : tLand + 1.3;
    if (!carrier) tEnd = tLand;
    m = { k: "punt", carrier: carrier?.key ?? null, tackler: tackler?.key ?? null, tEnd, td: !!ev.retTD, recov: muffRec?.key ?? null, recovT: muffRec ? tLand + 0.6 : null,
      special: { k: "punt", punter: punter.key, snapper: snapper?.key, returner: ret.key, tKick, tLand, catches: catches && !ev.muff, release: tKick } };
  }
  for (const s of slots) if (!F[s.key]) F[s.key] = path([0, s.x, s.y]);
  const freeze = tEnd + 0.6;
  const f = {};
  for (const s of slots) { const g = F[s.key]; f[s.key] = (t) => onField(g(Math.min(t, Math.max(freeze, T - 0.2)))); }
  const ballOut = (t) => { const b = ball(t); return b.held ? b : { ...b, ...((([x, y]) => ({ x, y }))(onField([b.x, b.y]))) }; };
  return { T, f, ball: ballOut, down, who, m, hop, stars: [...new Set(stars)], catchAt: null, tEnd };
}

// A kickoff acted out (the same shape as buildPlay's result), from the kicking team's side (it
// drives toward +x): the kicker's run-up and the boot off the tee at his 35, the cover team
// sprinting down in its lanes, the return team falling back to set its wall, the catch (or a muff),
// the blocks meeting the coverage, the return and the tackle (or a touchdown). ev: { k: "ko",
// kicker, kr, catchAt, spot, muff, td } (playsim.js kickoff()): catchAt is the receiving team's
// yard line where he fields it, spot where the return ends.
function buildKickoff(ev, slots, R) {
  const los = 35, off = slots.filter((s) => s.side === "off"), def = slots.filter((s) => s.side === "def");
  const by = (list, pos, i = 0) => list.filter((s) => s.pos === pos)[i] || null;
  const near = (list, x, y) => list.reduce((b, s) => (!b || Math.hypot(s.x - x, s.y - y) < Math.hypot(b.x - x, b.y - y) ? s : b), null);
  const F = {}, down = {}, who = {}, stars = [];
  const kicker = by(off, "K") || off[0], ret = by(def, "S") || def[def.length - 1];
  const tKick = 0.95, flight = 2.6, tLand = tKick + flight;
  const cx = clamp(100 - (ev.catchAt ?? 3), 88, 104), cy = (R() - 0.5) * 10, tb = !!ev.tb;
  // the run-up, the kick, and he trails the play down the middle as the safety valve
  F[kicker.key] = path([0, kicker.x, kicker.y], [0.3, kicker.x, kicker.y], [tKick, los - 0.7, 0.5], [tKick + 0.45, los + 1.5, 0.4], [tKick + 2.4, los + 16, 0]);
  const flightPos = (t) => { const u = clamp((t - tKick) / flight, 0, 1); return { x: lerp(los, cx, u), y: lerp(0, cy, u), h: 0.3 + Math.sin(Math.PI * u) * 15 }; };
  const muff = !!ev.muff && !tb, td = !!ev.td && !tb;
  // the return: up the field (toward -x) to where the engine says it ended
  let carrier = null, tEnd = tLand + 0.6, end = [cx - 1.5, cy + 2];
  if (!muff && !tb) {
    const ex = td ? -4 : 100 - ev.spot, ey = clamp(cy + (R() - 0.5) * 22, -LAT, LAT);
    const run = Math.max(1, cx - ex), dur = clamp(run / (7.5 + run * 0.08), 0.6, 4.6);
    const mid = [lerp(cx, ex, 0.45), clamp(lerp(cy, ey, 0.5) + (R() - 0.5) * 12, -LAT, LAT)];
    F[ret.key] = path([0, ret.x, ret.y], [tLand - 0.5, cx, cy], [tLand, cx, cy], [tLand + dur * 0.45, mid[0], mid[1]], [tLand + dur, ex, ey]);
    carrier = ret; tEnd = tLand + dur; end = [ex, ey];
  } else F[ret.key] = path([0, ret.x, ret.y], [tLand - 0.5, cx, cy], [tLand + 0.5, cx + 0.5, cy]);
  // a touchback: he catches it deep in the end zone and takes a knee
  if (tb) { carrier = null; tEnd = tLand + 0.9; end = [cx - 8, cy]; F[ret.key] = path([0, ret.x, ret.y], [tLand - 0.5, cx, cy]); }
  // where the two units collide: about 25 yards in front of the catch
  const meetX = cx - 22 - R() * 6;
  const cover = off.filter((s) => s !== kicker);
  // the up-backs lead the returner; everyone else on the return team takes a man in coverage
  const upBacks = def.filter((s) => s.pos === "RB");
  const blockers = def.filter((s) => s !== ret && !upBacks.includes(s));
  const mate = pairLine(cover, blockers);
  const pairs = {}, meetAt = {};
  for (const c of cover) {
    const cp = [meetX + (R() - 0.5) * 4, clamp(lerp(c.y, cy, 0.35), -LAT, LAT)], tC = tLand - 0.1 + R() * 0.5;
    F[c.key] = path([0, c.x, c.y], [0.45, c.x, c.y], [tC, cp[0], cp[1]], [tC + 2, cp[0] + 1, cp[1]]);
    meetAt[c.key] = tC;
  }
  for (const b of blockers) {
    const c = mate[b.key];
    if (!c) { F[b.key] = path([0, b.x, b.y], [tLand, meetX + 4, b.y * 0.6]); continue; }
    const cf = F[c.key], tC = meetAt[c.key];
    // he backs up to set the wall, then squares up to his man as he arrives and rides him
    F[b.key] = (t) => { const [x, y] = cf(Math.max(t, tC)); const there = [x + 1.8, y]; if (t >= tC) return there; const u = ease(clamp((t - 0.45) / (tC - 0.45), 0, 1)); return [lerp(b.x, there[0], u), lerp(b.y, there[1], u)]; };
    pairs[b.key] = tC - 0.15; pairs[c.key] = tC - 0.15;
  }
  // the up-backs run a few yards ahead of the returner
  upBacks.forEach((u, i) => { const rf = F[ret.key], side = i ? 2.2 : -2.2; F[u.key] = (t) => { if (t < tLand) { const v = clamp(t / tLand, 0, 1); return [lerp(u.x, cx - 6, v), lerp(u.y, cy + side, v)]; } const [x, y] = rf(t); return [Math.max(x - 4.5, -3), y + side]; }; });
  // whoever's free in coverage (and the kicker) runs the play down
  let tackler = null;
  const free = cover.filter((c) => !Object.values(mate).includes(c));
  if (carrier && !td) {
    tackler = near(free.length ? free : cover, end[0], end[1]) || kicker;
    delete pairs[tackler.key];
    F[tackler.key] = toward(F[tackler.key], Math.min(tLand, tEnd - 0.4), [end[0] + 0.8, end[1]], tEnd);
    down[carrier.key] = tEnd; down[tackler.key] = tEnd + 0.08; stars.push(tackler.key);
  }
  for (const c of free) if (c !== tackler) { delete pairs[c.key]; F[c.key] = toward(F[c.key], tLand, [end[0] + 2 + R() * 3, end[1] + (R() - 0.5) * 6], tEnd + 0.3 + R() * 0.6); }
  // a muff: it bounces loose and the coverage falls on it
  let recov = null;
  if (muff) { recov = near(cover, cx, cy); delete pairs[recov.key]; F[recov.key] = toward(F[recov.key], tLand - 0.6, end, tLand + 0.6); down[recov.key] = tLand + 0.6; }
  const ball = (t) => {
    if (t < tKick) return { x: los, y: 0, h: 0.25 };
    if (t < tLand) return flightPos(t);
    if (carrier || tb) return { held: ret.key };
    const u = clamp((t - tLand) / 0.6, 0, 1);
    return { x: lerp(cx, end[0], u), y: lerp(cy, end[1], u), h: Math.abs(Math.sin(u * Math.PI * 2)) * 1.1 * (1 - u) };
  };
  who[kicker.key] = ev.kicker; who[ret.key] = ev.kr; stars.push(ret.key);
  const T = carrier ? tEnd + (td ? 1.5 : 0.9) : tLand + 1.4;
  const m = { k: "ko", carrier: carrier?.key ?? null, tackler: tackler?.key ?? null, tE: tLand, tEnd, td, recov: recov?.key ?? null, recovT: recov ? tLand + 0.6 : null,
    special: { k: "ko", kicker: kicker.key, returner: ret.key, tKick, tLand, catches: !muff, release: 0, pairs, kneelAt: tb ? tLand + 0.3 : null } };
  for (const s of slots) if (!F[s.key]) F[s.key] = path([0, s.x, s.y]);
  const freeze = tEnd + 0.6, f = {};
  for (const s of slots) { const g = F[s.key]; f[s.key] = (t) => onField(g(Math.min(t, Math.max(freeze, T - 0.2)))); }
  const ballOut = (t) => { const b = ball(t); return b.held ? b : { ...b, ...((([x, y]) => ({ x, y }))(onField([b.x, b.y]))) }; };
  return { T, f, ball: ballOut, down, who, m, hop: td ? { key: ret.key, at: tEnd } : null, stars: [...new Set(stars)], catchAt: null, tEnd };
}
