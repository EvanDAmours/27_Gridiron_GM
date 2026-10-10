// A team's star, standing beside its logo on the home screen: an animated SVG player in his
// team's uniform (colors at home, white on the road) with his own gear. The loadout (sleeves,
// arm tape, wristbands, gloves, eye black, visor, towel, socks, cleats, neck roll, facemask) is
// rolled once from his id, so he looks the same every week and every season.
import React from "react";

const hash = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; return h >>> 0; };
const roller = (seed) => { let x = hash(seed) || 1; return () => ((x = Math.imul(x ^ (x >>> 13), 0x5bd1e995) ^ (x >>> 15)) >>> 0) / 4294967296; };
const BIG = new Set(["LT", "LG", "C", "RG", "RT", "DL"]);
const SKILL = new Set(["WR", "CB", "S", "RB"]);

// His gear, the same every time for the same player.
export function gearFor(p) {
  const r = roller(`${p?.id}|gear`);
  const pick = (opts) => { let x = r() * opts.reduce((s, [, w]) => s + w, 0); for (const [v, w] of opts) { x -= w; if (x <= 0) return v; } return opts[0][0]; };
  const pos = p?.pos || "WR", qb = pos === "QB", big = BIG.has(pos);
  return {
    sleeves: pick([["none", 45], ["one", 20], ["both", 35]]),
    sleeveClr: pick([["#f8fafc", 4], ["#111827", 4], ["team", 3]]),
    armTape: r() < (big ? 0.6 : 0.35),
    wristbands: r() < 0.6,
    bandClr: pick([["#f8fafc", 5], ["#111827", 3], ["team", 3]]),
    gloves: qb ? (r() < 0.3 ? "one" : "none") : "both",
    gloveClr: pick([["team", 5], ["#111827", 4], ["#f8fafc", 2]]),
    eyeBlack: pick([["none", 45], ["stripes", 40], ["sticker", 15]]),
    visor: pick([["none", 55], ["clear", 25], ["smoke", 12], ["iridescent", 8]]),
    towel: r() < (qb ? 0.6 : SKILL.has(pos) ? 0.4 : 0.15),
    socks: pick([["high", 60], ["low", 40]]),
    cleats: pick([["#f8fafc", 4], ["#111827", 4], ["team", 3], ["#d4a017", 0.4]]),
    neckRoll: big && r() < 0.35,
    mask: qb || pos === "K" || pos === "P" ? "open" : big ? "cage" : pos === "LB" || pos === "TE" || pos === "RB" ? "bar3" : "bar2",
    sway: Math.round(r() * 1000) / 1000,
  };
}

const jerseyNum = (p) => p?.num ?? (hash(`${p?.id}|num`) % 89) + 10;

