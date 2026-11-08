// The Retro Bowl look: a side-on pixel field that scrolls as the offense drives right, the clubs'
// own pixel sprites (public/sprites, the sheets the live field uses), a bitmap scoreboard and the
// pull-back throw's dotted arc. Everything is drawn on one canvas with smoothing off so the pixels
// stay crisp. Field units from play.js: x yards downfield (0-100), y lateral (-26.65..26.65).
import SHEETS from "../pixel/teamSprites.json" with { type: "json" };
import ACTS from "../pixel/actionSprites.json" with { type: "json" };
import ACTS2 from "../pixel/actionSprites2.json" with { type: "json" };
import SCENE from "../pixel/sceneSprites.json" with { type: "json" };
import { teamKey } from "../teamUniforms.js";
import { lastName } from "../lastName.js";
import { pixText, pixWidth, pixShadow, FIELD_GL } from "./pixfont.js";
import { HALF, ELIGIBLE, passPlan, BULLET_RANGE, BULLET_MAX, playDiagram } from "./play.js";

const BASE = `${import.meta.env?.BASE_URL ?? "/"}sprites/`;
const POSE = { QB: "qb", RB: "rb", WR: "wr", TE: "te", LT: "ol", LG: "ol", C: "ol", RG: "ol", RT: "ol", DL: "dl", LB: "lb", CB: "db", S: "db" };
// (playtesting: a hook that sees every man's frame as it's drawn; null in the game)
export const poseProbe = { cb: null };
export const PLAYER_H = 3.3; // a standing quarterback, in yards (big, like Retro Bowl, so a player reads at a glance)
const SQUASH = 0.42; // the field's depth is foreshortened: a yard across is this much of a yard along

// ---- sprite sheets (loaded once per club) ----
const imgs = {};
const load = (k, act) => {
  const key = (act === 2 ? "act2/" : act ? "act/" : "") + k;
  if (imgs[key]) return imgs[key];
  const im = new Image(); im.src = `${BASE}${key}.webp`; imgs[key] = im; return im;
};
const grounds = {};
const groundImg = (k) => grounds[k] || (grounds[k] = Object.assign(new Image(), { src: `${import.meta.env?.BASE_URL ?? "/"}weather/${k}.webp` }));
export const preload = (team) => { const k = teamKey(team); if (k) { load(k); load(k, true); if (ACTS2[k]) load(k, 2); if (SCENE.teams[k]) { sceneImg(`${k}_home`); sceneImg(`${k}_away`); } } sceneImg("common"); };
// ---- the scene sheets: the ceremony and sideline people and props (sceneSprites.json) ----
const sceneImgs = {};
const sceneImg = (key) => sceneImgs[key] || (sceneImgs[key] = Object.assign(new Image(), { src: `${BASE}scene/${key}.webp` }));
// does this club have its own sideline and ceremony people (in this uniform)?
const hasScene = (team, away) => { const k = teamKey(team); return !!SCENE.teams[k]?.[away ? "away" : "home"]; };
// one frame, its feet on (x, y): from the club's sheet (team given) or the shared one (team null).
// The sheets are drawn at the action sheets' scale: a standing man is about one player tall.
function sceneSprite(ctx, cam, team, away, name, x, y, facing = 1, scale = 1) {
  let r, im;
  if (team) { const k = teamKey(team), kit = away ? "away" : "home"; r = SCENE.teams[k]?.[kit]?.f[name]; if (!r) return false; im = sceneImg(`${k}_${kit}`); }
  else { r = SCENE.common.f[name]; if (!r) return false; im = sceneImg("common"); }
  if (!im.complete || !im.naturalWidth) return false;
  const [cx, cy, cw, ch, ax, ay] = r, sc = ((PLAYER_H * cam.s) / 160) * scale, [sx, sy] = cam.toScreen(x, y);
  ctx.save(); ctx.translate(Math.round(sx), Math.round(sy)); if (facing < 0) ctx.scale(-1, 1);
  ctx.drawImage(im, cx, cy, cw, ch, Math.round(-ax * sc), Math.round(-ay * sc), Math.round(cw * sc), Math.round(ch * sc));
  ctx.restore(); return true;
}

// ---- the 5x7 bitmap font: pixfont.js (shared with the screens outside the field) ----
export { pixText, pixWidth, pixShadow };

// the football, 13x7: o outline, b leather, h highlight, w stripes and laces
const BALL = ["....ooooo....", "..oobhhhboo..", ".obwhwbwhwbo.", "obbwbbbbbwbbo", ".obwbbbbbwbo.", "..oobbbbboo..", "....ooooo...."];
const BALL_C = { o: "#2a1206", b: "#8a4a22", h: "#b06a36", w: "#f4efe4" };

// ---- the camera ----
// The field runs left to right. s: pixels per yard along the field. The field's near sideline sits
// at the bottom of the canvas; the stands fill the strip above the far sideline.
export function makeCamera(W, H, { span = 66 } = {}) {
  // the whole width of the field fits under the scoreboard, and no more than ~40 yards show across
  const hud = Math.max(2, Math.round(Math.min(W / 380, H / 215))) * 11;
  const s = Math.min(H > W ? W / 34 : W / span, (H - hud - 8) / (53.3 * SQUASH + 1.4)); // ~66 yards across a wide screen, ~34 upright (a phone held upright: closer in, so the players fill it)
  // the field sits low on a wide screen (stands above it) and in the middle of a tall one
  const depth = 53.3 * SQUASH * s, room = H - hud - depth - s * 1.2, top = hud + (H > W ? room * 0.5 : Math.min(room, s * 4.5)) + s * 0.2;
  return { W, H, s, depth, top, camX: 50, lead: 5, toScreen(x, y) { return [W * 0.42 + (x - this.camX) * s, top + (y + HALF) * SQUASH * s]; }, toField(px, py) { return { x: this.camX + (px - W * 0.42) / s, y: (py - top) / (SQUASH * s) - HALF }; } };
}

// ---- drawing ----
// The stadium's lights on the turf: brighter down the middle, falling off toward the sidelines and the
// corners; at night the falloff is deeper and the light warmer, so the field glows under the lights.
function stadiumLight(ctx, cam, night) {
  const { W, top, depth } = cam;
  if (!ctx.createRadialGradient) return;
  const cx = W / 2, cy = top + depth * 0.45, r = Math.max(W, depth) * 0.75;
  const g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r); if (!g) return;
  g.addColorStop(0, night ? "rgba(255,244,214,.08)" : "rgba(255,255,240,.03)"); g.addColorStop(0.6, "rgba(0,0,0,0)"); g.addColorStop(1, night ? "rgba(0,6,16,.38)" : "rgba(0,10,0,.1)");
  ctx.fillStyle = g; ctx.fillRect(0, Math.round(top), W, Math.round(depth));
}

// The stadium scoreboard, standing in the far stands at the 50: an old-school board of light bulbs.
// GUEST on the left, HOME on the right (they keep their sides when the field turns round for the
// other team's ball), the scores in big red seven-segment digits, the clock in amber, the quarter,
// and DOWN / TO GO / BALL ON along the bottom with each side's timeouts and an arrow for the ball.
const SEG = { 0: "abcdef", 1: "bc", 2: "abdeg", 3: "abcdg", 4: "bcfg", 5: "acdfg", 6: "acdefg", 7: "abc", 8: "abcdefg", 9: "abcdfg", "-": "g", " ": "" };
function seg7(ctx, x, y, w, h, ch, color) {
  const t = Math.max(2, Math.round(w * 0.2)), on = SEG[ch] ?? "", hh = Math.round(h / 2);
  const bars = { a: [x + t, y, w - 2 * t, t], b: [x + w - t, y + t, t, hh - t], c: [x + w - t, y + hh, t, hh - t], d: [x + t, y + h - t, w - 2 * t, t], e: [x, y + hh, t, hh - t], f: [x, y + t, t, hh - t], g: [x + t, y + hh - Math.round(t / 2), w - 2 * t, t] };
  for (const k of "abcdefg") { const [bx, by, bw, bh] = bars[k]; ctx.fillStyle = on.includes(k) ? color : "rgba(255,255,255,.05)"; ctx.fillRect(Math.round(bx), Math.round(by), Math.max(1, Math.round(bw)), Math.max(1, Math.round(bh))); }
}
function digits(ctx, x, y, w, h, str, color, gap) { [...str].forEach((c, i) => seg7(ctx, x + i * (w + gap), y, w, h, c, color)); return str.length * (w + gap) - gap; }
function stadiumBoard(ctx, cam, g, teams, yardAt, wallTop) {
  if (!g?.score) return;
  const { s } = cam, cx = yardAt(50), bw = Math.round(Math.min(s * 12.5, cam.W * 0.24)), bh = Math.round(Math.min(wallTop - 6, bw * 0.27));
  if (bh < 44 || cx + bw / 2 < 0 || cx - bw / 2 > cam.W) return; // (too small for its digits to read: a phone held upright has the score strip instead)
  const x = Math.round(cx - bw / 2), y = Math.round(wallTop - bh - 1);
  const home = HOME_OF(teams), userHome = home === teams.user, side = (t) => (t === teams.user ? "h" : "a");
  const G = userHome ? teams.opp : teams.user, Hm = home, hasBall = (t) => !g.done && !g.koNext && g.poss === side(t);
  const red = "#ff3b1f", amber = "#ffb627", lab = "#e8e2c8";
  // three rows, every size from the board's height: the clubs and the quarter on top, the scores and
  // the clock in the middle, the down and the ball along the bottom (the pixel letters are 7 rows tall)
  const pl = Math.max(1, Math.floor((bh * 0.2) / 7)), pb = Math.max(1, Math.floor((bh * 0.16) / 7));
  const topH = 7 * pl + 6, stripH = 7 * pb + 6, midY = y + topH, midH = bh - topH - stripH;
  // the frame and the black face, with its grid of bulbs
  ctx.fillStyle = "#3a4050"; ctx.fillRect(x - 3, y - 3, bw + 6, bh + 5);
  ctx.fillStyle = "#06070a"; ctx.fillRect(x, y, bw, bh);
  ctx.fillStyle = "rgba(255,255,255,.03)"; for (let gy = y + 2; gy < y + bh; gy += 3) ctx.fillRect(x + 1, gy, bw - 2, 1);
  const dh = Math.max(8, midH - 4), dw = Math.min(Math.round(dh * 0.52), Math.round(bw * 0.075)), gap = Math.max(2, Math.round(dw * 0.22)), dy = midY + Math.round((midH - dh) / 2);
  for (const [t, left] of [[G, true], [Hm, false]]) {
    const fx = left ? 0.17 : 0.83, cxT = x + bw * fx;
    // the club (in its colour), a ball beside the one with it, its timeouts underneath the score
    const ab = String(t?.ab || ""), abW = pixWidth(ab, pl);
    pixText(ctx, ab, cxT, y + 3, pl, t?.clr && t.clr !== "#000000" ? lighten(t.clr) : lab, "center");
    if (hasBall(t)) { const a = Math.max(2, Math.round(pl * 2.5)), ax = left ? cxT + abW / 2 + a + 3 : cxT - abW / 2 - a - 3, ay = y + 3 + Math.round(3.5 * pl), d = left ? -1 : 1; ctx.fillStyle = amber; ctx.beginPath(); ctx.moveTo(ax - d * a, ay - a); ctx.lineTo(ax + d * a, ay); ctx.lineTo(ax - d * a, ay + a); ctx.closePath(); ctx.fill(); }
    const sw = 2 * dw + gap; digits(ctx, Math.round(cxT - sw / 2), dy, dw, dh, String(g.score[side(t)] ?? 0).padStart(2, " ").slice(-2), red, gap);
    const tos = g.to?.[side(t)] ?? 3, tw = Math.max(3, Math.round(dw * 0.45)), th = Math.max(1, Math.round(pl)), tx0 = Math.round(cxT - (3 * tw + 4) / 2);
    for (let i = 0; i < 3; i++) { ctx.fillStyle = i < tos ? amber : "rgba(255,255,255,.1)"; ctx.fillRect(tx0 + i * (tw + 2), y + bh - stripH - th - 1, tw, th); }
  }
  // the middle: the quarter over the clock
  pixText(ctx, g.done ? "FINAL" : g.ot ? "OT" : `QTR ${Math.min(4, g.qtr || 1)}`, x + bw / 2, y + 3, pl, lab, "center");
  const ch = Math.max(8, Math.round(dh * 0.8)), cw = Math.min(Math.round(ch * 0.52), Math.round(bw * 0.06)), cg = Math.max(2, Math.round(cw * 0.22)), m = Math.floor((g.clock || 0) / 60), sec = String((g.clock || 0) % 60).padStart(2, "0");
  const colW = Math.max(2, Math.round(cw * 0.5)), total = 4 * cw + 2 * cg + colW * 2, cx0 = Math.round(x + bw / 2 - total / 2), cy0 = midY + Math.round((midH - ch) / 2);
  digits(ctx, cx0, cy0, cw, ch, String(m).padStart(2, " "), amber, cg);
  const colx = cx0 + 2 * cw + cg + Math.round(colW / 2); ctx.fillStyle = amber; const dot = Math.max(2, Math.round(cw * 0.18)); for (const fy of [0.3, 0.7]) ctx.fillRect(colx, Math.round(cy0 + ch * fy - dot / 2), dot, dot);
  digits(ctx, cx0 + 2 * cw + cg + colW * 2, cy0, cw, ch, sec, amber, cg);
  // the bottom strip: the down and distance, and where the ball is
  ctx.fillStyle = "#2a2f3a"; ctx.fillRect(x, y + bh - stripH, bw, 1);
  const live = !g.done && !g.koNext && g.down, ball = g.yard > 50 ? 100 - g.yard : g.yard, togo = g.toGo >= 100 - g.yard ? "GOAL" : String(g.toGo);
  const strip = live ? `${["1ST", "2ND", "3RD", "4TH"][g.down - 1] || g.down} & ${togo}   BALL ON ${ball}` : g.done ? "FINAL" : "";
  if (strip) pixText(ctx, strip, x + bw / 2, y + bh - stripH + 3, pb, amber, "center");
}
const lighten = (hex) => shade(hex, 0.45);


