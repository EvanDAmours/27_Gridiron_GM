// A club's star as Tecmo Bowl-style pixel art: drawn on a tiny grid in flat team colors with two
// shading tones and hard black outlines, then blown up with square pixels. His size comes from his
// real height, weight and strength; his gear (sleeves, tape, wristbands, gloves, towel, socks,
// cleats, facemask) from gearFor, so he looks the same every week. A black visor hides the face.
import React, { useEffect, useRef } from "react";
import { gearFor, jerseyNum } from "./PlayerFigure.jsx";

const LW = 64, LH = 112; // the sprite grid
const hex2 = (h) => { const n = parseInt((h || "#888888").replace("#", "").padEnd(6, "0").slice(0, 6), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const lum = (h) => { const [r, g, b] = hex2(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
const tone = (h, f) => { const c = hex2(h).map((v) => Math.round(f >= 1 ? v + (255 - v) * (f - 1) : v * f)); return `rgb(${c[0]},${c[1]},${c[2]})`; };
const INK = "#0b0b0d";

function draw(ctx, p, t, away, bob, flip) {
  const g = gearFor(p);
  const clr = t.clr || "#334155", ac = t.ac || "#e2e8f0";
  const tc = (c) => (c === "team" ? clr : c);
  const J = away ? "#eef1f5" : clr, trim = away ? clr : ac;
  const numFill = away ? clr : lum(clr) > 0.7 ? clr : "#f8fafc", numEdge = away ? ac : lum(ac) > 0.85 ? "#111" : ac;
  const pantsC = away ? "#e6e9ee" : lum(ac) > 0.85 || lum(ac) < 0.12 ? "#e6e9ee" : ac;
  const sockC = away ? "#eef1f5" : clr, skin = p.face?.sk || "#8a5a3c";
  const maskC = lum(ac) < 0.2 ? "#9aa0a8" : ac;

  // his build from his real size
  const ht = p.ht_ || p.ht || 74, wt = p.wt || 225, str = p.str ?? 75;
  const HS = Math.max(0.9, Math.min(1.08, ht / 75));
  const W = Math.max(0.78, Math.min(1.3, Math.pow((wt / (ht * ht)) / (225 / 5625), 0.95)));
  const M = 0.85 + Math.max(40, Math.min(99, str)) / 400;
  const gut = Math.max(0, Math.min(1, (wt - 290) / 60));

  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, LW, LH);
  if (flip) ctx.setTransform(-1, 0, 0, 1, LW, 0); // face the other way (the number is drawn unmirrored below)
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  const H = 92 * HS, G = 108, cx = LW / 2;
  const Y = (f) => Math.round(G - H * f);
  const up = bob; // upper body bob

  // primitives: every shape gets a black outline, then a shade on the far side and a light edge
  const limb = (x1, y1, x2, y2, wdt, c) => {
    ctx.strokeStyle = INK; ctx.lineWidth = wdt + 2; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = c; ctx.lineWidth = wdt; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = tone(c, 0.68); ctx.lineWidth = Math.max(1, wdt * 0.38); ctx.beginPath(); ctx.moveTo(x1 + wdt * 0.3, y1); ctx.lineTo(x2 + wdt * 0.3, y2); ctx.stroke();
    ctx.strokeStyle = tone(c, 1.3); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x1 - wdt * 0.28, y1); ctx.lineTo(x2 - wdt * 0.28, y2); ctx.stroke();
  };
  const poly = (pts, c, shadeFrom) => {
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
    ctx.fillStyle = c; ctx.fill();
    if (shadeFrom != null) { ctx.save(); ctx.clip(); ctx.fillStyle = tone(c, 0.7); ctx.fillRect(shadeFrom, 0, LW, LH); ctx.fillStyle = tone(c, 1.25); ctx.fillRect(Math.min(...pts.map((q) => q[0])) + 1, 0, 2, LH); ctx.restore(); }
    ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke();
  };
  const oval = (x, y, rx, ry, c, shade = true) => {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill();
    if (shade) { ctx.save(); ctx.clip(); ctx.fillStyle = tone(c, 0.7); ctx.fillRect(x + rx * 0.25, y - ry, rx * 2, ry * 2); ctx.restore(); }
    ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke();
  };

  // ---- legs: socks and cleats, then pants with knee pads and a side stripe
  const legX = 5.2 * W, thigh = 8.4 * W * M, shin = 5.6 * Math.sqrt(W) * M;
  for (const s of [-1, 1]) {
    const x = cx + s * legX, kx = cx + s * (legX + 0.6), ax = cx + s * (legX + 1);
    limb(kx, Y(0.29), ax, Y(0.06), shin, sockC);
    if (g.socks === "low") limb(ax, Y(0.17), ax, Y(0.06), shin, "#f1f1ee");
    else { ctx.fillStyle = "#f1f1ee"; ctx.fillRect(Math.round(kx - shin / 2), Y(0.25), Math.round(shin), 2); }
    poly([[ax - 3.5, Y(0.06)], [ax + 3.5 + s * 1.5, Y(0.06)], [ax + 4 + s * 2.5, G - 1], [ax - 4 + s * 0.5, G - 1]], tc(g.cleats));
    limb(x, Y(0.5), kx, Y(0.3), thigh, pantsC);
    oval(kx, Y(0.3), thigh * 0.48, 2.6, pantsC, false);
    ctx.fillStyle = trim; ctx.fillRect(Math.round(x + s * (thigh / 2 - 1.5) - (s > 0 ? 1 : 0)), Y(0.5), 1, Math.round(H * 0.17));
  }
  const hipW = 9.6 * W + gut * 2;
  poly([[cx - hipW, Y(0.53)], [cx + hipW, Y(0.53)], [cx + hipW - 1, Y(0.45)], [cx - hipW + 1, Y(0.45)]], pantsC, cx + hipW * 0.35);

  // ---- upper body (bobs a pixel when he breathes)
  ctx.save(); ctx.translate(0, -up);
  const sh = 15 * W, waist = 9.2 * W + gut * 3.4;
  const ys = Y(0.79), yw = Y(0.53);
  // arms behind the torso edges
  const armUp = 5.2 * Math.sqrt(W) * M, armLo = 4.6 * Math.sqrt(W) * M;
  for (const s of [-1, 1]) {
    const sx = cx + s * (sh - 1), ex = cx + s * (sh + 2.5), wx = cx + s * (sh + 3.2);
    const sleeve = g.sleeves === "both" || (g.sleeves === "one" && s === -1);
    limb(sx, ys + 3, ex, Y(0.635), armUp, sleeve ? tc(g.sleeveClr) : skin);
    limb(ex, Y(0.635), wx, Y(0.5), armLo, sleeve ? tc(g.sleeveClr) : skin);
    if (g.armTape) { ctx.fillStyle = "#f1f1ee"; ctx.fillRect(Math.round(wx - armLo / 2 - 0.5), Y(0.57), Math.round(armLo + 1), 2); }
    if (g.wristbands) { ctx.fillStyle = tc(g.bandClr); ctx.fillRect(Math.round(wx - armLo / 2 - 0.5), Y(0.515), Math.round(armLo + 1), 2); }
    const gloved = g.gloves === "both" || (g.gloves === "one" && s === 1);
    oval(wx, Y(0.48), 3, 3.4, gloved ? tc(g.gloveClr) : skin);
  }
  // torso: broad over the pads, in to the belt
  poly([[cx - sh, ys + 1], [cx + sh, ys + 1], [cx + waist, yw], [cx - waist, yw]], J, cx + sh * 0.3);
  // shoulder pads and sleeve stripes
  for (const s of [-1, 1]) {
    oval(cx + s * (sh - 3), ys + 2, 6.2 * W, 4.2, J);
    ctx.fillStyle = trim; ctx.fillRect(Math.round(cx + s * (sh - 1) - (s > 0 ? 3 : 0)), ys + 5, 3, 2);
  }
  // number
  const num = String(jerseyNum(p)).slice(0, 2);
  ctx.font = `900 ${Math.round(H * 0.15)}px 'Arial Black', Impact, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, -up);
  ctx.lineWidth = 2; ctx.strokeStyle = numEdge; ctx.strokeText(num, cx, Y(0.67));
  ctx.fillStyle = numFill; ctx.fillText(num, cx, Y(0.67)); ctx.restore();
  // belt and towel
  ctx.fillStyle = INK; ctx.fillRect(Math.round(cx - waist), yw - 1, Math.round(waist * 2), 2);
  if (g.towel) poly([[cx - 4, yw], [cx - 1, yw], [cx - 1, yw + 8], [cx - 4, yw + 7]], "#f4f4f0");
  // neck (and a neck roll on some big men)
  poly([[cx - 4 * Math.sqrt(W), ys + 1], [cx + 4 * Math.sqrt(W), ys + 1], [cx + 3.5, ys - 4], [cx - 3.5, ys - 4]], tone(skin, 0.75));
  if (g.neckRoll) oval(cx, ys, 6, 2.2, J, false);

  // ---- helmet, Tecmo style: a big glossy shell turned three-quarters, the face behind a heavy facemask
  const hr = 10.4 * Math.sqrt(HS), hx = cx - 1, hy = ys - 3 - hr * 0.78;
  oval(hx, hy, hr, hr * 0.92, clr);
  ctx.fillStyle = tone(clr, 1.45); // a broad shine on the lit side
  ctx.fillRect(Math.round(hx - hr * 0.62), Math.round(hy - hr * 0.55), 2, Math.round(hr * 0.5));
  ctx.fillRect(Math.round(hx - hr * 0.45), Math.round(hy - hr * 0.72), Math.round(hr * 0.35), 1);
  ctx.fillStyle = trim; ctx.fillRect(Math.round(hx + hr * 0.08), Math.round(hy - hr * 0.92), 2, Math.round(hr * 0.75)); // stripe
  // ear hole
  oval(hx - hr * 0.2, hy + hr * 0.12, 1.8, 1.8, tone(clr, 0.5), false);
  // the face, toward the front of the helmet
  const fx0 = hx + hr * 0.18, fx1 = hx + hr * 0.95, fy0 = hy - hr * 0.05, fy1 = hy + hr * 0.82;
  poly([[fx0, fy0], [fx1, fy0 + 1], [fx1 - 1, fy1], [fx0 + 1, fy1]], skin, fx0 + (fx1 - fx0) * 0.55);
  ctx.fillStyle = INK; ctx.fillRect(Math.round(fx0 + 2), Math.round(fy0 + 2), 2, 1); ctx.fillRect(Math.round(fx1 - 3), Math.round(fy0 + 2), 1, 1); // eyes
  if (g.eyeBlack !== "none") { ctx.fillRect(Math.round(fx0 + 2), Math.round(fy0 + 4), 2, 1); ctx.fillRect(Math.round(fx1 - 3), Math.round(fy0 + 4), 1, 1); }
  if (g.visor !== "none") { ctx.fillStyle = g.visor === "clear" ? tone(skin, 0.8) : g.visor === "iridescent" ? "#3b2f7a" : "#07080a"; ctx.fillRect(Math.round(fx0), Math.round(fy0 + 1), Math.round(fx1 - fx0), 3); }
  ctx.fillStyle = tone(skin, 0.6); ctx.fillRect(Math.round(fx0 + 2), Math.round(fy1 - 3), 3, 1); // mouth
  // jaw pad and chin strap
  oval(hx + hr * 0.12, hy + hr * 0.62, 2.4, 2.8, clr, false);
  ctx.fillStyle = "#f2f2ee"; ctx.fillRect(Math.round(fx0 + 1), Math.round(fy1), Math.round((fx1 - fx0) * 0.7), 1);
  // facemask: thick bars wrapping the front
  ctx.fillStyle = maskC;
  const bars = g.mask === "open" ? [0.25] : g.mask === "bar2" ? [0.25, 0.55] : [0.25, 0.5, 0.75];
  for (const b of bars) ctx.fillRect(Math.round(fx0 - 1), Math.round(hy + hr * b), Math.round(fx1 - fx0 + 3), 2);
  ctx.fillRect(Math.round(fx1 + 1), Math.round(hy + hr * 0.2), 2, Math.round(hr * 0.62)); // the front post
  if (g.mask === "cage") ctx.fillRect(Math.round((fx0 + fx1) / 2), Math.round(hy + hr * 0.25), 1, Math.round(hr * 0.55));
  ctx.fillStyle = tone(maskC, 0.6); for (const b of bars) ctx.fillRect(Math.round(fx0 - 1), Math.round(hy + hr * b) + 1, Math.round(fx1 - fx0 + 3), 1);
  ctx.restore();
}

// Snap every pixel to the palette (no blended edges) and wrap the silhouette in a black outline.
function crisp(ctx) {
  const img = ctx.getImageData(0, 0, LW, LH), d = img.data, solid = new Uint8Array(LW * LH);
  for (let i = 0, k = 0; i < d.length; i += 4, k++) { if (d[i + 3] < 120) d[i + 3] = 0; else { d[i + 3] = 255; solid[k] = 1; } }
  for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) {
    const k = y * LW + x; if (solid[k]) continue;
    if ((x > 0 && solid[k - 1]) || (x < LW - 1 && solid[k + 1]) || (y > 0 && solid[k - LW]) || (y < LH - 1 && solid[k + LW])) { const i = k * 4; d[i] = 11; d[i + 1] = 11; d[i + 2] = 13; d[i + 3] = 255; }
  }
  ctx.putImageData(img, 0, 0);
}

export default function PixelPlayer({ p, t, away = false, flip = false, h = 180, label = true }) {
  const ref = useRef(null);
  const dpr = typeof window !== "undefined" ? Math.min(3, window.devicePixelRatio || 1) : 1;
  const S = Math.max(1, Math.floor((h * dpr) / LH));
  const cw = (LW * S) / dpr, ch = (LH * S) / dpr;
  useEffect(() => {
    const out = ref.current; if (!out || !p || !t) return;
    const low = document.createElement("canvas"); low.width = LW; low.height = LH;
    const lctx = low.getContext("2d", { willReadFrequently: true });
    const octx = out.getContext("2d");
    const render = (bob) => {
      draw(lctx, p, t, away, bob, flip); lctx.setTransform(1, 0, 0, 1, 0, 0); crisp(lctx);
      octx.imageSmoothingEnabled = false; octx.clearRect(0, 0, out.width, out.height);
      octx.drawImage(low, 0, 0, out.width, out.height);
    };
    render(0);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    let b = 0; const id = setInterval(() => { b ^= 1; render(b); }, 650 + (jerseyNum(p) % 7) * 30);
    return () => clearInterval(id);
  }, [p?.id, p?.ovr, t?.ab, away, flip, S]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!p || !t) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
      <canvas ref={ref} width={LW * S} height={LH * S} role="img" aria-label={`${p.name}, ${t.name} ${p.pos}`} style={{ width: cw, height: ch, imageRendering: "pixelated" }} />
      {label && <div style={{ fontSize: Math.max(10, Math.round(h / 15)), fontWeight: 800, color: "#e2e8f0", marginTop: 2, whiteSpace: "nowrap", textAlign: "center" }}>{(p.name || "").split(" ").slice(1).join(" ") || p.name} <span style={{ color: "#94a3b8", fontWeight: 700 }}>{p.pos} {p.ovr}</span></div>}
    </div>
  );
}
