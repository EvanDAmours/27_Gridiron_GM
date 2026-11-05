// The Retro Bowl look: a side-on pixel field that scrolls as the offense drives right, the clubs'
// own pixel sprites (public/sprites, the sheets the live field uses), a bitmap scoreboard and the
// pull-back throw's dotted arc. Everything is drawn on one canvas with smoothing off so the pixels
// stay crisp. Field units from play.js: x yards downfield (0-100), y lateral (-26.65..26.65).
import SHEETS from "../pixel/teamSprites.json" with { type: "json" };
import ACTS from "../pixel/actionSprites.json" with { type: "json" };
import ACTS2 from "../pixel/actionSprites2.json" with { type: "json" };
import { teamKey } from "../teamUniforms.js";
import { HALF, ELIGIBLE, passPlan, BULLET_RANGE, BULLET_MAX, playDiagram } from "./play.js";

const BASE = `${import.meta.env?.BASE_URL ?? "/"}sprites/`;
const POSE = { QB: "qb", RB: "rb", WR: "wr", TE: "te", LT: "ol", LG: "ol", C: "ol", RG: "ol", RT: "ol", DL: "dl", LB: "lb", CB: "db", S: "db" };
export const PLAYER_H = 2.9; // a standing quarterback, in yards (big, like Retro Bowl)
const SQUASH = 0.42; // the field's depth is foreshortened: a yard across is this much of a yard along

// ---- sprite sheets (loaded once per club) ----
const imgs = {};
const load = (k, act) => {
  const key = (act === 2 ? "act2/" : act ? "act/" : "") + k;
  if (imgs[key]) return imgs[key];
  const im = new Image(); im.src = `${BASE}${key}.webp`; imgs[key] = im; return im;
};
export const preload = (team) => { const k = teamKey(team); if (k) { load(k); load(k, true); if (ACTS2[k]) load(k, 2); } };