// The paint on the grass, like a real stadium's (and the broadcast field's): each end zone carries its
// club's name huge in its color with a white outline, reading toward the field, with its logo
// faded at both ends; the home club's logo sits at midfield. All of it lies flat on the turf, so it
// takes the field's foreshortening.
const HOME_OF = (teams) => (teams.user?.isAway != null ? (teams.user.isAway ? teams.opp : teams.user) : teams.user);
// A club's end zone wordmark, rendered once at a small size (so it pixelates when it's drawn large)
const WM_SIZE = 24, wmCache = new Map();
function wordmark(name, clr, ac) {
  const key = `${name}|${clr}|${ac}`; if (wmCache.has(key)) return wmCache.get(key);
  if (typeof document === "undefined" && typeof OffscreenCanvas === "undefined") return null;
  const mk = (w, h) => (typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(w, h) : Object.assign(document.createElement("canvas"), { width: w, height: h }));
  const font = `italic 900 ${WM_SIZE}px "Arial Black", "Arial", sans-serif`, probe = mk(4, 4).getContext("2d"); if (!probe) return null;
  probe.font = font; const w = Math.ceil(probe.measureText(name).width || name.length * WM_SIZE * 0.8), pad = Math.ceil(WM_SIZE * 0.3);
  const cv = mk(w + pad * 2, Math.ceil(WM_SIZE * 1.5)), c = cv.getContext("2d");
  c.font = font; c.textAlign = "center"; c.textBaseline = "middle"; const cx = cv.width / 2, cy = cv.height / 2;
  c.lineJoin = "round"; c.lineWidth = WM_SIZE * 0.16; c.strokeStyle = "rgba(244,244,236,.95)"; c.strokeText(name, cx, cy);
  c.lineWidth = WM_SIZE * 0.06; c.strokeStyle = ac && ac !== clr ? ac : "rgba(0,0,0,.35)"; c.strokeText(name, cx, cy);
  c.fillStyle = clr || "#334155"; c.fillText(name, cx, cy);
  wear(c, cv.width, cv.height);
  const out = { cv, w: w + pad * 2 }; wmCache.set(key, out); return out;
}
// Paint on grass is never solid: blades poke through it and it wears thin in spots. A fixed scatter of
// pixels, some faded and some gone, so the paint reads as painted onto the turf (not a sticker on it).
function wear(c, w, h) {
  try { const d = c.getImageData(0, 0, w, h), a = d.data; for (let i = 0; i < w * h; i++) { const o = i * 4 + 3; if (!a[o]) continue; const r = hash(i % w, Math.floor(i / w)); if (r < 0.07) a[o] = 0; else if (r < 0.2) a[o] = Math.round(a[o] * 0.45); else if (r < 0.32) a[o] = Math.round(a[o] * 0.75); } c.putImageData(d, 0, 0); } catch { /* a canvas we can't read: leave it whole */ }
}
// A club's logo for the turf: shrunk to a few dozen pixels with hard edges (it comes out in chunky
// pixels like the rest of the field), then worn like the paint. Made once per club, when its logo has loaded.
const pixLogos = new Map();
function pixLogo(ab, res = 30, worn = true) { // (worn: scuffed like paint on grass; off for a clean sign)
  const key = `${ab}|${res}|${worn ? 1 : 0}`; if (pixLogos.has(key)) return pixLogos.get(key);
  const im = logo(ab); if (!im.complete || !im.naturalWidth) return null;
  if (typeof document === "undefined") return null;
  const cv = document.createElement("canvas"); cv.width = cv.height = res; const c = cv.getContext("2d"); if (!c) return null;
  const r = im.naturalWidth / im.naturalHeight, w = r >= 1 ? res : res * r, h = r >= 1 ? res / r : res;
  c.imageSmoothingEnabled = true; c.drawImage(im, (res - w) / 2, (res - h) / 2, w, h);
  try { const d = c.getImageData(0, 0, res, res); for (let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] > 110 ? 255 : 0; c.putImageData(d, 0, 0); } catch { /* tainted: keep it smooth */ }
  if (worn) wear(c, res, res); pixLogos.set(key, cv); return cv;
}
function paintField(ctx, cam, teams, yardAt, sb = null) {
  const { W, s, top, depth } = cam, cy = top + depth / 2;
  const flat = (x, y, fn) => { ctx.save(); ctx.translate(x, y); ctx.scale(1, SQUASH); fn(); ctx.restore(); };
  const A = ctx.globalAlpha; // (a second, faint coat over the snow comes through here at a lower alpha)
  const logoAt = (ab, x, y, size, alpha, rot = 0) => { const pl = pixLogo(ab); if (!pl) return; flat(x, y, () => { ctx.rotate(rot); ctx.globalAlpha = A * alpha; const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false; ctx.drawImage(pl, -size / 2, -size / 2, size, size); ctx.imageSmoothingEnabled = sm; ctx.globalAlpha = A; }); };
  // midfield: the home club's logo
  const home = HOME_OF(teams), mx = yardAt(50);
  if (sb && mx > -s * 14 && mx < W + s * 14) { const num = String(sb).replace(/^SUPER BOWL\s*/i, "") || "SB", wm = wordmark(num, "#d4a72c", "#7a5a10"); if (wm) { ctx.save(); ctx.translate(mx, cy); ctx.scale(1, SQUASH); const sc = (s * 6) / WM_SIZE; ctx.scale(sc, sc); ctx.globalAlpha = A * 0.85; const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false; ctx.drawImage(wm.cv, -wm.cv.width / 2, -wm.cv.height / 2); ctx.imageSmoothingEnabled = sm; ctx.restore(); } }
  else if (home?.ab && mx > -s * 12 && mx < W + s * 12) logoAt(home.ab, mx, cy, s * 11, 0.28);
  for (const [yd, t, rot] of [[-5, teams.user, -Math.PI / 2], [105, teams.opp, Math.PI / 2]]) {
    const x = yardAt(yd); if (x < -s * 8 || x > W + s * 8 || !t) continue;
    // the wordmark: the club's name across the width of the field, heavy italic in its colour with a
    // white outline, drawn small and blown up so it comes out in chunky pixels like the rest of the field
    const name = String(t.name || t.ab || "").toUpperCase(), len = 53.3 * 0.7 * s, fs = s * 4.6, wm = wordmark(name, t.clr, t.ac);
    if (wm) flat(x, cy / SQUASH * SQUASH, () => {
      ctx.rotate(rot); const sc = fs / WM_SIZE, k = Math.min(1.6, len / (wm.w * sc));
      ctx.scale(k * sc, sc); const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false; ctx.globalAlpha = A * 0.9;
      ctx.drawImage(wm.cv, -wm.cv.width / 2, -wm.cv.height / 2); ctx.imageSmoothingEnabled = sm; ctx.globalAlpha = A;
    });
    // the club's logo at each end of its end zone, faded into the grass
    for (const yy of [-HALF + 4.5, HALF - 4.5]) { const [, ly] = cam.toScreen(0, yy); logoAt(t.ab, x, ly, s * 4.6, 0.62); } // (upright, lying flat)
  }
}

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
// Which second-sheet frame a man shows, kept steady: once he's moving he stays "moving" until he's
// nearly stopped (and the reverse), a sideways run holds until he's clearly running ahead again, and
// when there's no new frame for him he keeps the last one rather than dropping back to the first
// sheet's art (that swap, in mid-play, was a pop between two drawing styles).
function pose2(S, e, t) {
  const r = pose2raw(S, e, t);
  if (r) { if (STEADY.test(r.n)) e._last2 = r; return r; } // (only a steady frame is held: never a catch, a throw or a juke frozen in place)
  if (S.dived && S.ball.holder === e.key) { e._last2 = null; return null; } // (the dive: the first sheet's laid-out frame, never a held running one)
  return S.kind || S.phase === "presnap" ? null : e._last2 || null;
}
const STEADY = /^(run|run_ball|run_up|run_down|run_ball_up|run_ball_down|block_engaged|pass_set|run_drive|rush_bull|backpedal|fall)_?\d*$|^(block_engaged|rush_bull|fall_2)$/;
function pose2raw(S, e, t) {
  if (S.kind || S.phase === "presnap") return null;
  const sp = Math.hypot(e.vx, e.vy), g = e._gait || 0, hasBall = S.ball.holder === e.key;
  const moving = (e._mv = e._mv ? sp > 0.6 : sp > 1.2);
  const i6 = (Math.floor(g / 0.42) % 6) + 1, i4 = (Math.floor(g / 0.55) % 4) + 1, i2 = (Math.floor(g / 0.7) % 2) + 1;
  const ax = Math.abs(e.vx), ay = Math.abs(e.vy);
  e._acr = !moving ? null : e._acr ? (ay > ax * 1.05 ? (e.vy < 0 ? "up" : "down") : null) : ay > ax * 1.5 ? (e.vy < 0 ? "up" : "down") : null;
  const across = e._acr;
  const run = (ball) => ({ n: ball ? (across ? `run_ball_${across}_${i4}` : `run_ball_${i6}`) : across ? `run_${across}_${i4}` : `run_${i6}` });
  const over = S.phase === "tackle" || S.phase === "fall";
  if (over && S._overAt == null) S._overAt = t;
  const since = over ? t - S._overAt : 0, isPass = S.call?.startsWith("pass");
  if (e.key === "QB" && !over) {
    if (e.mode === "handoff") return { n: "handoff_qb" }; // (a run: the exchange from the snap, never a throwing frame)
    if (S.thrownAt && t - S.thrownAt < 0.1) return { n: "throw_release" };
    if (hasBall && S.phase === "live") {
      if (e.mode === "dropback") return { n: `drop_${i4}`, face: 1 };
      return { n: S.aim ? "throw_windup" : "throw_set", face: 1 }; // (set in the pocket, he faces downfield whichever way his feet last moved)
    }
    if (e.mode === "handoff") return { n: "handoff_qb" };
    if (hasBall) return run(true);
    // the ball's gone: he turns away carrying out the fake, empty-handed (never the first sheet's ball-in-hand frame)
    if (S.handAt != null && t - S.handAt < 0.6) return { n: "hip_turn" };
    return moving ? run(false) : { n: "hip_turn" };
  }
  if (S.dived && hasBall) return null; // (the first sheet's diving carry)
  if (over && hasBall) {
    if (S.result?.td) return since < 0.35 ? run(true) : since < 0.9 ? { n: "td_spike" } : { n: `td_dance_${(Math.floor(t * 4) % 2) + 1}` };
    if (S.phase === "tackle") return since < 0.12 ? { n: "hit_reel" } : since < 0.24 ? { n: "fall_1" } : { n: "fall_2" };
    return moving ? run(true) : null;
  }
  if (over && S.tackler === e) return { n: since < 0.18 ? "tackle_dive" : "tackle_wrap" };
  if (e.down > 0) return e.missed && e.down > 0.3 ? { n: "whiff" } : e.down < 0.15 ? { n: "getup_2" } : e.down < 0.3 ? { n: "getup_1" } : { n: "fall_2" };
  const f = S.ball.flight;
  if (f && !f.kick && f.target === e.key && e.side === "off") {
    const left = f.t0 + f.T - t;
    return left < 0.22 ? { n: f.bullet ? "catch_chest" : "catch_high" } : { n: `look_back_${(Math.floor(g / 0.7) % 2) + 1}` };
  }
  if (f && !f.kick && e.side === "def" && f.target && S.cover?.[f.target] === e.key && f.t0 + f.T - t < 0.2 && Math.hypot(e.x - f.to.x, e.y - f.to.y) < 1.6) return { n: "swat" };
  if (hasBall && S.phase === "carry") {
    if (S.catchAt != null && t - S.catchAt < 0.3 && e.side === "off") return { n: "catch_secure" };
    if (e.key === "RB" && S.call?.startsWith("run") && S.handAt != null && t - S.handAt < 0.3) return { n: "handoff_rb" };
    if (S.jukeAt != null && t - S.jukeAt < 0.32) return { n: t - S.jukeAt < 0.14 ? "juke_plant" : "juke_cut" };
    if (S.stagger > t) return { n: "stumble" };
    return run(true);
  }
  if (over) return moving ? run(false) : e.key === "QB" && !hasBall && !isPass ? { n: "hip_turn" } : null;
  // the defensive backs give ground facing the quarterback until the ball's out
  if (e.side === "def" && BACKS.has(e.key) && S.phase === "live" && S.ball.holder === "QB") { e._bp = e._bp ? e.vx > 0.1 && sp < e.top * 0.9 : e.vx > 0.4 && sp < e.top * 0.8; if (e._bp) return { n: `backpedal_${i4}`, face: -1 }; } else e._bp = false;
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
    if (e.key === "K" && S.kind === "punt") return [S.phase === "presnap" || t < 0.35 ? "c8" : t < t0 - 0.12 ? "c6" : "c7", true]; // hands up for the snap, the ball held out for the drop, the leg through it
    if (e.key === "K") return [S.phase === "presnap" || t < t0 - 0.45 ? "c1" : t < t0 + 0.4 ? "c2" : "c3", true];
    if (e.key === "H") return ["c4", true]; // the holder down on one knee, the ball on the spot
    if (e.key === "C" && (S.phase === "presnap" || t < 0.3)) return ["c5", true]; // the long snapper over the ball
    if (S.tackler === e && S.arrived != null) return ["b4", true]; // the man who got there first, wrapping him up
    if (e.key === "S0" && S.arrived != null && e.down > 0) return ["b3", true]; // brought down at the end of the return
    if (e.key === "S0" && S.arrived != null && S.koTD) return ["a7", true]; // all the way back: the celebration
    if (e.key === "S0" && (S.kind === "punt" || S.kind === "ko")) {
      // the returner: hands up under it as it comes down, the catch, the ball tucked, then off he goes
      const f = S.ball.flight;
      if (!hasBall && f && t >= f.t0 && f.t0 + f.T - t < 0.55) return ["b1", true];
      if (hasBall && S.caughtAt != null && t - S.caughtAt < 0.35) return ["a4", true];
      return [hasBall ? (stride ? "a1" : "a2") : moving ? (stride ? "a5" : "a6") : "db", hasBall || moving];
    }
    if (moving && (S.kind === "punt" || S.kind === "ko")) return [stride ? "a5" : "a6", true]; // the coverage running down, the return team getting back
    if (S.kind === "ko" && e.key !== "S0") return ["db", false]; // (lined up for the kick: on their feet, not in a stance)
    if (e.side === "off") return [POSE[e.p.pos] === "qb" ? "ol" : POSE[e.p.pos] || "ol", false];
    return [POSE[e.p.pos] || "db", false];
  }
  if (S.phase === "presnap") return [POSE[e.p.pos] || "db", false];
  if (e.key === "QB") {
    if (S.thrownAt && t - S.thrownAt < 0.5) return ["a8", true];
    if (S.phase === "tackle" && S.result?.type === "sack" && t >= S.endAt - 0.6) return ["b3", true];
    if (hasBall) return [moving ? (stride ? "a1" : "a2") : "qb", moving];
    return [stride ? "a5" : "a6", moving]; // (no ball: never the ball-in-hand frame)
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
// The grass texture, in pixels of the stands' size: short blades and specks, a few lighter, most darker,
// laid over the mown stripes as a repeating tile (deterministic, so it never shimmers as it scrolls).
const turfCache = new Map();
function turfTile(u) {
  if (turfCache.has(u)) return turfCache.get(u);
  if (typeof OffscreenCanvas === "undefined" && typeof document === "undefined") return null;
  const N = 48, cv = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(N * u, N * u) : Object.assign(document.createElement("canvas"), { width: N * u, height: N * u }), c = cv.getContext("2d");
  if (!c) return null;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const h = hash(i * 1.37 + 3, j * 2.11 + 7); if (h > 0.14) continue;
    c.fillStyle = h < 0.02 ? "rgba(214,232,170,.16)" : h < 0.08 ? "rgba(24,52,18,.13)" : "rgba(34,64,24,.08)";
    c.fillRect(i * u, j * u, u, u);
  }
  turfCache.set(u, cv); return cv;
}
const standsCache = new Map();
const hash = (a, b) => { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); };
function standsTile(u, needH, teams, pose) {
  const rowH = u * 6, rows = Math.max(1, Math.ceil(needH / rowH)), seats = 40, sp = u * 4;
  // (the home crowd fills most of the seats: on the road, that's theirs)
  const userVis = teams.user.isAway != null ? !!teams.user.isAway : !!teams.userAway;
  const home = userVis ? teams.opp : teams.user, vis = userVis ? teams.user : teams.opp;
  const key = `${u}|${rows}|${home.clr}|${vis.clr}|${pose}`;
  if (standsCache.has(key)) return standsCache.get(key);
  if (standsCache.size > 24) standsCache.clear();
  if (typeof OffscreenCanvas === "undefined" && typeof document === "undefined") return null; // (no canvas: a headless test)
  const cv = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(seats * sp, rows * rowH) : Object.assign(document.createElement("canvas"), { width: seats * sp, height: rows * rowH });
  const c = cv.getContext("2d");
  const shirts = [home.clr, home.clr, home.clr, home.ac || "#ddd", vis.clr, vis.clr, "#5b6478", "#7a6a58", "#3e4a5e", "#c9c2b0"];
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
    // like the sim's field: light snow is gentle flurries; heavy snow a thick blizzard driven by the
    // wind, with big soft flakes close to the camera
    const heavy = wx.snow === 2, n = heavy ? 260 : 70, drift = heavy ? -70 + wx_ * 0.6 : wx_ * 0.6;
    for (let i = 0; i < n; i++) {
      const big = i % 7 === 0, sz = Math.max(1, Math.round(k * (big ? (heavy ? 4 : 3) : 1 + hash(i, 5) * (heavy ? 1.6 : 1.2))));
      const fall = (big ? 90 : 45) + hash(i, 4) * (heavy ? 70 : 35), sway = Math.sin(time * (0.7 + hash(i, 9)) + i) * (heavy ? 10 : 16);
      const x = (((hash(i, 6) * (W + 200) + drift * time + sway) % (W + 200)) + W + 200) % (W + 200) - 100, y = (hash(i, 7) * (H + 20) + fall * time) % (H + 20) - 10;
      ctx.globalAlpha = big ? 0.55 : 0.75 + hash(i, 15) * 0.25; ctx.fillStyle = "#fff";
      ctx.fillRect(Math.round(x - sz / 2), Math.round(y - sz / 2), sz, sz);
      if (sz >= 3) { ctx.fillRect(Math.round(x - sz / 2 - 1), Math.round(y - sz / 2 + 1), sz + 2, Math.max(1, sz - 2)); ctx.fillRect(Math.round(x - sz / 2 + 1), Math.round(y - sz / 2 - 1), Math.max(1, sz - 2), sz + 2); } // (rounded)
    }
    ctx.globalAlpha = 1;
    if (heavy) { ctx.fillStyle = "rgba(226,232,240,.07)"; ctx.fillRect(0, 0, W, H); } // the white-out haze
  }

}
// The conditions under the scoreboard: the sky and the wind (its speed, and an arrow for which way
// it blows relative to your drive: > at your back, < in your face).
export function drawWxChip(ctx, cam, wx, wind) {
  const px = Math.max(1, Math.round(uiPx(cam) * 0.75)), sky = wx?.label && wx.label !== "Clear" ? wx.label.toUpperCase() : "";
  // which way it blows, in eight directions (up the screen is toward the far sideline): a diagonal shows both
  const ax = Math.abs(wind?.x || 0), ay = Math.abs(wind?.y || 0), wh = wind?.x > 0 ? ">" : "<", wv = wind?.y < 0 ? "^" : "V";
  const arrow = !wind?.mph ? "" : ax > ay * 2.2 ? ` ${wh}` : ay > ax * 2.2 ? ` ${wv}` : ` ${wv}${wh}`;
  const text = [sky, wind?.mph ? `WIND ${wind.mph}${arrow}` : ""].filter(Boolean).join(" - "); if (!text) return;
  const w = pixWidth(text, px) + px * 6, h = px * 10, x = px * 3, y = Math.round(uiPx(cam) * 20.5); // (under the scorebug's two rows)
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
// Each club's team area between the 30s, on a strip of turf behind its sideline: a team-coloured
// bench with the club's name, a cooler cart with cups and towels, heaters on a cold day, players
// standing and taking a knee, assistant coaches, and the head coach in a headset with his play
// sheet, walking the line with the ball. On the far side, the chain crew: the down marker at the
// line of scrimmage and the chains out to the line to gain. Yours is the near side and jumps on a
// big play. Everything's placed on the field, so it scrolls with it.
const SIDE_POSES = ["c8", "c6", "c8", "a3", "c8", "c6", "c8", "c8", "c6", "c8", "a3", "c8"];
// a person who isn't in pads (a coach, a chain-crew man), as pixel art: c cap, k skin, h headset,
// p shirt, w white (collar, play sheet), t trousers, s shoes
const COACH = ["...ccc...", "..ccccc..", "..cccccc.", "..kkkkk..", ".hkkkkkh.", "..kkkkhh.", "...kkk...", "..pwwwp..", ".ppppppp.", "kppppppk.", "kppppppk.", "kppppppkw", "kppppppkw", ".pppppp.w", ".ppppppp.", ".ttttttt.", ".ttttttt.", ".ttt.ttt.", ".ttt.ttt.", ".ttt.ttt.", ".ttt.ttt.", ".tt...tt.", ".ss...ss.", "sss...sss"];
function person(ctx, cam, x, y, facing, pal, scale = 0.72, { headset = true, sheet = true, cap = true } = {}) {
  const [sx, sy] = cam.toScreen(x, y), u = (PLAYER_H * cam.s * scale) / COACH.length, w = COACH[0].length;
  for (let r = 0; r < COACH.length; r++) for (let c = 0; c < w; c++) {
    let k = COACH[r][c]; if (k === ".") continue;
    if (k === "h" && !headset) k = r < 5 ? "k" : "."; if (k === "w" && c === 8 && !sheet) continue; if (k === "c" && !cap) k = r < 2 ? "." : "k";
    if (k === ".") continue;
    ctx.fillStyle = pal[k]; const cx = facing < 0 ? w - 1 - c : c;
    ctx.fillRect(Math.round(sx + (cx - w / 2) * u), Math.round(sy - (COACH.length - r) * u), Math.ceil(u), Math.ceil(u));
  }
}
const SKIN = ["#f1c9a5", "#c98e62", "#8d5a3b", "#e0ac84"];
function cooler(ctx, cam, x, y, k = 1) {
  const [sx, sy] = cam.toScreen(x, y), s = cam.s * k, w = Math.max(4, Math.round(s * 0.8)), h = Math.max(5, Math.round(s * 0.95));
  ctx.fillStyle = "#f07a14"; ctx.fillRect(Math.round(sx - w / 2), Math.round(sy - h), w, h);
  ctx.fillStyle = "#c95f08"; ctx.fillRect(Math.round(sx + w / 2 - Math.max(1, w / 4)), Math.round(sy - h), Math.max(1, Math.round(w / 4)), h);
  ctx.fillStyle = "#f4f4f0"; ctx.fillRect(Math.round(sx - w / 2 - 1), Math.round(sy - h - Math.max(2, s * 0.2)), w + 2, Math.max(2, Math.round(s * 0.2)));
  ctx.fillRect(Math.round(sx - w / 2), Math.round(sy - h * 0.55), w, Math.max(1, Math.round(s * 0.1)));
  ctx.fillStyle = "#d8d8d0"; ctx.fillRect(Math.round(sx - w / 2 - Math.max(1, s * 0.14)), Math.round(sy - h * 0.3), Math.max(1, Math.round(s * 0.14)), Math.max(1, Math.round(s * 0.14)));
}
function rect(ctx, cam, x, y, wYd, hPx, color) { const [a, b] = cam.toScreen(x, y), [c] = cam.toScreen(x + wYd, y); ctx.fillStyle = color; ctx.fillRect(Math.round(a), Math.round(b - hPx), Math.max(1, Math.round(c - a)), Math.max(1, Math.round(hPx))); }
// A club's team area drawn with its own sideline sheet: benches with players sitting on them, the drinks
// table, the helmet rack and the kicking net, players standing along the restraining line who cheer when
// something big happens, the staff (a coordinator on his tablet, a position coach, the trainer, a man
// carrying water up and down), the head coach walking with the ball (calling the play behind his sheet
// before the snap, a fist pump on the big moments), and the club's cheerleaders when it has a squad
// and it's at home. Everything is sorted far to near so it overlaps the right way.
function sideScene(ctx, cam, team, away, near, opts) {
  const at = (d) => (near ? HALF + d : -HALF - d), t = opts.time || 0, cold = opts.wx?.snow || opts.wx?.cold, hype = opts.hype || 0, ballX = opts.ballX ?? 50, SC = 0.86, items = [];
  const put = (x, d, name, face = 1, scale = SC, shared = false) => items.push({ x, y: at(d), name, face, scale, shared });
  const two = (a, b, rate, i) => (Math.floor(t * rate + i * 0.37) % 2 ? b : a); // (an idle pair, each man on his own beat)
  // the back row: benches, and the players sitting on them
  const sit = cold ? ["sit_parka", "sit_1", "sit_parka", "sit_2", "sit_towel", "sit_parka"] : ["sit_1", "sit_2", "sit_1", "sit_towel", "sit_2", "sit_1"];
  [37, 42.2, 47.4, 52.6, 57.8, 63].forEach((x, i) => { put(x, 2.95, "bench", 1); if (hash(i, 31) < 0.7) put(x + (hash(i, 5) - 0.5) * 0.8, 2.9, sit[i], hash(i, 7) < 0.5 ? 1 : -1); });
  put(67.6, 2.6, "drinks_table"); put(70.4, 2.2, "cup_bin"); put(32.4, 2.6, "helmet_rack"); put(50, 2.95, "tablet_cart"); put(29.2, 2.8, "kicking_net");
  if (cold) { put(44, 2.1, "heater"); put(56, 2.1, "heater"); }
  // the players along the line, standing or cheering
  for (let i = 0; i < 9; i++) {
    const x = 35.2 + i * 3.6 + (hash(i, near ? 11 : 12) - 0.5) * 1.2, d = 1.2 + hash(i, 13) * 0.5, up = hype > 0.3 && hash(i, 14) < 0.85;
    put(x, d, up ? two("cheer_1", "cheer_2", 5, i) : two("stand_helmet_1", "stand_helmet_2", 0.7, i), ballX >= x ? 1 : -1);
  }
  // the staff
  put(44.6, 1.0, two("coordinator_idle", "coordinator_point", 0.45, 1), 1);
  put(57.2, 0.95, hype > 0.3 ? "position_coach_clap" : "position_coach_idle", -1);
  put(61.4, 1.05, "trainer_stand", -1);
  { const span = 6, u = (t * 0.35) % 2, w = u < 1 ? u : 2 - u, wx = 63 + w * span; put(wx, 2.2, "water_carry", u < 1 ? 1 : -1); }
  // the head coach, staying level with the ball
  { const want = Math.max(33, Math.min(67, ballX + (near ? -2.5 : 2.5))), key = near ? "near" : "far", prev = coachAt[key] ?? want;
    const x = (coachAt[key] = Math.abs(want - prev) > 15 ? want : prev + (want - prev) * 0.04), walking = Math.abs(want - x) > 0.4;
    const name = hype > 0.3 ? "coach_fistpump" : walking ? two("coach_walk_1", "coach_walk_2", 3.2, 0) : opts.phase === "presnap" ? "coach_call" : opts.phase === "live" || opts.phase === "carry" ? "coach_signal" : two("coach_idle_1", "coach_idle_2", 0.6, 0);
    put(x, 0.6, name, walking ? Math.sign(want - x) : ballX >= x ? 1 : -1); }
  // cheerleaders, outside the team area toward the end zone, at a home game
  if (!away && SCENE.teams[teamKey(team)]?.home?.f.cl_idle_1) for (let i = 0; i < 4; i++) {
    const x = 16.4 + i * 2.6, beat = (t * 1.1 + i * 0.25) % 6, name = hype > 0.3 ? two("cl_poms_up_1", "cl_poms_up_2", 6, i) : beat < 3 ? two("cl_idle_1", "cl_idle_2", 1.2, i) : beat < 4.5 ? two("cl_kick_1", "cl_kick_2", 3, i) : two("cl_poms_up_1", "cl_poms_up_2", 4, i);
    put(x, 0.9, name, 1, SC * 0.95);
  }
  items.sort((a, b) => a.y - b.y);
  // (the near sideline is seen from in front: its back row sits below the field edge on the screen, so
  // it's squeezed into the strip of turf there; the far side's back row is up against the wall)
  for (const it of items) sceneSprite(ctx, cam, it.shared ? null : team, away, it.name, it.x, it.y, it.face, it.scale);
}
const coachAt = { near: null, far: null };
function sideTeam(ctx, cam, team, away, near, opts) {
  if (hasScene(team, away) && sceneImg(`${teamKey(team)}_${away ? "away" : "home"}`).complete) return sideScene(ctx, cam, team, away, near, opts);
  const s = cam.s, dir = near ? 1 : -1, at = (d) => (near ? HALF + d : -HALF - d), t = opts.time || 0, cold = opts.wx?.snow || opts.wx?.cold;
  // the bench: a long team-coloured back with the club's name on it, a grey seat in front of it. On
  // the far side it's behind the players; on the near side it's between them and the camera
  const bench = () => {
    const hb = near ? s * 0.7 : s * 1.0;
    rect(ctx, cam, 33, at(2.75), 34, hb, team.clr); rect(ctx, cam, 33, at(2.75), 34, Math.max(1, s * 0.12), team.ac || "#fff"); rect(ctx, cam, 33, at(2.75) - (near ? 0 : 0), 34, Math.max(1, s * 0.08), "rgba(0,0,0,.35)");
    for (let x = 37; x < 66; x += 9) { const [lx, ly] = cam.toScreen(x, at(2.75)); pixText(ctx, team.ab, lx, Math.round(ly - hb + s * 0.13), Math.max(1, Math.round(s * 0.09)), team.ac || "#fff", "center"); }
  };
  if (!near) bench();
  // the cooler cart (two coolers on a grey cart), the cup table, a stack of towels
  rect(ctx, cam, 68, at(2.0), 2.6, s * 0.35, "#6b717d"); for (const wx_ of [68.4, 70.2]) { const [cx, cy] = cam.toScreen(wx_, at(2.0)); ctx.fillStyle = "#222"; ctx.fillRect(Math.round(cx - s * 0.15), Math.round(cy - s * 0.12), Math.round(s * 0.3), Math.round(s * 0.24)); }
  cooler(ctx, cam, 68.8, at(2.0) - 0 * dir, 0.95); { const [cx, cy] = cam.toScreen(70.1, at(2.0)); ctx.save(); ctx.translate(0, -s * 0.35); cooler(ctx, { ...cam, toScreen: () => [cx, cy] }, 0, 0, 0.95); ctx.restore(); }
  rect(ctx, cam, 64.2, at(1.75), 2.2, s * 0.6, "#ececec"); for (let i = 0; i < 6; i++) rect(ctx, cam, 64.4 + i * 0.33, at(1.75) - dir * 0, 0.18, s * 0.85, i % 2 ? "#ffffff" : "#e2e2e2");
  for (let i = 0; i < 4; i++) rect(ctx, cam, 31.2, at(2.2), 1.3, s * (0.18 + i * 0.16), i % 2 ? team.clr : "#f4f4f0");
  // heaters on a cold day: grey boxes with a glowing grille
  if (cold) for (const hx of [40.5, 55.5]) { rect(ctx, cam, hx, at(2.1), 1.4, s * 1.1, "#4b515c"); const glow = 0.65 + 0.35 * Math.sin(t * 3 + hx); rect(ctx, cam, hx + 0.25, at(2.1) - dir * 0, 0.9, s * 0.6, `rgba(255,${Math.round(120 + 60 * glow)},40,${glow})`); }
  // the players: standing along the bench, the front row taking a knee
  const hype = near ? opts.hype || 0 : 0, ballX = opts.ballX ?? 50;
  const pal = (shirt) => ({ c: shirt, k: SKIN[0], h: "#111", p: shirt, w: "#f4f4f0", t: "#c8b48a", s: "#1b1b1b" });
  for (let i = 0; i < SIDE_POSES.length; i++) {
    const x = 34.5 + i * 2.65 + hash(i, near ? 1 : 2) * 1.0, kneel = false, front = i % 3 === 1, y = at(front ? 0.95 : 1.5 + hash(i, 5) * 0.45), jump = hype > 0.3 && !kneel && hash(i, 8) < 0.85;
    const pose = jump ? (Math.floor(t * 6 + i) % 2 ? "b8" : "b7") : SIDE_POSES[i];
    sprite(ctx, cam, team, away, pose, x, y - (jump && Math.floor(t * 6 + i) % 2 ? 0.3 * dir : 0), ballX >= x ? 1 : -1, true, 0.72);
  }
  // the coaches: two assistants with play sheets near the bench, and the head coach (headset, play
  // sheet) walking the team area to stay level with the ball
  person(ctx, cam, 41.2, at(1.35), 1, { ...pal(team.clr), k: SKIN[1] }, 0.68, { headset: true, sheet: true, cap: false });
  person(ctx, cam, 58.8, at(1.4), -1, { ...pal(team.ac && team.ac !== "#fff" && team.ac !== "#ffffff" ? team.ac : "#2b3346"), k: SKIN[3] }, 0.68, { headset: false, sheet: true, cap: true });
  const hc = Math.max(32, Math.min(68, ballX + (near ? -2 : 2)));
  person(ctx, cam, hc, at(0.7), ballX >= hc ? 1 : -1, { ...pal(team.clr), k: SKIN[2] }, 0.74, { headset: true, sheet: true, cap: true });
  if (near) bench();
}
// the chain crew on the far sideline: the down marker at the line of scrimmage (its number on top),
// the two chain poles ten yards apart with the chain between, three men in orange vests
function chains(ctx, cam, los, toGain, down) {
  if (los == null || toGain == null || toGain > 100) return;
  const s = cam.s, y = -HALF - 0.45, start = toGain - 10, vest = { c: "#1b1b1b", k: SKIN[1], h: "#111", p: "#f07a14", w: "#f4f4f0", t: "#2b2f3a", s: "#111" };
  const pole = (x, top) => { const [px_, py] = cam.toScreen(x, y); ctx.fillStyle = "#e9e3d4"; ctx.fillRect(Math.round(px_ - s * 0.07), Math.round(py - s * 2.4), Math.max(1, Math.round(s * 0.14)), Math.round(s * 2.4)); top(px_, py - s * 2.4); };
  // the chain, sagging a little between the poles
  const [c0x, c0y] = cam.toScreen(start, y), [c1x] = cam.toScreen(toGain, y); ctx.fillStyle = "#c9c3b0"; for (let x = c0x; x < c1x; x += Math.max(2, s * 0.25)) { const u = (x - c0x) / Math.max(1, c1x - c0x); ctx.fillRect(Math.round(x), Math.round(c0y - s * 1.2 + Math.sin(u * Math.PI) * s * 0.35), Math.max(1, Math.round(s * 0.12)), Math.max(1, Math.round(s * 0.12))); }
  for (const x of [start, toGain]) pole(x, (tx, ty) => { ctx.fillStyle = "#f07a14"; ctx.fillRect(Math.round(tx - s * 0.32), Math.round(ty - s * 0.25), Math.round(s * 0.64), Math.round(s * 0.35)); });
  pole(los, (tx, ty) => { const b = Math.round(s * 0.8); ctx.fillStyle = "#f07a14"; ctx.fillRect(Math.round(tx - b / 2), Math.round(ty - b), b, b); pixText(ctx, String(down || 1), Math.round(tx), Math.round(ty - b + b * 0.18), Math.max(1, Math.round(b / 9)), "#111", "center"); });
  for (const [x, f] of [[start, 1], [toGain, -1], [los, 1]]) person(ctx, cam, x + f * 0.45, y - 0.15, f, vest, 0.62, { headset: false, sheet: false, cap: true });
}
export function drawSidelines(ctx, cam, teams, opts = {}) {
  if (!teams?.user || !teams?.opp) return;
  // the benches stay put all game: your club on the near sideline, theirs across the field, each in
  // its own uniform for the day (opts.bench: the real clubs, not the field's way round for this snap,
  // which turns with every change of possession)
  const B = opts.bench || { near: teams.user, far: teams.opp }, awayOf = (t, d) => (t?.isAway != null ? !!t.isAway : d);
  if (opts.side !== "near") { sideTeam(ctx, cam, B.far, awayOf(B.far, true), false, opts); drawCrews(ctx, cam, false, opts); chains(ctx, cam, opts.los, opts.toGain, opts.down); } // theirs, across the field (behind the play)
  if (opts.side !== "far") { sideTeam(ctx, cam, B.near, awayOf(B.near, false), true, opts);
    // the line judge, on the sideline at the line of scrimmage: arms up for a touchdown
    if (opts.los != null) { const lj = (crewAt.judge = crewAt.judge == null || Math.abs(crewAt.judge - opts.los) > 30 ? opts.los : crewAt.judge + (opts.los - crewAt.judge) * 0.05); sceneSprite(ctx, cam, null, false, opts.td && opts.phase !== "live" ? "referee_td" : "referee_idle", lj, HALF + 0.35, -1, 0.86); }
    drawCrews(ctx, cam, true, opts); } // yours, on the near sideline (in front of it)
}

// ---- the goalposts ----
// An NFL goalpost in the game's perspective (x along the field, y across it, h up, all in yards):
// a padded base two yards behind the end line, the gooseneck curving forward over the end line, the
// crossbar 10 ft up and 18 ft 6 in wide (it runs across the field, so it's tilted up the screen),
// and the uprights 30 ft above it. The far upright is drawn first, then the bar, then the near one.
function goalPost(ctx, cam, ex, back, padClr) {
  // Side on, the classic way: the padded base stands behind the end line in the middle of the field,
  // the gooseneck curves forward up over the line, and the uprights rise from the crossbar (from the
  // side the two of them line up as one). back: +1 at the right end, -1 at the left.
  const s = cam.s, P = (x, h) => { const [sx, sy] = cam.toScreen(x, 0); return [sx, sy - h * s * 0.95]; };
  const [cx] = P(ex, 0); if (cx < -s * 12 || cx > cam.W + s * 12) return;
  const gold = "#f5c518", lite = "#ffe680", dark = "#7a5f08", bar = 3.33, top = bar + 6.4, base = ex + 2.0 * back;
  const w = Math.max(3, Math.round(s * 0.34)), pw = Math.max(5, Math.round(s * 0.7)), padH = 2.2;
  const line = (a, b, wd, c, cap = "butt") => { ctx.strokeStyle = c; ctx.lineWidth = wd; ctx.lineCap = cap; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); };
  // its shadow on the turf, off to the side
  { const [bx, by] = P(base, 0); ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(bx + back * s * 0.2, by, s * 0.9, s * 0.28, 0, 0, Math.PI * 2); ctx.fill(); }
  // the post up out of the pad, then the gooseneck curving forward to the crossbar over the end line
  const p0 = P(base, padH - 0.1), p1 = P(base, bar - 0.9), g = P(ex, bar), gc = P(base, bar + 0.25);
  ctx.lineCap = "butt"; ctx.lineJoin = "round";
  for (const [wd, c] of [[w + 3, dark], [w, gold]]) { ctx.strokeStyle = c; ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(...p0); ctx.lineTo(...p1); ctx.quadraticCurveTo(...gc, ...g); ctx.stroke(); }
  // the upright (the far one just peeking out behind the near), and the crossbar end-on
  const u0 = P(ex, bar), u1 = P(ex, top);
  line([u0[0] + back * 2, u0[1]], [u1[0] + back * 2, u1[1]], Math.max(2, w - 1), dark);
  line(u0, u1, w + 2, dark); line(u0, u1, w, gold); line([u0[0] - w * 0.25, u0[1]], [u1[0] - w * 0.25, u1[1]], Math.max(1, Math.round(w * 0.3)), lite);
  { const k = Math.max(4, Math.round(s * 0.55)); ctx.fillStyle = dark; ctx.fillRect(Math.round(g[0] - k / 2) - 1, Math.round(g[1] - k / 2) - 1, k + 2, k + 2); ctx.fillStyle = gold; ctx.fillRect(Math.round(g[0] - k / 2), Math.round(g[1] - k / 2), k, k); }
  // the wind ribbon on top
  { const [fx, fy] = u1; ctx.fillStyle = "#e23b3b"; ctx.fillRect(Math.round(fx), Math.round(fy - s * 0.1), Math.round(s * 0.7 * -back + (back > 0 ? 0 : 0)), Math.max(2, Math.round(s * 0.28))); }
  // the pad round the base, in the home club's colour with a dark outline
  { const [bx, by] = P(base, 0), [, ty] = P(base, padH), x0 = Math.round(bx - pw / 2), y0 = Math.round(ty), h = Math.round(by - ty);
    ctx.fillStyle = "#0b0e14"; ctx.fillRect(x0 - 1, y0 - 1, pw + 2, h + 2);
    ctx.fillStyle = padClr || "#1d4ed8"; ctx.fillRect(x0, y0, pw, h);
    ctx.fillStyle = "rgba(255,255,255,.22)"; ctx.fillRect(x0 + 1, y0 + 1, Math.max(1, Math.round(pw * 0.25)), h - 2);
    ctx.fillStyle = "rgba(0,0,0,.18)"; for (let k = 1; k < 4; k++) ctx.fillRect(x0, y0 + Math.round((h * k) / 4), pw, 1); }
}

