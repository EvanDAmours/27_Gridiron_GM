// The stadium around the live field: a top-down bowl (the home club's real stadium, where we've
// drawn it) with a crowd of little blobs, and camera flashes in the stands after touchdowns and big
// plays. Drawn once per game from a seeded layout (the same stadium always looks the same) and
// rasterized to a single bitmap, so the thousands of fans cost nothing while the field animates.
//
// Layout: the field keeps its shape in the middle; the stands take PAD_X of the width on each side
// and PAD_Y (of the width) above and below. A ring at depth t (0 at the field, 1 at the outer
// wall) is a rounded rectangle; each stadium lists what sits at which depth.
import React, { useEffect, useMemo, useRef, useState } from "react";

export const PAD_X = 0.08, PAD_Y = 0.07;
const VW = 1000, FW = VW * (1 - 2 * PAD_X), FH = FW * 0.45, VH = FH + 2 * VW * PAD_Y;
const DX = VW * PAD_X, DY = VW * PAD_Y; // the stands' depth at the sides and at the ends of the bowl
// how much taller the stadium is than the field alone (for the field's size budget), and how
// much wider (the wrapper's max width)
export const STADIUM_TALL = VH / FH, STADIUM_WIDE = 1 / (1 - 2 * PAD_X);

// Each stadium is a design (kind) plus the club's colors and crowd (color, weight).
// MetLife Stadium (Giants and Jets): a squared-off three-level bowl, LED ribbon boards on the
// fascias, a club level of suites, four corner video boards, a rim ringed with lights and the
// aluminum louvered skin lit in the home team's color.
const METLIFE = { kind: "metlife", name: "METLIFE STADIUM", corner: 0.62 };
export const STADIUMS = {
  NYG: { ...METLIFE, skin: "#1d4ed8", skinHi: "#3b82f6", ribbon: "#1d4ed8", ribbonText: "GIANTS  ·  NEW YORK  ·  BIG BLUE  ·  METLIFE STADIUM  ·  GIANTS  ·  NEW YORK  ·  BIG BLUE",
    crowd: [["#1e3a8a", 34], ["#3155b8", 14], ["#a8b3c7", 7], ["#8f1d2c", 8], ["#0f172a", 17], ["#475569", 12], ["#5b6b8a", 8]] },
  NYJ: { ...METLIFE, skin: "#15803d", skinHi: "#22c55e", ribbon: "#166534", ribbonText: "JETS  ·  J-E-T-S  ·  GANG GREEN  ·  METLIFE STADIUM  ·  JETS  ·  J-E-T-S  ·  GANG GREEN",
    crowd: [["#14532d", 34], ["#1f7a45", 14], ["#cbd5e1", 12], ["#0f172a", 20], ["#475569", 12], ["#5b6b8a", 8]] },
  // AT&T Stadium (Cowboys): a rounded bowl under a silver dome, the roof rolled open over the field,
  // the two great steel arches running end to end over it, and the glass walls at each end.
  DAL: { kind: "att", name: "AT&T STADIUM", corner: 1, skin: "#c3cad4", skinHi: "#eef1f5", ribbon: "#0b2a5b", ribbonHi: "#3b82f6", ribbonText: "COWBOYS  ·  AMERICA'S TEAM  ·  ARLINGTON  ·  AT&T STADIUM  ·  COWBOYS  ·  HOW 'BOUT THEM COWBOYS",
    crowd: [["#0b2a5b", 30], ["#1e40af", 10], ["#a7b1bf", 13], ["#e5e7eb", 9], ["#0f172a", 18], ["#475569", 12], ["#7f1d1d", 4]] },
  // Lincoln Financial Field (Eagles): open corners, a big video board over each end zone, and the
  // two winged canopies over the sideline upper decks, with wind turbines along their rims.
  PHI: { kind: "linc", name: "LINCOLN FINANCIAL FIELD", corner: 0.5, skin: "#8c96a3", skinHi: "#c4cbd4", ribbon: "#004c54", ribbonHi: "#14b8a6", ribbonText: "EAGLES  ·  FLY EAGLES FLY  ·  PHILADELPHIA  ·  THE LINC  ·  EAGLES  ·  GO BIRDS",
    crowd: [["#004c54", 34], ["#0b6b73", 12], ["#a5acaf", 9], ["#e5e7eb", 8], ["#0f172a", 20], ["#475569", 10], ["#1f6b2c", 4]] },
  // Northwest Stadium (Commanders): a deep oval bowl of burgundy seats inside a concrete shell,
  // light banks on the rim, the upper end zones covered in team tarps and a video board over each.
  WAS: { kind: "northwest", name: "NORTHWEST STADIUM", corner: 0.85, skin: "#4a4f58", skinHi: "#6b7280", ribbon: "#5a1414", ribbonHi: "#ffb612", ribbonText: "COMMANDERS  ·  HAIL TO THE COMMANDERS  ·  WASHINGTON  ·  NORTHWEST STADIUM  ·  COMMANDERS  ·  HTTC", ribbonInk: "#ffb612", empty: "#7a1f2b",
    crowd: [["#5a1414", 32], ["#7a1f2b", 10], ["#ffb612", 8], ["#c99a2e", 4], ["#e5e7eb", 6], ["#0f172a", 18], ["#475569", 12]] },
};
export const hasStadium = (ab) => !!STADIUMS[ab];

