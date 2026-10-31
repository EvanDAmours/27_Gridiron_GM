// The stadium around the live field: a top-down bowl (the home club's real stadium, where we've
// drawn it) with a crowd of little blobs, and camera flashes in the stands after touchdowns and big
// plays. Drawn once per game into a single SVG image (thousands of fans cost one <img>), from a
// seeded layout so the same stadium always looks the same.
//
// Layout: the field keeps its shape in the middle; the stands take PAD_X of the width on each side
// and PAD_Y (of the width) above and below. A ring at depth t (0 at the field, 1 at the outer
// wall) is a rounded rectangle; each stadium lists what sits at which depth.
import React, { useEffect, useMemo, useState } from "react";

export const PAD_X = 0.08, PAD_Y = 0.07;
const VW = 1000, FW = VW * (1 - 2 * PAD_X), FH = FW * 0.45, VH = FH + 2 * VW * PAD_Y;
const DX = VW * PAD_X, DY = VW * PAD_Y; // the stands' depth at the sides and at the ends of the bowl
// how much taller the stadium is than the field alone (for the field's size budget), and how
// much wider (the wrapper's max width)
export const STADIUM_TALL = VH / FH, STADIUM_WIDE = 1 / (1 - 2 * PAD_X);

// MetLife Stadium (Giants and Jets): a squared-off three-level bowl, LED ribbon boards on the
// fascias, a club level of suites, four corner video boards, a rim ringed with lights and the
// aluminum louvered skin lit in the home team's color.
const METLIFE = { name: "METLIFE STADIUM", corner: 0.62 };
export const STADIUMS = {
  NYG: { ...METLIFE, skin: "#1d4ed8", skinHi: "#3b82f6", ribbon: "#1d4ed8", ribbonText: "GIANTS  ·  NEW YORK  ·  BIG BLUE  ·  METLIFE STADIUM  ·  GIANTS  ·  NEW YORK  ·  BIG BLUE",
    crowd: [["#1e3a8a", 34], ["#3155b8", 14], ["#a8b3c7", 7], ["#8f1d2c", 8], ["#0f172a", 17], ["#475569", 12], ["#5b6b8a", 8]] },
  NYJ: { ...METLIFE, skin: "#15803d", skinHi: "#22c55e", ribbon: "#166534", ribbonText: "JETS  ·  J-E-T-S  ·  GANG GREEN  ·  METLIFE STADIUM  ·  JETS  ·  J-E-T-S  ·  GANG GREEN",
    crowd: [["#14532d", 34], ["#1f7a45", 14], ["#cbd5e1", 12], ["#0f172a", 20], ["#475569", 12], ["#5b6b8a", 8]] },
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

// The stadium as an SVG document (for an <img>), and where every fan sits (for the flashes).
function drawStadium(st, night) {
  const rnd = seeded(7), s = [], seats = [];
  const add = (x) => s.push(x);
  const pick = () => { const tot = st.crowd.reduce((t, [, w]) => t + w, 0); let x = rnd() * tot; for (const [c, w] of st.crowd) if ((x -= w) < 0) return c; return st.crowd[0][0]; };
  const R = (t) => ring(t, st.corner);
  add(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VW} ${f1(VH)}">`);
  add(`<defs><filter id="g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter><linearGradient id="sk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${st.skin}"/><stop offset=".5" stop-color="${st.skinHi}"/><stop offset="1" stop-color="${st.skin}"/></linearGradient></defs>`);
  // the louvered skin, lit in team color, with its glow
  add(`<path d="${path(R(1))}" fill="${st.skin}" opacity=".35" filter="url(#g)"/>`);
  add(`<path d="${path(R(0.985))}" fill="url(#sk)"/>`);
  for (const [x, y, nx, ny] of along(R(0.955), 3.2)) add(`<line x1="${f1(CX + x - nx * 2.4)}" y1="${f1(CY + y - ny * 2.4)}" x2="${f1(CX + x + nx * 2.4)}" y2="${f1(CY + y + ny * 2.4)}" stroke="#04122e" stroke-width=".8" opacity=".5"/>`);
  // the rim and its lights (none over the name at the 50)
  add(`<path d="${path(R(0.915))}" fill="#3a4150"/>`);
  const rimR = R(0.89);
  for (const [x, y] of along(rimR, 22)) if (!(Math.abs(x) < 75 && Math.abs(y) > rimR[1] - 4)) add(`<rect x="${f1(CX + x - 2.4)}" y="${f1(CY + y - 1.2)}" width="4.8" height="2.4" rx=".6" fill="#fff8dc"/><circle cx="${f1(CX + x)}" cy="${f1(CY + y)}" r="3.5" fill="#fffbe6" opacity=".35" filter="url(#g)"/>`);
  for (const [side, ang] of [[-1, 0], [1, 180]]) { const y = CY + side * rimR[1]; add(`<text x="${CX}" y="${f1(y)}" fill="#e2e8f0" font-size="7.5" font-weight="900" font-family="Arial" text-anchor="middle" dominant-baseline="central" letter-spacing="2.6" transform="rotate(${ang} ${CX} ${f1(y)})">${st.name}</text>`); }
  // a seating bowl: concrete, then rows of fans (sections split by aisles), dimmer toward the top
  const bowl = (t0, t1, rows, base, lit, tunnels = []) => {
    add(`<path d="${path(R(t1))}" fill="${base}"/>`);
    for (let i = 0; i < rows; i++) {
      const f = (i + 0.5) / rows, t = t0 + (t1 - t0) * f;
      add(`<path d="${path(R(t + (t1 - t0) / rows / 2))}" fill="none" stroke="#000" stroke-opacity=".22" stroke-width=".6"/>`);
      for (const [x, y, , , d] of along(R(t), 3.5)) {
        if (d % 46 < 3.6) continue; // an aisle
        if (tunnels.some(([tx, tw, th]) => Math.abs(x - tx) < tw && Math.abs(y) < th)) continue;
        if (rnd() < 0.05) { add(`<rect x="${f1(CX + x - 0.9)}" y="${f1(CY + y - 0.9)}" width="1.8" height="1.8" fill="#9ca3af" opacity=".6"/>`); continue; } // an empty (grey) seat
        const px = CX + x + (rnd() - 0.5) * 1.2, py = CY + y + (rnd() - 0.5) * 1.2;
        add(`<circle cx="${f1(px)}" cy="${f1(py)}" r="${f1(1.2 + rnd() * 0.45)}" fill="${pick()}" opacity="${f1(lit * (1 - 0.35 * f))}"/>`);
        seats.push([f1(px), f1(py)]);
      }
    }
  };
  bowl(0.6, 0.875, 6, "#232831", night ? 0.78 : 0.9);
  // the club level: suites' glass
  add(`<path d="${path(R(0.6))}" fill="#20252e"/>`);
  for (const [x, y, nx, ny] of along(R(0.565), 13)) add(`<rect x="${f1(CX + x - 4.5)}" y="${f1(CY + y - 1.6)}" width="9" height="3.2" rx=".8" fill="#fde68a" opacity=".42" transform="rotate(${f1((Math.atan2(ny, nx) * 180) / Math.PI + 90)} ${f1(CX + x)} ${f1(CY + y)})"/>`);
  // the LED ribbon boards on the fascias, with the club's words along both sidelines
  const ribbon = (t) => {
    const rr = R(t);
    add(`<path d="${path(rr)}" fill="none" stroke="#071233" stroke-width="5"/><path d="${path(rr)}" fill="none" stroke="${st.ribbon}" stroke-width="3.2"/><path d="${path(rr)}" fill="none" stroke="${st.skinHi}" stroke-width="3" opacity=".3" filter="url(#g)"/>`);
    for (const [side, ang] of [[-1, 0], [1, 180]]) { const y = CY + side * rr[1]; add(`<text x="${CX}" y="${f1(y)}" fill="#fff" font-size="2.9" font-weight="900" font-family="Arial" text-anchor="middle" dominant-baseline="central" letter-spacing="1" transform="rotate(${ang} ${CX} ${f1(y)})">${st.ribbonText}</text>`); }
  };
  ribbon(0.53);
  // the lower bowl, with the team tunnels in each end
  const tun = [[-(FW / 2 + DX * 0.3), DX * 0.17, 12], [FW / 2 + DX * 0.3, DX * 0.17, 12]];
  bowl(0.1, 0.5, 8, "#2a2f39", night ? 0.92 : 1, tun);
  for (const [tx, tw, th] of tun) add(`<rect x="${f1(CX + tx - tw)}" y="${f1(CY - th)}" width="${f1(tw * 2)}" height="${th * 2}" rx="2" fill="#0b0f17"/>`);
  ribbon(0.5);
  // the apron: turf to the wall, and the wall
  add(`<path d="${path(R(0.085))}" fill="#1f6b2c"/><path d="${path(R(0.085))}" fill="none" stroke="#0f172a" stroke-width="2.2"/>`);
  // the four corner video boards, each facing the field across its corner
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    const o = R(0.72), bx = CX + sx * (o[0] - o[2] * 0.3), by = CY + sy * (o[1] - o[2] * 0.3), a = 45 * sx * sy;
    add(`<g transform="rotate(${a} ${f1(bx)} ${f1(by)})"><rect x="${f1(bx - 24)}" y="${f1(by - 5.5)}" width="48" height="11" rx="1.2" fill="#0a0f1a" stroke="#64748b" stroke-width=".7"/><rect x="${f1(bx - 22)}" y="${f1(by - 4)}" width="44" height="8" rx=".8" fill="${st.ribbon}" opacity=".55"/></g>`);
  }
  add("</svg>");
  return { url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s.join(""))}`, seats };
}

const FLASH_CSS = `@keyframes stFlash { 0% { opacity: 0; transform: scale(.4) } 12% { opacity: 1; transform: scale(1) } 100% { opacity: 0; transform: scale(.7) } }
.st-flash { animation: stFlash .38s ease-out both; transform-box: fill-box; transform-origin: center; }
@media (prefers-reduced-motion: reduce) { .st-flash { animation: none; opacity: 0; } }`;

// Camera flashes: n fans across the stands, most in the first second after the play.
function Flashes({ seats, n, seed }) {
  const pops = useMemo(() => {
    const rnd = seeded(seed * 7919 + 13), out = [];
    for (let i = 0; i < n && seats.length; i++) { const [x, y] = seats[Math.floor(rnd() * seats.length)]; out.push([x, y, 1.5 * rnd() ** 2]); }
    return out;
  }, [seats, n, seed]);
  return (
    <svg viewBox={`0 0 ${VW} ${f1(VH)}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1 }} aria-hidden="true">
      <defs><radialGradient id="stf"><stop offset="0" stopColor="#ffffff" stopOpacity="1" /><stop offset=".22" stopColor="#fffdf2" stopOpacity=".9" /><stop offset=".5" stopColor="#fffbe6" stopOpacity=".35" /><stop offset="1" stopColor="#fffbe6" stopOpacity="0" /></radialGradient></defs>
      {pops.map(([x, y, d], i) => <circle key={i} className="st-flash" cx={x} cy={y} r="7" fill="url(#stf)" style={{ animationDelay: `${d.toFixed(2)}s` }} />)}
    </svg>
  );
}

// The stadium around its children (the field). home: the home club's abbreviation; night: a night
// game (the upper deck sits in the dark); flash: { key, size } changes for every burst of flashes.
export default function Stadium({ home, night, flash, children }) {
  const st = STADIUMS[home];
  const art = useMemo(() => (st ? drawStadium(st, night) : null), [st, night]);
  const [burst, setBurst] = useState(null);
  useEffect(() => {
    if (!flash?.key || !art) return;
    setBurst({ k: flash.key, n: flash.size || 60 });
    const t = setTimeout(() => setBurst(null), 2600);
    return () => clearTimeout(t);
  }, [flash?.key]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!st) return children;
  return (
    <div style={{ position: "relative", padding: `${PAD_Y * 100}% ${PAD_X * 100}%` }}>
      <style>{FLASH_CSS}</style>
      <img src={art.url} alt="" aria-hidden="true" draggable="false" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", userSelect: "none" }} />
      {burst && <Flashes key={burst.k} seats={art.seats} n={burst.n} seed={typeof burst.k === "number" ? burst.k : 1} />}
      <div style={{ position: "relative", zIndex: 2 }}>{children}</div>
    </div>
  );
}