// ---- the camera crews: real broadcasts have them all along the field ----
// A handheld cameraman on the near sideline and a camera cart on the far one, both tracking the line
// of scrimmage (they glide to the new spot between plays), and one behind each end zone.
const crewAt = { near: null, far: null };
let lastLos = 50; // (the last snap's line, for when there's no play on the field)
function cameraman(ctx, cam, x, y, facing, opts = {}) {
  const s = cam.s, [fx, fy] = cam.toScreen(x, y), u = s * 0.1, R = (dx, dy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(fx + dx * u * facing - (facing < 0 ? w * u : 0)), Math.round(fy - dy * u), Math.max(1, Math.round(w * u)), Math.max(1, Math.round(h * u))); };
  // shadow
  ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(fx, fy, s * 0.7, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
  // the cable trailing behind him
  if (opts.cable !== false) { ctx.strokeStyle = "rgba(10,10,12,.7)"; ctx.lineWidth = Math.max(1, u * 0.8); ctx.beginPath(); ctx.moveTo(fx - facing * u * 2, fy - u * 4); ctx.quadraticCurveTo(fx - facing * u * 10, fy + u * 2, fx - facing * u * 26, fy + u * 1); ctx.stroke(); }
  // legs, shoes, the body in black, the arms up to the camera, the head with a headset
  R(-3, 9, 2.2, 9, "#1c2230"); R(1, 9, 2.2, 9, "#1c2230"); R(-3.5, 1, 3, 1, "#0d0d0d"); R(0.8, 1, 3, 1, "#0d0d0d");
  R(-4, 19, 8, 10.5, "#14171f"); R(-4, 19, 8, 1.2, "#2a303d");
  R(2, 18, 4.5, 2.4, "#14171f");
  R(-2.6, 23.6, 5.2, 4.8, opts.skin || "#d9a47c"); R(-3.2, 24.6, 6.4, 1.6, "#0d0d0d"); R(-3.6, 22.4, 1.4, 2.6, "#0d0d0d");
  // the camera on his shoulder, lens toward the play, the red tally light on
  R(-1, 23, 9, 4.4, "#2b2f37"); R(-1, 23, 9, 1, "#3d4350"); R(8, 22.6, 3.4, 3.6, "#15171c"); R(11.2, 22, 1.2, 4.8, "#0a0a0c"); R(11.4, 21.4, 0.8, 0.8, "#6fa8dc");
  R(1, 24.4, 1.2, 1.2, opts.live ? "#ff3b30" : "#5a1d1d");
}
function cameraCart(ctx, cam, x, y, facing, live) {
  const s = cam.s, [fx, fy] = cam.toScreen(x, y), u = s * 0.1, R = (dx, dy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(fx + dx * u * facing - (facing < 0 ? w * u : 0)), Math.round(fy - dy * u), Math.max(1, Math.round(w * u)), Math.max(1, Math.round(h * u))); };
  ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(fx, fy, s * 1.6, s * 0.28, 0, 0, Math.PI * 2); ctx.fill();
  // the cart: a low deck on four wheels, a pedestal, the camera with its big lens, the operator behind it
  R(-14, 4.5, 26, 2.6, "#3b3f48"); R(-14, 4.5, 26, 0.8, "#5b6270");
  for (const wx of [-12, -4, 4, 9]) R(wx, 2, 2.6, 2.6, "#0d0d0d");
  R(2, 15, 1.6, 10.5, "#6b717d");
  R(-2, 19, 9, 4.6, "#2b2f37"); R(7, 18.6, 4.2, 3.8, "#15171c"); R(11, 18, 1.4, 5, "#0a0a0c"); R(11.2, 17.4, 0.9, 0.9, "#6fa8dc"); R(0, 20.2, 1.2, 1.2, live ? "#ff3b30" : "#5a1d1d");
  // the operator, standing on the deck
  R(-10, 13.5, 2.2, 6.5, "#1c2230"); R(-7, 13.5, 2.2, 6.5, "#1c2230"); R(-11, 21, 7.4, 7.6, "#14171f"); R(-4, 19.6, 6, 1.8, "#14171f");
  R(-9.6, 25.4, 4.8, 4.4, "#c8956c"); R(-10.2, 26.2, 6, 1.4, "#0d0d0d");
}
// The camera crews, where they work in a real stadium: on each sideline a camera at either end of the
// team area (clear of the bench), turned toward the ball; in each corner of every end zone, behind the
// end line, a photographer (kneeling on the near side, standing on the far side).
function drawCrews(ctx, cam, near, opts) {
  // one camera on each sideline (turned toward the ball), and the people who work a sideline: security,
  // a marshal, a cable runner; each facing the play (the branded art has its own left-facing version)
  const ball = opts.ballX ?? opts.los ?? 50, y = near ? HALF + 1.4 : -HALF - 1.5;
  const put = (n, x, yy = y) => { const right = ball >= x; if (!sceneSprite(ctx, cam, null, false, right ? n : `${n}_l`, x, yy, 1, 0.9)) sceneSprite(ctx, cam, null, false, n, x, yy, right ? 1 : -1, 0.9); };
  if (near) { put("cam_stand", 27.4); put("cable_tech", 31.2); put("marshal", 73.2); }
  else { put("cam_kneel", 73.2); put("sec_jacket", 27.4); }
}