// ---- a 5x7 bitmap font for the scoreboard and banners ----
const GL = {
  "0": "01110 10001 10011 10101 11001 10001 01110", "1": "00100 01100 00100 00100 00100 00100 01110", "2": "01110 10001 00001 00010 00100 01000 11111", "3": "11111 00010 00100 00010 00001 10001 01110", "4": "00010 00110 01010 10010 11111 00010 00010", "5": "11111 10000 11110 00001 00001 10001 01110", "6": "00110 01000 10000 11110 10001 10001 01110", "7": "11111 00001 00010 00100 01000 01000 01000", "8": "01110 10001 10001 01110 10001 10001 01110", "9": "01110 10001 10001 01111 00001 00010 01100",
  A: "01110 10001 10001 11111 10001 10001 10001", B: "11110 10001 10001 11110 10001 10001 11110", C: "01110 10001 10000 10000 10000 10001 01110", D: "11100 10010 10001 10001 10001 10010 11100", E: "11111 10000 10000 11110 10000 10000 11111", F: "11111 10000 10000 11110 10000 10000 10000", G: "01110 10001 10000 10111 10001 10001 01111", H: "10001 10001 10001 11111 10001 10001 10001", I: "01110 00100 00100 00100 00100 00100 01110", J: "00111 00010 00010 00010 00010 10010 01100", K: "10001 10010 10100 11000 10100 10010 10001", L: "10000 10000 10000 10000 10000 10000 11111", M: "10001 11011 10101 10101 10001 10001 10001", N: "10001 10001 11001 10101 10011 10001 10001", O: "01110 10001 10001 10001 10001 10001 01110", P: "11110 10001 10001 11110 10000 10000 10000", Q: "01110 10001 10001 10001 10101 10010 01101", R: "11110 10001 10001 11110 10100 10010 10001", S: "01111 10000 10000 01110 00001 00001 11110", T: "11111 00100 00100 00100 00100 00100 00100", U: "10001 10001 10001 10001 10001 10001 01110", V: "10001 10001 10001 10001 10001 01010 00100", W: "10001 10001 10001 10101 10101 10101 01010", X: "10001 10001 01010 00100 01010 10001 10001", Y: "10001 10001 01010 00100 00100 00100 00100", Z: "11111 00001 00010 00100 01000 10000 11111",
  " ": "00000 00000 00000 00000 00000 00000 00000", ":": "00000 00100 00100 00000 00100 00100 00000", "&": "01100 10010 10100 01000 10101 10010 01101", "-": "00000 00000 00000 11111 00000 00000 00000", ".": "00000 00000 00000 00000 00000 01100 01100", "'": "00100 00100 00000 00000 00000 00000 00000", "+": "00000 00100 00100 11111 00100 00100 00000", ",": "00000 00000 00000 00000 00000 00100 01000", "!": "00100 00100 00100 00100 00100 00000 00100",
  "<": "00010 00100 01000 10000 01000 00100 00010", ">": "01000 00100 00010 00001 00010 00100 01000", "(": "00010 00100 01000 01000 01000 00100 00010", ")": "01000 00100 00010 00010 00010 00100 01000",
  "/": "00001 00010 00010 00100 01000 01000 10000", "?": "01110 10001 00001 00010 00100 00000 00100", "%": "11001 11010 00010 00100 01000 01011 10011", "#": "01010 11111 01010 01010 01010 11111 01010", "^": "00100 01110 10101 00100 00100 00100 00100",
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
// with a drop shadow, the way every label in Retro Bowl sits on the field
export function pixShadow(ctx, text, x, y, px, color = "#fff", align = "left", shadow = "rgba(0,0,0,.7)") { pixText(ctx, text, x + px, y + px, px, shadow, align); return pixText(ctx, text, x, y, px, color, align); }

// the football, 13x7: o outline, b leather, h highlight, w stripes and laces
const BALL = ["....ooooo....", "..oobhhhboo..", ".obwhwbwhwbo.", "obbwbbbbbwbbo", ".obwbbbbbwbo.", "..oobbbbboo..", "....ooooo...."];
const BALL_C = { o: "#2a1206", b: "#8a4a22", h: "#b06a36", w: "#f4efe4" };

// ---- the camera ----
// The field runs left to right. s: pixels per yard along the field. The field's near sideline sits
// at the bottom of the canvas; the stands fill the strip above the far sideline.
export function makeCamera(W, H) {
  // the whole width of the field fits under the scoreboard, and no more than ~40 yards show across
  const hud = Math.max(2, Math.round(Math.min(W / 380, H / 215))) * 11;
  const s = Math.min(H > W ? W / 44 : W / 66, (H - hud - 8) / (53.3 * SQUASH + 1.4)); // ~66 yards across a wide screen, ~44 upright
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
// A frame from the second action sheet (clubs that have one): drawn with its foot point
// [ax, ay] on the man's spot, at the same scale as the first sheet. False when the club or the
// frame isn't there, so the caller falls back to the first sheet.
function sprite2(ctx, cam, team, away, name, x, y, facing) {
  const k = teamKey(team), sh = ACTS2[k], r = sh?.[away ? "away" : "home"]?.[name]; if (!r) return false;
  const im = load(k, 2); if (!im.complete || !im.naturalWidth) return false;
  const [cx, cy, cw, ch, ax = cw / 2, ay = ch] = r, ref = ACTS[k]?.home?.a8?.[3] || 160, sc = (PLAYER_H * cam.s) / ref;
  const [sx, sy] = cam.toScreen(x, y);
  ctx.save(); ctx.translate(Math.round(sx), Math.round(sy)); if (facing < 0) ctx.scale(-1, 1);
  ctx.drawImage(im, cx, cy, cw, ch, Math.round(-ax * sc), Math.round(-ay * sc), Math.round(cw * sc), Math.round(ch * sc));
  ctx.restore(); return true;
}
// Which second-sheet frame a man is in (null: use poseFor's). Run cycles step with the ground he
// covers (six frames to two strides); a man running mostly across the field turns up or down the
// screen; the throw, catch, tackle and fall play out as short sequences. {face} overrides facing.
const BACKS = new Set(["CB0", "CB1", "CB2", "S0", "S1"]), OLINE = new Set(["LT", "LG", "C", "RG", "RT"]);
function pose2(S, e, t) {
  if (S.kind || S.phase === "presnap") return null;
  const sp = Math.hypot(e.vx, e.vy), moving = sp > 1.2, g = e._gait || 0, hasBall = S.ball.holder === e.key;
  const i6 = (Math.floor(g / 0.42) % 6) + 1, i4 = (Math.floor(g / 0.55) % 4) + 1, i2 = (Math.floor(g / 0.7) % 2) + 1;
  const across = moving && Math.abs(e.vy) > Math.abs(e.vx) * 1.4 ? (e.vy < 0 ? "up" : "down") : null;
  const run = (ball) => ({ n: ball ? (across ? `run_ball_${across}_${i4}` : `run_ball_${i6}`) : across ? `run_${across}_${i4}` : `run_${i6}` });
  const over = S.phase === "tackle" || S.phase === "fall";
  if (over && S._overAt == null) S._overAt = t;
  const since = over ? t - S._overAt : 0, isPass = S.call?.startsWith("pass");
  if (e.key === "QB" && !over) {
    if (S.thrownAt != null && t - S.thrownAt < 0.1) return { n: "throw_release" };
    if (hasBall && S.phase === "live") {
      if (e.mode === "dropback") return { n: `drop_${i4}`, face: 1 };
      return { n: S.aim ? "throw_windup" : "throw_set" };
    }
    if (e.mode === "handoff") return { n: "handoff_qb" };
    if (hasBall) return run(true);
    return null;
  }
  if (S.dived && hasBall) return null; // (the first sheet's diving carry)
  if (over && hasBall) {
    if (S.result?.td) return since < 0.35 ? run(true) : since < 0.9 ? { n: "td_spike" } : { n: `td_dance_${(Math.floor(t * 4) % 2) + 1}` };
    if (S.phase === "tackle") return since < 0.12 ? { n: "hit_reel" } : since < 0.24 ? { n: "fall_1" } : since < 0.38 ? { n: "fall_2" } : null;
    return null;
  }
  if (over && S.tackler === e) return { n: since < 0.18 ? "tackle_dive" : "tackle_wrap" };
  if (e.down > 0) return e.missed && e.down > 0.3 ? { n: "whiff" } : e.down < 0.15 ? { n: "getup_2" } : e.down < 0.3 ? { n: "getup_1" } : null;
  const f = S.ball.flight;
  if (f && !f.kick && f.target === e.key && e.side === "off") {
    const left = f.t0 + f.T - t;
    return left < 0.22 ? { n: f.bullet ? "catch_chest" : "catch_high" } : { n: `look_back_${(Math.floor(g / 0.7) % 2) + 1}` };
  }
  if (f && !f.kick && e.side === "def" && f.target && S.cover?.[f.target] === e.key && f.t0 + f.T - t < 0.2 && Math.hypot(e.x - f.to.x, e.y - f.to.y) < 1.6) return { n: "swat" };
  if (hasBall && S.phase === "carry") {
    if (S.catchAt != null && t - S.catchAt < 0.3 && e.side === "off") return { n: "catch_secure" };
    if (e.key === "RB" && S.call?.startsWith("run") && S.t < 1.3 && e.x < S.los) return { n: "handoff_rb" };
    if (S.jukeAt != null && t - S.jukeAt < 0.32) return { n: t - S.jukeAt < 0.14 ? "juke_plant" : "juke_cut" };
    if (S.stagger > t) return { n: "stumble" };
    return run(true);
  }
  if (over) return null;
  // the defensive backs give ground facing the quarterback until the ball's out
  if (e.side === "def" && BACKS.has(e.key) && S.phase === "live" && S.ball.holder === "QB" && e.vx > 0.4 && sp < e.top * 0.8) return { n: `backpedal_${i4}`, face: -1 };
  if (OLINE.has(e.key) && e.mode === "block") return isPass ? (moving ? { n: `pass_set_${i2}` } : { n: "block_engaged" }) : moving ? { n: `run_drive_${i2}` } : { n: "block_engaged" };
  if (e.side === "def" && e.key.startsWith("DL") && e.mode === "rush") {
    if (!isPass) return { n: "rush_bull" };
    const shed = S.shed?.[e.key] ?? 9, mv = e.move || "";
    if (/SPIN/.test(mv) && shed - t < 0.45) return { n: `spin_noball_${Math.min(3, Math.floor((0.45 - (shed - t)) / 0.15) + 1)}` };
    if (/SWIM/.test(mv) && shed - t < 0.35) return { n: "rush_swim" };
    return { n: "rush_bull" };
  }
  if (moving) return run(false);
  return null;
}

function poseFor(S, e, t) {
  // the legs keep pace with the ground: one step every ~1.15 yards, so a sprinter's legs turn
  // over faster than a jogging lineman's and nobody "moonwalks"
  const sp = Math.hypot(e.vx, e.vy), moving = sp > 1.2;
  if (e._gt == null || t < e._gt) e._gt = t; e._gait = (e._gait || 0) + sp * Math.min(0.1, t - e._gt); e._gt = t;
  const stride = Math.floor(e._gait / 1.15) % 2 === 0;
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
  if (S.dived && hasBall) return ["b2", true]; // laid out for the extra yard
  if ((S.phase === "tackle" || S.phase === "fall") && hasBall && t >= S.endAt - 0.55) return [S.result?.td ? "a7" : "b3", true];
  if (S.ball.flight && S.ball.flight.target === e.key && e.side === "off") return ["b1", true];
  if (e.down > 0) return ["b3", true];
  if (hasBall) return [stride ? "a1" : "a2", true];
  if (e.side === "def" && S.phase === "tackle" && S.tackler === e && t >= S.endAt - 0.55) return ["b4", true];
  if (moving) return [stride ? "a5" : "a6", true];
  if (e.side === "off" && ["LT", "LG", "C", "RG", "RT", "TE"].includes(e.key)) return [S.phase === "presnap" ? "ol" : "c5", S.phase !== "presnap"];
  return [POSE[e.p.pos] || "db", false];
}

// ---- the crowd ----
// One strip of stands, drawn once per size/colours/pose and cached: rows of fans on stepped
// tiers (a dark step under each row), mostly in the home side's colours with a few empty
// seats; rows further back are darker. pose 0 is seated; 1 and 2 are the two beats of a cheer.
const standsCache = new Map();
const hash = (a, b) => { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); };
function standsTile(u, needH, teams, pose) {
  const rowH = u * 6, rows = Math.max(1, Math.ceil(needH / rowH)), seats = 40, sp = u * 4;
  const key = `${u}|${rows}|${teams.user.clr}|${teams.opp.clr}|${pose}`;
  if (standsCache.has(key)) return standsCache.get(key);
  if (standsCache.size > 24) standsCache.clear();
  if (typeof OffscreenCanvas === "undefined" && typeof document === "undefined") return null; // (no canvas: a headless test)
  const cv = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(seats * sp, rows * rowH) : Object.assign(document.createElement("canvas"), { width: seats * sp, height: rows * rowH });
  const c = cv.getContext("2d");
  const shirts = [teams.user.clr, teams.user.clr, teams.user.clr, teams.user.ac || "#ddd", teams.opp.clr, teams.opp.clr, "#5b6478", "#7a6a58", "#3e4a5e", "#c9c2b0"];
  const skin = ["#f1c9a5", "#d9a47c", "#a8754f", "#7a4f32", "#5c3a24"], hair = ["#2a1d14", "#4a3020", "#151515", "#8a6a3a", "#bbb"];
  for (let r = 0; r < rows; r++) {
    const y0 = r * rowH;
    c.fillStyle = "#1a202c"; c.fillRect(0, y0, cv.width, rowH); // the seat back
    c.fillStyle = "#262e3d"; c.fillRect(0, y0 + rowH - u, cv.width, u); // the step
    for (let k = 0; k < seats; k++) {
      const h = hash(k, r); if (h > 0.86) continue; // an empty seat
      const x = k * sp + (r % 2 ? u * 2 : 0) % sp, up = pose && hash(k + 7, r + 3) < 0.7, jump = up && (pose === 2) === hash(k, r + 9) < 0.5 ? u : 0;
      const shirt = shirts[Math.floor(hash(k + 1, r) * shirts.length)], sk = skin[Math.floor(hash(k + 2, r) * skin.length)];
      const by = y0 + u * 3 - jump; // body, then head on top
      c.fillStyle = shirt; c.fillRect(x, by, u * 3, u * 2);
      c.fillStyle = sk; c.fillRect(x + u / 2, by - u * 2, u * 2, u * 2);
      c.fillStyle = hair[Math.floor(hash(k + 3, r) * hair.length)]; c.fillRect(x + u / 2, by - u * 2, u * 2, Math.max(1, u / 2));
      if (up) { c.fillStyle = sk; c.fillRect(x - u / 2, by - u * 2, u, u * 2); c.fillRect(x + u * 2.5, by - u * 2, u, u * 2); } // arms up
    }
  }
  // depth: the back rows (the top of the strip) fall into shadow
  const g = c.createLinearGradient(0, 0, 0, cv.height); g.addColorStop(0, "rgba(6,8,12,.6)"); g.addColorStop(1, "rgba(6,8,12,0)");
  c.fillStyle = g; c.fillRect(0, 0, cv.width, cv.height);
  standsCache.set(key, cv); return cv;
}

// ---- the weather ----
// Falling rain or snow over the whole picture (screen space, so no state: each drop's place is a
// function of its index and the time), blown by the wind.
export function drawWeather(ctx, cam, { wx, time = 0, wind } = {}) {
  if (!wx || !(wx.rain || wx.snow)) return;
  const { W, H } = cam, k = Math.max(1, Math.round(uiPx(cam) / 2)), wx_ = (wind?.x || 0) * 6, wy_ = (wind?.y || 0) * 2;
  if (wx.rain) {
    const n = 90 * wx.rain, len = 9 * k; ctx.strokeStyle = `rgba(190,215,240,${0.28 + 0.1 * wx.rain})`; ctx.lineWidth = k; ctx.beginPath();
    for (let i = 0; i < n; i++) { const sp = 520 + hash(i, 1) * 260, x = ((hash(i, 2) * (W + 200) + (wx_ + 60) * time) % (W + 200) + W + 200) % (W + 200) - 100, y = ((hash(i, 3) * H + sp * time) % H); ctx.moveTo(x, y); ctx.lineTo(x - (wx_ + 60) * 0.03 * k, y + len); }
    ctx.stroke();
    ctx.fillStyle = `rgba(20,30,45,${0.08 * wx.rain})`; ctx.fillRect(0, 0, W, H); // a grey day
  }
  if (wx.snow) {
    const n = 110 * wx.snow;
    for (let i = 0; i < n; i++) { const sp = 30 + hash(i, 4) * 50, sz = k * (1 + Math.round(hash(i, 5) * 1.6)); const x = (((hash(i, 6) * W + (wx_ + Math.sin(time * 0.8 + i) * 12) * time) % W) + W) % W, y = (hash(i, 7) * H + sp * time) % H; ctx.fillStyle = "rgba(250,252,255,.85)"; ctx.fillRect(Math.round(x), Math.round(y), sz, sz); }
  }
}
// The conditions under the scoreboard: the sky and the wind (its speed, and an arrow for which way
// it blows relative to your drive: > at your back, < in your face).
export function drawWxChip(ctx, cam, wx, wind) {
  const px = Math.max(1, Math.round(uiPx(cam) * 0.75)), sky = wx?.label && wx.label !== "Clear" ? wx.label.toUpperCase() : "";
  const arrow = !wind?.mph ? "" : Math.abs(wind.x) >= Math.abs(wind.y) ? (wind.x > 0 ? " >" : " <") : (wind.y < 0 ? " ^" : " V");
  const text = [sky, wind?.mph ? `WIND ${wind.mph}${arrow}` : ""].filter(Boolean).join(" - "); if (!text) return;
  const w = pixWidth(text, px) + px * 6, h = px * 10, x = px * 3, y = Math.round(uiPx(cam) * 13.5);
  ctx.fillStyle = "rgba(8,10,16,.75)"; ctx.fillRect(x, y, w, h); pixText(ctx, text, x + px * 3, y + px * 2, px, "#cfe8ff");
}

// ---- the box score ----
// The final screen: the score, the two clubs' totals side by side, and your leaders (with a
// player of the game). box: { title, sub, rows: [[label, you, them]], leaders: [[role, line]], pog }.
export function drawBoxScore(ctx, cam, box, teams, { time = 0, hint = "" } = {}) {
  const { W, H } = cam, px = uiPx(cam), u = teams.user, o = teams.opp;
  ctx.fillStyle = "rgba(6,8,12,.86)"; ctx.fillRect(0, 0, W, H);
  const rowH = px * 9, pw = Math.min(W - px * 8, px * 240), ph = Math.min(H - px * 4, px * 44 + rowH * (box.rows.length + 1 + box.leaders.length) + px * 30), x0 = Math.round(W / 2 - pw / 2), y0 = Math.round(H / 2 - ph / 2);
  ctx.fillStyle = "#121826"; ctx.fillRect(x0, y0, pw, ph); ctx.fillStyle = u.clr; ctx.fillRect(x0, y0, pw, px * 2);
  pixShadow(ctx, box.title, W / 2, y0 + px * 6, Math.round(px * 1.6), "#ffd166", "center");
  pixShadow(ctx, box.sub, W / 2, y0 + px * 20, px, "#fff", "center");
  // the team totals: you | label | them
  const cx = W / 2, colW = Math.min(px * 48, pw * 0.26); let y = y0 + px * 34;
  pixText(ctx, u.ab, cx - colW, y, px, "#ffd166", "center"); pixText(ctx, o.ab, cx + colW, y, px, "#ffd166", "center"); y += rowH;
  for (const [label, a, b] of box.rows) {
    const better = typeof a === "number" && typeof b === "number" ? (/TURNOVERS|SACKED/.test(label) ? a < b : a > b) : false;
    pixText(ctx, String(a), cx - colW, y, px, better ? "#9be29b" : "#fff", "center"); pixText(ctx, label, cx, y, px, "rgba(255,255,255,.6)", "center"); pixText(ctx, String(b), cx + colW, y, px, "#fff", "center"); y += rowH;
  }
  // your leaders
  y += px * 3; ctx.fillStyle = "#2c3744"; ctx.fillRect(x0 + px * 6, y - px * 3, pw - px * 12, px);
  const fit = Math.max(1, Math.min(px, ...box.leaders.map(([r, t]) => Math.floor((pw - px * 16) / ((12 + t.length) * 6))))); // one size for all three lines
  for (const [role, text] of box.leaders) { pixText(ctx, role, x0 + px * 8, y, fit, "#7fe3ff"); pixText(ctx, text, x0 + px * 8 + 12 * 6 * fit, y, fit, "#fff"); y += rowH; }
  y += px * 3;
  if (box.pog) { const pulse = 0.6 + 0.4 * Math.sin(time * 4); pixShadow(ctx, `PLAYER OF THE GAME: ${box.pog}`, W / 2, y + px * 2, Math.max(1, Math.min(px, Math.floor((pw - px * 8) / ((box.pog.length + 20) * 6)))), `rgba(255,209,102,${pulse})`, "center"); }
  if (hint) pixText(ctx, hint, W / 2, y0 + ph - px * 9, Math.max(1, px - 1), "rgba(255,255,255,.6)", "center");
}

// ---- the sidelines ----
// Each club's team area between the 30s: a bench, a cup table, a couple of orange water coolers and
// a row of players standing, hands on hips, a few taking a knee; yours on the near sideline, theirs
// across the field. They're placed on the field, so they scroll with it; your side jumps on a big play.
const SIDE_POSES = ["c8", "c8", "c6", "a3", "c8", "c4", "c8", "c6", "c8"];
function cooler(ctx, cam, x, y) {
  const [sx, sy] = cam.toScreen(x, y), s = cam.s, w = Math.max(4, Math.round(s * 0.75)), h = Math.max(5, Math.round(s * 0.9));
  ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(Math.round(sx - w / 2), Math.round(sy - 1), w, Math.max(2, Math.round(s * 0.15)));
  ctx.fillStyle = "#f07a14"; ctx.fillRect(Math.round(sx - w / 2), Math.round(sy - h), w, h); // the orange barrel
  ctx.fillStyle = "#c95f08"; ctx.fillRect(Math.round(sx + w / 2 - Math.max(1, w / 4)), Math.round(sy - h), Math.max(1, Math.round(w / 4)), h); // its shaded side
  ctx.fillStyle = "#f4f4f0"; ctx.fillRect(Math.round(sx - w / 2 - 1), Math.round(sy - h - Math.max(2, s * 0.18)), w + 2, Math.max(2, Math.round(s * 0.18))); // the white lid
  ctx.fillStyle = "#f4f4f0"; ctx.fillRect(Math.round(sx - w / 2), Math.round(sy - h * 0.55), w, Math.max(1, Math.round(s * 0.08))); // a white band
  ctx.fillStyle = "#d8d8d0"; ctx.fillRect(Math.round(sx - w / 2 - Math.max(1, s * 0.12)), Math.round(sy - h * 0.3), Math.max(1, Math.round(s * 0.12)), Math.max(1, Math.round(s * 0.12))); // the spigot
}
function sideTeam(ctx, cam, team, away, near, opts) {
  const s = cam.s, y0 = near ? HALF + 1.7 : -HALF - 1.2, back = near ? 1 : -1; // (the bench sits further from the field than the players)
  // the bench: a long grey seat with legs
  const [bx0, by] = cam.toScreen(36, y0 + back * 1.3), [bx1] = cam.toScreen(64, y0 + back * 1.3);
  ctx.fillStyle = "#59606d"; ctx.fillRect(Math.round(bx0), Math.round(by - s * 0.55), Math.round(bx1 - bx0), Math.max(2, Math.round(s * 0.22)));
  ctx.fillStyle = "#3d434e"; for (let x = bx0 + s; x < bx1; x += s * 4) ctx.fillRect(Math.round(x), Math.round(by - s * 0.35), Math.max(1, Math.round(s * 0.12)), Math.round(s * 0.35));
  // the cup table and the coolers at one end of the bench
  const [tx, ty] = cam.toScreen(65.5, y0 + back * 0.9); ctx.fillStyle = "#ececec"; ctx.fillRect(Math.round(tx - s * 0.9), Math.round(ty - s * 0.6), Math.round(s * 1.8), Math.max(2, Math.round(s * 0.18)));
  ctx.fillStyle = "#3d434e"; ctx.fillRect(Math.round(tx - s * 0.8), Math.round(ty - s * 0.45), Math.max(1, Math.round(s * 0.1)), Math.round(s * 0.45)); ctx.fillRect(Math.round(tx + s * 0.7), Math.round(ty - s * 0.45), Math.max(1, Math.round(s * 0.1)), Math.round(s * 0.45));
  for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? "#ffffff" : "#e2e2e2"; ctx.fillRect(Math.round(tx - s * 0.75 + i * s * 0.32), Math.round(ty - s * 0.85), Math.max(1, Math.round(s * 0.18)), Math.max(2, Math.round(s * 0.25))); }
  cooler(ctx, cam, 67.3, y0 + back * 0.9); cooler(ctx, cam, 68.4, y0 + back * 1.1); cooler(ctx, cam, 34.5, y0 + back * 1.0);
  // the players: along the bench, facing the play
  const hype = near ? opts.hype || 0 : 0, t = opts.time || 0;
  for (let i = 0; i < SIDE_POSES.length; i++) {
    const x = 37 + i * 3.1 + hash(i, near ? 1 : 2) * 1.2, y = y0 + (hash(i, 5) - 0.5) * 0.8, jump = hype > 0.3 && hash(i, 8) < 0.8;
    const pose = jump ? (Math.floor(t * 6 + i) % 2 ? "b8" : "b7") : SIDE_POSES[i];
    const facing = (opts.ballX ?? 50) >= x ? 1 : -1;
    shadow(ctx, cam, x, y, 0.55);
    sprite(ctx, cam, team, away, pose, x, y - (jump && Math.floor(t * 6 + i) % 2 ? 0.25 : 0), facing, true, 0.75);
  }
}
export function drawSidelines(ctx, cam, teams, opts = {}) {
  if (!teams?.user || !teams?.opp) return;
  sideTeam(ctx, cam, teams.opp, true, false, opts); // theirs, across the field (behind the play)
  sideTeam(ctx, cam, teams.user, false, true, opts); // yours, on the near sideline
}