// The sprite, facing right (3/4 view), one character per pixel. Slots are filled from his team
// colors and gear: o outline; H/h/L helmet (base, shadow, highlight), S helmet stripe; k/K skin,
// E eye, V visor slot, b eye-black slot; F facemask, M cage bar; N neck-roll slot, n neck; J/j/D
// jersey (base, shadow, trim), s jersey sleeve; a forearm, t tape slot, w wrist, g hand; B belt;
// P/p/T pants (base, shadow, stripe), R towel slot; y upper sock, X sock, C cleat.
const SPRITE = [
  "......oooooo..........",
  "....ooHHSHHLLoo.......",
  "...oHHHHSHHHLLLo......",
  "..ohHHHHSHHHHHLLo.....",
  "..ohhHHHHSHHHHHLo.....",
  ".ohhhHHHHHHHHkkkoFo...",
  ".ohhhHHHHHHHkVVkFFFo..",
  ".ohhhhHHHHHHkbbkkFo...",
  ".ohhhhHHHHHHkKkkFFFo..",
  "..ohhhhhHHHoKkkMFo....",
  "...oohhhhhooKKoo......",
  ".....NNNNnnNNNN.......",
  "...ooDDJJJJJJJJDDoo...",
  "..oDDJJJJJJJJJJJJDDo..",
  ".osjJJJJJJJJJJJJJJsso.",
  ".ossjJJJJJJJJJJJJjsso.",
  ".oaajJJJJJJJJJJJJjaao.",
  ".oaajJJJJJJJJJJJJjaao.",
  ".ottjJJJJJJJJJJJJjtto.",
  ".oaajjJJJJJJJJJJjjaao.",
  ".owwojjjjjjjjjjjjowwo.",
  ".oggoBBBBBBBBBBBBoggo.",
  "..oo.oPPPPPRRPPPo.oo..",
  ".....oTPPPPRRPPTo.....",
  ".....oTPPPpRRpPTo.....",
  ".....oTPPPo..oPPTo....",
  ".....oTPPPo..oPPTo....",
  ".....oyyyyo..oyyyo....",
  ".....oyyyyo..oyyyo....",
  ".....oXXXXo..oXXXo....",
  ".....oXXXXo..oXXXo....",
  "....oCCCCCCo.oCCCCCo..",
  "....oooooooo.ooooooo..",
];
const SW = 22, SH = SPRITE.length, HEAD_ROWS = 11;
// 3x5 pixel digits for the jersey number.
const DIGITS = { 0: ["111", "101", "101", "101", "111"], 1: ["010", "110", "010", "010", "111"], 2: ["111", "001", "111", "100", "111"], 3: ["111", "001", "011", "001", "111"], 4: ["101", "101", "111", "001", "001"], 5: ["111", "100", "111", "001", "111"], 6: ["111", "100", "111", "101", "111"], 7: ["111", "001", "010", "010", "010"], 8: ["111", "101", "111", "101", "111"], 9: ["111", "101", "111", "001", "111"] };
const shade = (hex, f) => {
  const n = parseInt((hex || "#888888").replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  const ch = (v) => Math.round(Math.max(0, Math.min(255, f >= 0 ? v + (255 - v) * f : v * (1 + f))));
  return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
};

export default function PlayerFigure({ p, t, away = false, flip = false, h = 180, label = true }) {
  if (!p || !t) return null;
  const g = gearFor(p);
  const clr = t.clr || "#334155", ac = t.ac || "#e2e8f0";
  const tc = (c) => (c === "team" ? clr : c);
  const skin = p.face?.sk || "#c68642";
  const J = away ? "#f1f5f9" : clr, trim = away ? clr : ac;
  const pants = away ? clr : "#e5e7eb", stripe = away ? "#f1f5f9" : ac;
  const sock = away ? clr : "#f1f5f9";
  const visor = { clear: "#bfdbfe", smoke: "#0f172a", iridescent: "#a855f7" }[g.visor];
  const arm = (front) => (g.sleeves === "both" || (g.sleeves === "one" && front) ? tc(g.sleeveClr) : skin);
  const glove = (front) => (g.gloves === "both" || (g.gloves === "one" && front) ? tc(g.gloveClr) : skin);
  const col = (ch, x, y) => {
    const front = x >= SW / 2;
    switch (ch) {
      case "o": return "#0b1020";
      case "H": return clr; case "h": return shade(clr, -0.32); case "L": return shade(clr, 0.4); case "S": return ac;
      case "k": case "n": return skin; case "K": return shade(skin, -0.22); case "E": return "#111";
      case "V": return visor || (x === 14 ? "#111" : skin);
      case "b": return g.eyeBlack !== "none" ? "#111" : skin;
      case "F": return "#cbd5e1"; case "M": return g.mask === "cage" || g.mask === "bar3" ? "#cbd5e1" : skin;
      case "N": return g.neckRoll ? (away ? clr : "#e5e7eb") : null;
      case "J": return J; case "j": return shade(J, -0.22); case "D": return trim; case "s": return front ? J : shade(J, -0.22);
      case "a": return front ? arm(true) : shade(arm(false), -0.15);
      case "t": return g.armTape && arm(front) === skin ? "#f8fafc" : front ? arm(true) : shade(arm(false), -0.15);
      case "w": return g.wristbands ? tc(g.bandClr) : front ? arm(true) : shade(arm(false), -0.15);
      case "g": return glove(front);
      case "B": return "#111827";
      case "P": return pants; case "p": return shade(pants, -0.18); case "T": return stripe;
      case "R": return g.towel ? "#f8fafc" : pants;
      case "y": return g.socks === "high" ? sock : skin; case "X": return sock;
      case "C": return tc(g.cleats);
      default: return null;
    }
  };
  const num = String(jerseyNum(p)).slice(0, 2);
  const numClr = away ? clr : "#f8fafc";
  const fx = (x) => (flip ? SW - 1 - x : x);
  const rects = (from, to) => {
    const out = [];
    for (let y = from; y < to; y++) for (let x = 0; x < SW; x++) {
      const c = col(SPRITE[y][x], x, y);
      if (c) out.push(<rect key={`${x}-${y}`} x={fx(x)} y={y} width="1.02" height="1.02" fill={c} />);
    }
    return out;
  };
  // The number on his chest (never mirrored).
  const digits = [];
  const left = 11 - (num.length * 4 - 1) / 2 + (flip ? -1 : 0);
  [...num].forEach((d, i) => DIGITS[d].forEach((row, ry) => [...row].forEach((on, rx) => { if (on === "1") digits.push(<rect key={`n${i}-${rx}-${ry}`} x={Math.round(left) + i * 4 + rx} y={14 + ry} width="1.02" height="1.02" fill={numClr} />); })));
  const id = `pf${hash(p.id) % 100000}`;
  const delay = `${(-g.sway * 1.2).toFixed(2)}s`;
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}>
      <svg viewBox={`-1 -2 ${SW + 2} ${SH + 4}`} width={h * ((SW + 2) / (SH + 4))} height={h} shapeRendering="crispEdges" role="img" aria-label={`${p.name}, #${num}`} style={{ imageRendering: "pixelated", overflow: "visible" }}>
        <style>{`
          .${id}h { animation: ${id}b 1.2s steps(1, end) infinite; animation-delay: ${delay}; }
          @keyframes ${id}b { 0% { transform: translateY(0); } 50% { transform: translateY(0.6px); } }
          @media (prefers-reduced-motion: reduce) { .${id}h { animation: none; } }
        `}</style>
        <ellipse cx={SW / 2} cy={SH + 0.3} rx="8" ry="1.3" fill="#0007" shapeRendering="auto" />
        <g>{rects(HEAD_ROWS, SH)}{digits}</g>
        <g className={`${id}h`}>{rects(0, HEAD_ROWS)}</g>
      </svg>
      {label && <div style={{ fontSize: Math.max(10, Math.round(h / 15)), fontWeight: 800, color: "#e2e8f0", marginTop: 2, whiteSpace: "nowrap", textAlign: "center" }}>{(p.name || "").split(" ").slice(1).join(" ") || p.name} <span style={{ color: "#94a3b8", fontWeight: 700 }}>{p.pos} {p.ovr}</span></div>}
    </div>
  );
}

// A club's best healthy player (kickers and punters aside).
export const starOf = (t) => [...(t?.roster || [])].filter((p) => !p.injured && !p.holdout && p.pos !== "K" && p.pos !== "P").sort((a, b) => (b.ovr || 0) - (a.ovr || 0))[0] || null;
