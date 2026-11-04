// The stadium around the live field: a top-down bowl (the home club's real stadium, where we've
// drawn it) with a crowd of little blobs, and camera flashes in the stands after touchdowns and big
// plays. Drawn once per game from a seeded layout (the same stadium always looks the same) and
// rasterized to a single bitmap, so the thousands of fans cost nothing while the field animates.
//
// Layout: the field keeps its shape in the middle; the stands take PAD_X of the width on each side
// and PAD_Y (of the width) above and below. A ring at depth t (0 at the field, 1 at the outer
// wall) is a rounded rectangle; each stadium lists what sits at which depth.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { STADIUMS } from "./stadiumData.js";

export const PAD_X = 0.08, PAD_Y = 0.07;
const VW = 1000, FW = VW * (1 - 2 * PAD_X), FH = FW * 0.45, VH = FH + 2 * VW * PAD_Y;
const DX = VW * PAD_X, DY = VW * PAD_Y; // the stands' depth at the sides and at the ends of the bowl
// how much taller the stadium is than the field alone (for the field's size budget), and how
// much wider (the wrapper's max width)
export const STADIUM_TALL = VH / FH, STADIUM_WIDE = 1 / (1 - 2 * PAD_X);

export { STADIUMS };
export const hasStadium = (ab) => !!STADIUMS[ab];

// a small seeded random, so a stadium's crowd is the same every game
const seeded = (a) => () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const CX = VW / 2, CY = VH / 2;
// the ring at depth t: half-width, half-height and corner radius
const ring = (t, corner) => { const hw = FW / 2 + t * DX, hh = FH / 2 + t * DY; return [hw, hh, Math.min(6 + t * Math.min(DX, DY) * 1.6 * corner, hh - 1, hw - 1)]; };
const path = ([hw, hh, r]) => `M ${CX - hw + r} ${CY - hh} H ${CX + hw - r} A ${r} ${r} 0 0 1 ${CX + hw} ${CY - hh + r} V ${CY + hh - r} A ${r} ${r} 0 0 1 ${CX + hw - r} ${CY + hh} H ${CX - hw + r} A ${r} ${r} 0 0 1 ${CX - hw} ${CY + hh - r} V ${CY - hh + r} A ${r} ${r} 0 0 1 ${CX - hw + r} ${CY - hh} Z`;
// points every `step` along a ring, with the outward direction at each and the distance along it
function along([hw, hh, r], step) {
  const out = [], segs = [
    ["l", -hw + r, -hh, hw - r, -hh, 0, -1], ["a", hw - r, -hh + r, -Math.PI / 2], ["l", hw, -hh + r, hw, hh - r, 1, 0], ["a", hw - r, hh - r, 0],
    ["l", hw - r, hh, -hw + r, hh, 0, 1], ["a", -hw + r, hh - r, Math.PI / 2], ["l", -hw, hh - r, -hw, -hh + r, -1, 0], ["a", -hw + r, -hh + r, Math.PI],
  ];
  let s = 0;
  for (const g of segs) {
    if (g[0] === "l") {
      const [, x0, y0, x1, y1, nx, ny] = g, L = Math.hypot(x1 - x0, y1 - y0);
      for (let t = 0; t < L; t += step) out.push([x0 + ((x1 - x0) * t) / L, y0 + ((y1 - y0) * t) / L, nx, ny, s + t]);
      s += L;
    } else {
      const [, cx, cy, a0] = g, L = (r * Math.PI) / 2;
      for (let t = 0; t < L; t += step) { const a = a0 + t / Math.max(r, 0.01); out.push([cx + r * Math.cos(a), cy + r * Math.sin(a), Math.cos(a), Math.sin(a), s + t]); }
      s += L;
    }
  }
  return out;
}
const f1 = (x) => Math.round(x * 10) / 10;

