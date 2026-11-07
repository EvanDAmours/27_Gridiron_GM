// Pixel-art surroundings for the stadium flyover (StadiumFlyover.jsx), drawn in code at a low
// resolution and blown up with no smoothing. Two layers: the skyline on the horizon (it stays put
// while the camera tips down, then slides away) and the ground the stadium stands on (it tilts and
// zooms with the stadium). So far: the Meadowlands, for MetLife Stadium (the Giants and the Jets).

const seeded = (a) => () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
export const CITY_SCENES = { NYG: "meadowlands", NYJ: "meadowlands" };
export const hasCityScene = (ab) => !!CITY_SCENES[ab];

// ---- the skyline: Manhattan across the river from the Meadowlands ----
export const SKY_W = 560, SKY_H = 106;
export function drawSkyline(cv, kind, night) {
  if (kind !== "meadowlands") return;
  cv.width = SKY_W; cv.height = SKY_H; const c = cv.getContext("2d"); if (!c) return;
  const R = seeded(1958), horizon = 92;
  // the sky in bands, like the pixel art: dusk purple at night, a hazy blue by day
  const bands = night ? ["#141b4a", "#1d2463", "#2a2b78", "#3d2f86", "#5a358f", "#7a3d90", "#a24c8f", "#c4628c"] : ["#5f8fd6", "#6c9ad9", "#7aa5dc", "#8ab0df", "#9bbbe0", "#adc6e2", "#c0d1e3", "#d2dbe2"];
  bands.forEach((col, i) => { c.fillStyle = col; c.fillRect(0, Math.floor((i * horizon) / bands.length), SKY_W, Math.ceil(horizon / bands.length) + 1); });
  // a few thin pixel clouds
  c.fillStyle = night ? "#5b4a9a" : "#e8eef5";
  for (let i = 0; i < 9; i++) { const x = Math.floor(R() * SKY_W), y = 8 + Math.floor(R() * 50), w = 12 + Math.floor(R() * 30); c.fillRect(x, y, w, 1); c.fillRect(x + 4, y - 1, Math.floor(w * 0.5), 1); }
  // the far skyline: low blocks all along the Manhattan shore
  const far = night ? "#232a5e" : "#7d8fb0", mid = night ? "#1a2050" : "#5f7398", near = night ? "#10153a" : "#4a5c80";
  for (let x = 40; x < 520; x += 3 + Math.floor(R() * 4)) { const h = 6 + Math.floor(R() * 12); c.fillStyle = far; c.fillRect(x, horizon - h, 4 + Math.floor(R() * 4), h); }
  // the towers, with lit windows
  const win = (x, y, w, h, on) => { for (let yy = y + 2; yy < y + h - 1; yy += 2) for (let xx = x + 1; xx < x + w - 1; xx += 2) if (R() < on) { c.fillStyle = R() < 0.8 ? (night ? "#f2c45a" : "#c9d8ea") : (night ? "#ffe9a8" : "#e9f0f8"); c.fillRect(xx, yy, 1, 1); } };
  const tower = (x, w, h, col, on = night ? 0.45 : 0.18) => { c.fillStyle = col; c.fillRect(x, horizon - h, w, h); c.fillStyle = "rgba(255,255,255,.08)"; c.fillRect(x, horizon - h, 1, h); win(x, horizon - h, w, h, on); };
  for (let i = 0; i < 44; i++) { const x = 70 + Math.floor(R() * 420), w = 5 + Math.floor(R() * 7), h = 14 + Math.floor(R() * 26); tower(x, w, h, R() < 0.5 ? mid : near); }
  // Hudson Yards and midtown, taller
  tower(218, 9, 44, near); tower(228, 7, 52, mid); tower(262, 8, 47, near); tower(280, 6, 40, mid);
  // the Empire State Building: stepped shoulders, the mast on top
  { const x = 246, col = night ? "#e8c06a" : "#c7c2b0"; c.fillStyle = col; c.fillRect(x, horizon - 50, 11, 50); c.fillRect(x + 2, horizon - 58, 7, 8); c.fillRect(x + 3, horizon - 63, 5, 5); c.fillRect(x + 4, horizon - 68, 3, 5); c.fillRect(x + 5, horizon - 76, 1, 8); win(x, horizon - 50, 11, 50, night ? 0.55 : 0.12); }
  // One World Trade Center downtown: the tapered glass tower and its spire
  { const x0 = 338, base = 12, h = 66; for (let y = 0; y < h; y++) { const k = y / h, w = Math.max(3, Math.round(base * (1 - k * 0.55))), x = x0 + Math.round((base - w) / 2); c.fillStyle = night ? (y % 3 ? "#3a5bb0" : "#4f72c8") : (y % 3 ? "#8fb2dc" : "#a8c4e6"); c.fillRect(x, horizon - y - 1, w, 1); }
    c.fillStyle = night ? "#c9d4f0" : "#e8eef6"; c.fillRect(x0 + 5, horizon - h - 1, 2, 2); c.fillRect(x0 + 6, horizon - h - 12, 1, 11); win(x0 + 1, horizon - 40, 10, 38, night ? 0.35 : 0.1); }
  tower(324, 7, 34, near); tower(354, 8, 30, mid); tower(364, 6, 24, near);
  // the river in front, with the lights broken up in it
  c.fillStyle = night ? "#0c1238" : "#5c7aa6"; c.fillRect(0, horizon, SKY_W, SKY_H - horizon);
  for (let y = horizon + 1; y < SKY_H; y += 2) for (let x = 0; x < SKY_W; x += 1) { if (R() < (night ? 0.05 : 0.04)) { c.fillStyle = night ? (R() < 0.6 ? "#f2c45a" : "#6b7fd6") : "#a9c2e2"; c.fillRect(x, y, 1 + Math.floor(R() * 3), 1); } }
  // and the Jersey shore's low line of rooftops in front of the river
  c.fillStyle = night ? "#080b24" : "#3f5172"; for (let x = 0; x < SKY_W; x += 2) { const h = 1 + Math.floor(R() * 3); c.fillRect(x, SKY_H - h - 2, 2, h + 2); }
}

