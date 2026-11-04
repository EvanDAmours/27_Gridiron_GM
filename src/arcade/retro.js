// The Retro Bowl look: a side-on pixel field that scrolls as the offense drives right, the clubs'
// own pixel sprites (public/sprites, the sheets the live field uses), a bitmap scoreboard and the
// pull-back throw's dotted arc. Everything is drawn on one canvas with smoothing off so the pixels
// stay crisp. Field units from play.js: x yards downfield (0-100), y lateral (-26.65..26.65).
import SHEETS from "../pixel/teamSprites.json" with { type: "json" };
import ACTS from "../pixel/actionSprites.json" with { type: "json" };
import { teamKey } from "../teamUniforms.js";
import { HALF, ELIGIBLE } from "./play.js";

const BASE = `${import.meta.env?.BASE_URL ?? "/"}sprites/`;
const POSE = { QB: "qb", RB: "rb", WR: "wr", TE: "te", LT: "ol", LG: "ol", C: "ol", RG: "ol", RT: "ol", DL: "dl", LB: "lb", CB: "db", S: "db" };
export const PLAYER_H = 2.9; // a standing quarterback, in yards (big, like Retro Bowl)
const SQUASH = 0.42; // the field's depth is foreshortened: a yard across is this much of a yard along

// ---- sprite sheets (loaded once per club) ----
const imgs = {};
const load = (k, act) => {
  const key = (act ? "act/" : "") + k;
  if (imgs[key]) return imgs[key];
  const im = new Image(); im.src = `${BASE}${key}.webp`; imgs[key] = im; return im;
};
export const preload = (team) => { const k = teamKey(team); if (k) { load(k); load(k, true); } };

// ---- a 5x7 bitmap font for the scoreboard and banners ----
const GL = {
  "0": "01110 10001 10011 10101 11001 10001 01110", "1": "00100 01100 00100 00100 00100 00100 01110", "2": "01110 10001 00001 00010 00100 01000 11111", "3": "11111 00010 00100 00010 00001 10001 01110", "4": "00010 00110 01010 10010 11111 00010 00010", "5": "11111 10000 11110 00001 00001 10001 01110", "6": "00110 01000 10000 11110 10001 10001 01110", "7": "11111 00001 00010 00100 01000 01000 01000", "8": "01110 10001 10001 01110 10001 10001 01110", "9": "01110 10001 10001 01111 00001 00010 01100",
  A: "01110 10001 10001 11111 10001 10001 10001", B: "11110 10001 10001 11110 10001 10001 11110", C: "01110 10001 10000 10000 10000 10001 01110", D: "11100 10010 10001 10001 10001 10010 11100", E: "11111 10000 10000 11110 10000 10000 11111", F: "11111 10000 10000 11110 10000 10000 10000", G: "01110 10001 10000 10111 10001 10001 01111", H: "10001 10001 10001 11111 10001 10001 10001", I: "01110 00100 00100 00100 00100 00100 01110", J: "00111 00010 00010 00010 00010 10010 01100", K: "10001 10010 10100 11000 10100 10010 10001", L: "10000 10000 10000 10000 10000 10000 11111", M: "10001 11011 10101 10101 10001 10001 10001", N: "10001 10001 11001 10101 10011 10001 10001", O: "01110 10001 10001 10001 10001 10001 01110", P: "11110 10001 10001 11110 10000 10000 10000", Q: "01110 10001 10001 10001 10101 10010 01101", R: "11110 10001 10001 11110 10100 10010 10001", S: "01111 10000 10000 01110 00001 00001 11110", T: "11111 00100 00100 00100 00100 00100 00100", U: "10001 10001 10001 10001 10001 10001 01110", V: "10001 10001 10001 10001 10001 01010 00100", W: "10001 10001 10001 10101 10101 10101 01010", X: "10001 10001 01010 00100 01010 10001 10001", Y: "10001 10001 01010 00100 00100 00100 00100", Z: "11111 00001 00010 00100 01000 10000 11111",
  " ": "00000 00000 00000 00000 00000 00000 00000", ":": "00000 00100 00100 00000 00100 00100 00000", "&": "01100 10010 10100 01000 10101 10010 01101", "-": "00000 00000 00000 11111 00000 00000 00000", ".": "00000 00000 00000 00000 00000 01100 01100", "'": "00100 00100 00000 00000 00000 00000 00000", "+": "00000 00100 00100 11111 00100 00100 00000", ",": "00000 00000 00000 00000 00000 00100 01000", "!": "00100 00100 00100 00100 00100 00000 00100",
};
export function pixText(ctx, text, x, y, px, color = "#fff", align = "left") {
  const t = String(text).toUpperCase(), w = t.length * 6 * px - px;
  let cx = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
  ctx.fillStyle = color;
  for (const ch of t) {
    const rows = (GL[ch] || GL[" "]).split(" ");
    rows.forEach((r, ry) => { for (let rx = 0; rx < 5; rx++) if (r[rx] === "1") ctx.fillRect(Math.round(cx + rx * px), Math.round(y + ry * px), px, px); });
    cx += 6 * px;
  }
  return w;
}
export const pixWidth = (text, px) => String(text).length * 6 * px - px;