// The referee: on the field every snap, standing behind the offense with his hands on his hips; when
// the ball's snapped he trails the play, and if there's a flag on it he reaches for it and throws it.
const refSt = { S: null, x: 0, y: -6.5, t: 0, flagAt: null };
function refOnField(S, opts) {
  if (!S || S.kind) return null;
  const now = opts.time || 0;
  if (S !== refSt.S) { refSt.S = S; refSt.x = S.los - 11; refSt.y = -6.5; refSt.t = now; refSt.flagAt = null; }
  const dt = Math.max(0, Math.min(0.1, now - refSt.t)); refSt.t = now;
  let pose = "ref_hips", face = 1;
  if (S.phase !== "presnap") {
    const want = Math.max(S.los - 11, (S.ball?.x ?? S.los) - 9), dx = want - refSt.x, step = Math.sign(dx) * Math.min(Math.abs(dx), 6.5 * dt);
    refSt.x += step; face = dx >= 0 ? 1 : -1;
    if (Math.abs(dx) > 0.25) pose = `ref_run_${(Math.floor(now * 7) % 3) + 1}`;
  }
  const ev = S.result || S.ev, flag = ev && ev.pen && ev.pen.accepted !== false;
  if (flag && S.phase !== "presnap" && S.phase !== "live") { if (refSt.flagAt == null) refSt.flagAt = now; pose = now - refSt.flagAt < 0.4 ? "ref_reach_flag" : "ref_flag_throw"; face = 1; }
  return { x: refSt.x, y: refSt.y, pose, face };
}