const esc = (t) => t.replace(/&/g, "&amp;").replace(/'/g, "&#39;").replace(/</g, "&lt;");
// where a point (from the center) sits: beyond both field edges (a corner), or off an end
const inCorner = (x, y) => Math.abs(x) > FW / 2 + 2 && Math.abs(y) > FH / 2 + 2;
const atEnd = (x, y) => Math.abs(x) > FW / 2 && Math.abs(y) <= FH / 2;
const BIG = 700;
const PLAZA = "#1a1e26";

// The stadium as an SVG document (for an <img>), and where every fan sits (for the flashes).
// Coordinates in the helpers are from the center of the field; a side is -1/1 (left/right end,
// top/bottom sideline).
export function drawStadium(st, night) {
  const rnd = seeded(7), s = [], seats = [], covers = [];
  const add = (x) => s.push(x);
  const pick = () => { const tot = st.crowd.reduce((t, [, w]) => t + w, 0); let x = rnd() * tot; for (const [c, w] of st.crowd) if ((x -= w) < 0) return c; return st.crowd[0][0]; };
  const R = (t) => ring(t, st.corner);
  const band = (t0, t1, fill, more = "") => add(`<path d="${path(R(t1))} ${path(R(t0))}" fill-rule="evenodd" fill="${fill}" ${more}/>`);
  const box = ([x0, y0, x1, y1], more = "") => `<rect x="${f1(CX + Math.min(x0, x1))}" y="${f1(CY + Math.min(y0, y1))}" width="${f1(Math.abs(x1 - x0))}" height="${f1(Math.abs(y1 - y0))}" ${more}/>`;
  let cid = 0;
  const clip = (rects, body) => { const id = `c${cid++}`; add(`<clipPath id="${id}">${rects.map((r) => box(r)).join("")}</clipPath><g clip-path="url(#${id})">`); body(); add("</g>"); };
  const covered = (x, y, lv) => covers.some(([x0, y0, x1, y1, l]) => (!l || l === lv) && x >= Math.min(x0, x1) && x <= Math.max(x0, x1) && y >= Math.min(y0, y1) && y <= Math.max(y0, y1));
  const label = (t, text, size, ink, spacing) => { for (const [side, ang] of [[-1, 0], [1, 180]]) { const y = CY + side * R(t)[1]; add(`<text x="${CX}" y="${f1(y)}" fill="${ink}" font-size="${size}" font-weight="900" font-family="Arial" text-anchor="middle" dominant-baseline="central" letter-spacing="${spacing}" transform="rotate(${ang} ${CX} ${f1(y)})">${esc(text)}</text>`); } };
  const lights = (t, step, gap) => { const rr = R(t); for (const [x, y] of along(rr, step)) if (!(Math.abs(x) < gap && Math.abs(y) > rr[1] - 4)) add(`<rect x="${f1(CX + x - 2.4)}" y="${f1(CY + y - 1.2)}" width="4.8" height="2.4" rx=".6" fill="#fff8dc"/><circle cx="${f1(CX + x)}" cy="${f1(CY + y)}" r="3.5" fill="#fffbe6" opacity=".35" filter="url(#g)"/>`); };
  const normals = (t, step, len, stroke, w, op) => { for (const [x, y, nx, ny] of along(R(t), step)) add(`<line x1="${f1(CX + x - nx * len)}" y1="${f1(CY + y - ny * len)}" x2="${f1(CX + x + nx * len)}" y2="${f1(CY + y + ny * len)}" stroke="${stroke}" stroke-width="${w}" opacity="${op}"/>`); };
  const roof = st.roof, up = st.upper || {}, openEnds = up.ends || [];
  const upperTop = roof && !roof.see ? Math.min(0.875, roof.from - 0.01) : 0.875;
  const nameGap = st.name.length * 4 + 15;

  // what hides seats (boards, canopies, landmarks): no fans drawn under them, so no flashes there
  const boards = Array.isArray(st.boards) ? st.boards.map((b) => ({ w: 10, sides: [-1, 1], ...b, h: b.h * FH })) : [];
  for (const b of boards) for (const sx of b.sides) { const x = sx * R(b.at)[0]; covers.push([x - b.w / 2 - 1, -b.h / 2 - 1, x + b.w / 2 + 1, b.h / 2 + 1, "upper"]); }
  const xa = (FW / 2) * 0.96;
  if (st.wings) for (const sy of [-1, 1]) covers.push([-xa - 10, sy * R(st.wings.at - 0.005)[1], xa + 10, sy * BIG, "upper"]);
  if (st.tower) covers.push([-FW * 0.44, st.tower.side * R(st.tower.from - 0.005)[1], FW * 0.44, st.tower.side * BIG]);
  for (const k of ["ship", "pools"]) if (st[k]) covers.push([st[k] * R(0.61)[0], -FH * 0.32, st[k] * R(0.87)[0], FH * 0.32, "upper"]);
  if (st.trusses != null) for (const sy of [-1, 1]) { const y = sy * (FH / 2 + DY * st.trusses); covers.push([-BIG, y - 5, BIG, y + 5]); }
  if (st.retracted) for (const sx of [-1, 1]) covers.push([sx * (FW / 2 + DX * 0.55), -(FH / 2 + DY * st.trusses - 4), sx * BIG, FH / 2 + DY * st.trusses - 4]);
  const tarp = (x, y) => atEnd(x, y) && Math.abs(y) < FH * 0.3;
  const skipUpper = (x, y) => covered(x, y, "upper") || (up.corners && inCorner(x, y)) || openEnds.some((sx) => x * sx > FW / 2 + 2) || (up.tarps && tarp(x, y));
  const tun = [[-(FW / 2 + DX * 0.3), DX * 0.17, 12], [FW / 2 + DX * 0.3, DX * 0.17, 12]];
  const skipLower = (x, y) => tun.some(([tx, tw, th]) => Math.abs(x - tx) < tw && Math.abs(y) < th) || covered(x, y, "lower");

  add(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VW} ${f1(VH)}">`);
  add(`<defs><filter id="g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter><linearGradient id="sk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${st.skin}"/><stop offset=".5" stop-color="${st.skinHi}"/><stop offset="1" stop-color="${st.skin}"/></linearGradient><linearGradient id="gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7dd3fc"/><stop offset="1" stop-color="#1e3a5f"/></linearGradient><radialGradient id="fl"><stop offset="0" stop-color="#fff7cc"/><stop offset=".35" stop-color="#fbbf24"/><stop offset=".7" stop-color="#ea580c" stop-opacity=".7"/><stop offset="1" stop-color="#ea580c" stop-opacity="0"/></radialGradient><pattern id="tri" width="16" height="13.86" patternUnits="userSpaceOnUse"><path d="M0 0 H16 M0 0 L8 13.86 L16 0 M0 13.86 H16" fill="none" stroke="#94a3b8" stroke-width=".5"/></pattern></defs>`);

  // the outer shell
  if (st.shell === "louvers") {
    // the louvered skin, lit in team color, with its glow; the rim and its lights
    add(`<path d="${path(R(1))}" fill="${st.skin}" opacity=".35" filter="url(#g)"/>`);
    add(`<path d="${path(R(0.985))}" fill="url(#sk)"/>`);
    normals(0.955, 3.2, 2.4, "#04122e", 0.8, 0.5);
    add(`<path d="${path(R(0.915))}" fill="#3a4150"/>`);
    lights(0.89, 22, nameGap);
  } else if (st.shell === "concrete") {
    // a concrete shell with pilasters, and banks of lights on the rim
    add(`<path d="${path(R(1))}" fill="url(#sk)"/>`);
    normals(0.95, 9, 3, "#1f2329", 1.6, 0.55);
    add(`<path d="${path(R(0.91))}" fill="#30343c"/>`);
    lights(0.895, 30, nameGap);
  } else {
    add(`<path d="${path(R(1))}" fill="#2b3039"/><path d="${path(R(0.9))}" fill="#30343c"/>`);
  }

  // a seating bowl: concrete, then rows of fans (sections split by aisles), dimmer toward the top
  const bowl = (t0, t1, rows, base, lit, skip) => {
    add(`<path d="${path(R(t1))}" fill="${base}"/>`);
    for (let i = 0; i < rows; i++) {
      const f = (i + 0.5) / rows, t = t0 + (t1 - t0) * f;
      add(`<path d="${path(R(t + (t1 - t0) / rows / 2))}" fill="none" stroke="#000" stroke-opacity=".22" stroke-width=".6"/>`);
      for (const [x, y, , , d] of along(R(t), 3.5)) {
        if (d % 46 < 3.6) continue; // an aisle
        if (skip(x, y)) continue;
        fan(CX + x, CY + y, lit * (1 - 0.35 * f));
      }
    }
  };
  const fan = (x, y, lit) => {
    if (rnd() < 0.05) { add(`<rect x="${f1(x - 0.9)}" y="${f1(y - 0.9)}" width="1.8" height="1.8" fill="${st.empty || "#9ca3af"}" opacity=".6"/>`); return; } // an empty seat
    const px = x + (rnd() - 0.5) * 1.2, py = y + (rnd() - 0.5) * 1.2;
    add(`<circle cx="${f1(px)}" cy="${f1(py)}" r="${f1(1.2 + rnd() * 0.45)}" fill="${pick()}" opacity="${f1(lit)}"/>`);
    seats.push([f1(px), f1(py)]);
  };
  // the upper bowl
  bowl(0.6, upperTop, 6, "#232831", night ? 0.78 : 0.9, skipUpper);
  // open corners and open ends: plaza, with lamps and a few trees
  const plazaLamps = (pts) => pts.forEach(([x, y], k) => add(k % 3 === 2 ? `<circle cx="${f1(CX + x)}" cy="${f1(CY + y)}" r="3.2" fill="#14532d" opacity=".9"/>` : `<circle cx="${f1(CX + x)}" cy="${f1(CY + y)}" r="1.6" fill="#fde68a" opacity=".8"/>`));
  if (up.corners) for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    clip([[sx * (FW / 2 + 2), sy * (FH / 2 + 2), sx * BIG, sy * BIG]], () => band(0.6, 1, PLAZA));
    plazaLamps([0, 1, 2].map((k) => [sx * (FW / 2 + 14 + k * 16), sy * (FH / 2 + 14 + (2 - k) * 14)]));
  }
  for (const sx of openEnds) {
    clip([[sx * (FW / 2 + 2), -BIG, sx * BIG, BIG]], () => band(0.6, 1, PLAZA));
    plazaLamps([-0.8, -0.45, -0.1, 0.25, 0.6].map((f, k) => [sx * R(0.94)[0], f * FH + k * 3]));
  }
  if (up.tarps) for (const sx of [-1, 1]) {
    // tarps over the upper end zones, the club's name on them
    const x0 = CX + sx * R(0.62)[0], x1 = CX + sx * R(0.86)[0], h = FH * 0.6, xm = (x0 + x1) / 2;
    add(`<rect x="${f1(Math.min(x0, x1))}" y="${f1(CY - h / 2)}" width="${f1(Math.abs(x1 - x0))}" height="${f1(h)}" rx="2" fill="${st.ribbon}" stroke="${st.ribbonHi}" stroke-width="1"/>`);
    add(`<text x="${f1(xm)}" y="${f1(CY)}" fill="${st.ribbonHi}" font-size="9" font-weight="900" font-family="Arial" text-anchor="middle" dominant-baseline="central" letter-spacing="3" transform="rotate(${sx * 90} ${f1(xm)} ${f1(CY)})">${esc(up.tarps)}</text>`);
  }
  // bleachers in an open end (the Dawg Pound, the Hawks Nest): straight rows of fans
  if (st.bleachers) {
    const sx = st.bleachers, xi = R(0.63)[0], xo = R(0.85)[0];
    add(box([sx * xi, -FH * 0.44, sx * xo, FH * 0.44], `fill="#2a2f39"`));
    for (let x = xi + 1.75; x < xo; x += 3.5) for (let y = -FH * 0.44 + 2; y < FH * 0.44; y += 3.5) if (!covered(sx * x, y, "upper")) fan(CX + sx * x, CY + y, night ? 0.85 : 0.95);
  }
  // the club level: suites' glass
  add(`<path d="${path(R(0.6))}" fill="#20252e"/>`);
  for (const [x, y, nx, ny] of along(R(0.565), 13)) add(`<rect x="${f1(CX + x - 4.5)}" y="${f1(CY + y - 1.6)}" width="9" height="3.2" rx=".8" fill="#fde68a" opacity=".42" transform="rotate(${f1((Math.atan2(ny, nx) * 180) / Math.PI + 90)} ${f1(CX + x)} ${f1(CY + y)})"/>`);
  // the LED ribbon boards on the fascias, with the club's words along both sidelines
  const ribbon = (t) => {
    const rr = R(t);
    add(`<path d="${path(rr)}" fill="none" stroke="#071233" stroke-width="5"/><path d="${path(rr)}" fill="none" stroke="${st.ribbon}" stroke-width="3.2"/><path d="${path(rr)}" fill="none" stroke="${st.ribbonHi || st.skinHi}" stroke-width="3" opacity=".3" filter="url(#g)"/>`);
    label(t, st.ribbonText, 2.9, st.ribbonInk || "#fff", 1);
  };
  ribbon(0.53);
  // the lower bowl, with the team tunnels in each end
  bowl(0.1, 0.5, 8, "#2a2f39", night ? 0.92 : 1, skipLower);
  for (const [tx, tw, th] of tun) add(`<rect x="${f1(CX + tx - tw)}" y="${f1(CY - th)}" width="${f1(tw * 2)}" height="${th * 2}" rx="2" fill="#0b0f17"/>`);
  ribbon(0.5);
  // the apron: turf to the wall, and the wall
  add(`<path d="${path(R(0.085))}" fill="#1f6b2c"/><path d="${path(R(0.085))}" fill="none" stroke="#0f172a" stroke-width="2.2"/>`);

  // video boards
  if (st.boards === "corners") for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    const o = R(0.72), bx = CX + sx * (o[0] - o[2] * 0.3), by = CY + sy * (o[1] - o[2] * 0.3), a = 45 * sx * sy;
    add(`<g transform="rotate(${a} ${f1(bx)} ${f1(by)})"><rect x="${f1(bx - 24)}" y="${f1(by - 5.5)}" width="48" height="11" rx="1.2" fill="#0a0f1a" stroke="#64748b" stroke-width=".7"/><rect x="${f1(bx - 22)}" y="${f1(by - 4)}" width="44" height="8" rx=".8" fill="${st.ribbon}" opacity=".55"/></g>`);
  }
  for (const b of boards) for (const sx of b.sides) {
    const x = CX + sx * R(b.at)[0], w = b.w, h = b.h;
    add(`<rect x="${f1(x - w / 2)}" y="${f1(CY - h / 2)}" width="${w}" height="${f1(h)}" rx="1.4" fill="#0a0f1a" stroke="#64748b" stroke-width=".8"/><rect x="${f1(x - w / 2 + 1.6)}" y="${f1(CY - h / 2 + 3)}" width="${f1(w - 3.2)}" height="${f1(h - 6)}" rx=".8" fill="${st.ribbon}" opacity=".75"/><rect x="${f1(x - w / 2 + 1.6)}" y="${f1(CY - h / 2 + 3)}" width="${f1(w - 3.2)}" height="${f1(h - 6)}" rx=".8" fill="${st.ribbonHi || st.skinHi}" opacity=".18"/>`);
  }

  // a roof ring, rolled open over the field
  if (roof) {
    if (roof.see) { band(roof.from, 1, st.skin, `opacity="${roof.see}"`); band(roof.from, 1, "url(#tri)"); }
    else band(roof.from, 1, "url(#sk)");
    const mid = (roof.from + 1) / 2;
    if (roof.tex === "seams") normals(mid, 8, (1 - roof.from) * DY * 0.45, st.skin === "#1f2937" ? "#0b0f17" : "#8a94a3", 0.7, 0.7);
    if (roof.tex === "rings") { for (const t of [0.85, 0.9, 0.95]) add(`<path d="${path(R(t))}" fill="none" stroke="#8a7550" stroke-width=".8" opacity=".7"/>`); normals(mid, 24, (1 - roof.from) * DY * 0.5, "#8a7550", 0.8, 0.6); }
    if (roof.tex === "skylights") for (const [x, y, nx, ny] of along(R(mid), 26)) add(`<rect x="${f1(CX + x - 4)}" y="${f1(CY + y - 2)}" width="8" height="4" rx=".6" fill="#e0f2fe" opacity=".75" transform="rotate(${f1((Math.atan2(ny, nx) * 180) / Math.PI + 90)} ${f1(CX + x)} ${f1(CY + y)})"/>`);
    if (roof.tex === "ridge") { normals(mid, 10, (1 - roof.from) * DY * 0.45, "#6b7280", 0.6, 0.6); for (const sx of [-1, 1]) add(`<line x1="${f1(CX + sx * R(roof.from)[0])}" y1="${CY}" x2="${f1(CX + sx * R(1)[0])}" y2="${CY}" stroke="#4b5563" stroke-width="1.6"/>`); for (const sy of [-1, 1]) add(`<line x1="${f1(CX - FW * 0.42)}" y1="${f1(CY + sy * R(mid)[1])}" x2="${f1(CX + FW * 0.42)}" y2="${f1(CY + sy * R(mid)[1])}" stroke="#4b5563" stroke-width="1.2"/>`); }
    if (roof.tex === "clear") {
      // the clear panels along one sideline: the sky shows through
      clip([[-FW * 0.45, FH / 2, FW * 0.45, BIG]], () => { band(roof.from, 1, "#0b1220"); band(roof.from, 1, "#e0f2fe", `opacity=".28"`); });
      for (let x = -FW * 0.45; x < FW * 0.45; x += 12) add(`<line x1="${f1(CX + x)}" y1="${f1(CY + R(roof.from)[1])}" x2="${f1(CX + x)}" y2="${f1(CY + R(1)[1])}" stroke="#94a3b8" stroke-width=".5" opacity=".7"/>`);
      normals(mid, 9, (1 - roof.from) * DY * 0.45, "#1f2937", 0.7, 0.6);
    }
    if (roof.tex === "petals") {
      // the pinwheel: eight petals around the opening, each its own shade
      const id = `c${cid++}`;
      add(`<clipPath id="${id}"><path d="${path(R(1))} ${path(R(roof.from))}" clip-rule="evenodd"/></clipPath><g clip-path="url(#${id})">`);
      // eight seams evenly around the opening, each turned off the straight-out line, so the petals twist
      const rf = R(roof.from), all = along(rf, 2), per = all[all.length - 1][4] + 2, seam = [];
      for (let k = 0; k < 8; k++) { const [x, y, nx, ny] = all[Math.min(all.length - 1, Math.round(((k + 0.5) * per) / 8 / 2))]; const a = Math.atan2(ny, nx) + 0.75; seam.push([[x, y], [x + 400 * Math.cos(a), y + 400 * Math.sin(a)]]); }
      for (let k = 0; k < 8; k++) { const [a0, a1] = seam[k], [b0, b1] = seam[(k + 1) % 8]; add(`<path d="M ${CX} ${CY} L ${f1(CX + a0[0])} ${f1(CY + a0[1])} L ${f1(CX + a1[0])} ${f1(CY + a1[1])} L ${f1(CX + b1[0])} ${f1(CY + b1[1])} L ${f1(CX + b0[0])} ${f1(CY + b0[1])} Z" fill="${k % 2 ? st.skinHi : st.skin}" stroke="#4b5563" stroke-width="1.2"/>`); }
      add("</g>");
    }
    add(`<path d="${path(R(roof.from))}" fill="none" stroke="#4b5563" stroke-width="1.6"/><path d="${path(R(1))}" fill="none" stroke="#4b5563" stroke-width="1.4"/>`);
  }
  // glass walls at the ends
  for (const sx of st.glassEnds || []) {
    const xi = CX + sx * R(0.86)[0], xo = CX + sx * R(0.995)[0], h = FH * 0.62, x = Math.min(xi, xo), w = Math.abs(xo - xi);
    add(`<rect x="${f1(x)}" y="${f1(CY - h / 2)}" width="${f1(w)}" height="${f1(h)}" fill="url(#gl)" opacity=".9"/>`);
    for (let yy = CY - h / 2 + 8; yy < CY + h / 2; yy += 8) add(`<line x1="${f1(x)}" y1="${f1(yy)}" x2="${f1(x + w)}" y2="${f1(yy)}" stroke="#0f172a" stroke-width=".5" opacity=".6"/>`);
  }
  // the roof panels, rolled back and stacked over the ends
  if (st.retracted) for (const sx of [-1, 1]) {
    const x0 = sx * (FW / 2 + DX * 0.55), x1 = sx * (R(1)[0] - 3), hh = FH / 2 + DY * st.trusses - 4;
    add(box([x0 + sx * 3, -hh + 3, x1 + sx * 3, hh + 3], `fill="#000" opacity=".3"`));
    add(box([x0, -hh, x1, hh], `fill="${st.skinHi}" stroke="#6b7280" stroke-width="1"`));
    for (let y = -hh + 14; y < hh; y += 14) add(`<line x1="${f1(CX + x0)}" y1="${f1(CY + y)}" x2="${f1(CX + x1)}" y2="${f1(CY + y)}" stroke="#94a3b8" stroke-width=".6"/>`);
  }
  // roof trusses (or AT&T's arches) end to end: a steel truss with its shadow
  if (st.trusses != null) {
    const hw = R(1)[0];
    for (const sy of [-1, 1]) {
      const y = CY + sy * (FH / 2 + DY * st.trusses), x0 = CX - hw + 4, x1 = CX + hw - 4;
      add(`<rect x="${f1(x0 + 3)}" y="${f1(y - 3 + 4)}" width="${f1(x1 - x0)}" height="7" fill="#000" opacity=".28"/>`);
      add(`<rect x="${f1(x0)}" y="${f1(y - 3.5)}" width="${f1(x1 - x0)}" height="7" rx="3.5" fill="#cfd5dd" stroke="#4b5563" stroke-width="1"/>`);
      let zz = `M ${f1(x0 + 4)} ${f1(y - 2.6)}`;
      for (let x = x0 + 4, upz = false; x < x1 - 4; x += 6, upz = !upz) zz += ` L ${f1(x + 6)} ${f1(y + (upz ? -2.6 : 2.6))}`;
      add(`<path d="${zz}" fill="none" stroke="#6b7280" stroke-width=".7"/>`);
      for (const xe of [x0, x1]) add(`<rect x="${f1(xe - 5)}" y="${f1(y - 6)}" width="10" height="12" rx="1.5" fill="#6b7280"/>`);
    }
  }
  // a canopy over every seat, open over the field (Hard Rock, Highmark), and Hard Rock's corner spires
  if (st.canopy) {
    band(st.canopy.from, 1, "#e2e8f0", `opacity=".8"`);
    normals((st.canopy.from + 1) / 2, 12, (1 - st.canopy.from) * DY * 0.5, "#94a3b8", 0.7, 0.8);
    add(`<path d="${path(R(st.canopy.from))}" fill="none" stroke="#64748b" stroke-width="1.4"/>`);
  }
  if (st.spires) for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    const o = R(0.97), px = CX + sx * (o[0] - o[2] * 0.3), py = CY + sy * (o[1] - o[2] * 0.3);
    for (const [tx, ty] of [[sx * (FW / 2 - 60), sy * R(st.canopy?.from ?? 0.7)[1]], [sx * R(st.canopy?.from ?? 0.7)[0], sy * (FH / 2 - 50)], [sx * (FW / 2 + 10), sy * (FH / 2 + 30)]]) add(`<line x1="${f1(px)}" y1="${f1(py)}" x2="${f1(CX + tx)}" y2="${f1(CY + ty)}" stroke="#cbd5e1" stroke-width=".6" opacity=".8"/>`);
    add(`<circle cx="${f1(px)}" cy="${f1(py)}" r="3.4" fill="#f8fafc" stroke="#64748b" stroke-width=".8"/>`);
  }
  // canopies over the sideline upper decks, with ribs, solar panels and wind turbines
  if (st.wings) for (const sy of [-1, 1]) {
    const w = st.wings, yi = CY + sy * R(w.at)[1], ye = CY + sy * (FH / 2 + DY * 0.86), yp = CY + sy * (FH / 2 + DY * 1.12), yMid = CY + sy * (FH / 2 + DY * 0.99);
    const d = `M ${f1(CX - xa)} ${f1(yi)} L ${f1(CX + xa)} ${f1(yi)} L ${f1(CX + xa + 10)} ${f1(ye)} Q ${CX} ${f1(yp)} ${f1(CX - xa - 10)} ${f1(ye)} Z`;
    add(`<path d="${d}" fill="#000" opacity=".3" transform="translate(3 ${sy * 3})"/><path d="${d}" fill="url(#sk)" stroke="#4b5563" stroke-width="1"/>`);
    for (let x = -xa + 14; x < xa; x += 14) {
      const u = x / (xa + 10), yo = ye + (yMid - ye) * (1 - u * u);
      add(`<line x1="${f1(CX + x)}" y1="${f1(yi)}" x2="${f1(CX + x)}" y2="${f1(yo)}" stroke="#6b7280" stroke-width=".6"/>`);
      if (w.panels) add(`<rect x="${f1(CX + x - 5.5)}" y="${f1(Math.min(yi, yo) + Math.abs(yo - yi) * 0.38)}" width="11" height="${f1(Math.abs(yo - yi) * 0.3)}" fill="#1e3a5f" opacity=".75"/>`);
    }
    const yn = CY + sy * (R(w.at)[1] + 4);
    add(`<text x="${CX}" y="${f1(yn)}" fill="#1f2937" font-size="5.6" font-weight="900" font-family="Arial" text-anchor="middle" dominant-baseline="central" letter-spacing="2" transform="rotate(${sy > 0 ? 180 : 0} ${CX} ${f1(yn)})">${esc(st.name)}</text>`);
    if (w.turbines) for (let k = 0; k < 7; k++) {
      const x = -xa * 0.85 + (k * xa * 1.7) / 6, u = x / (xa + 10), y = CY + sy * (FH / 2 + DY * (0.86 + 0.13 * (1 - u * u)) - 3);
      add(`<g transform="translate(${f1(CX + x)} ${f1(y)})"><circle r="1.3" fill="#f8fafc"/>${[0, 120, 240].map((a) => `<line x1="0" y1="0" x2="${f1(4.5 * Math.cos(((a + k * 17) * Math.PI) / 180))}" y2="${f1(4.5 * Math.sin(((a + k * 17) * Math.PI) / 180))}" stroke="#f8fafc" stroke-width=".9" stroke-linecap="round"/>`).join("")}</g>`);
    }
  }
  // Soldier Field's colonnades along both sidelines
  if (st.colonnade) for (const sy of [-1, 1]) {
    const y0 = sy * R(0.925)[1], y1 = sy * R(0.995)[1];
    add(box([-FW * 0.42, y0, FW * 0.42, y1], `fill="#e7e3d6" stroke="#8a8474" stroke-width=".8"`));
    for (const t of [0.945, 0.975]) for (let x = -FW * 0.42 + 6; x < FW * 0.42; x += 7) add(`<circle cx="${f1(CX + x)}" cy="${f1(CY + sy * R(t)[1])}" r="1.5" fill="#fbfaf5" stroke="#a8a291" stroke-width=".5"/>`);
  }
  // a building along one sideline: Levi's suite tower (its green roof and solar panels) or Ford Field's warehouse
  if (st.tower) {
    const tw = st.tower, y0 = tw.side * R(tw.from)[1], y1 = tw.side * (R(1)[1] - 0.5), x0 = -FW * 0.44, x1 = FW * 0.44, dy = Math.abs(y1 - y0);
    if (tw.style === "brick") {
      add(box([x0, y0, x1, y1], `fill="#8b4a3a" stroke="#4a2219" stroke-width="1"`));
      for (let x = x0 + 6; x < x1 - 4; x += 9) for (const f of [0.3, 0.65]) add(box([x, y0 + tw.side * dy * f - 1, x + 4, y0 + tw.side * dy * f + 1], `fill="#fde68a" opacity=".55"`));
    } else {
      add(box([x0, y0, x1, y1], `fill="#3f6b3a" stroke="#7dd3fc" stroke-width="1"`));
      for (let x = x0 + 6; x < x1 - 30; x += 22) add(box([x, y0 + tw.side * dy * 0.45, x + 16, y0 + tw.side * dy * 0.85], `fill="#1e3a5f" opacity=".85"`));
      for (let x = x0 + 4; x < x1; x += 11) add(`<circle cx="${f1(CX + x)}" cy="${f1(CY + y0 + tw.side * dy * 0.22)}" r="1.8" fill="#4d7c46"/>`);
    }
  }
  // landmarks
  if (st.lighthouse) {
    // Gillette: the lighthouse and the bridge across the open end
    const sx = st.lighthouse, bx = sx * R(0.84)[0];
    add(box([bx - 3, -FH * 0.5, bx + 3, FH * 0.5], `fill="#9ca3af" stroke="#4b5563" stroke-width=".8"`));
    const lx = CX + sx * R(0.8)[0], ly = CY - FH * 0.4;
    add(`<circle cx="${f1(lx)}" cy="${f1(ly)}" r="9" fill="#fffbe6" opacity=".45" filter="url(#g)"/><circle cx="${f1(lx)}" cy="${f1(ly)}" r="5" fill="#f8fafc" stroke="#475569" stroke-width=".8"/><circle cx="${f1(lx)}" cy="${f1(ly)}" r="2.2" fill="#fde68a"/>`);
  }
  if (st.ship) {
    // Raymond James: the pirate ship in the end zone, masts and sails, cannons along her sides
    const sx = st.ship, x = CX + sx * R(0.74)[0], L = FH * 0.29, W = 8;
    add(`<path d="M ${f1(x)} ${f1(CY - L)} Q ${f1(x + W)} ${f1(CY - L * 0.5)} ${f1(x + W)} ${f1(CY + L * 0.6)} L ${f1(x + W * 0.7)} ${f1(CY + L)} L ${f1(x - W * 0.7)} ${f1(CY + L)} L ${f1(x - W)} ${f1(CY + L * 0.6)} Q ${f1(x - W)} ${f1(CY - L * 0.5)} ${f1(x)} ${f1(CY - L)} Z" fill="#6b3f1d" stroke="#3b200c" stroke-width="1"/>`);
    for (let y = CY - L * 0.7; y < CY + L * 0.9; y += 4) add(`<line x1="${f1(x - W * 0.75)}" y1="${f1(y)}" x2="${f1(x + W * 0.75)}" y2="${f1(y)}" stroke="#8b5a2b" stroke-width=".6"/>`);
    for (const f of [-0.45, 0.05, 0.5]) { const y = CY + f * L; add(`<rect x="${f1(x - 13)}" y="${f1(y - 1.6)}" width="26" height="3.2" rx="1" fill="#f8fafc" opacity=".9"/><circle cx="${f1(x)}" cy="${f1(y)}" r="1.6" fill="#3b200c"/>`); }
    for (let y = CY - L * 0.3; y < CY + L * 0.8; y += 9) for (const s2 of [-1, 1]) add(`<circle cx="${f1(x + s2 * (W - 0.5))}" cy="${f1(y)}" r="1" fill="#111"/>`);
  }
  if (st.pools) {
    // EverBank: the pools and cabanas on the end-zone deck
    const sx = st.pools, xi = R(0.62)[0], xo = R(0.86)[0];
    add(box([sx * xi, -FH * 0.3, sx * xo, FH * 0.3], `fill="#d6d3d1" rx="2"`));
    for (const sy of [-1, 1]) add(box([sx * (xi + 4), sy * FH * 0.03, sx * (xo - 4), sy * FH * 0.26], `fill="#38bdf8" stroke="#0ea5e9" stroke-width=".8" rx="3"`));
    for (let y = -FH * 0.27; y < FH * 0.27; y += 9) add(box([sx * (xo - 2.5), y, sx * (xo - 0.5), y + 5], `fill="#f8fafc"`));
  }
  if (st.torch) {
    // Allegiant: the Al Davis memorial torch outside the lanai doors
    const tx = CX + st.torch * (FW / 2 + DX * 0.72), ty = CY + FH * 0.42;
    add(`<circle cx="${f1(tx)}" cy="${f1(ty)}" r="11" fill="url(#fl)"/><circle cx="${f1(tx)}" cy="${f1(ty)}" r="3" fill="#fff7cc"/>`);
  }
  if (st.horse) {
    // Mile High: the bucking bronco on the end board
    const sx = st.horse, bx = CX + sx * R(0.93)[0];
    add(`<g transform="translate(${f1(bx)} ${f1(CY)}) rotate(${sx * 90}) scale(1.5) translate(-8 -7)"><path d="M0 14 L3 8 L2 4 L5 0 L8 2 L7 5 L11 6 L15 4 L16 7 L13 9 L12 14 L10 14 L10 10 L6 10 L4 14 Z" fill="#f8fafc" stroke="#fb4f14" stroke-width=".5"/></g>`);
  }
  // the stadium's name: on the roof or canopy, or around the rim
  if (!st.wings) {
    const t = roof ? (roof.see ? 0.9 : (roof.from + 1) / 2) : st.canopy ? (st.canopy.from + 1) / 2 : st.shell === "wall" ? 0.95 : st.shell === "concrete" ? 0.895 : 0.89;
    label(t, st.name, 7.5, st.nameInk || (roof || st.canopy ? "#1f2937" : "#e2e8f0"), 2.6);
  }
  add("</svg>");
  return { url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s.join(""))}`, seats };
}

// Camera flashes: n fans across the stands, most in the first second after the play. Drawn on one
// canvas from a single pre-rendered glow (no SVG, no CSS animations), only while a burst runs.
const FLASH_MS = 380, BURST_MS = 2000;
let glow = null;
function flashSprite() {
  if (glow) return glow;
  glow = document.createElement("canvas"); glow.width = glow.height = 32;
  const g = glow.getContext("2d"), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.22, "rgba(255,253,242,.9)"); gr.addColorStop(0.5, "rgba(255,251,230,.35)"); gr.addColorStop(1, "rgba(255,251,230,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  return glow;
}
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// The stadium image, rasterized once to a bitmap at the size it's shown: a live SVG of thousands of
// fans and blurred lights repaints every time the field over it animates, a bitmap doesn't.
function useRaster(url, box) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    if (!url) return;
    let alive = true, out = null;
    const img = new Image();
    img.onload = () => {
      if (!alive) return;
      const w = Math.min(2600, Math.max(1000, Math.round((box.current?.clientWidth || 1200) * Math.min(2, window.devicePixelRatio || 1))));
      const c = document.createElement("canvas"); c.width = w; c.height = Math.round((w * VH) / VW);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => { if (!alive || !b) return; out = URL.createObjectURL(b); setSrc(out); });
    };
    img.src = url;
    return () => { alive = false; if (out) URL.revokeObjectURL(out); };
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps
  return src;
}

// The stadium around its children (the field). home: the home club's abbreviation; night: a night
// game (the upper deck sits in the dark); flash: { key, size } changes for every burst of flashes.
// fans: a neutral-site game (the Super Bowl) fills the host's stands with both clubs' fans, half and
// half, and its ribbon boards carry the game (ribbon) instead of the host club's words.
export default function Stadium({ home, night, flash, fans, ribbon, children }) {
  const fansKey = fans ? fans.join(",") : "";
  const st = useMemo(() => {
    const base = STADIUMS[home];
    if (!base || !fans) return base;
    const half = (ab) => { const c = STADIUMS[ab]?.crowd || base.crowd, tot = c.reduce((t, [, w]) => t + w, 0); return c.map(([k, w]) => [k, (w / tot) * 50]); };
    const out = { ...base, crowd: [...half(fans[0]), ...half(fans[1])], empty: "#334155" };
    // the host club's own dress comes off for the game: neutral boards, and no club tarps
    Object.assign(out, { ribbon: "#0b1222", ribbonHi: "#d4af37", ribbonInk: "#fde68a", ribbonText: ribbon || base.ribbonText });
    if (base.upper?.tarps) out.upper = { ...base.upper, tarps: null };
    if (home === "NYG" || home === "NYJ") Object.assign(out, { skin: "#4b5563", skinHi: "#9ca3af" });
    return out;
  }, [home, fansKey, ribbon]); // eslint-disable-line react-hooks/exhaustive-deps
  const art = useMemo(() => (st ? drawStadium(st, night) : null), [st, night]);
  const box = useRef(null), cv = useRef(null);
  const src = useRaster(art?.url, box);
  useEffect(() => {
    const c = cv.current;
    if (!flash?.key || !art || !c || !art.seats.length || reducedMotion()) return;
    const W = c.clientWidth, H = c.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (!W || !H) return;
    c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
    const g = c.getContext("2d"), k = c.width / VW, spr = flashSprite(), r = 7 * k;
    const rnd = seeded((typeof flash.key === "number" ? flash.key : 1) * 7919 + 13);
    const pops = Array.from({ length: flash.size || 60 }, () => { const [x, y] = art.seats[Math.floor(rnd() * art.seats.length)]; return [x * k, y * k, 1500 * rnd() ** 2]; });
    let raf = 0;
    const t0 = performance.now();
    const frame = (now) => {
      const t = now - t0;
      g.clearRect(0, 0, c.width, c.height);
      for (const [x, y, d] of pops) {
        const u = (t - d) / FLASH_MS;
        if (u < 0 || u > 1) continue;
        // a pop: up fast, fade out while it shrinks a little
        const a = u < 0.12 ? u / 0.12 : 1 - (u - 0.12) / 0.88, s = r * (u < 0.12 ? 0.4 + (0.6 * u) / 0.12 : 1 - (0.3 * (u - 0.12)) / 0.88);
        g.globalAlpha = a; g.drawImage(spr, x - s, y - s, s * 2, s * 2);
      }
      g.globalAlpha = 1;
      if (t < BURST_MS) raf = requestAnimationFrame(frame); else g.clearRect(0, 0, c.width, c.height);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); g.clearRect(0, 0, c.width, c.height); };
  }, [flash?.key]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!st) return children;
  const layer = { position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", userSelect: "none" };
  return (
    <div ref={box} style={{ position: "relative", padding: `${PAD_Y * 100}% ${PAD_X * 100}%`, isolation: "isolate" }}>
      {src && <img src={src} alt="" aria-hidden="true" draggable="false" style={{ ...layer, transform: "translateZ(0)" }} />}
      <canvas ref={cv} aria-hidden="true" style={{ ...layer, zIndex: 1 }} />
      {/* the field on its own layer: its plays repaint only the field, never the stands */}
      <div style={{ position: "relative", zIndex: 2, willChange: "transform" }}>{children}</div>
    </div>
  );
}