// the football, 13x7: o outline, b leather, h highlight, w stripes and laces
const BALL = ["....ooooo....", "..oobhhhboo..", ".obwhwbwhwbo.", "obbwbbbbbwbbo", ".obwbbbbbwbo.", "..oobbbbboo..", "....ooooo...."];
const BALL_C = { o: "#2a1206", b: "#8a4a22", h: "#b06a36", w: "#f4efe4" };

// ---- the camera ----
// The field runs left to right. s: pixels per yard along the field. The field's near sideline sits
// at the bottom of the canvas; the stands fill the strip above the far sideline.
export function makeCamera(W, H) {
  // the whole width of the field fits under the scoreboard, and no more than ~40 yards show across
  const hud = Math.max(2, Math.round(Math.min(W / 40, H / 30) * 0.09)) * 11;
  const s = Math.min(H > W ? W / 30 : W / 40, (H - hud - 8) / (53.3 * SQUASH + 1.4));
  // the field sits low on a wide screen (stands above it) and in the middle of a tall one
  const depth = 53.3 * SQUASH * s, room = H - hud - depth - s * 1.2, top = hud + (H > W ? room * 0.5 : Math.min(room, s * 4.5)) + s * 0.2;
  return { W, H, s, depth, top, camX: 50, lead: 5, toScreen(x, y) { return [W * 0.42 + (x - this.camX) * s, top + (y + HALF) * SQUASH * s]; }, toField(px, py) { return { x: this.camX + (px - W * 0.42) / s, y: (py - top) / (SQUASH * s) - HALF }; } };
}

// ---- drawing ----
function sprite(ctx, cam, team, away, pose, x, y, facing, act = false, scale = 1) {
  const k = teamKey(team), sh = act ? ACTS[k] : SHEETS[k];
  const r = sh?.[away ? "away" : "home"]?.[pose]; if (!r) return false;
  const im = load(k, act); if (!im.complete || !im.naturalWidth) return false;
  const [cx, cy, cw, ch] = r, ref = act ? sh.home.a8[3] : sh.home.qb[3];
  const h = (ch / ref) * PLAYER_H * cam.s * scale, w = h * (cw / ch);
  const [sx, sy] = cam.toScreen(x, y);
  ctx.save(); ctx.translate(Math.round(sx), Math.round(sy));
  if (facing < 0) ctx.scale(-1, 1);
  ctx.drawImage(im, cx, cy, cw, ch, Math.round(-w / 2), Math.round(-h), Math.round(w), Math.round(h));
  ctx.restore();
  return true;
}
const shadow = (ctx, cam, x, y, r = 0.9) => { const [sx, sy] = cam.toScreen(x, y); ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.beginPath(); ctx.ellipse(sx, sy, r * cam.s, r * cam.s * 0.35, 0, 0, Math.PI * 2); ctx.fill(); };