// Around each end zone, as at a real game: the orange pylons at its four corners; the photographers
// along the end line (kneeling in front, standing behind), security in the corners and a ball attendant
// by the post; the end-zone camera up on its riser; and the kicking net behind the uprights, raised for
// a field goal or an extra point at that end and lowered the rest of the time.
function endZoneLife(ctx, cam, S, teams, opts) {
  const s = cam.s, t = opts.time || 0, home = HOME_OF(teams);
  const on = (x) => { const [sx] = cam.toScreen(x, 0); return sx > -s * 10 && sx < cam.W + s * 10; };
  const up = (x, y, h) => { const [sx, sy] = cam.toScreen(x, y); return [Math.round(sx), Math.round(sy - h * s * 0.95)]; };
  // pylons: the goal line and the end line, both sidelines, both ends
  for (const x of [0, -10, 100, 110]) { if (!on(x)) continue; for (const y of [-HALF, HALF]) { const [px, py] = up(x, y, 0), w = Math.max(2, Math.round(s * 0.32)), h = Math.max(3, Math.round(s * 0.75));
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(px - w / 2 + 1, py - 1, w + 2, Math.max(1, Math.round(s * 0.15)));
    ctx.fillStyle = "#ff6a00"; ctx.fillRect(px - w / 2, py - h, w, h); ctx.fillStyle = "#ffa64d"; ctx.fillRect(px - w / 2, py - h, Math.max(1, Math.round(w / 3)), h); ctx.fillStyle = "#b84a00"; ctx.fillRect(px - w / 2, py - Math.round(h * 0.25), w, Math.max(1, Math.round(h * 0.12))); } }
  const kicking = S?.kind === "fg" && S.phase !== "done"; // (every kick on this field goes toward the right-hand posts)
  for (const [ex, dir] of [[110, 1], [-10, -1]]) {
    if (!on(ex + dir * 3)) continue;
    const back = (d) => ex + dir * d, face = -dir;
    // the end-zone camera on its riser, dead centre behind the post
    { const [rx, ry] = up(back(5.2), -1.5, 0), rw = Math.round(s * 2.6), rh = Math.round(s * 1.5);
      ctx.fillStyle = "#1e2430"; ctx.fillRect(rx - rw / 2, ry - rh, rw, rh); ctx.fillStyle = "#2c3446"; ctx.fillRect(rx - rw / 2, ry - rh, rw, Math.max(1, Math.round(s * 0.2)));
      ctx.fillStyle = "rgba(255,255,255,.12)"; for (let i = 1; i < 4; i++) ctx.fillRect(rx - rw / 2 + Math.round((rw * i) / 4), ry - rh, 1, rh);
      ctx.save(); ctx.translate(0, -rh); sceneSprite(ctx, cam, null, false, dir > 0 ? "cam_stand_l" : "cam_stand", back(5.2), -1.5, 1, 0.86) || sceneSprite(ctx, cam, null, false, "tv_camera_1", back(5.2), -1.5, face, 0.82); ctx.restore(); }
    // the kicking net: two tall poles behind the uprights with the net strung between; up for a kick at this end
    { const raised = kicking && dir > 0, h = raised ? 9.5 : 2.2, x = back(2.6), [ax, ay] = up(x, -4.4, 0), [bx, by] = up(x, 4.4, 0), [, aT] = up(x, -4.4, h), [, bT] = up(x, 4.4, h);
      ctx.fillStyle = "rgba(20,24,30,.28)"; const cols = 10; for (let i = 0; i <= cols; i++) { const u = i / cols, xx = Math.round(ax + (bx - ax) * u), yb = ay + (by - ay) * u, yt = aT + (bT - aT) * u; ctx.fillRect(xx, Math.round(yt), 1, Math.round(yb - yt)); }
      const rows = raised ? 8 : 2; for (let j = 0; j <= rows; j++) { const v = j / rows; ctx.beginPath(); ctx.strokeStyle = "rgba(20,24,30,.3)"; ctx.lineWidth = 1; ctx.moveTo(ax, ay + (aT - ay) * v); ctx.lineTo(bx, by + (bT - by) * v); ctx.stroke(); }
      ctx.fillStyle = "#3a404c"; const pw = Math.max(2, Math.round(s * 0.18)); ctx.fillRect(ax - pw / 2, aT, pw, ay - aT); ctx.fillRect(bx - pw / 2, bT, pw, by - bT); }
    // a few photographers back toward the wall (kneeling either side of the post, one standing), a ball
    // attendant, security in the corners: all turned toward the field, well clear of the end line
    const L = dir > 0 ? "_l" : "", at = (n, d, y) => sceneSprite(ctx, cam, null, false, n + L, back(d), y, 1, 0.86) || sceneSprite(ctx, cam, null, false, n, back(d), y, face, 0.86);
    at("cam_kneel", 3.4, -11); at("cam_kneel", 3.4, 11.5); at("cam_stand", 4.4, -18.5);
    sceneSprite(ctx, cam, null, false, "ballboy", back(3.8), 6.2, face, 0.8);
    at("sec_vest", 5.0, HALF - 1.6); at("sec_jacket", 5.0, -HALF + 1.6);
    void t; void home;
  }
}

// The crowd behind each end zone, close to the field the way Lambeau's is: a short strip of turf past
// the end line (the goalpost and a cameraman stand on it), a low padded wall in the home club's colour,
// then the seats packed to the top, fans who jump with the rest of the stadium when something happens.
// The rows run away from the field, so the far ones fall into shadow toward the screen's edge.
export const END_WALL = 16.5; // yards past the goal line (6.5 past the end line: room for the photographers, the net and the camera)
function endStands(ctx, cam, teams, yardAt, { px, wallTop, nearEdge, cheer, night }) {
  const { W, s } = cam, home = HOME_OF(teams), y0 = Math.max(0, Math.round(wallTop)), y1 = Math.round(nearEdge + s * 0.5), hgt = y1 - y0;
  for (const side of [-1, 1]) {
    const wx = Math.round(yardAt(side < 0 ? -END_WALL : 100 + END_WALL)), x0 = side < 0 ? 0 : wx, x1 = side < 0 ? wx : W;
    if (x1 - x0 < 1 || hgt < 4) continue;
    const tile = standsTile(px, hgt, teams, cheer);
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, hgt); ctx.clip();
    ctx.fillStyle = "#121620"; ctx.fillRect(x0, y0, x1 - x0, hgt);
    if (tile) { const ox = -(((cam.camX * s * 0.5) % tile.width) + tile.width) % tile.width; for (let x = ox; x < W; x += tile.width) ctx.drawImage(tile, Math.round(x), y0); }
    // the rows climbing away from the field: darker toward the edge of the screen
    const far = side < 0 ? x0 : x1, g = ctx.createLinearGradient?.(wx, 0, far, 0);
    if (g) { g.addColorStop(0, "rgba(6,8,12,0)"); g.addColorStop(1, night ? "rgba(2,4,12,.7)" : "rgba(6,8,12,.5)"); ctx.fillStyle = g; ctx.fillRect(x0, y0, x1 - x0, hgt); }
    if (night) { ctx.fillStyle = "rgba(2,4,14,.45)"; ctx.fillRect(x0, y0, x1 - x0, hgt); }
    ctx.restore();
    // the wall: padded in the home club's colour, a lighter cap along its top, its shadow on the turf
    const ww = Math.max(3, Math.round(s * 0.45)), wl = side < 0 ? wx - ww : wx;
    ctx.fillStyle = "rgba(0,0,0,.22)"; ctx.fillRect(side < 0 ? wx : wx - Math.round(s * 0.35), y0, Math.round(s * 0.35), hgt);
    ctx.fillStyle = home?.clr && home.clr !== "#000000" ? shade(home.clr, -0.25) : "#2b3140"; ctx.fillRect(wl, y0, ww, hgt);
    ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.fillRect(side < 0 ? wx - Math.max(1, Math.round(ww * 0.25)) : wx, y0, Math.max(1, Math.round(ww * 0.25)), hgt);
  }
}

