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

export const SPEED = 9; // yards a second a pursuer covers

// ev: the engine's play (with k, qb, tgt, cm, rusher, db, tkl, yac, deep, quick, screen, keeper,
// scramble, edge). slots: the 22 men as drawn at the snap, [{ key, side: "off"|"def", pos, id, x, y }].
// Returns { T, f: { key: t -> [x, y] }, ball: t -> { x, y, h, held }, down: { key: t }, hop: { key, at },
// stars: [keys to name on the field] }.
export function buildPlay(ev, slots, seed = 1) {
  const R = rng(seed);
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
  for (const s of off) if (is(s, "LT", "LG", "C", "RG", "RT")) F[s.key] = passPlay ? path([0, s.x, s.y], [0.35, s.x - 1, s.y], [3, s.x - 1.3, s.y + (R() - 0.5) * 0.8]) : path([0, s.x, s.y], [0.45, s.x + 1.6, s.y + (R() - 0.5) * 0.8], [3, s.x + 2.2, s.y + (R() - 0.5) * 1.2]);
  // Receivers not getting the ball run their routes and settle.
  const route = (s) => { const dx = 8 + R() * 9, dy = (R() - 0.5) * 8; return path([0, s.x, s.y], [1.1, s.x + dx * 0.75, s.y + dy * 0.3], [2.2, s.x + dx + 3, s.y + dy], [3.2, s.x + dx + 4, s.y + dy]); };
  const block = (s) => path([0, s.x, s.y], [1, s.x + 3 + R() * 2, s.y + (R() - 0.5) * 2], [3, s.x + 4 + R() * 2, s.y + (R() - 0.5) * 3]);

  let carrier = null, tE = 0, tEnd = 0, end = null, T = 2, tackler = null, ballF = null, catchAt = null;
  let tH = 0.45, holeY = 0;

  if (passPlay) {
    for (const s of recvs) F[s.key] = route(s);
    const rb = off.find((s) => s.pos === "RB");
    if (rb) F[rb.key] = path([0, rb.x, rb.y], [0.5, rb.x + 1, rb.y - sideOf(rb.y) * 2], [3, rb.x + 1.2, rb.y - sideOf(rb.y) * 2]);
  }

  if (k === "sack") {
    const tS = 1.35 + R() * 0.45, sx = los + Y, sy = qy + (R() - 0.5) * 3;
    F[qbS.key] = path([0, qx, qy], [0.5, qx - 1.5, qy], [tS - 0.3, lerp(qx - 1.5, sx, 0.5), lerp(qy, sy, 0.6)], [tS, sx, sy]);
    const rs = byId(def, ev.rusher) || near(def.filter((s) => is(s, "DL", "LB")), qx, qy);
    const wide = rs.y + sideOf(rs.y) * 3;
    F[rs.key] = path([0, rs.x, rs.y], [0.45, los + 2, wide], [tS - 0.35, sx + 2.2, lerp(wide, sy, 0.6)], [tS, sx + 0.8, sy + 0.3], [tS + 0.4, sx - 0.2, sy + 0.4]);
    carrier = qbS; tackler = rs; tE = tS; tEnd = tS; end = [sx, sy];
    stars.push(rs.key, qbS.key);
    ballF = (t) => (t < 0.25 ? { x: lerp(los, qx, t / 0.25), y: lerp(0, qy, t / 0.25), h: 0.6 } : { held: qbS.key });
    T = tS + 0.95;
  } else if (passPlay) {
    // where the throw is caught: the air yards, then what he did after the catch
    const tgt = byId(off, ev.tgt) || (ev.screen ? off.find((s) => s.pos === "RB") : null) || near(recvs, los + 8, (R() - 0.5) * 30) || off[0];
    const air = k === "pass"
      ? (ev.screen ? -1 - R() : ev.yac ? Math.max(1, Y - ev.yac - Math.round(R() * 3)) : Y <= 3 ? Y : ev.deep ? Math.max(14, Y - 2 - R() * 5) : clamp(Math.round(Y * (0.55 + R() * 0.3)), 1, Y))
      : ev.deep ? 20 + R() * 16 : ev.quick ? 4 + R() * 4 : 7 + R() * 9;
    const cx = Math.min(los + air, 108), cy = ev.screen ? clamp(tgt.y * 0.6 + sideOf(tgt.y) * 6, -LAT, LAT) : clamp(tgt.y * 0.7 + (R() - 0.5) * 7, -LAT + 1, LAT - 1);
    const tThrow = ev.screen ? 0.55 : ev.quick ? 0.85 : ev.deep ? 1.5 : 1.15 + R() * 0.15;
    const throwX = qx - 1.5, flight = 0.22 + Math.hypot(cx - throwX, cy - qy) * 0.021, tC = tThrow + flight;
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
      const db = byId(def, ev.db) || cover;
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
      else F[s.key] = path([0, s.x, s.y], [0.45, s.x - 2.2, s.y], [3, s.x - 2.6, s.y + (R() - 0.5)]);
    }
  } else {
    // A run: the handoff (or the quarterback keeps it), through the hole, then out into the open.
    const rb = off.find((s) => s.pos === "RB");
    const qbRun = ev.keeper || ev.scramble || !rb;
    carrier = qbRun ? qbS : byId(off, ev.player) || rb;
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
      if (is(s, "DL")) F[s.key] = path([0, s.x, s.y], [0.5, s.x - 1.6, lerp(s.y, holeY, 0.15)], [3, s.x - 1.8, lerp(s.y, holeY, 0.2)]);
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
    for (const s of chasers) {
      if (s === carrier) continue;
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
  return { T, f, ball, down, who, hop: td && carrier ? { key: carrier.key, at: tEnd } : null, stars: [...new Set(stars)], catchAt, tEnd };
}