// Which frame a man is in: the club's stance art at the line, the action frames once he moves.
function poseFor(S, e, t) {
  const moving = Math.hypot(e.vx, e.vy) > 1.2, stride = Math.floor(t * 7) % 2 === 0;
  const hasBall = S.ball.holder === e.key;
  if (S.kind) { // a kick: the kicker swings through, the holder kneels, the line holds
    const t0 = S.ball.flight?.t0 ?? 9;
    if (e.key === "K") return [S.phase === "presnap" || t < t0 - 0.45 ? "c1" : t < t0 + 0.4 ? "c2" : "c3", true];
    if (e.key === "H") return ["c5", true];
    if (e.key === "S0" && S.kind === "punt") return [hasBall ? (stride ? "a1" : "a2") : moving ? (stride ? "a5" : "a6") : "db", hasBall || moving];
    if (e.side === "off") return [POSE[e.p.pos] === "qb" ? "ol" : POSE[e.p.pos] || "ol", false];
    return [POSE[e.p.pos] || "db", false];
  }
  if (S.phase === "presnap") return [POSE[e.p.pos] || "db", false];
  if (e.key === "QB") {
    if (S.thrownAt && t - S.thrownAt < 0.5) return ["a8", true];
    if (S.phase === "tackle" && S.result?.type === "sack" && t >= S.endAt - 0.6) return ["b3", true];
    if (hasBall) return [moving ? (stride ? "a1" : "a2") : "qb", moving];
    return ["a3", true];
  }
  if ((S.phase === "tackle" || S.phase === "fall") && hasBall && t >= S.endAt - 0.55) return [S.result?.td ? "a7" : "b3", true];
  if (S.ball.flight && S.ball.flight.target === e.key && e.side === "off") return ["b1", true];
  if (e.down > 0) return ["b3", true];
  if (hasBall) return [stride ? "a1" : "a2", true];
  if (e.side === "def" && S.phase === "tackle" && S.tackler === e && t >= S.endAt - 0.55) return ["b4", true];
  if (moving) return [stride ? "a5" : "a6", true];
  if (e.side === "off" && ["LT", "LG", "C", "RG", "RT", "TE"].includes(e.key)) return [S.phase === "presnap" ? "ol" : "c5", S.phase !== "presnap"];
  return [POSE[e.p.pos] || "db", false];
}