export function drawRetro(ctx, cam, S, teams, g, opts = {}) {
  const { W, H, s, top, depth } = cam;
  ctx.imageSmoothingEnabled = false;
  // the stands: tiers of fans above the far sideline (and below the near one on a tall screen)
  ctx.fillStyle = "#121620"; ctx.fillRect(0, 0, W, H);
  const px = Math.max(2, Math.round(s * 0.18)), nearEdge = top + depth + s * 1.2, wallTop = top - s * 0.9;
  const time = opts.time || 0, hype = opts.hype || 0;
  // calm until something happens; then the crowd is up, arms in the air, bouncing
  const cheer = hype > 0.15 ? 1 + (Math.floor(time * 8) % 2) : 0;
  const tile = standsTile(px, Math.max(wallTop, H - nearEdge), teams, cheer);
  if (tile) { const ox = -(((cam.camX * s * 0.5) % tile.width) + tile.width) % tile.width; // the stands scroll at half the field's speed
  for (let x = ox; x < W; x += tile.width) {
    if (wallTop > 0) ctx.drawImage(tile, Math.round(x), Math.round(wallTop - tile.height));
    if (H - nearEdge > px) ctx.drawImage(tile, Math.round(x), Math.round(nearEdge));
  } }
  // the wall and the far sideline
  ctx.fillStyle = "#3b3f4a"; ctx.fillRect(0, top - s * 0.9, W, s * 0.9);
  // the grass, striped every five yards
  const yardAt = (x) => W * 0.42 + (x - cam.camX) * s;
  for (let yd = -10; yd < 110; yd += 5) {
    const x0 = yardAt(yd), x1 = yardAt(yd + 5); if (x1 < 0 || x0 > W) continue;
    ctx.fillStyle = yd < 0 ? teams.user.clr : yd >= 100 ? teams.opp.clr : ((yd / 5) % 2 ? "#3f8f3a" : "#45993f");
    ctx.fillRect(Math.round(x0), Math.round(top), Math.round(x1 - x0) + 1, Math.round(depth));
  }
  // the weather on the turf: rain darkens and slicks it, snow lies on it (heavier snow, more of it)
  const WX = opts.wx || {};
  if (WX.rain) { ctx.fillStyle = `rgba(10,30,45,${0.12 * WX.rain})`; ctx.fillRect(0, Math.round(top), W, Math.round(depth)); }
  if (WX.snow) {
    ctx.fillStyle = `rgba(236,242,250,${0.22 + 0.2 * WX.snow})`; ctx.fillRect(0, Math.round(top), W, Math.round(depth));
    // drifts: soft white patches that stay put on the field as it scrolls
    for (let i = 0; i < 40 * WX.snow; i++) { const fx_ = hash(i, 3) * 120 - 10, fy = hash(i, 7) * 53.3 - HALF, [sx0, sy0] = cam.toScreen(fx_, fy); if (sx0 < -60 || sx0 > W + 60) continue; ctx.fillStyle = "rgba(248,250,255,.35)"; ctx.fillRect(Math.round(sx0), Math.round(sy0), Math.round(s * (1.5 + hash(i, 9) * 3)), Math.max(2, Math.round(s * 0.35))); }
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
  // the throw you're lining up: its real path (a flat bullet or a high lob), where it comes down,
  // and how far off it might be; in AUTO, a faint ring shows where it changes from bullet to lob
  if (S.aim && S.phase === "live" && S.ball.holder === "QB") drawAim(ctx, cam, S, opts.passKind || "auto");
  // the team areas along both sidelines: benches, coolers, the cup table and the players watching
  drawSidelines(ctx, cam, teams, { ...opts, ballX: S.ball?.x });
  // players, far to near so the near ones overlap the far ones; the man with the ball on top
  const ents = Object.values(S.ents).sort((a, b) => (a.key === S.ball.holder) - (b.key === S.ball.holder) || a.y - b.y);
  for (const e of ents) {
    const t = e.side === "off" ? teams.user : teams.opp, away = e.side === "def";
    const facing = Math.abs(e.vx) > 0.5 ? Math.sign(e.vx) : e.side === "off" ? 1 : -1;
    shadow(ctx, cam, e.x, e.y);
    const [pose, act] = poseFor(S, e, S.t), p2 = pose2(S, e, S.t);
    const ok = (p2 && sprite2(ctx, cam, t, away, p2.n, e.x, e.y, p2.face ?? facing)) || sprite(ctx, cam, t, away, pose, e.x, e.y, facing, act) || sprite(ctx, cam, t, away, POSE[e.p.pos] || "db", e.x, e.y, facing, false);
    if (!ok) { const [sx, sy] = cam.toScreen(e.x, e.y); ctx.fillStyle = t.clr; ctx.fillRect(sx - s * 0.5, sy - s * 2.2, s, s * 2.2); }
    if (opts.ring && S.ball.holder === e.key && S.phase !== "presnap") { const [sx, sy] = cam.toScreen(e.x, e.y); ctx.strokeStyle = "#fff"; ctx.lineWidth = Math.max(1, s * 0.08); ctx.beginPath(); ctx.ellipse(sx, sy, s * 1.1, s * 1.1 * SQUASH, 0, 0, Math.PI * 2); ctx.stroke(); }
  }
  // what just happened up front: BLITZ, the move that beat a blocker, PICKED UP
  for (const f of S.flash || []) {
    if (S.t > f.until) continue; const e = S.ents[f.key]; if (!e) continue;
    const [fx, fy] = cam.toScreen(e.x, e.y), fp = Math.max(1, Math.round(s * 0.09)), w = pixWidth(f.text, fp) + fp * 4;
    ctx.fillStyle = "rgba(8,10,16,.8)"; ctx.fillRect(Math.round(fx - w / 2), Math.round(fy - PLAYER_H * s - fp * 11), w, fp * 9);
    pixText(ctx, f.text, fx, Math.round(fy - PLAYER_H * s - fp * 10), fp, f.text === "PICKED UP" ? "#7fd4ff" : "#ffd166", "center");
  }
  // the ball in flight, or on the turf after an incompletion (the art holds it otherwise)
  const b = S.ball;
  if (b.flight) {
    (S.trail ||= []).push(cam.toScreen(b.x, b.y).concat([(b.h || 0) * s * 1.1 + PLAYER_H * s * 0.55])); if (S.trail.length > 9) S.trail.shift();
    S.trail.forEach(([tx, ty, tl], i) => { ctx.globalAlpha = (i / S.trail.length) * 0.45; ctx.fillStyle = b.flight.bullet ? "#bfefff" : "#fff2c4"; const d = Math.max(2, Math.round(s * 0.18 * (i / S.trail.length))); ctx.fillRect(Math.round(tx - d / 2), Math.round(ty - tl - d / 2), d, d); });
    ctx.globalAlpha = 1;
  } else S.trail = null;
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

// ---- the aim ----
export const KIND_COLOR = { bullet: "#7fe3ff", lob: "#ffd166" };
function drawAim(ctx, cam, S, kind) {
  const { s } = cam, qb = S.ents.QB, plan = passPlan(S, S.aim, kind), col = KIND_COLOR[plan.kind];
  const [qx, qy] = cam.toScreen(qb.x, qb.y), [ax, ay] = cam.toScreen(plan.land.x, plan.land.y), hand = PLAYER_H * s * 0.62;
  // in AUTO, the bullet range: inside it you get a bullet, outside a lob
  if (kind === "auto") { const [lx, l1] = cam.toScreen(S.los + BULLET_RANGE, -HALF), [, l2] = cam.toScreen(S.los + BULLET_RANGE, HALF); ctx.strokeStyle = "rgba(127,227,255,.28)"; ctx.lineWidth = Math.max(1, s * 0.08); ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.moveTo(lx, l1); ctx.lineTo(lx, l2); ctx.stroke(); ctx.setLineDash([]); }
  // the path, dot by dot, at its real height: a bullet barely rises, a lob climbs
  const n = 18, peak = plan.arc * s * 1.1;
  for (let i = 1; i < n; i++) {
    const u = i / n, x = qx + (ax - qx) * u, y = qy + (ay - qy) * u - hand * (1 - u) - peak * 4 * u * (1 - u), d = Math.max(2, Math.round(uiPx(cam) * (plan.bullet ? 1.2 : 1.5)));
    ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(Math.round(x - d / 2) + 1, Math.round(y - d / 2) + 1, d, d);
    ctx.fillStyle = col; ctx.fillRect(Math.round(x - d / 2), Math.round(y - d / 2), d, d);
  }
  // the landing spot: a ring sized to how far a throw like this tends to drift
  const r = s * (plan.bullet ? 0.9 : 1.3) * (0.7 + plan.dist / 40);
  ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, s * 0.12); ctx.beginPath(); ctx.ellipse(ax, ay, r, r * 0.42, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 0.25; ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = 1;
  ctx.fillStyle = col; ctx.fillRect(Math.round(ax - 2), Math.round(ay - 2), 4, 4);
  // the label: BULLET or LOB (AUTO when the game picked it), and a warning when he can't reach it
  const px = uiPx(cam), label = (plan.auto ? "AUTO " : "") + plan.kind.toUpperCase() + (plan.short ? " - TOO FAR" : plan.bullet && plan.dist > BULLET_MAX ? " - WILD" : "");
  const w = pixWidth(label, px) + px * 4, flip = ax + r + px * 3 + w > cam.W, lx = Math.round(flip ? ax - r - px * 3 - w : ax + r + px * 3), ly = Math.round(ay - px * 4.5);
  ctx.fillStyle = "rgba(8,10,16,.85)"; ctx.fillRect(lx, ly, w, px * 9); ctx.fillStyle = col; ctx.fillRect(lx, ly + px * 9 - px, w, px);
  pixText(ctx, label, lx + w / 2, ly + px, px, plan.short ? "#ff8a7a" : col, "center");
}

// ---- the scoreboard ----
// Retro Bowl's score bug: both clubs with their scores and timeouts, the quarter and clock in the
// middle, and under it the down and distance and where the ball is.
// one scale for every piece of text and every button: a pixel of the 5x7 font is this many screen
// pixels (2 on a phone, 3-4 on a laptop, 5-6 on a big monitor)
export const uiPx = (cam) => Math.max(2, Math.round(Math.min(cam.W / 380, cam.H / 215)));
const hudPx = uiPx;
export function drawHud(ctx, cam, sit, teams, { ot, to } = {}) {
  const { W } = cam, px = hudPx(cam), h = px * 7, pad = px * 2;
  const bar = h + pad * 2;
  ctx.fillStyle = "#0b0e14"; ctx.fillRect(0, 0, W, bar); ctx.fillStyle = "#1c2433"; ctx.fillRect(0, bar - px, W, px);
  const box = (x, t, n, right, poss, tos) => {
    const w = px * 6 * 3 + pad * 2, bx = right ? x - w : x;
    ctx.fillStyle = t.clr; ctx.fillRect(bx, px, w, bar - px * 3); ctx.fillStyle = t.ac; ctx.fillRect(bx, bar - px * 2, w, px);
    pixShadow(ctx, t.ab, bx + w / 2, pad, px, "#fff", "center");
    const sx = right ? bx - pad : bx + w + pad;
    pixShadow(ctx, n, sx, pad, px, "#fff", right ? "right" : "left");
    // possession: a little football beside the score
    const nw = pixWidth(n, px), fx = right ? sx - nw - pad * 2.5 : sx + nw + pad;
    if (poss) { ctx.fillStyle = "#a0552a"; ctx.fillRect(fx, pad + px * 2, px * 3, px * 3); ctx.fillStyle = "#fff"; ctx.fillRect(fx + px, pad + px * 2, px, px * 3); }
    // timeouts: three pips under the club
    for (let i = 0; i < 3; i++) { ctx.fillStyle = i < (tos ?? 3) ? "#ffd166" : "#3a4258"; ctx.fillRect(bx + pad + i * px * 3, bar - px * 2, px * 2, px); }
  };
  box(pad, teams.user, sit.score.h, false, sit.poss === "h" && !sit.done, to?.h); box(W - pad, teams.opp, sit.score.a, true, sit.poss === "a" && !sit.done, to?.a);
  const clock = `${Math.floor(sit.clock / 60)}:${String(sit.clock % 60).padStart(2, "0")}`;
  pixShadow(ctx, `${sit.ot || ot ? "OT" : "Q" + sit.qtr}  ${clock}`, W / 2, pad, px, "#ffd166", "center");
  return bar;
}
export function drawDownBox(ctx, cam, text, color = "#fff") {
  const { W } = cam, px = hudPx(cam), h = px * 7, pad = px * 2, bar = h + pad * 2;
  const w = pixWidth(text, px) + pad * 3;
  ctx.fillStyle = "#0b0e14"; ctx.fillRect(Math.round(W / 2 - w / 2), bar - px, Math.round(w), h + pad + px);
  ctx.fillStyle = "#1c2433"; ctx.fillRect(Math.round(W / 2 - w / 2), bar + h + pad - px, Math.round(w), px);
  pixShadow(ctx, text, W / 2, bar + pad / 2, px, color, "center");
}

// ---- the result banner ----
// It slides in across the field: the result big in the club's colours, the play-by-play under it.
// `age` is how long it has been up, for the slide and the pulse.
export function drawBanner(ctx, cam, title, text, sub, color, { age = 1, accent = "#ffd166", hint = "TAP TO CONTINUE" } = {}) {
  const { W, H, s } = cam, big = /TOUCHDOWN|WIN|INTERCEPT|FIELD GOAL|SAFETY/.test(title);
  const u = uiPx(cam), px = big ? u * 2 : Math.round(u * 1.5), px2 = u; void s;
  const lines = wrap(text, Math.floor((W - s * 2) / (6 * px2))).slice(0, 3);
  const h = px * 7 + px * 4 + px2 * 8 * lines.length + (sub ? px2 * 9 : 0) + px * 3;
  const ease = (u) => 1 - Math.pow(1 - Math.min(1, u), 3);
  const slide = ease(age / 0.28), y = Math.round(H * 0.5 - h / 2), x0 = Math.round((1 - slide) * -W);
  ctx.save(); ctx.translate(x0, 0);
  ctx.fillStyle = "rgba(8,10,16,.93)"; ctx.fillRect(0, y, W, h);
  ctx.fillStyle = color; ctx.fillRect(0, y, W, px); ctx.fillRect(0, y + h - px, W, px);
  const pulse = big ? 1 + Math.max(0, 0.25 - age) * 1.2 : 1, tpx = Math.max(2, Math.round(px * pulse));
  pixShadow(ctx, title, W / 2, y + px * 2.5, tpx, accent, "center", color);
  lines.forEach((l, i) => pixShadow(ctx, l, W / 2, y + px * 2.5 + tpx * 7 + px * 1.5 + i * px2 * 8, px2, "#fff", "center"));
  if (sub) pixText(ctx, sub, W / 2, y + h - px2 * 7 - px * 1.8, px2, "#9aa7b2", "center");
  ctx.restore();
  if (hint && age > 0.6) { ctx.globalAlpha = 0.5 + 0.3 * Math.sin(age * 5); pixText(ctx, hint, W / 2, y + h + px2 * 2, px2, "#fff", "center"); ctx.globalAlpha = 1; }
}
const wrap = (text, n) => { const out = []; let line = ""; for (const w of String(text).split(" ")) { if ((line + " " + w).trim().length > n) { out.push(line.trim()); line = w; } else line += " " + w; } if (line.trim()) out.push(line.trim()); return out; };

// ---- the play call ----
// Play cards along the bottom, each with the play's routes drawn on it, Retro Bowl style. A key
// number on each for the keyboard. Returns the hit boxes.
export function drawPlayCards(ctx, cam, heading, items, color, { keys = false, hover = null } = {}) {
  const { W, H } = cam, px = hudPx(cam), small = W < 560;
  const cols = small ? 3 : Math.min(6, items.length), rows = Math.ceil(items.length / cols), gap = px * 2;
  const cw = Math.min(px * 54, (W - gap * (cols + 1)) / cols), ch = Math.round(cw * (small ? 0.72 : 0.6)), total = cols * cw + (cols - 1) * gap;
  const top = H - rows * (ch + gap) - gap - px * 10, left = (W - total) / 2;
  ctx.fillStyle = "rgba(8,10,16,.9)"; ctx.fillRect(0, top - px * 3, W, H - top + px * 3);
  ctx.fillStyle = color; ctx.fillRect(0, top - px * 3, W, px);
  pixShadow(ctx, heading, W / 2, top, px, "#ffd166", "center");
  const boxes = [];
  items.forEach(([key, label, kind, shows], i) => {
    const c = i % cols, r = Math.floor(i / cols), x = Math.round(left + c * (cw + gap)), y = Math.round(top + px * 10 + r * (ch + gap));
    const on = hover === key;
    ctx.fillStyle = on ? "#2a3550" : "#161d2b"; ctx.fillRect(x, y, cw, ch);
    ctx.fillStyle = on ? "#ffd166" : "#2c3744"; ctx.fillRect(x, y, cw, px); ctx.fillRect(x, y, px, ch);
    ctx.fillStyle = "#06080d"; ctx.fillRect(x, y + ch - px, cw, px); ctx.fillRect(x + cw - px, y, px, ch);
    // the diagram: a strip of turf with the line of scrimmage, the formation and the routes
    const dx = x + px * 3, dy = y + px * 3, dw = cw - px * 6, dh = ch - px * 13;
    ctx.fillStyle = kind === "kick" ? "#2a5a2a" : "#2f6b2c"; ctx.fillRect(dx, dy, dw, dh);
    if (kind !== "kick") {
      ctx.save(); ctx.beginPath(); ctx.rect(dx, dy, dw, dh); ctx.clip(); // long routes run off the card, not into the next one
      const sx = dw / 34, sy = dh / 52, ox = dx + dw * 0.32, oy = dy + dh / 2, P = (q) => [ox + q.x * sx, oy + q.y * sy];
      ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(Math.round(ox), dy, 1, dh);
      const D = playDiagram(shows || key);
      for (const [k, [sxp, syp]] of Object.entries(D.spots)) { const [a, b] = P({ x: sxp, y: syp }); ctx.fillStyle = k === "QB" ? "#ffd166" : "#fff"; ctx.fillRect(Math.round(a - 1), Math.round(b - 1), 3, 3); }
      ctx.lineWidth = Math.max(1, px * 0.6);
      for (const l of D.lines) {
        ctx.strokeStyle = l.run ? "#ffd166" : "#7fe3ff"; ctx.beginPath(); l.pts.forEach((q, j) => { const [a, b] = P(q); if (j) ctx.lineTo(a, b); else ctx.moveTo(a, b); }); ctx.stroke();
        const [ea, eb] = P(l.pts[l.pts.length - 1]); ctx.fillStyle = ctx.strokeStyle; ctx.fillRect(Math.round(ea - 1.5), Math.round(eb - 1.5), 3, 3);
      }
      ctx.restore();
    } else { // the kick: uprights
      const gx = dx + dw * 0.7, gy = dy + dh * 0.75; ctx.fillStyle = "#ffd700"; ctx.fillRect(gx - 1, gy - dh * 0.5, 2, dh * 0.5); ctx.fillRect(gx - dw * 0.1, gy - dh * 0.5, dw * 0.2, 2); ctx.fillRect(gx - dw * 0.1, gy - dh * 0.75, 2, dh * 0.25); ctx.fillRect(gx + dw * 0.1 - 2, gy - dh * 0.75, 2, dh * 0.25);
    }
    const lp = Math.max(1, Math.min(px, Math.floor((cw - px * 4) / (6 * label.length))));
    pixShadow(ctx, label, x + cw / 2, y + ch - px * 5 - lp * 4, lp, on ? "#ffd166" : "#fff", "center");
    if (keys) pixText(ctx, String(i + 1), x + px * 3, y + px * 3, px, "rgba(255,209,102,.9)");
    boxes.push({ key, x, y, w: cw, h: ch });
  });
  return boxes;
}

// ---- small on-screen buttons (the pass type, pause) ----
export function drawChip(ctx, cam, x, y, label, { color = "#fff", active = false, align = "left", big = false } = {}) {
  // (on a touch screen a button is at least a thumb wide and tall: ~48 px)
  const px = hudPx(cam), pad = big ? Math.max(px * 6, Math.round((48 - px * 7) / 2)) : px * 3, w = Math.max(pixWidth(label, px) + pad * 2, big ? 56 : 0), h = px * 7 + pad * (big ? 2 : 1.33), bx = Math.round(align === "right" ? x - w : x);
  ctx.fillStyle = active ? "rgba(26,34,52,.95)" : "rgba(8,10,16,.8)"; ctx.fillRect(bx, y, w, h);
  ctx.fillStyle = color; ctx.fillRect(bx, y + h - px, w, px);
  pixText(ctx, label, bx + w / 2, Math.round(y + (h - px * 7) / 2), px, color, "center");
  return { x: bx, y, w, h };
}
// A segmented switch (BULLET | LOB): each side is its own button, the chosen one lit in its
// colour. Returns a box per side, keyed by item.
export function drawSwitch(ctx, cam, x, y, items, pick, { big = false } = {}) {
  const px = hudPx(cam), pad = big ? Math.max(px * 6, Math.round((48 - px * 7) / 2)) : px * 3, h = px * 7 + pad * (big ? 2 : 1.33);
  const w = Math.max(...items.map((it) => pixWidth(it.label, px))) + pad * 2, boxes = {};
  ctx.fillStyle = "rgba(8,10,16,.85)"; ctx.fillRect(x - px, y - px, w * items.length + px * 2, h + px * 2);
  items.forEach((it, i) => {
    const bx = x + i * w, on = it.key === pick;
    ctx.fillStyle = on ? it.color : "rgba(26,34,52,.95)"; ctx.fillRect(bx, y, w - (i < items.length - 1 ? px : 0), h);
    pixText(ctx, it.label, bx + w / 2, Math.round(y + (h - px * 7) / 2), px, on ? "#0b0e14" : it.color, "center");
    boxes[it.key] = { x: bx, y, w, h };
  });
  return boxes;
}
export function drawHint(ctx, cam, text, y) {
  const px = Math.max(1, Math.min(Math.max(2, Math.round(hudPx(cam) * 0.9)), Math.floor((cam.W - 12) / (String(text).length * 6 + 6)))), w = pixWidth(text, px) + px * 6; // shrinks to fit a narrow screen
  ctx.fillStyle = "rgba(8,10,16,.7)"; ctx.fillRect(Math.round(cam.W / 2 - w / 2), Math.round(y - px * 2), Math.round(w), px * 11);
  pixText(ctx, text, cam.W / 2, y, px, "#fff", "center");
}

// ---- the title screen and team picker ----
const logos = {};
const logo = (ab) => { if (!logos[ab]) { const im = new Image(); im.src = `${import.meta.env?.BASE_URL ?? "/"}logos/${ab}.png`; logos[ab] = im; } return logos[ab]; };
export function drawMenu(ctx, cam, opts) {
  const { teams, user, opp, time, focus, mobile } = opts;
  const { W, H } = cam, px = uiPx(cam), u = teams[user], o = teams[opp];
  // a night sky over the stadium, and the crowd
  ctx.fillStyle = "#0b0e14"; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) { const n = Math.sin(i * 91.7) * 43758.5, f = n - Math.floor(n), g = Math.sin(i * 12.3) * 9999 % 1; ctx.fillStyle = `rgba(255,255,255,${0.2 + 0.5 * Math.abs(Math.sin(time * 1.5 + i))})`; ctx.fillRect(Math.round(f * W), Math.round(Math.abs(g) * H * 0.35), 2, 2); }
  const cy = H * 0.62;
  { const tile = standsTile(px, H - cy, { user: u, opp: o }, 0); if (tile) for (let x = -((time * 6) % tile.width); x < W; x += tile.width) ctx.drawImage(tile, Math.round(x), Math.round(cy)); } // the same stands as the game, drifting slowly
  // the title
  const tp = px * 2.2;
  pixShadow(ctx, "GRIDIRON", W / 2, H * 0.07, Math.round(tp), "#ffd166", "center", "#7a3b00");
  pixShadow(ctx, "ARCADE", W / 2, H * 0.07 + tp * 9, Math.round(tp * 0.8), "#fff", "center", "#30405a");
  // the two clubs, each with a logo and arrows to change it
  const boxes = [], cardW = Math.min(W * 0.36, px * 90), cardH = Math.min(H * 0.34, px * 66), gy = H * 0.3;
  const card = (t, cx, label, which) => {
    const x = Math.round(cx - cardW / 2), y = Math.round(gy), on = focus === which;
    ctx.fillStyle = t.clr; ctx.fillRect(x, y, cardW, cardH); ctx.fillStyle = t.ac; ctx.fillRect(x, y + cardH - px * 2, cardW, px * 2);
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(x, y, cardW, px * 10);
    if (on) { ctx.strokeStyle = "#ffd166"; ctx.lineWidth = px; ctx.strokeRect(x - px, y - px, cardW + px * 2, cardH + px * 2); }
    pixText(ctx, label, cx, y + px * 2, px, "rgba(255,255,255,.8)", "center");
    const im = logo(t.ab), ls = Math.min(cardW * 0.5, cardH - px * 38);
    ctx.fillStyle = "rgba(255,255,255,.88)"; ctx.beginPath(); ctx.arc(cx, y + px * 12 + ls / 2, ls * 0.56, 0, Math.PI * 2); ctx.fill(); // a light disc, so every club's logo reads
    if (im.complete && im.naturalWidth) { ctx.imageSmoothingEnabled = true; ctx.drawImage(im, cx - ls / 2, y + px * 12, ls, ls); ctx.imageSmoothingEnabled = false; }
    else pixShadow(ctx, t.ab, cx, y + px * 12 + ls / 2 - px * 5, px * 2, "#fff", "center");
    pixShadow(ctx, t.city, cx, y + cardH - px * 20, px, "rgba(255,255,255,.85)", "center");
    pixShadow(ctx, t.name, cx, y + cardH - px * 12, Math.round(px * 1.4), "#fff", "center");
    const aw = px * 9, ay = y + cardH / 2 - aw / 2;
    for (const [dir, ax] of [[-1, x - aw - px * 2], [1, x + cardW + px * 2]]) { ctx.fillStyle = "rgba(8,10,16,.8)"; ctx.fillRect(ax, ay, aw, aw); pixText(ctx, dir < 0 ? "<" : ">", ax + aw / 2, ay + px, px, "#ffd166", "center"); boxes.push({ key: `${which}${dir}`, x: ax, y: ay, w: aw, h: aw }); }
  };
  card(u, W * 0.27, "YOU", "user"); card(o, W * 0.73, "OPPONENT", "opp");
  pixShadow(ctx, "VS", W / 2, gy + cardH / 2 - px * 4, Math.round(px * 1.6), "#ffd166", "center");
  // kick off
  const kw = px * 60, kh = px * 14, kx = Math.round(W / 2 - kw / 2), ky = Math.round(gy + cardH + px * 10), pulse = 0.5 + 0.5 * Math.sin(time * 4);
  ctx.fillStyle = u.clr; ctx.fillRect(kx, ky, kw, kh); ctx.fillStyle = `rgba(255,209,102,${0.5 + pulse * 0.5})`; ctx.fillRect(kx, ky + kh - px * 2, kw, px * 2);
  pixShadow(ctx, "KICK OFF", W / 2, ky + px * 3, Math.round(px * 1.4), "#fff", "center");
  boxes.push({ key: "go", x: kx, y: ky, w: kw, h: kh });
  // the game's length: tap to cycle the quarter length
  if (opts.qMin) { const label = `QUARTERS: ${opts.qMin} MIN`, lw = pixWidth(label, px) + px * 8, lh = px * 11, lx = Math.round(W / 2 - lw - px * 2), ly = ky + kh + px * 4; ctx.fillStyle = "rgba(8,10,16,.8)"; ctx.fillRect(lx, ly, lw, lh); ctx.fillStyle = "#2c3744"; ctx.fillRect(lx, ly + lh - px, lw, px); pixText(ctx, label, lx + lw / 2, ly + px * 2, px, "#fff", "center"); boxes.push({ key: "len", x: lx, y: ly, w: lw, h: lh });
    if (opts.wxPick) { const wl = `WEATHER: ${opts.wxPick.toUpperCase()}`, ww = pixWidth(wl, px) + px * 8, wx0 = Math.round(W / 2 + px * 2); ctx.fillStyle = "rgba(8,10,16,.8)"; ctx.fillRect(wx0, ly, ww, lh); ctx.fillStyle = "#2c3744"; ctx.fillRect(wx0, ly + lh - px, ww, px); pixText(ctx, wl, wx0 + ww / 2, ly + px * 2, px, "#fff", "center"); boxes.push({ key: "wx", x: wx0, y: ly, w: ww, h: lh }); } }
  // full screen (or, on an iPhone, how to get it)
  if (opts.fs) { const label = opts.fs === "ios" ? "FULL SCREEN: SHARE > ADD TO HOME SCREEN" : opts.fs === "on" ? "EXIT FULL SCREEN" : mobile ? "FULL SCREEN" : "FULL SCREEN (F)"; const bw = pixWidth(label, px) + px * 6, bh = px * 11, bx = W - px * 3 - bw; ctx.fillStyle = "rgba(8,10,16,.8)"; ctx.fillRect(bx, px * 3, bw, bh); pixText(ctx, label, bx + bw / 2, px * 5, px, "#ffd166", "center"); if (opts.fs !== "ios") boxes.push({ key: "fs", x: bx, y: px * 3, w: bw, h: bh }); }
  // back to the GM game
  { const bw = pixWidth("< FOOTBALL GM", px) + px * 6, bh = px * 11; ctx.fillStyle = "rgba(8,10,16,.8)"; ctx.fillRect(px * 3, px * 3, bw, bh); pixText(ctx, "< FOOTBALL GM", px * 3 + bw / 2, px * 5, px, "rgba(255,255,255,.8)", "center"); boxes.push({ key: "gm", x: px * 3, y: px * 3, w: bw, h: bh }); }
  { const t = mobile ? "TAP THE ARROWS TO PICK YOUR TEAMS" : "ARROW KEYS OR CLICK TO PICK - TAB SWITCHES - ENTER PLAYS", hp = Math.max(1, Math.min(px, Math.floor((W - px * 4) / (6 * t.length)))); pixText(ctx, t, W / 2, H - hp * 10, hp, "rgba(255,255,255,.65)", "center"); }
  return boxes;
}

// ---- the pause menu ----
export function drawPause(ctx, cam, items, { mobile } = {}) {
  const { W, H } = cam, px = hudPx(cam) + 1;
  ctx.fillStyle = "rgba(4,6,10,.82)"; ctx.fillRect(0, 0, W, H);
  pixShadow(ctx, "PAUSED", W / 2, H * 0.08, px * 2, "#ffd166", "center");
  const help = mobile ? ["TOUCH THE FIELD TO SNAP", "PULL BACK AND RELEASE TO THROW", "TAP BULLET OR LOB TO PICK THE THROW", "SWIPE TO STEER - FLICK SIDEWAYS TO JUKE, AHEAD TO DIVE"]
    : ["SPACE OR CLICK TO SNAP", "AIM WITH THE MOUSE - CLICK TO THROW", "Q OR THE BUTTONS: BULLET OR LOB", "RUN: MOUSE OR W/S - SPACE JUKES - E DIVES", "KICK: HOLD THE MOUSE, AIM, RELEASE", "1-6 PICK A PLAY - M MUTES - ESC PAUSES"];
  const hp = Math.max(1, Math.min(px - 1, Math.floor((H * 0.3) / (help.length * 9)), ...help.map((t) => Math.floor((W - px * 6) / (6 * t.length))))); // (fits across, and in the bottom third)
  // the buttons get whatever room the title and the help leave (so it all fits on a short screen)
  const top0 = H * 0.08 + px * 18, room = H - top0 - help.length * hp * 9 - px * 6, gap = px * 2;
  const bh = Math.max(px * 8, Math.min(px * 12, Math.floor(room / items.length) - gap)), bw = Math.max(px * 56, ...items.map(([, l]) => pixWidth(l, px) + px * 10)), boxes = [];
  const yAt = (i) => Math.round(top0 + i * (bh + gap));
  items.forEach(([key, label], i) => { const x = Math.round(W / 2 - bw / 2), y = yAt(i); ctx.fillStyle = "#161d2b"; ctx.fillRect(x, y, bw, bh); ctx.fillStyle = "#2c3744"; ctx.fillRect(x, y + bh - px, bw, px); pixText(ctx, label, W / 2, y + px * 3, px, "#fff", "center"); boxes.push({ key, x, y, w: bw, h: bh }); });
  const hy = yAt(items.length) + px * 3;
  help.forEach((t, i) => pixText(ctx, t, W / 2, hy + i * hp * 9, hp, "rgba(255,255,255,.7)", "center"));
  return boxes;
}