// a small seeded random, so a stadium's crowd is the same every game
const seeded = (a) => () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const CX = VW / 2, CY = VH / 2;
// the ring at depth t: half-width, half-height and corner radius
const ring = (t, corner) => [FW / 2 + t * DX, FH / 2 + t * DY, 6 + t * Math.min(DX, DY) * 1.6 * corner];
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
// where a point (from the center) sits: beyond both field edges (a corner), off an end, or a sideline
const inCorner = (x, y) => Math.abs(x) > FW / 2 + 2 && Math.abs(y) > FH / 2 + 2;
const atEnd = (x, y) => Math.abs(x) > FW / 2 && Math.abs(y) <= FH / 2;

// The stadium as an SVG document (for an <img>), and where every fan sits (for the flashes).
export function drawStadium(st, night) {
  const rnd = seeded(7), s = [], seats = [];
  const add = (x) => s.push(x);
  const pick = () => { const tot = st.crowd.reduce((t, [, w]) => t + w, 0); let x = rnd() * tot; for (const [c, w] of st.crowd) if ((x -= w) < 0) return c; return st.crowd[0][0]; };
  const R = (t) => ring(t, st.corner);
  const band = (t0, t1, fill, more = "") => add(`<path d="${path(R(t1))} ${path(R(t0))}" fill-rule="evenodd" fill="${fill}" ${more}/>`);
  const label = (t, text, size, ink, spacing) => { for (const [side, ang] of [[-1, 0], [1, 180]]) { const y = CY + side * R(t)[1]; add(`<text x="${CX}" y="${f1(y)}" fill="${ink}" font-size="${size}" font-weight="900" font-family="Arial" text-anchor="middle" dominant-baseline="central" letter-spacing="${spacing}" transform="rotate(${ang} ${CX} ${f1(y)})">${esc(text)}</text>`); } };
  const lights = (t, step, gap = 75) => { const rr = R(t); for (const [x, y] of along(rr, step)) if (!(Math.abs(x) < gap && Math.abs(y) > rr[1] - 4)) add(`<rect x="${f1(CX + x - 2.4)}" y="${f1(CY + y - 1.2)}" width="4.8" height="2.4" rx=".6" fill="#fff8dc"/><circle cx="${f1(CX + x)}" cy="${f1(CY + y)}" r="3.5" fill="#fffbe6" opacity=".35" filter="url(#g)"/>`); };
  // a big video board at each end, facing the field
  const endBoards = (t, h, w = 10) => { for (const sx of [-1, 1]) { const x = CX + sx * R(t)[0]; add(`<rect x="${f1(x - w / 2)}" y="${f1(CY - h / 2)}" width="${w}" height="${f1(h)}" rx="1.4" fill="#0a0f1a" stroke="#64748b" stroke-width=".8"/><rect x="${f1(x - w / 2 + 1.6)}" y="${f1(CY - h / 2 + 3)}" width="${w - 3.2}" height="${f1(h - 6)}" rx=".8" fill="${st.ribbon}" opacity=".75"/><rect x="${f1(x - w / 2 + 1.6)}" y="${f1(CY - h / 2 + 3)}" width="${w - 3.2}" height="${f1(h - 6)}" rx=".8" fill="${st.ribbonHi || st.skinHi}" opacity=".18"/>`); } };
  add(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VW} ${f1(VH)}">`);
  add(`<defs><filter id="g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter><linearGradient id="sk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${st.skin}"/><stop offset=".5" stop-color="${st.skinHi}"/><stop offset="1" stop-color="${st.skin}"/></linearGradient><linearGradient id="gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7dd3fc"/><stop offset="1" stop-color="#1e3a5f"/></linearGradient></defs>`);
  // the outer shell
  if (st.kind === "metlife") {
    // the louvered skin, lit in team color, with its glow; the rim and its lights (none over the name at the 50)
    add(`<path d="${path(R(1))}" fill="${st.skin}" opacity=".35" filter="url(#g)"/>`);
    add(`<path d="${path(R(0.985))}" fill="url(#sk)"/>`);
    for (const [x, y, nx, ny] of along(R(0.955), 3.2)) add(`<line x1="${f1(CX + x - nx * 2.4)}" y1="${f1(CY + y - ny * 2.4)}" x2="${f1(CX + x + nx * 2.4)}" y2="${f1(CY + y + ny * 2.4)}" stroke="#04122e" stroke-width=".8" opacity=".5"/>`);
    add(`<path d="${path(R(0.915))}" fill="#3a4150"/>`);
    lights(0.89, 22);
    label(0.89, st.name, 7.5, "#e2e8f0", 2.6);
  } else if (st.kind === "northwest") {
    // a concrete shell with pilasters, and banks of lights on the rim
    add(`<path d="${path(R(1))}" fill="url(#sk)"/>`);
    for (const [x, y, nx, ny] of along(R(0.95), 9)) add(`<line x1="${f1(CX + x - nx * 3)}" y1="${f1(CY + y - ny * 3)}" x2="${f1(CX + x + nx * 3)}" y2="${f1(CY + y + ny * 3)}" stroke="#1f2329" stroke-width="1.6" opacity=".55"/>`);
    add(`<path d="${path(R(0.91))}" fill="#30343c"/>`);
    lights(0.895, 30, 95);
    label(0.895, st.name, 7, "#e5e7eb", 2.4);
  } else {
    // a plain concourse wall (the roof or canopies go on top later)
    add(`<path d="${path(R(1))}" fill="#2b3039"/><path d="${path(R(0.9))}" fill="#30343c"/>`);
  }
  // a seating bowl: concrete, then rows of fans (sections split by aisles), dimmer toward the top.
  // skip(x, y): where there are no seats (tunnels, open corners, tarps)
  const bowl = (t0, t1, rows, base, lit, skip = () => false) => {
    add(`<path d="${path(R(t1))}" fill="${base}"/>`);
    for (let i = 0; i < rows; i++) {
      const f = (i + 0.5) / rows, t = t0 + (t1 - t0) * f;
      add(`<path d="${path(R(t + (t1 - t0) / rows / 2))}" fill="none" stroke="#000" stroke-opacity=".22" stroke-width=".6"/>`);
      for (const [x, y, , , d] of along(R(t), 3.5)) {
        if (d % 46 < 3.6) continue; // an aisle
        if (skip(x, y)) continue;
        if (rnd() < 0.05) { add(`<rect x="${f1(CX + x - 0.9)}" y="${f1(CY + y - 0.9)}" width="1.8" height="1.8" fill="${st.empty || "#9ca3af"}" opacity=".6"/>`); continue; } // an empty seat
        const px = CX + x + (rnd() - 0.5) * 1.2, py = CY + y + (rnd() - 0.5) * 1.2;
        add(`<circle cx="${f1(px)}" cy="${f1(py)}" r="${f1(1.2 + rnd() * 0.45)}" fill="${pick()}" opacity="${f1(lit * (1 - 0.35 * f))}"/>`);
        seats.push([f1(px), f1(py)]);
      }
    }
  };
  // the upper bowl: the Linc's corners are open, Northwest's upper end zones are tarped over
  // (no seats under the Linc's end boards and canopies either: nobody would see a flash there)
  const tarp = (x, y) => atEnd(x, y) && Math.abs(y) < FH * 0.3;
  const linc = (x, y) => inCorner(x, y) || (atEnd(x, y) && Math.abs(y) < FH * 0.33 && Math.abs(x) > R(0.69)[0] && Math.abs(x) < R(0.79)[0]) || (Math.abs(x) < FW / 2 && Math.abs(y) > R(0.675)[1]);
  const upperTop = st.kind === "att" ? 0.82 : 0.875;
  bowl(0.6, upperTop, 6, "#232831", night ? 0.78 : 0.9, st.kind === "linc" ? linc : st.kind === "northwest" ? tarp : undefined);
  if (st.kind === "linc") {
    // the open corners: plaza, with lamps
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      const o = R(upperTop), i0 = R(0.6);
      add(`<path d="M ${f1(CX + sx * (FW / 2 + 2))} ${f1(CY + sy * i0[1])} L ${f1(CX + sx * (FW / 2 + 2))} ${f1(CY + sy * o[1])} L ${f1(CX + sx * (o[0] - o[2] * 0.3))} ${f1(CY + sy * (o[1] - o[2] * 0.3))} L ${f1(CX + sx * o[0])} ${f1(CY + sy * (FH / 2 + 2))} L ${f1(CX + sx * i0[0])} ${f1(CY + sy * (FH / 2 + 2))} Z" fill="#1a1e26"/>`);
      for (let k = 0; k < 3; k++) add(`<circle cx="${f1(CX + sx * (FW / 2 + 14 + k * 16))}" cy="${f1(CY + sy * (FH / 2 + 14 + (2 - k) * 14))}" r="1.6" fill="#fde68a" opacity=".8"/>`);
    }
  }
  if (st.kind === "northwest") {
    // tarps over the upper end zones, the club's name on them
    for (const sx of [-1, 1]) {
      const x0 = CX + sx * R(0.62)[0], x1 = CX + sx * R(0.86)[0], h = FH * 0.6;
      add(`<rect x="${f1(Math.min(x0, x1))}" y="${f1(CY - h / 2)}" width="${f1(Math.abs(x1 - x0))}" height="${f1(h)}" rx="2" fill="#5a1414" stroke="#ffb612" stroke-width="1"/>`);
      const xm = (x0 + x1) / 2;
      add(`<text x="${f1(xm)}" y="${f1(CY)}" fill="#ffb612" font-size="9" font-weight="900" font-family="Arial" text-anchor="middle" dominant-baseline="central" letter-spacing="3" transform="rotate(${sx * 90} ${f1(xm)} ${f1(CY)})">COMMANDERS</text>`);
    }
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
  const tun = [[-(FW / 2 + DX * 0.3), DX * 0.17, 12], [FW / 2 + DX * 0.3, DX * 0.17, 12]];
  bowl(0.1, 0.5, 8, "#2a2f39", night ? 0.92 : 1, (x, y) => tun.some(([tx, tw, th]) => Math.abs(x - tx) < tw && Math.abs(y) < th) || (st.kind === "att" && Math.abs(Math.abs(y) - (FH / 2 + DY * 0.22)) < 5));
  for (const [tx, tw, th] of tun) add(`<rect x="${f1(CX + tx - tw)}" y="${f1(CY - th)}" width="${f1(tw * 2)}" height="${th * 2}" rx="2" fill="#0b0f17"/>`);
  ribbon(0.5);
  // the apron: turf to the wall, and the wall
  add(`<path d="${path(R(0.085))}" fill="#1f6b2c"/><path d="${path(R(0.085))}" fill="none" stroke="#0f172a" stroke-width="2.2"/>`);
  if (st.kind === "metlife") {
    // the four corner video boards, each facing the field across its corner
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      const o = R(0.72), bx = CX + sx * (o[0] - o[2] * 0.3), by = CY + sy * (o[1] - o[2] * 0.3), a = 45 * sx * sy;
      add(`<g transform="rotate(${a} ${f1(bx)} ${f1(by)})"><rect x="${f1(bx - 24)}" y="${f1(by - 5.5)}" width="48" height="11" rx="1.2" fill="#0a0f1a" stroke="#64748b" stroke-width=".7"/><rect x="${f1(bx - 22)}" y="${f1(by - 4)}" width="44" height="8" rx=".8" fill="${st.ribbon}" opacity=".55"/></g>`);
    }
  }
  if (st.kind === "linc") endBoards(0.74, FH * 0.62, 15);
  if (st.kind === "northwest") endBoards(0.93, FH * 0.55);
  if (st.kind === "att") {
    // the dome: silver roof panels from the upper deck to the wall, open over the field
    band(0.83, 1, "url(#sk)");
    for (const [x, y, nx, ny] of along(R(0.915), 8)) add(`<line x1="${f1(CX + x - nx * 7)}" y1="${f1(CY + y - ny * 7)}" x2="${f1(CX + x + nx * 7)}" y2="${f1(CY + y + ny * 7)}" stroke="#8a94a3" stroke-width=".7" opacity=".7"/>`);
    add(`<path d="${path(R(0.83))}" fill="none" stroke="#5b6472" stroke-width="2"/><path d="${path(R(1))}" fill="none" stroke="#5b6472" stroke-width="1.6"/>`);
    // the glass walls at each end
    for (const sx of [-1, 1]) {
      const xi = CX + sx * R(0.86)[0], xo = CX + sx * R(0.995)[0], h = FH * 0.62, x = Math.min(xi, xo), w = Math.abs(xo - xi);
      add(`<rect x="${f1(x)}" y="${f1(CY - h / 2)}" width="${f1(w)}" height="${f1(h)}" fill="url(#gl)" opacity=".9"/>`);
      for (let yy = CY - h / 2 + 8; yy < CY + h / 2; yy += 8) add(`<line x1="${f1(x)}" y1="${f1(yy)}" x2="${f1(x + w)}" y2="${f1(yy)}" stroke="#0f172a" stroke-width=".5" opacity=".6"/>`);
    }
    label(0.915, st.name, 7.5, "#1f2937", 2.6);
    // the two arches, end to end over the bowl: a steel truss with its shadow
    const hw = R(1)[0];
    for (const sy of [-1, 1]) {
      const y = CY + sy * (FH / 2 + DY * 0.22), x0 = CX - hw + 4, x1 = CX + hw - 4;
      add(`<rect x="${f1(x0 + 3)}" y="${f1(y - 3 + 4)}" width="${f1(x1 - x0)}" height="7" fill="#000" opacity=".28"/>`);
      add(`<rect x="${f1(x0)}" y="${f1(y - 3.5)}" width="${f1(x1 - x0)}" height="7" rx="3.5" fill="#cfd5dd" stroke="#4b5563" stroke-width="1"/>`);
      let zz = `M ${f1(x0 + 4)} ${f1(y - 2.6)}`;
      for (let x = x0 + 4, up = false; x < x1 - 4; x += 6, up = !up) zz += ` L ${f1(x + 6)} ${f1(y + (up ? -2.6 : 2.6))}`;
      add(`<path d="${zz}" fill="none" stroke="#6b7280" stroke-width=".7"/>`);
      for (const xe of [x0, x1]) add(`<rect x="${f1(xe - 5)}" y="${f1(y - 6)}" width="10" height="12" rx="1.5" fill="#6b7280"/>`);
    }
  }
  if (st.kind === "linc") {
    // the winged canopies over the sideline upper decks: solar panels, ribs and wind turbines
    const xa = FW / 2 * 0.96;
    for (const sy of [-1, 1]) {
      const yi = CY + sy * R(0.68)[1], ye = CY + sy * (FH / 2 + DY * 0.86), yp = CY + sy * (FH / 2 + DY * 1.12);
      const d = `M ${f1(CX - xa)} ${f1(yi)} L ${f1(CX + xa)} ${f1(yi)} L ${f1(CX + xa + 10)} ${f1(ye)} Q ${CX} ${f1(yp)} ${f1(CX - xa - 10)} ${f1(ye)} Z`;
      add(`<path d="${d}" fill="#000" opacity=".3" transform="translate(3 ${sy * 3})"/><path d="${d}" fill="url(#sk)" stroke="#4b5563" stroke-width="1"/>`);
      for (let x = -xa + 14; x < xa; x += 14) {
        const u = x / (xa + 10), yo = ye + (CY + sy * (FH / 2 + DY * 0.99) - ye) * (1 - u * u);
        add(`<line x1="${f1(CX + x)}" y1="${f1(yi)}" x2="${f1(CX + x)}" y2="${f1(yo)}" stroke="#6b7280" stroke-width=".6"/>`);
        add(`<rect x="${f1(CX + x - 5.5)}" y="${f1(Math.min(yi, yo) + Math.abs(yo - yi) * 0.38)}" width="11" height="${f1(Math.abs(yo - yi) * 0.3)}" fill="#1e3a5f" opacity=".75"/>`);
      }
      const yn = CY + sy * (R(0.68)[1] + 4);
      add(`<text x="${CX}" y="${f1(yn)}" fill="#1f2937" font-size="5.6" font-weight="900" font-family="Arial" text-anchor="middle" dominant-baseline="central" letter-spacing="2" transform="rotate(${sy > 0 ? 180 : 0} ${CX} ${f1(yn)})">${esc(st.name)}</text>`);
      // seven wind turbines along each canopy's rim
      for (let k = 0; k < 7; k++) {
        const x = -xa * 0.85 + (k * xa * 1.7) / 6, u = x / (xa + 10), y = CY + sy * (FH / 2 + DY * (0.86 + 0.13 * (1 - u * u)) - 3);
        add(`<g transform="translate(${f1(CX + x)} ${f1(y)})"><circle r="1.3" fill="#f8fafc"/>${[0, 120, 240].map((a) => `<line x1="0" y1="0" x2="${f1(4.5 * Math.cos(((a + k * 17) * Math.PI) / 180))}" y2="${f1(4.5 * Math.sin(((a + k * 17) * Math.PI) / 180))}" stroke="#f8fafc" stroke-width=".9" stroke-linecap="round"/>`).join("")}</g>`);
      }
    }
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
export default function Stadium({ home, night, flash, children }) {
  const st = STADIUMS[home];
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