export function drawRetro(ctx, cam, S, teams, g, opts = {}) {
  const { W, H, s, top, depth } = cam;
  ctx.imageSmoothingEnabled = false;
  // the stands: crowd pixels above the far sideline (and below the near one on a tall screen)
  ctx.fillStyle = "#1a1f2b"; ctx.fillRect(0, 0, W, H);
  const px = Math.max(2, Math.round(s * 0.18)), nearEdge = top + depth + s * 1.2;
  for (let yy = 0; yy < H; yy += px) { if (yy > top - px && yy < nearEdge) continue; for (let xx = ((yy / px) % 2) * px; xx < W; xx += px * 2) { const n = Math.sin(xx * 12.9 + yy * 7.3) * 43758.5; const f = n - Math.floor(n); ctx.fillStyle = f < 0.35 ? "#2b3346" : f < 0.6 ? "#3a4258" : f < 0.75 ? "#5a3a3a" : "#1f2433"; ctx.fillRect(xx, yy, px, px); } }
  // the wall and the far sideline
  ctx.fillStyle = "#3b3f4a"; ctx.fillRect(0, top - s * 0.9, W, s * 0.9);
  // the grass, striped every five yards
  const yardAt = (x) => W * 0.42 + (x - cam.camX) * s;
  for (let yd = -10; yd < 110; yd += 5) {
    const x0 = yardAt(yd), x1 = yardAt(yd + 5); if (x1 < 0 || x0 > W) continue;
    ctx.fillStyle = yd < 0 ? teams.user.clr : yd >= 100 ? teams.opp.clr : ((yd / 5) % 2 ? "#3f8f3a" : "#45993f");
    ctx.fillRect(Math.round(x0), Math.round(top), Math.round(x1 - x0) + 1, Math.round(depth));
  }
  // the near sideline and the strip below it
  ctx.fillStyle = "#e8e8e0"; ctx.fillRect(0, Math.round(top + depth), W, Math.max(2, s * 0.25));
  ctx.fillStyle = "#2f6b2c"; ctx.fillRect(0, Math.round(top + depth + s * 0.25), W, Math.round(s * 0.95));
  ctx.fillStyle = "#3b3f4a"; ctx.fillRect(0, Math.round(nearEdge), W, Math.round(s * 0.5));
  // yard lines, hashes and numbers
  const lw = Math.max(1, Math.round(s * 0.12));
  for (let yd = 0; yd <= 100; yd += 5) { const x = Math.round(yardAt(yd)); if (x < -4 || x > W + 4) continue; ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.fillRect(x, Math.round(top), lw, Math.round(depth)); }
  ctx.fillStyle = "rgba(255,255,255,.55)";
  for (let yd = 1; yd < 100; yd++) { if (yd % 5 === 0) continue; const x = Math.round(yardAt(yd)); if (x < 0 || x > W) continue; for (const h of [-8, 8]) { const [, y] = cam.toScreen(0, h); ctx.fillRect(x, Math.round(y), lw, Math.max(2, s * 0.25)); } }
  for (let i = 0; i < 9; i++) { const yd = 10 + i * 10, x = yardAt(yd); if (x < -40 || x > W + 40) continue; const n = String(yd > 50 ? 100 - yd : yd); const [, y1] = cam.toScreen(0, -HALF + 6), [, y2] = cam.toScreen(0, HALF - 9); pixText(ctx, n, x - s * 0.9, y1, Math.max(1, Math.round(s * 0.16)), "rgba(255,255,255,.75)"); pixText(ctx, n, x - s * 0.9, y2, Math.max(1, Math.round(s * 0.16)), "rgba(255,255,255,.75)"); }
  // end-zone names
  for (const [yd, t] of [[-10, teams.user], [100, teams.opp]]) { const x = yardAt(yd + 5); if (x < -200 || x > W + 200) continue; const [, y] = cam.toScreen(0, 0); ctx.save(); ctx.translate(x, y); ctx.rotate(-Math.PI / 2); pixText(ctx, t.name, 0, -s * 0.6, Math.max(1, Math.round(s * 0.2)), "rgba(255,255,255,.85)", "center"); ctx.restore(); }
  // the uprights, on each goal line, seen side-on
  for (const yd of [0, 100]) { const x = Math.round(yardAt(yd)); if (x < -20 || x > W + 20) continue; const [, gy] = cam.toScreen(0, 0); const h = s * 5.5; ctx.fillStyle = "#ffd700"; ctx.fillRect(x - 2, Math.round(gy - h), 4, Math.round(h)); ctx.fillRect(x - s * 1.1, Math.round(gy - h), Math.round(s * 2.2), 3); ctx.fillRect(x - s * 1.1, Math.round(gy - h - s * 2), 3, Math.round(s * 2)); ctx.fillRect(x + s * 1.1 - 3, Math.round(gy - h - s * 2), 3, Math.round(s * 2)); }
  if (!S) return;
  // the line of scrimmage and the line to gain
  const vline = (yd, color) => { const x = Math.round(yardAt(yd)); if (x < 0 || x > W) return; ctx.fillStyle = color; ctx.fillRect(x, Math.round(top), Math.max(2, lw * 2), Math.round(depth)); };
  vline(S.los, "rgba(60,120,255,.8)"); if (S.firstDown < 100 && !S.kind) vline(S.firstDown, "rgba(255,220,0,.9)");
  // routes, shown faintly before the snap and while the quarterback holds it (Retro Bowl shows them)
  if (S.phase === "presnap" || (S.phase === "live" && S.ball.holder === "QB")) {
    ctx.setLineDash([Math.max(2, s * 0.25), Math.max(2, s * 0.25)]); ctx.lineWidth = Math.max(1, s * 0.08); ctx.strokeStyle = "rgba(255,255,255,.45)";
    for (const r of ELIGIBLE) { const e = S.ents[r]; if (!e || !e.path?.length) continue; ctx.beginPath(); let [x0, y0] = cam.toScreen(e.x, e.y); ctx.moveTo(x0, y0); for (const p of e.path) { const [x, y] = cam.toScreen(p.x, p.y); ctx.lineTo(x, y); } ctx.stroke(); }
    ctx.setLineDash([]);
  }
  // the throw's arc and landing spot while you pull back
  if (S.aim && S.phase === "live" && S.ball.holder === "QB") {
    const qb = S.ents.QB, [qx, qy] = cam.toScreen(qb.x, qb.y), [ax, ay] = cam.toScreen(S.aim.x, S.aim.y);
    const n = 14, dist = Math.hypot(S.aim.x - qb.x, S.aim.y - qb.y), lift = Math.min(6, dist / 4) * s;
    ctx.fillStyle = "#fff";
    for (let i = 1; i < n; i++) { const u = i / n, x = qx + (ax - qx) * u, y = qy + (ay - qy) * u - PLAYER_H * s * 0.6 - lift * 4 * u * (1 - u); const d = Math.max(2, s * 0.14); ctx.fillRect(Math.round(x - d / 2), Math.round(y - d / 2), d, d); }
    ctx.strokeStyle = "#fff"; ctx.lineWidth = Math.max(1.5, s * 0.1); ctx.beginPath(); ctx.ellipse(ax, ay, s * 1.1, s * 1.1 * SQUASH, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fill();
  }
  // players, far to near so the near ones overlap the far ones; the man with the ball on top
  const ents = Object.values(S.ents).sort((a, b) => (a.key === S.ball.holder) - (b.key === S.ball.holder) || a.y - b.y);
  for (const e of ents) {
    const t = e.side === "off" ? teams.user : teams.opp, away = e.side === "def";
    const facing = Math.abs(e.vx) > 0.5 ? Math.sign(e.vx) : e.side === "off" ? 1 : -1;
    shadow(ctx, cam, e.x, e.y);
    const [pose, act] = poseFor(S, e, S.t);
    const ok = sprite(ctx, cam, t, away, pose, e.x, e.y, facing, act) || sprite(ctx, cam, t, away, POSE[e.p.pos] || "db", e.x, e.y, facing, false);
    if (!ok) { const [sx, sy] = cam.toScreen(e.x, e.y); ctx.fillStyle = t.clr; ctx.fillRect(sx - s * 0.5, sy - s * 2.2, s, s * 2.2); }
    if (opts.ring && S.ball.holder === e.key && S.phase !== "presnap") { const [sx, sy] = cam.toScreen(e.x, e.y); ctx.strokeStyle = "#fff"; ctx.lineWidth = Math.max(1, s * 0.08); ctx.beginPath(); ctx.ellipse(sx, sy, s * 1.1, s * 1.1 * SQUASH, 0, 0, Math.PI * 2); ctx.stroke(); }
  }
  // the ball in flight, or on the turf after an incompletion (the art holds it otherwise)
  const b = S.ball;
  if (b.flight || b.holder == null) {
    const [bx, by] = cam.toScreen(b.x, b.y), lift = b.flight ? (b.h || 0) * s * 1.1 + PLAYER_H * s * 0.55 : Math.max(0, (b.h || 0)) * s;
    shadow(ctx, cam, b.x, b.y, 0.4);
    // a pixel football: pointed ends, two-tone leather, white stripes and laces, nose along its flight
    const px = Math.max(1, Math.round(s * 0.07));
    let ang = 0.35;
    if (b.flight) { const f = b.flight, [fx, fy] = cam.toScreen(f.from.x, f.from.y), [tx, ty] = cam.toScreen(f.to.x, f.to.y); ang = Math.atan2(ty - fy, tx - fx); }
    ctx.save(); ctx.translate(Math.round(bx), Math.round(by - lift)); ctx.rotate(ang);
    for (let r = 0; r < BALL.length; r++) for (let c = 0; c < BALL[r].length; c++) { const k = BALL[r][c]; if (k === ".") continue; ctx.fillStyle = BALL_C[k]; ctx.fillRect((c - BALL[r].length / 2) * px, (r - BALL.length / 2) * px, px, px); }
    ctx.restore();
  }
}

// The scoreboard strip, Retro Bowl style: both clubs with scores, the quarter and clock, and the
// down and distance.
const hudPx = (cam) => Math.max(2, Math.round(Math.min(cam.W / 40, cam.H / 30) * 0.09));
export function drawHud(ctx, cam, sit, teams, { ot } = {}) {
  const { W } = cam, px = hudPx(cam), h = px * 7, pad = px * 2;
  const bar = h + pad * 2;
  ctx.fillStyle = "#0b0e14"; ctx.fillRect(0, 0, W, bar);
  const box = (x, t, n, right) => {
    const w = px * 6 * 3 + pad, bx = right ? x - w : x;
    ctx.fillStyle = t.clr; ctx.fillRect(bx, pad / 2, w, h + pad); ctx.fillStyle = t.ac; ctx.fillRect(bx, pad / 2 + h + pad - px, w, px);
    pixText(ctx, t.ab, bx + w / 2, pad, px, "#fff", "center");
    pixText(ctx, n, right ? bx - pad : bx + w + pad, pad, px, "#fff", right ? "right" : "left");
  };
  box(pad, teams.user, sit.score.h, false); box(W - pad, teams.opp, sit.score.a, true);
  const clock = `${Math.floor(sit.clock / 60)}:${String(sit.clock % 60).padStart(2, "0")}`;
  pixText(ctx, `${sit.ot || ot ? "OT" : "Q" + sit.qtr}  ${clock}`, W / 2, pad, px, "#ffd166", "center");
  return bar;
}
export function drawDownBox(ctx, cam, text, color = "#fff") {
  const { W } = cam, px = hudPx(cam), h = px * 7, pad = px * 2, bar = h + pad * 2;
  const w = pixWidth(text, px) + pad * 2;
  ctx.fillStyle = "#0b0e14"; ctx.fillRect(W / 2 - w / 2, bar, w, h + pad);
  pixText(ctx, text, W / 2, bar + pad / 2, px, color, "center");
}
// A banner across the field: the play's result.
export function drawBanner(ctx, cam, title, text, sub, color) {
  const { W, H, s } = cam, px = Math.max(2, Math.round(s * 0.12)), px2 = Math.max(2, Math.round(s * 0.08));
  const lines = wrap(text, Math.floor((W - s * 2) / (6 * px2)));
  const h = px * 7 + px2 * 7 * lines.length + (sub ? px2 * 7 + px2 * 2 : 0) + px * 5;
  const y = H * 0.56 - h / 2;
  ctx.fillStyle = "rgba(8,10,16,.92)"; ctx.fillRect(0, y, W, h);
  ctx.fillStyle = color; ctx.fillRect(0, y, W, px);
  pixText(ctx, title, W / 2, y + px * 2, px, "#ffd166", "center");
  lines.forEach((l, i) => pixText(ctx, l, W / 2, y + px * 2 + px * 7 + px + i * px2 * 8, px2, "#fff", "center"));
  if (sub) pixText(ctx, sub, W / 2, y + h - px2 * 7 - px * 1.5, px2, "#9aa7b2", "center");
  pixText(ctx, "TAP TO CONTINUE", W / 2, y + h + px, px2, "rgba(255,255,255,.6)", "center");
}
const wrap = (text, n) => { const out = []; let line = ""; for (const w of String(text).split(" ")) { if ((line + " " + w).trim().length > n) { out.push(line.trim()); line = w; } else line += " " + w; } if (line.trim()) out.push(line.trim()); return out; };

// The play call, Retro Bowl style: a strip of pixel buttons along the bottom. Returns the hit boxes.
export function drawButtons(ctx, cam, heading, items, color) {
  const { W, H, s } = cam, px = Math.max(2, Math.round(s * 0.09)), pad = px * 2, bh = px * 7 + pad * 2;
  const cols = Math.min(3, items.length), rows = Math.ceil(items.length / cols), gap = px * 1.5;
  const bw = (W - gap * (cols + 1)) / cols, top = H - rows * (bh + gap) - gap - px * 9;
  ctx.fillStyle = "rgba(8,10,16,.94)"; ctx.fillRect(0, top - px * 2, W, H - top + px * 2);
  ctx.fillStyle = color; ctx.fillRect(0, top - px * 2, W, px);
  pixText(ctx, heading, W / 2, top + px, px, "#ffd166", "center");
  const boxes = [];
  items.forEach(([key, label], i) => {
    const c = i % cols, r = Math.floor(i / cols), x = gap + c * (bw + gap), y = top + px * 9 + r * (bh + gap);
    ctx.fillStyle = "#1b2230"; ctx.fillRect(x, y, bw, bh);
    ctx.fillStyle = "#2c3744"; ctx.fillRect(x, y, bw, px); ctx.fillRect(x, y, px, bh);
    ctx.fillStyle = "#0b0e14"; ctx.fillRect(x, y + bh - px, bw, px); ctx.fillRect(x + bw - px, y, px, bh);
    pixText(ctx, label, x + bw / 2, y + pad, px, "#fff", "center");
    boxes.push({ key, x, y, w: bw, h: bh });
  });
  return boxes;
}