// ---- the ground, cached ----
const GROUND_X0 = -25, GROUND_YDS = 150;
export const perfStats = { groundBuilds: 0 }; // (playtesting)
const groundCache = new Map(); // (a few: the field flips for the other side's snaps, and each way round is its own picture)
function paintGround(ctx, cam, teams, opts, { apron, apronTop, nearEdge, wallTop, px }) {
  const { W, s, top, depth } = cam;
  // the wall, and the turf of the team areas along both sidelines
  ctx.fillStyle = "#3b3f4a"; ctx.fillRect(0, Math.round(wallTop), W, Math.round(apronTop - wallTop));
  ctx.fillStyle = "#2a2e38"; ctx.fillRect(0, Math.round(apronTop - s * 0.1), W, Math.round(s * 0.1));
  ctx.fillStyle = "#4f8139"; ctx.fillRect(0, Math.round(apronTop), W, Math.round(apron));
  ctx.fillRect(0, Math.round(top + depth), W, Math.round(nearEdge - top - depth));
  // the grass, striped every five yards
  const yardAt = (x) => W * 0.42 + (x - cam.camX) * s;
  { // past the end lines: the apron to the wall, like the sidelines
    ctx.fillStyle = "#4f8139"; const l = yardAt(-10), r = yardAt(110);
    if (l > 0) ctx.fillRect(0, Math.round(top), Math.ceil(l), Math.round(depth));
    if (r < W) ctx.fillRect(Math.floor(r), Math.round(top), Math.ceil(W - r), Math.round(depth));
  }
  for (let yd = -10; yd < 110; yd += 5) {
    const x0 = yardAt(yd), x1 = yardAt(yd + 5); if (x1 < 0 || x0 > W) continue;
    // (each stripe shaded from the far side to the near one, like mowed grass under the lights; the end
    // zones are grass too, with the club's name painted on)
    const light = (yd / 5) % 2 === 0, gr = ctx.createLinearGradient?.(0, top, 0, top + depth);
    if (gr) { gr.addColorStop(0, light ? "#699d4d" : "#609345"); gr.addColorStop(1, light ? "#62964a" : "#598c42"); ctx.fillStyle = gr; } else ctx.fillStyle = light ? "#669a4b" : "#5d9044";
    ctx.fillRect(Math.round(x0), Math.round(top), Math.round(x1 - x0) + 1, Math.round(depth));
  }
  // the turf itself, in pixels: blades and specks, light and dark, over all the grass (it scrolls with
  // the field), and the wear along the hash rows where the plays start
  { const tex = turfTile(px); if (tex) { const pat = ctx.createPattern?.(tex, "repeat"); if (pat) { const ox = ((yardAt(0) % tex.width) + tex.width) % tex.width; ctx.save(); ctx.translate(ox, Math.round(apronTop)); ctx.fillStyle = pat; ctx.fillRect(-ox, 0, W, Math.round(nearEdge - apronTop)); ctx.restore(); } }
    for (let yd = 1; yd < 100; yd++) { const x = yardAt(yd); if (x < -s || x > W + s) continue; const near = Math.max(0, 1 - Math.abs(yd - 50) / 45);
      for (const hy of [-8, 8]) for (let k = 0; k < 3; k++) { const h1 = hash(yd * 3 + k, hy), h2 = hash(k + 11, yd + hy); if (h1 > 0.35 + near * 0.5) continue;
        const [, y] = cam.toScreen(0, hy + (h2 - 0.5) * 3.2); ctx.fillStyle = h2 > 0.5 ? "rgba(112,92,54,.32)" : "rgba(96,80,46,.26)"; ctx.fillRect(Math.round(x + (h1 - 0.5) * s * 0.9), Math.round(y), px * (h1 < 0.15 ? 2 : 1), px); } } }
  // the paint goes down first, so the snow lies over it and the rain pools on it
  paintField(ctx, cam, teams, yardAt, opts.sb);
  // the weather on the turf: the same illustrated ground as the sim's live field (snow lying deep with
  // cleared lanes, or in drifts; puddles and mud in the rain), laid on the field under the paint
  const WX = opts.wx || {};
  if (WX.rain) { ctx.fillStyle = `rgba(4,16,8,${WX.rain === 2 ? 0.24 : 0.14})`; ctx.fillRect(0, Math.round(top), W, Math.round(depth)); }
  if (WX.rain || WX.snow) {
    const kind = WX.snow ? (WX.snow === 2 ? "heavySnow" : "lightSnow") : WX.rain === 2 ? "heavyRain" : "lightRain", im = groundImg(kind);
    if (im.complete && im.naturalWidth) {
      // (the art is drawn for a 120 x 53.3-yard field; heavy snow's on a slightly bigger canvas)
      const [gx, gy, gw, gh] = kind === "heavySnow" ? [-11.9, -HALF, 123.75, HALF * 2] : [-10, -HALF, 120, HALF * 2];
      const [sx0, sy0] = cam.toScreen(gx, gy), [sx1, sy1] = cam.toScreen(gx + gw, gy + gh);
      ctx.save(); ctx.beginPath(); ctx.rect(0, Math.round(top), W, Math.round(depth)); ctx.clip(); ctx.imageSmoothingEnabled = true;
      ctx.drawImage(im, Math.round(sx0), Math.round(sy0), Math.round(sx1 - sx0), Math.round(sy1 - sy0)); ctx.restore(); ctx.imageSmoothingEnabled = false;
    }
    if (WX.snow) { ctx.fillStyle = "rgba(235,242,250,.35)"; ctx.fillRect(0, Math.round(apronTop), W, Math.round(apron)); ctx.fillRect(0, Math.round(top + depth), W, Math.round(nearEdge - top - depth)); } // snow on the team areas too
    // the paint still shows through the drifts here and there: a faint second coat over the weather
    ctx.save(); ctx.globalAlpha = WX.snow ? (WX.snow === 2 ? 0.32 : 0.45) : 0.55; paintField(ctx, cam, teams, yardAt, opts.sb); ctx.restore();
  }
  // the near sideline and the strip below it
  // both sidelines: the white boundary, and the dashed line of each team area
  ctx.fillStyle = "#e8e8e0"; ctx.fillRect(0, Math.round(top + depth), W, Math.max(2, s * 0.25)); ctx.fillRect(0, Math.round(top - Math.max(2, s * 0.25)), W, Math.max(2, s * 0.25));
  ctx.fillStyle = "#3b3f4a"; ctx.fillRect(0, Math.round(nearEdge), W, Math.round(s * 0.5));
  for (const yy of [-HALF - 1.1, HALF + 1.1]) { const [a0, ya] = cam.toScreen(30, yy), [a1] = cam.toScreen(70, yy); ctx.fillStyle = "rgba(255,255,255,.55)"; for (let x = a0; x < a1; x += s * 1.2) ctx.fillRect(Math.round(x), Math.round(ya), Math.round(s * 0.6), Math.max(1, Math.round(s * 0.1))); }
  // yard lines, hashes and numbers
  const lw = Math.max(1, Math.round(s * 0.12));
  for (let yd = 0; yd <= 100; yd += 5) { const x = Math.round(yardAt(yd)); if (x < -4 || x > W + 4) continue; ctx.fillStyle = yd % 10 === 0 ? "rgba(236,238,220,.86)" : "rgba(236,238,220,.7)"; ctx.fillRect(x, Math.round(top), lw, Math.round(depth)); }
  ctx.fillStyle = "rgba(236,238,220,.72)";
  { const tk = Math.max(px * 2, Math.round(s * 0.32));
    for (let yd = 1; yd < 100; yd++) { if (yd % 5 === 0) continue; const x = Math.round(yardAt(yd)); if (x < 0 || x > W) continue;
      for (const h of [-8, 8]) { const [, y] = cam.toScreen(0, h); ctx.fillRect(x, Math.round(y - tk / 2), lw, tk); }
      ctx.fillRect(x, Math.round(top), lw, tk); ctx.fillRect(x, Math.round(top + depth - tk), lw, tk); } }
  // the numbers, painted in the same pixel letters as everything else: chunky and off-white, lying
  // flat on the grass, the far ones upside down (they face the far sideline), each with a little pixel
  // arrow pointing to the nearer goal
  { const pn = Math.max(2, Math.round(s * 0.34)), col = "rgba(236,238,220,.9)";
    for (let i = 0; i < 9; i++) { const yd = 10 + i * 10, x = yardAt(yd); if (x < -60 || x > W + 60) continue; const n = String(yd > 50 ? 100 - yd : yd), dir = yd < 50 ? -1 : yd > 50 ? 1 : 0, w = pixWidth(n, pn);
      for (const [yy, flip] of [[-HALF + 7.5, true], [HALF - 7.5, false]]) { const [, y] = cam.toScreen(0, yy);
        ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(1, SQUASH * 1.5); if (flip) ctx.rotate(Math.PI);
        pixText(ctx, n, 0, -Math.round(3.5 * pn), pn, col, "center", FIELD_GL);
        if (dir) { const d = flip ? -dir : dir, ax = Math.round(d * (w / 2 + pn * 2.2)); ctx.fillStyle = col; for (let c = 0; c < 3; c++) { const h = (3 - c) * 2 - 1; ctx.fillRect(ax + d * c * pn - (d < 0 ? 0 : 0), Math.round(-h * pn / 2), pn, h * pn); } }
        ctx.restore(); } } }
}
function groundLayer(ctx, cam, teams, opts, geo, yardAt) {
  const { s, top, H } = cam, WX = opts.wx || {}, dpr = opts.dpr || 1; // (the canvas's pixels to the camera's: not the transform, which carries the zoom)
  const y0 = Math.floor(geo.wallTop - 2), y1 = Math.ceil(geo.nearEdge + s * 0.5 + 2), Wc = Math.ceil(GROUND_YDS * s);
  const ready = (ab) => { const im = ab && logo(ab); return im && im.complete && im.naturalWidth ? 1 : 0; };
  const gk = WX.snow ? (WX.snow === 2 ? "heavySnow" : "lightSnow") : WX.rain ? (WX.rain === 2 ? "heavyRain" : "lightRain") : null, gimg = gk && groundImg(gk);
  const key = [cam.W, H, s, top, dpr, teams.user?.ab, teams.user?.clr, teams.opp?.ab, teams.opp?.clr, HOME_OF(teams)?.ab, opts.sb || "", WX.rain || 0, WX.snow || 0, ready(teams.user?.ab), ready(teams.opp?.ab), ready(HOME_OF(teams)?.ab), gimg ? (gimg.complete && gimg.naturalWidth ? 1 : 0) : 2].join("|");
  const mk = (w, h) => (typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(w, h) : typeof document !== "undefined" && document.createElement ? Object.assign(document.createElement("canvas"), { width: w, height: h }) : null);
  let gc = groundCache.get(key);
  if (!gc) {
    const cv = mk(Math.ceil(Wc * dpr), Math.ceil((y1 - y0) * dpr)), c = cv?.getContext?.("2d");
    if (!c || !c.setTransform) { paintGround(ctx, cam, teams, opts, geo); return; } // (no offscreen canvas: paint it straight on)
    c.setTransform(dpr, 0, 0, dpr, 0, -y0 * dpr); c.imageSmoothingEnabled = false;
    const c0 = GROUND_X0 + (Wc * 0.42) / s;
    const fc = { ...cam, W: Wc, camX: c0, toScreen(x, y) { return [Wc * 0.42 + (x - c0) * s, top + (y + HALF) * SQUASH * s]; } };
    paintGround(c, fc, teams, opts, geo); perfStats.groundBuilds++;
    gc = { cv, y0, y1, Wc }; groundCache.set(key, gc); if (groundCache.size > 4) groundCache.delete(groundCache.keys().next().value);
  }
  const g = gc, dx = Math.round(yardAt(GROUND_X0) * dpr) / dpr;
  ctx.drawImage(g.cv, dx, g.y0, g.Wc, g.y1 - g.y0);
}
export function drawRetro(ctx, cam, S, teams, g, opts = {}) {
  const { W, H, s, top, depth } = cam;
  ctx.imageSmoothingEnabled = false;
  // the stands: tiers of fans above the far sideline (and below the near one on a tall screen)
  ctx.fillStyle = "#121620"; ctx.fillRect(0, 0, W, H);
  // the team areas: a strip of turf along each sideline (about three yards), then the wall, then the stands
  const apron = 3 * SQUASH * s, apronTop = top - apron, px = Math.max(2, Math.round(s * 0.18)), nearEdge = top + depth + apron + s * 0.1, wallTop = apronTop - s * 0.45;
  const time = opts.time || 0, hype = opts.hype || 0;
  // calm until something happens; then the crowd is up, arms in the air, bouncing
  const cheer = hype > 0.15 ? 1 + (Math.floor(time * 8) % 2) : 0;
  const tile = standsTile(px, Math.max(wallTop, H - nearEdge), teams, cheer);
  if (tile) { const ox = -(((cam.camX * s * 0.5) % tile.width) + tile.width) % tile.width; // the stands scroll at half the field's speed
  for (let x = ox; x < W; x += tile.width) {
    if (wallTop > 0) ctx.drawImage(tile, Math.round(x), Math.round(wallTop - tile.height));
    if (H - nearEdge > px) ctx.drawImage(tile, Math.round(x), Math.round(nearEdge));
  } }
  if (opts.night) { ctx.fillStyle = "rgba(2,4,14,.45)"; ctx.fillRect(0, 0, W, Math.max(0, Math.round(wallTop))); if (H > nearEdge) ctx.fillRect(0, Math.round(nearEdge), W, Math.round(H - nearEdge)); } // (a night game: the crowd in the dark beyond the lights)

  // the ground (turf, weather on it, lines, numbers, the painted end zones): painted once into a strip
  // covering the whole field and slid under the camera, so a frame copies it instead of repainting it
  const yardAt = (x) => W * 0.42 + (x - cam.camX) * s;
  groundLayer(ctx, cam, teams, opts, { apron, apronTop, nearEdge, wallTop, px }, yardAt);
  endStands(ctx, cam, teams, yardAt, { px, wallTop, nearEdge, cheer, night: opts.night });
  stadiumLight(ctx, cam, opts.night);
  // what's around each end zone (pylons, photographers, the net, the camera riser), then the goalposts on each end line
  endZoneLife(ctx, cam, S, teams, opts);
  for (const [ex, back, pad] of [[110, 1, teams.opp], [-10, -1, teams.user]]) goalPost(ctx, cam, ex, back, pad.clr);
  // no play on the field (between plays, a kick the engine ran): the sidelines, the crews and the
  // scoreboard are still there, the crews where the last snap was
  if (!S) { const so = { ...opts, los: lastLos, toGain: null, down: g?.down }; drawSidelines(ctx, cam, teams, { ...so, side: "far" }); if (lastLos != null) sceneSprite(ctx, cam, null, false, "ref_hips", lastLos - 11, -6.5, 1, 0.95); if (!opts.noBoard) stadiumBoard(ctx, cam, opts.board || g, opts.boardTeams || teams, (x) => W * 0.42 + (x - cam.camX) * s, wallTop); drawSidelines(ctx, cam, teams, { ...so, side: "near" }); return; }
  if (!S.kind) lastLos = S.los;
  // the line of scrimmage and the line to gain
  const lw = Math.max(1, Math.round(s * 0.12)), vline = (yd, color) => { const x = Math.round(yardAt(yd)); if (x < 0 || x > W) return; ctx.fillStyle = color; ctx.fillRect(x, Math.round(top), Math.max(2, lw * 2), Math.round(depth)); };
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
  const sideOpts = { ...opts, ballX: S.ball?.x, los: S.kind ? null : S.los, toGain: S.kind ? null : S.firstDown, down: g?.down, phase: S.phase, td: !!S.result?.td };
  drawSidelines(ctx, cam, teams, { ...sideOpts, side: "far" });
  if (!opts.noBoard) stadiumBoard(ctx, cam, opts.board || g, opts.boardTeams || teams, (x) => W * 0.42 + (x - cam.camX) * s, wallTop); // (at the 50, in front of the far bench)
  // players, far to near so the near ones overlap the far ones; the man with the ball on top
  const ents = Object.values(S.ents).sort((a, b) => (a.key === S.ball.holder) - (b.key === S.ball.holder) || a.y - b.y);
  const ref = refOnField(S, opts); let refDrawn = !ref;
  for (const e of ents) {
    if (!refDrawn && e.y > ref.y) { refDrawn = true; sceneSprite(ctx, cam, null, false, ref.pose, ref.x, ref.y, ref.face, 0.95); }
    // (in a franchise game on the road you wear your away uniform and they wear their home one)
    const t = e.side === "off" ? teams.user : teams.opp, away = t.isAway != null ? !!t.isAway : e.side === "def" ? !teams.userAway : !!teams.userAway; // (a live game: each club in its own uniform for the day)
    if (Math.abs(e.vx) > 1.0 || e._face == null) e._face = Math.abs(e.vx) > 0.5 ? Math.sign(e.vx) : e._face ?? (e.side === "off" ? 1 : -1); // (a blocker rocking back and forth doesn't spin)
    const facing = e._face;
    shadow(ctx, cam, e.x, e.y);
    const [pose, act] = poseFor(S, e, S.t), p2 = pose2(S, e, S.t);
    const ok = (p2 && sprite2(ctx, cam, t, away, p2.n, e.x, e.y, p2.face ?? facing)) || sprite(ctx, cam, t, away, pose, e.x, e.y, facing, act) || sprite(ctx, cam, t, away, POSE[e.p.pos] || "db", e.x, e.y, facing, false);
    if (poseProbe.cb) poseProbe.cb(S, e, { pose, act, p2: p2?.n || null, facing: p2?.face ?? facing, team: t });
    if (!ok) { const [sx, sy] = cam.toScreen(e.x, e.y); ctx.fillStyle = t.clr; ctx.fillRect(sx - s * 0.5, sy - s * 2.2, s, s * 2.2); }
    if (opts.ring && S.ball.holder === e.key && S.phase !== "presnap") { const [sx, sy] = cam.toScreen(e.x, e.y); ctx.strokeStyle = "#fff"; ctx.lineWidth = Math.max(1, s * 0.08); ctx.beginPath(); ctx.ellipse(sx, sy, s * 1.1, s * 1.1 * SQUASH, 0, 0, Math.PI * 2); ctx.stroke(); }
  }
  if (!refDrawn) sceneSprite(ctx, cam, null, false, ref.pose, ref.x, ref.y, ref.face, 0.95);
  drawSidelines(ctx, cam, teams, { ...sideOpts, side: "near" });
  // before the snap: who's who, the name under each receiver, the tight end and the back
  if (S.phase === "presnap" && !S.kind) {
    const np = Math.max(1, Math.floor(uiPx(cam) * 0.34)); // small: a tag, not a headline
    for (const r of ELIGIBLE) {
      const e = S.ents[r]; if (!e?.p?.name) continue;
      const last = String(e.p.name).split(" ").filter((w) => !/^(jr\.?|sr\.?|ii|iii|iv)$/i.test(w)).pop().toUpperCase().replace(/[^A-Z0-9'.-]/g, "");
      const label = last, [lx, ly] = cam.toScreen(e.x, e.y), w = pixWidth(label, np) + np * 4;
      ctx.fillStyle = "rgba(8,10,16,.72)"; ctx.fillRect(Math.round(lx - w / 2), Math.round(ly + s * 0.2), w, np * 9);
      pixText(ctx, label, lx, Math.round(ly + s * 0.2 + np * 1), np, r === "RB" ? "#ffd166" : r === "TE" ? "#9be29b" : "#7fe3ff", "center");
    }
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
  // locked on to a receiver (the slingshot near his catch point): a bracket round him and his name on the label
  const lk = S.aimLock && S.ents[S.aimLock];
  if (lk) { const [rx, ry] = cam.toScreen(lk.x, lk.y), rr = s * 1.5; ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, s * 0.14); ctx.beginPath(); ctx.ellipse(rx, ry, rr, rr * 0.45, 0, 0, Math.PI * 2); ctx.stroke(); }
  // the label: BULLET or LOB (AUTO when the game picked it), and a warning when he can't reach it
  const px = uiPx(cam), label = (lk ? `${lastName(lk.p?.name || "").toUpperCase()} - ` : "") + (plan.auto ? "AUTO " : "") + plan.kind.toUpperCase() + (plan.short ? " - TOO FAR" : plan.bullet && plan.dist > BULLET_MAX ? " - WILD" : "");
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
// The score strip across the top (the standalone arcade; in a live game the app shows the score and
// the stadium scoreboard at the 50 does the rest).
export function drawHud(ctx, cam, sit, teams, { ot, to } = {}) {
  const { W } = cam, px = hudPx(cam), h = px * 7, pad = px * 2, px2 = Math.max(1, Math.round(px * 0.7)), tip = px * 4;
  // two rows: the clubs, scores and clock; under the clock the down and distance (whoever has the ball)
  const bar = h + pad * 2 + px2 * 7 + px * 2;
  ctx.fillStyle = "#0b0e14"; ctx.fillRect(0, 0, W, bar); ctx.fillStyle = "#1c2433"; ctx.fillRect(0, bar - px, W, px);
  const box = (x, t, n, right, poss, tos) => {
    const w = Math.max(px * 6 * 3 + pad * 2, tip * 3 + px * 2 * 2 + pad * 2), bx = right ? x - w : x;
    ctx.fillStyle = t.clr; ctx.fillRect(bx, px, w, bar - px * 3); ctx.fillStyle = t.ac; ctx.fillRect(bx, bar - px * 2, w, px);
    pixShadow(ctx, t.ab, bx + w / 2, pad, px, "#fff", "center");
    const sx = right ? bx - pad : bx + w + pad;
    pixShadow(ctx, n, sx, pad, px, "#fff", right ? "right" : "left");
    // possession: a little football beside the score
    const nw = pixWidth(n, px), fx = right ? sx - nw - pad * 2.5 : sx + nw + pad;
    if (poss) { ctx.fillStyle = "#a0552a"; ctx.fillRect(fx, pad + px * 2, px * 3, px * 3); ctx.fillStyle = "#fff"; ctx.fillRect(fx + px, pad + px * 2, px, px * 3); }
    // timeouts: three bars under the club's name, on a dark strip so they read on any colour (gold: left, dark: used)
    const ty = pad + h + px, tw = tip * 3 + px * 2 * 2, tx = Math.round(bx + w / 2 - tw / 2);
    ctx.fillStyle = "rgba(8,10,16,.75)"; ctx.fillRect(tx - px, ty - px, tw + px * 2, px * 2 + px * 2);
    for (let i = 0; i < 3; i++) { const on = i < (tos ?? 3); ctx.fillStyle = on ? "#ffd166" : "#39415a"; ctx.fillRect(tx + i * (tip + px * 2), ty, tip, px * 2); if (on) { ctx.fillStyle = "#fff6c8"; ctx.fillRect(tx + i * (tip + px * 2), ty, tip, Math.max(1, Math.round(px / 2))); } }
  };
  box(pad, teams.user, sit.score.h, false, sit.poss === "h" && !sit.done, to?.h); box(W - pad, teams.opp, sit.score.a, true, sit.poss === "a" && !sit.done, to?.a);
  const clock = `${Math.floor(sit.clock / 60)}:${String(sit.clock % 60).padStart(2, "0")}`;
  pixShadow(ctx, `${sit.ot || ot ? "OT" : "Q" + sit.qtr}  ${clock}`, W / 2, pad, px, "#ffd166", "center");
  // the down and distance, and where the ball is
  if (!sit.done) {
    const off = sit.poss === "h" ? teams.user : teams.opp, def = sit.poss === "h" ? teams.opp : teams.user, yd = sit.yard;
    const ORD = ["", "1ST", "2ND", "3RD", "4TH"], toGo = sit.toGo >= 100 - yd ? "GOAL" : sit.toGo;
    const spot = yd === 50 ? "THE 50" : yd > 50 ? `${def.ab} ${100 - yd}` : `${off.ab} ${yd}`;
    const txt = sit.koNext ? `${off.ab} KICKOFF` : `${off.ab}  ${ORD[sit.down] || sit.down} & ${toGo}  ON ${spot}`;
    pixShadow(ctx, txt, W / 2, pad + h + px, px2, "#fff", "center");
  }
  return bar;
}
const shade = (hex, k) => { const n = parseInt(String(hex).replace("#", "").padEnd(6, "0").slice(0, 6), 16); const f = (c) => Math.max(0, Math.min(255, Math.round(c + (k < 0 ? c * k : (255 - c) * k)))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };

export function drawDownBox(ctx, cam, text, color = "#fff", { left = false } = {}) {
  const px = hudPx(cam), h = px * 7, pad = px * 2, bar = left ? pad : h + pad * 2 + Math.max(1, Math.round(px * 0.7)) * 7 + px * 2; // (under the scorebug)
  const w = pixWidth(text, px) + pad * 3, W = left ? w + pad * 4 : cam.W; // (at the left: its box starts a little in from the edge)
  ctx.fillStyle = "#0b0e14"; ctx.fillRect(Math.round(W / 2 - w / 2), bar - px, Math.round(w), h + pad + px);
  ctx.fillStyle = "#1c2433"; ctx.fillRect(Math.round(W / 2 - w / 2), bar + h + pad - px, Math.round(w), px);
  pixShadow(ctx, text, W / 2, bar + pad / 2, px, color, "center");
}

// ---- the result banner ----
// It slides in across the field: the result big in the club's colours, the play-by-play under it.
// `age` is how long it has been up, for the slide and the pulse.
// A live game's result, TV style: a slim lower third over the bottom of the field (the app has the full
// play-by-play beside it), rising in, the club's colour down its edge.
export function drawLowerThird(ctx, cam, title, text, color, { age = 1, accent = "#ffd166", sub = null, hint = null, center = false } = {}) {
  const { W, H } = cam, u = uiPx(cam), px = Math.max(2, Math.round(u * 1.25)), px2 = Math.max(1, Math.round(u * 0.8));
  // up to three lines of the play, and a grey line under them saying why (never cut off: the box grows up from the bottom)
  const maxW = Math.min(W - u * 8, Math.max(u * 160, W * 0.86)), chars = Math.max(12, Math.floor((maxW - u * 14) / (6 * px2)));
  const lines = wrap(text || "", chars).slice(0, 3), subL = sub ? wrap(sub, chars).slice(0, 1) : [];
  const h = px * 7 + u * 4 + (lines.length + subL.length) * px2 * 8 + u * 3;
  const k = 1 - Math.pow(1 - Math.min(1, age / 0.22), 3), y = Math.round(H - u * 4 - h + (1 - k) * (h + u * 4));
  const w = Math.round(Math.min(maxW, Math.max(pixWidth(title, px) + (hint ? pixWidth(hint, px2) + u * 10 : 0), ...lines.map((l) => pixWidth(l, px2)), ...subL.map((l) => pixWidth(l, px2))) + u * 14)), x = Math.round(W / 2 - w / 2);
  ctx.save(); ctx.globalAlpha = Math.min(1, age / 0.15);
  ctx.fillStyle = "rgba(6,8,14,.9)"; ctx.fillRect(x, y, w, h); ctx.fillStyle = color || "#334155"; ctx.fillRect(x, y, Math.max(3, u), h); ctx.fillStyle = "rgba(255,255,255,.08)"; ctx.fillRect(x, y, w, 1);
  const tx = center ? Math.round(x + w / 2) : x + u * 6, al = center ? "center" : "left";
  pixShadow(ctx, title, tx, y + u * 2, px, accent, al);
  lines.forEach((l, i) => pixText(ctx, l, tx, y + u * 3 + px * 7 + u + i * px2 * 8, px2, "#e5e7eb", al));
  subL.forEach((l) => pixText(ctx, l, x + u * 6, y + u * 3 + px * 7 + u + lines.length * px2 * 8, px2, "#9aa7b2", "left"));
  // waiting on you: a blinking prompt in the box's top right corner
  if (hint && age > 0.5 && Math.floor(age * 2) % 2 === 0) pixText(ctx, hint, x + w - u * 4, y + u * 2.5, px2, "#ffd166", "right");
  ctx.restore();
}
export function drawBanner(ctx, cam, title, text, sub, color, { age = 1, accent = "#ffd166", hint = "TAP TO CONTINUE" } = {}) {
  const { W, H, s } = cam, big = /TOUCHDOWN|WIN|INTERCEPT|FIELD GOAL|SAFETY/.test(title);
  const u = uiPx(cam), px = big ? u * 2 : Math.round(u * 1.5), px2 = Math.max(1, Math.round(u * 0.85)); void s;
  const lines = wrap(text, Math.floor((W * 0.92) / (6 * px2))).slice(0, 4);
  const h = px * 7 + px * 4 + px2 * 8 * lines.length + (sub ? px2 * 9 : 0) + px * 3;
  const ease = (u) => 1 - Math.pow(1 - Math.min(1, u), 3);
  const slide = ease(age / 0.28), y = Math.round(H * 0.5 - h / 2), x0 = Math.round((1 - slide) * -W);
  ctx.save(); ctx.translate(x0, 0);
  ctx.fillStyle = "rgba(8,10,16,.93)"; ctx.fillRect(0, y, W, h);
  ctx.fillStyle = color; ctx.fillRect(0, y, W, px); ctx.fillRect(0, y + h - px, W, px);
  const pulse = big ? 1 + Math.max(0, 0.25 - age) * 1.2 : 1, tpx = Math.max(2, Math.round(px * pulse));
  pixShadow(ctx, title, W / 2, y + px * 2.5, tpx, accent, "center", color);
  lines.forEach((l, i) => pixShadow(ctx, l, W / 2, y + px * 2.5 + tpx * 7 + px * 1.5 + i * px2 * 8, px2, "#fff", "center"));
  if (sub) pixText(ctx, wrap(sub, Math.floor((W * 0.92) / (6 * px2)))[0] || "", W / 2, y + h - px2 * 7 - px * 1.8, px2, "#9aa7b2", "center");
  ctx.restore();
  if (hint && age > 0.6) { ctx.globalAlpha = 0.5 + 0.3 * Math.sin(age * 5); pixText(ctx, hint, W / 2, y + h + px2 * 2, px2, "#fff", "center"); ctx.globalAlpha = 1; }
}
const wrap = (text, n) => { const out = []; let line = ""; for (const w of String(text).split(" ")) { if ((line + " " + w).trim().length > n) { out.push(line.trim()); line = w; } else line += " " + w; } if (line.trim()) out.push(line.trim()); return out; };

// ---- the play call ----
// Play cards along the bottom, each with the play's routes drawn on it, Retro Bowl style. A key
// number on each for the keyboard. Returns the hit boxes.
export function drawPlayCards(ctx, cam, heading, items, color, { keys = false, hover = null, sub = null } = {}) {
  const { W, H } = cam, px = hudPx(cam), small = W < 560;
  const cols = small ? 3 : Math.min(6, items.length), rows = Math.ceil(items.length / cols), gap = px * 2;
  const cw = Math.min(px * 54, (W - gap * (cols + 1)) / cols), ch = Math.round(cw * (small ? 0.72 : 0.6)), total = cols * cw + (cols - 1) * gap;
  const top = H - rows * (ch + gap) - gap - px * 10, left = (W - total) / 2;
  ctx.fillStyle = "rgba(8,10,16,.9)"; ctx.fillRect(0, top - px * 3, W, H - top + px * 3);
  ctx.fillStyle = color; ctx.fillRect(0, top - px * 3, W, px);
  pixShadow(ctx, heading, W / 2, top, px, "#ffd166", "center");
  // who's on the field for this snap (the back in the backfield), so the call can fit the man
  if (sub) { const sw = pixWidth(sub, px) + px * 6; ctx.fillStyle = "rgba(8,10,16,.9)"; ctx.fillRect(Math.round(W / 2 - sw / 2), top - px * 13, Math.round(sw), px * 10); ctx.fillStyle = color; ctx.fillRect(Math.round(W / 2 - sw / 2), top - px * 13, Math.round(sw), Math.max(1, Math.round(px * 0.5))); pixShadow(ctx, sub, W / 2, top - px * 11, px, "#fff", "center"); }
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
  pixShadow(ctx, opts.sb ? String(opts.sb).toUpperCase() : "ARCADE", W / 2, H * 0.07 + tp * 9, Math.round(tp * 0.8), opts.sb ? "#fde68a" : "#fff", "center", opts.sb ? "#5a3d00" : "#30405a");
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
  ctx.fillStyle = opts.sb ? "#8a6a16" : u.clr; ctx.fillRect(kx, ky, kw, kh); ctx.fillStyle = `rgba(255,209,102,${0.5 + pulse * 0.5})`; ctx.fillRect(kx, ky + kh - px * 2, kw, px * 2);
  pixShadow(ctx, "KICK OFF", W / 2, ky + px * 3, Math.round(px * 1.4), "#fff", "center");
  boxes.push({ key: "go", x: kx, y: ky, w: kw, h: kh });
  // the game's length: tap to cycle the quarter length
  if (opts.qMin) { const label = `QUARTERS: ${opts.qMin} MIN`, lw = pixWidth(label, px) + px * 8, lh = px * 11, lx = Math.round(W / 2 - lw - px * 2), ly = ky + kh + px * 4; ctx.fillStyle = "rgba(8,10,16,.8)"; ctx.fillRect(lx, ly, lw, lh); ctx.fillStyle = "#2c3744"; ctx.fillRect(lx, ly + lh - px, lw, px); pixText(ctx, label, lx + lw / 2, ly + px * 2, px, "#fff", "center"); boxes.push({ key: "len", x: lx, y: ly, w: lw, h: lh });
    { const sl = opts.sb ? "SUPER BOWL: ON" : "SUPER BOWL: OFF", sw = pixWidth(sl, px) + px * 8, sx0 = Math.round(W / 2 - sw / 2), sy0 = ly + lh + px * 3; ctx.fillStyle = opts.sb ? "rgba(70,52,10,.92)" : "rgba(8,10,16,.8)"; ctx.fillRect(sx0, sy0, sw, lh); ctx.fillStyle = opts.sb ? "#e8c45a" : "#2c3744"; ctx.fillRect(sx0, sy0 + lh - px, sw, px); pixText(ctx, sl, sx0 + sw / 2, sy0 + px * 2, px, opts.sb ? "#fde68a" : "#fff", "center"); boxes.push({ key: "sb", x: sx0, y: sy0, w: sw, h: lh }); }
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
  const help = mobile ? ["TOUCH THE FIELD TO SNAP", "TAP A RECEIVER TO THROW HIM THE BALL", "TAP BULLET OR LOB TO PICK THE THROW", "SWIPE TO STEER - FLICK SIDEWAYS TO JUKE, AHEAD TO DIVE"]
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

// ---- the broadcast touches in a live game ----
// Before the snap: who's out there, in small tags over the quarterback, the back and the top target
// (the receiver or tight end with the best rating), so you can read the matchup before the play.
export function drawNameTags(ctx, cam, S) {
  const px = Math.max(1, Math.round(uiPx(cam) * 0.75)), last = (p) => String(p?.name || "").split(" ").slice(-1)[0].toUpperCase();
  const recv = ["X", "Z", "SLOT", "TE"].map((k) => S.ents[k]).filter(Boolean).sort((a, b) => (b.p?.ovr || 0) - (a.p?.ovr || 0))[0];
  const tags = [[S.ents.QB, "QB"], [S.ents.RB, S.ents.RB?.p?.pos === "FB" ? "FB" : "RB"], [recv, recv?.key === "TE" ? "TE" : "WR"]];
  const placed = [];
  for (const [e, role] of tags) {
    if (!e?.p) continue;
    const [sx, sy] = cam.toScreen(e.x, e.y), num = e.p.num != null ? `#${e.p.num} ` : "", text = `${role} ${num}${last(e.p)}`;
    const w = pixWidth(text, px) + px * 6, h = px * 11, x = Math.round(sx - w / 2); let y = Math.round(sy - PLAYER_H * cam.s - h - px * 3);
    // (two players close together: the later tag stacks above the earlier one instead of covering it)
    for (let k = 0; k < 4; k++) { const hit = placed.find((b) => x < b.x + b.w && x + w > b.x && y < b.y + b.h + px && y + h + px > b.y); if (!hit) break; y = hit.y - h - px * 2; }
    placed.push({ x, y, w, h });
    ctx.fillStyle = "rgba(8,10,16,.82)"; ctx.fillRect(x, y, w, h); ctx.fillStyle = "#ffd166"; ctx.fillRect(x, y + h - px, w, px);
    pixText(ctx, text, x + w / 2, y + px * 2, px, "#fff", "center");
  }
}
// The instant replay's tag, top left, with a red light that blinks
export function drawReplayTag(ctx, cam, time) {
  const px = uiPx(cam), text = "REPLAY", w = pixWidth(text, px) + px * 14, h = px * 11, x = px * 3, y = px * 3;
  ctx.fillStyle = "rgba(8,10,16,.85)"; ctx.fillRect(x, y, w, h); ctx.fillStyle = "#e11d48"; ctx.fillRect(x, y, px, h);
  if (Math.floor(time * 2) % 2 === 0) { ctx.fillStyle = "#ef4444"; ctx.fillRect(x + px * 4, y + px * 4, px * 3, px * 3); }
  pixText(ctx, text, x + px * 10, y + px * 2, px, "#fff");
  // letterbox bars: the picture reads as a replay at a glance
  ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(0, 0, cam.W, Math.round(px * 1.5)); ctx.fillRect(0, cam.H - Math.round(px * 1.5), cam.W, Math.round(px * 1.5));
}

// ---- the trophy ceremony (you won the Super Bowl) ----
// The Lombardi Trophy in pixels: a silver football on a tapered stand, standing on (x, y) bottom-centre.
export function drawLombardi(ctx, x, y, u) {
  const R = (dx, dy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x + dx * u), Math.round(y - dy * u), Math.max(1, Math.round(w * u)), Math.max(1, Math.round(h * u))); };
  R(-3, 2, 6, 2, "#2b2f36"); R(-3, 2, 6, 0.5, "#9aa3ad"); // the base
  for (let i = 0; i < 6; i++) { const w = 3.2 - i * 0.35; R(-w / 2, 3 + i, w, 1.05, i % 2 ? "#cfd5dc" : "#e5e9ee"); } // the stand, tapering up
  R(-0.3, 8.6, 0.6, 1.2, "#f8fafc");
  // the ball, tipped back, with its laces
  ctx.save(); ctx.translate(Math.round(x + 0.4 * u), Math.round(y - 10.6 * u)); ctx.rotate(-0.55);
  ctx.fillStyle = "#c7cdd4"; ctx.beginPath(); ctx.ellipse(0, 0, 2.6 * u, 1.6 * u, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#eef2f6"; ctx.beginPath(); ctx.ellipse(-0.5 * u, -0.5 * u, 1.6 * u, 0.7 * u, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#8a939e"; ctx.fillRect(Math.round(-1.2 * u), Math.round(-0.15 * u), Math.round(2.4 * u), Math.max(1, Math.round(0.3 * u)));
  for (let i = -1; i <= 1; i++) ctx.fillRect(Math.round(i * 0.7 * u - 0.1 * u), Math.round(-0.45 * u), Math.max(1, Math.round(0.25 * u)), Math.max(1, Math.round(0.9 * u)));
  ctx.restore();
  // a glint that comes and goes
  const g = (performance.now() / 600) % 3; if (g < 0.5) { ctx.fillStyle = "rgba(255,255,255,.9)"; const a = g * 2; ctx.fillRect(Math.round(x - 1.2 * u), Math.round(y - (11.5 + a) * u), Math.max(1, Math.round(0.5 * u)), Math.max(1, Math.round(0.5 * u))); }
}

// The scene at midfield: a stage with a backdrop in the champions' colours, the commissioner walking
// the trophy out from the near sideline and up onto the stage, handing it over, and the team on and
// around the stage, jumping, the quarterback lifting the trophy over his head. t: seconds since it began.
export function drawCeremony(ctx, cam, team, away, t, { sb = "SUPER BOWL" } = {}) {
  const s = cam.s, sx = (x) => cam.toScreen(x, 0)[0], sy = (y) => cam.toScreen(0, y)[1], hS = Math.round(s * 1.1), u = s * 0.21;
  const clr = team?.clr && team.clr !== "#000000" ? team.clr : "#1e293b", ac = team?.ac || "#e5e7eb";
  // the backdrop behind the stage, rising over the far sideline: the words across its top, clear of
  // the players standing in front of it
  { const x0 = sx(40), x1 = sx(60), yb = sy(-12.5) - hS, h = Math.round(s * 8.4), px = Math.max(1, Math.round(uiPx(cam) * 0.85));
    ctx.fillStyle = "#0b0f19"; ctx.fillRect(Math.round(x0 - 3), Math.round(yb - h - 3), Math.round(x1 - x0 + 6), h + 3);
    const g = ctx.createLinearGradient?.(0, yb - h, 0, yb); if (g) { g.addColorStop(0, clr); g.addColorStop(0.55, clr); g.addColorStop(1, "#0b0f19"); ctx.fillStyle = g; } else ctx.fillStyle = clr;
    ctx.fillRect(Math.round(x0), Math.round(yb - h), Math.round(x1 - x0), h);
    ctx.fillStyle = "#e8c45a"; const gb = Math.max(2, px); ctx.fillRect(Math.round(x0), Math.round(yb - h), Math.round(x1 - x0), gb); ctx.fillRect(Math.round(x0), Math.round(yb - gb), Math.round(x1 - x0), gb);
    // the words sit low on it, just over the heads of the players on the stage, so the scorebug
    // across the top of the screen never covers them
    const mid = (x0 + x1) / 2, big = Math.max(px, Math.round(px * 1.5)), heads = Math.round(sy(-10.5) - hS - PLAYER_H * s * 1.08);
    // (the title itself is the banner along the bottom of the screen: SUPER BOWL ... CHAMPIONS)
    const nameY = Math.max(Math.round(yb - h + px * 4), heads - big * 7 - px * 3); void sb;
    // the champions' logo on it, low-res like the rest of the game (22 pixels across, blown up with no
    // smoothing, a hard shadow under it); their name instead until the logo has loaded
    // (sized to the strip of backdrop that shows between the score strip across the top and the heads)
    const up = uiPx(cam), hudB = up * 13 + Math.max(1, Math.round(up * 0.7)) * 7 + up, room = heads - px - Math.max(yb - h + gb + px, hudB);
    const lg = team?.ab && pixLogo(team.ab, 22, false), k = Math.max(2, Math.min(Math.round((big * 13) / 22), Math.floor(room / 26))), size = 22 * k; // (a whole number of screen pixels per logo pixel)
    if (lg) { const pad = k * 2, bw = size + pad * 2, bx = Math.round(mid - bw / 2), by = Math.round(Math.max(Math.min(heads - bw - px, yb - bw - px), hudB + px)); // (a small screen: it can tuck behind the heads on the stage rather than under the score)
      // a light badge with a gold rim behind it, corners cut like a pixel sprite, so a dark logo shows on a dark backdrop
      const cut = k * 2, plate = (x, y, w, hh, c) => { ctx.fillStyle = c; ctx.fillRect(x + cut, y, w - cut * 2, hh); ctx.fillRect(x, y + cut, w, hh - cut * 2); ctx.fillRect(x + k, y + k, w - k * 2, hh - k * 2); };
      plate(bx + k, by + k, bw, bw, "rgba(5,8,20,.7)"); plate(bx, by, bw, bw, "#e8c45a"); plate(bx + k, by + k, bw - k * 2, bw - k * 2, "#f1f3f7");
      ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(lg, bx + pad, by + pad, size, size); ctx.restore(); }
    else pixShadow(ctx, String(team?.name || "").toUpperCase(), mid, nameY, big, "#fff", "center"); }
  // the stage: its top, then its front with the champions' colours and gold trim
  { const x0 = sx(42), x1 = sx(58), yt = sy(-12) - hS, yf = sy(-6) - hS;
    ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.fillRect(Math.round(x0 + s * 0.4), Math.round(sy(-6) - s * 0.1), Math.round(x1 - x0), Math.round(s * 0.5));
    ctx.fillStyle = "#1f2430"; ctx.fillRect(Math.round(x0), Math.round(yt), Math.round(x1 - x0), Math.round(yf - yt));
    ctx.fillStyle = "rgba(255,255,255,.05)"; for (let i = 1; i < 4; i++) ctx.fillRect(Math.round(x0), Math.round(yt + ((yf - yt) * i) / 4), Math.round(x1 - x0), 1);
    ctx.fillStyle = clr; ctx.fillRect(Math.round(x0), Math.round(yf), Math.round(x1 - x0), hS);
    ctx.fillStyle = "#e8c45a"; ctx.fillRect(Math.round(x0), Math.round(yf), Math.round(x1 - x0), Math.max(2, Math.round(s * 0.12)));
    // the steps up the front, in the middle
    for (let i = 0; i < 3; i++) { ctx.fillStyle = i % 2 ? "#2a303d" : "#343b4a"; const w = s * (3.2 - i * 0.4); ctx.fillRect(Math.round(sx(50) - w / 2), Math.round(sy(-6) - (hS * (i + 1)) / 3), Math.round(w), Math.round(hS / 3) + 1); } }
  // who's where: the team on the stage and in front of it, and the commissioner
  const own = hasScene(team, away), common = !!SCENE.common?.f?.comm_walk_1;
  const jump = (i, k = 1) => Math.round(Math.abs(Math.sin(t * 5.5 + i * 1.7)) * s * 0.45 * k);
  const handed = t >= 8.2, people = [];
  const qbX = common ? 51.4 : 50;
  const onStage = [[45, -9.5], [47.5, -10.5], [52.8, -10.5], [55.2, -9.5], [qbX, -8.4]];
  onStage.forEach(([x, y], i) => people.push({ x, y, up: hS, kind: "player", i, qb: i === 4 }));
  // the rest of the team fills midfield in front of the stage: loose rows, closer together nearer the stage
  { let i = 5; const rows = [[-2.0, 37.5, 62.5, 2.7], [0.6, 35, 65, 2.7], [3.2, 31, 69, 2.9], [5.9, 33, 67, 3.1], [8.6, 36, 64, 3.5]]; // (a clear lane along the front of the stage for the commissioner)
    for (const [ry, x0, x1, step] of rows) for (let x = x0; x <= x1; x += step) { people.push({ x: x + (hash(i, 51) - 0.5) * 1.4, y: ry + (hash(i, 52) - 0.5) * 1.1, up: 0, kind: "player", i }); i++; } }
  // the stage's furniture: a lectern at one side, a confetti cannon on each front corner
  if (common) { people.push({ x: 43.4, y: -10.8, up: hS, kind: "prop", name: "lectern" }); for (const cx of [42.6, 57.4]) people.push({ x: cx, y: -6.3, up: hS, kind: "prop", name: "confetti_cannon", face: cx < 50 ? 1 : -1 }); }
  // the commissioner: walks up from the near sideline to the steps, climbs, holds the trophy out to the
  // quarterback, then steps back and applauds
  const ease = (a) => a * a * (3 - 2 * a), cl = (a) => Math.max(0, Math.min(1, a));
  let cx = common ? 48.6 : 50, cy, cup = 0;
  const stepX = common ? 48.6 : 50;
  if (t < 4.6) { cx = 26 + (stepX - 26) * cl(t / 4.6); cy = -4.7; } else if (t < 5.6) { const k = ease(cl((t - 4.6) / 1)); cx = stepX; cy = -4.7 - k * 3.3; cup = Math.round(hS * k); } else { cy = -8; cup = hS; if (handed) cx = (common ? 48.6 : 50) - ease(cl((t - 8.2) / 1)) * 1.6 * (common ? 1 : -1); }
  people.push({ x: cx, y: cy, up: cup, kind: "commish" });
  people.sort((a, b) => a.y - b.y);
  // what each player is doing: the quarterback takes the trophy and lifts it; the others celebrate,
  // and after a while some are in the champions' caps and t-shirts
  // two beats, no more: until the trophy's up everyone bounces in one jump; once the quarterback lifts
  // it, they all hold one pose (each his own) while the confetti falls
  const hold = handed && t >= 9;
  const own2 = (p) => {
    if (p.qb) return !handed ? "point_up" : t < 8.9 ? "trophy_receive" : "trophy_lift_1";
    return ["point_up", "helmet_raise", "confetti_catch", "wave_crowd"][Math.floor(hash(p.i, 62) * 4)]; // (one pose each, held: no bouncing)
  };

  for (const p of people) {
    ctx.save(); ctx.translate(0, -p.up);
    if (p.kind === "prop") sceneSprite(ctx, cam, null, false, p.name, p.x, p.y, p.face || 1, 0.9);
    else if (p.kind === "commish") {
      const walking = t < 5.6, name = walking ? `comm_walk_${(Math.floor(t * 5) % 4) + 1}` : !handed ? "comm_present" : "comm_clap_2";
      if (!sceneSprite(ctx, cam, null, false, name, p.x, p.y, 1, 1)) {
        person(ctx, cam, p.x, p.y, 1, { c: "#111827", k: SKIN[0], h: "#111827", p: "#1f2937", w: "#f8fafc", t: "#111827", s: "#0b0b0b" }, 0.92, { headset: false, sheet: false, cap: false });
        if (!handed) { const [tx, ty] = cam.toScreen(p.x + 0.9, p.y); drawLombardi(ctx, tx, Math.round(ty - PLAYER_H * s * 0.42), u); }
      }
    } else {
      const facing = p.x < 50 ? 1 : -1;
      if (own) { sceneSprite(ctx, cam, team, away, own2(p), p.x, p.y, p.qb ? -1 : facing, 1); }
      else {
        const lift = p.qb && handed, up = 0; void jump; void hold;
        ctx.translate(0, -up);
        const name = lift ? "catch_high" : hash(p.i, 62) < 0.5 ? "catch_high" : "td_dance_1";
        if (!sprite2(ctx, cam, team, away, name, p.x, p.y, facing)) sprite(ctx, cam, team, away, "c8", p.x, p.y, facing, true);
        if (lift) { const [tx, ty] = cam.toScreen(p.x, p.y); drawLombardi(ctx, tx, Math.round(ty - PLAYER_H * s * 1.08), u * 1.05); }
      }
    }
    ctx.restore();
  }
}

// The Super Bowl's title card at kickoff (the arcade's Super Bowl mode): the game's name in gold over
// the two clubs, fading in and out over the field.
export function drawSbCard(ctx, cam, name, teams, age) {
  const { W, H } = cam, px = uiPx(cam), a = Math.min(1, age / 0.4, (3.6 - age) / 0.6); if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a;
  const h = px * 40, y = Math.round(H * 0.3 - h / 2); ctx.fillStyle = "rgba(6,8,14,.86)"; ctx.fillRect(0, y, W, h); ctx.fillStyle = "#e8c45a"; ctx.fillRect(0, y, W, px); ctx.fillRect(0, y + h - px, W, px);
  pixShadow(ctx, String(name).toUpperCase(), W / 2, y + px * 6, Math.round(px * 2.2), "#fde68a", "center", "#5a3d00");
  pixShadow(ctx, `${teams.user?.name || ""}  VS  ${teams.opp?.name || ""}`.toUpperCase(), W / 2, y + px * 26, px, "#fff", "center");
  ctx.restore();
}