// ---- the ground: the Meadowlands around MetLife Stadium ----
// 360 x 288 pixels; the stadium (laid over it) sits in the middle, 120 pixels wide.
export const GROUND_W = 360, GROUND_H = 288;
export function drawGround(cv, kind, night) {
  if (kind !== "meadowlands") return;
  cv.width = GROUND_W; cv.height = GROUND_H; const c = cv.getContext("2d"); if (!c) return;
  const R = seeded(1976), dim = night ? 0.55 : 1;
  const col = (hex) => { if (dim === 1) return hex; const n = parseInt(hex.slice(1), 16), f = (v) => Math.round(v * dim * 0.9 + 6); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255) + (night ? 14 : 0)})`; };
  const px = (x, y, w, h, hex) => { c.fillStyle = col(hex); c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  // the marsh: reeds in tans and olives
  const marsh = ["#8c8456", "#7d7a4b", "#9a9062", "#76784a", "#8f8a5c"];
  for (let y = 0; y < GROUND_H; y++) for (let x = 0; x < GROUND_W; x += 2) { c.fillStyle = col(marsh[Math.floor(R() * marsh.length)]); c.fillRect(x, y, 2, 1); }
  // the Hackensack River winding along the bottom left, and a few ponds in the reeds
  for (let x = -10; x < GROUND_W; x++) { const y = 248 + Math.sin(x / 26) * 12 + Math.sin(x / 9) * 2; px(x, y, 1, 18, "#3d6f9e"); if (x % 7 === 0) px(x, y + 3 + (x % 3), 3, 1, "#6c9cc6"); }
  for (const [x, y, w, h] of [[30, 150, 22, 9], [300, 200, 26, 11], [318, 120, 14, 7], [40, 200, 12, 6]]) { px(x, y, w, h, "#46789f"); px(x + 2, y + 1, w - 6, 1, "#7aa6cc"); }
  // the racetrack up on the left: the dirt oval, its infield and its pond, the grandstand
  { const cx = 82, cy = 50, rx = 50, ry = 24; for (let a = 0; a < 360; a += 0.5) { const t = (a * Math.PI) / 180; for (let k = 0; k < 4; k++) px(cx + Math.cos(t) * (rx - k), cy + Math.sin(t) * (ry - k), 1, 1, "#b08a5a"); }
    for (let y = -ry + 4; y < ry - 4; y++) { const w = Math.sqrt(1 - (y / (ry - 4)) ** 2) * (rx - 4); px(cx - w, cy + y, w * 2, 1, "#6f8f45"); }
    px(cx - 20, cy - 6, 40, 12, "#46789f"); px(cx - 16, cy - 5, 20, 1, "#7aa6cc"); px(cx - 30, cy + ry + 2, 60, 8, "#c8c4b8"); px(cx - 30, cy + ry + 2, 60, 2, "#e8e4da"); }
  // American Dream, the big white mall over on the right, and the arena by it
  { px(258, 22, 82, 58, "#d9dde2"); px(258, 22, 82, 3, "#f4f6f8"); px(262, 30, 30, 20, "#c3ccd6"); px(300, 30, 34, 14, "#9fb6c9"); px(270, 58, 60, 16, "#e6e9ec"); px(258, 78, 82, 3, "#9aa2ac");
    for (let x = 264; x < 336; x += 6) px(x, 52, 3, 2, "#5b8fb0"); px(232, 92, 24, 18, "#dfe3e8"); px(232, 92, 24, 2, "#f6f8fa"); }
  // the roads: the Turnpike up the left, Route 3 across the top, the ramps looping in
  const road = (pts, w) => { for (let i = 0; i < pts.length - 1; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)); for (let k = 0; k <= n; k++) { const x = x0 + ((x1 - x0) * k) / n, y = y0 + ((y1 - y0) * k) / n; px(x - w / 2, y - w / 2, w, w, "#4a4d55"); if (k % 6 < 3) px(x, y, 1, 1, "#d8c25a"); } } };
  road([[150, -4], [140, 60], [120, 120], [96, 200], [80, 292]], 7); // the New Jersey Turnpike
  road([[-4, 86], [110, 84], [220, 92], [364, 96]], 6); // Route 3
  road([[220, 92], [250, 120], [262, 160], [250, 210], [210, 236], [150, 238], [104, 214]], 4); // Route 120, round the lots
  road([[128, 92], [140, 108]], 3); road([[226, 110], [214, 118]], 3);
  // the rail line to the stadium's station
  for (let x = 100; x < 160; x++) { px(x, 228 + (x - 100) * 0.1, 1, 1, "#3a3a3a"); if (x % 3 === 0) px(x, 227 + (x - 100) * 0.1, 1, 3, "#6b5a46"); }
  // the parking lots: gray asphalt with white bays, cars in them, the plaza ringing the stadium
  const lot = (x, y, w, h, full) => { px(x, y, w, h, "#6d7078"); for (let yy = y + 2; yy < y + h - 1; yy += 4) { px(x + 1, yy, w - 2, 1, "#9a9da3"); for (let xx = x + 2; xx < x + w - 2; xx += 2) if (R() < full) { const k = R(); px(xx, yy - 1, 1, 2, k < 0.25 ? "#e8e8e8" : k < 0.45 ? "#202326" : k < 0.6 ? "#9b2d2d" : k < 0.75 ? "#2d4f9b" : "#8a8f96"); } } };
  for (const [x, y, w, h] of [[112, 98, 46, 34], [204, 98, 42, 30], [104, 158, 40, 40], [214, 156, 36, 44], [150, 200, 66, 24], [120, 134, 18, 22], [226, 130, 18, 24]]) lot(x, y, w, h, 0.72);
  { const cx = 180, cy = 144; for (let y = -40; y <= 40; y++) { const w = Math.sqrt(Math.max(0, 1 - (y / 40) ** 2)) * 74; px(cx - w, cy + y, w * 2, 1, y % 5 === 0 ? "#c9c3b5" : "#d8d2c3"); } }
  // trees along the roads and the lots' edges
  for (let i = 0; i < 160; i++) { const x = Math.floor(R() * GROUND_W), y = Math.floor(R() * GROUND_H); if (Math.hypot(x - 180, (y - 144) * 1.4) < 90) continue; px(x, y, 2, 2, R() < 0.5 ? "#3f6a34" : "#4f7a3c"); }
  // at night: the lot lights glowing
  if (night) for (let i = 0; i < 70; i++) { const a = R() * Math.PI * 2, r = 50 + R() * 40, x = 180 + Math.cos(a) * r * 1.35, y = 144 + Math.sin(a) * r * 0.9; c.fillStyle = "rgba(255,214,120,.55)"; c.fillRect(Math.round(x), Math.round(y), 2, 2); }
}
