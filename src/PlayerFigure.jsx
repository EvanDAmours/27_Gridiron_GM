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

const shade = (hex, f) => {
  const n = parseInt((hex || "#888888").replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  const ch = (v) => Math.round(Math.max(0, Math.min(255, f >= 0 ? v + (255 - v) * f : v * (1 + f))));
  return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
};

// A glossy vinyl-figure look: smooth rounded shapes, every surface lit from the upper left so it
// reads as 3D next to the logos. Proportions are toy-like (the helmet a little big) but not a bobblehead.
export default function PlayerFigure({ p, t, away = false, h = 180, label = true }) {
  if (!p || !t) return null;
  const g = gearFor(p);
  const clr = t.clr || "#334155", ac = t.ac || "#e2e8f0";
  const tc = (c) => (c === "team" ? clr : c);
  const skin = p.face?.sk || "#c68642";
  const J = away ? "#eef2f7" : clr, trim = away ? clr : ac;
  const pants = away ? clr : "#e8ecf2", stripe = away ? "#eef2f7" : ac;
  const sock = away ? clr : "#eef2f7";
  const big = BIG.has(p.pos), skill = SKILL.has(p.pos);
  const w = big ? 1.12 : skill ? 0.95 : 1;
  const id = `pf${hash(p.id) % 100000}`;
  const u = (k) => `url(#${id}${k})`;
  const num = String(jerseyNum(p)).slice(0, 2);
  const delay = `${(-g.sway * 3).toFixed(2)}s`;
  const lin = (k, c, a = -0.3, b = 0.22) => (
    <linearGradient id={`${id}${k}`} x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stopColor={shade(c, a)} /><stop offset=".35" stopColor={shade(c, b)} /><stop offset=".65" stopColor={c} /><stop offset="1" stopColor={shade(c, a - 0.08)} />
    </linearGradient>
  );
  const rad = (k, c) => (
    <radialGradient id={`${id}${k}`} cx=".36" cy=".3" r=".75">
      <stop offset="0" stopColor={shade(c, 0.45)} /><stop offset=".45" stopColor={c} /><stop offset="1" stopColor={shade(c, -0.42)} />
    </radialGradient>
  );
  const sleeveOn = (side) => g.sleeves === "both" || (g.sleeves === "one" && side === "R");
  const gloveOn = (side) => g.gloves === "both" || (g.gloves === "one" && side === "R");
  const armFill = (side) => (sleeveOn(side) ? u(`sl`) : u("sk"));
  const Arm = ({ side }) => {
    const x = side === "L" ? 17 : 89; // left edge of the arm
    return (
      <g className={`${id}${side}`} style={{ transformOrigin: `${x + 7}px 64px` }}>
        <rect x={x} y="60" width="14" height="58" rx="7" fill={armFill(side)} />
        {g.armTape && !sleeveOn(side) && <><rect x={x} y="93" width="14" height="3" fill="#f8fafc" /><rect x={x} y="99" width="14" height="2.4" fill="#f8fafc" /></>}
        {g.wristbands && <rect x={x - 0.5} y="106" width="15" height="7" rx="2.5" fill={tc(g.bandClr)} />}
        <circle cx={x + 7} cy="121" r="8" fill={gloveOn(side) ? u("gl") : u("sk")} />
        <rect x={x - 2} y="56" width="18" height="20" rx="8" fill={u("je")} />
        <rect x={x - 2} y="70" width="18" height="3" fill={trim} opacity=".9" />
      </g>
    );
  };
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}>
      <svg viewBox="0 0 120 200" width={h * 0.6} height={h} role="img" aria-label={`${p.name}, #${num}`} style={{ overflow: "visible" }}>
        <style>{`
          .${id} { animation: ${id}b 3s ease-in-out infinite; animation-delay: ${delay}; transform-origin: 60px 196px; }
          .${id}hd { animation: ${id}t 3s ease-in-out infinite; animation-delay: ${delay}; transform-origin: 60px 52px; }
          .${id}L { animation: ${id}l 3s ease-in-out infinite; animation-delay: ${delay}; }
          .${id}R { animation: ${id}r 3s ease-in-out infinite; animation-delay: ${delay}; }
          @keyframes ${id}b { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-1.4px); } }
          @keyframes ${id}t { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(-2deg); } }
          @keyframes ${id}l { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(3deg); } }
          @keyframes ${id}r { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(-3deg); } }
          @media (prefers-reduced-motion: reduce) { .${id}, .${id}hd, .${id}L, .${id}R { animation: none; } }
        `}</style>
        <defs>
          {rad("hm", clr)}{rad("sk", skin)}{rad("gl", tc(g.gloveClr))}{rad("cl", tc(g.cleats))}
          {lin("je", J)}{lin("pa", pants, -0.25, 0.2)}{lin("so", sock, -0.25, 0.2)}{lin("sl", tc(g.sleeveClr))}
          <linearGradient id={`${id}vi`} x1="0" x2="1"><stop offset="0" stopColor="#f59e0b" /><stop offset=".5" stopColor="#a855f7" /><stop offset="1" stopColor="#22d3ee" /></linearGradient>
        </defs>
        <ellipse cx="60" cy="193" rx="34" ry="5" fill="#000" opacity=".35" />
        <g className={id}>
          <g transform={`translate(60 0) scale(${w} 1) translate(-60 0)`}>
            {/* legs */}
            <rect x="38" y="116" width="44" height="18" rx="6" fill={u("pa")} />
            <rect x="38" y="122" width="20" height="44" rx="8" fill={u("pa")} />
            <rect x="62" y="122" width="20" height="44" rx="8" fill={u("pa")} />
            <rect x="39" y="124" width="2.6" height="38" rx="1.3" fill={stripe} /><rect x="78.4" y="124" width="2.6" height="38" rx="1.3" fill={stripe} />
            {g.socks === "low" && <><rect x="41" y="160" width="14" height="14" fill={u("sk")} /><rect x="65" y="160" width="14" height="14" fill={u("sk")} /></>}
            <rect x="40" y={g.socks === "high" ? 156 : 170} width="16" height={g.socks === "high" ? 26 : 12} rx="5" fill={u("so")} />
            <rect x="64" y={g.socks === "high" ? 156 : 170} width="16" height={g.socks === "high" ? 26 : 12} rx="5" fill={u("so")} />
            <rect x="35" y="179" width="24" height="11" rx="5.5" fill={u("cl")} />
            <rect x="61" y="179" width="24" height="11" rx="5.5" fill={u("cl")} />
            {/* arms (behind the pads) */}
            <Arm side="L" /><Arm side="R" />
            {/* torso: jersey over shoulder pads */}
            {g.neckRoll && <rect x="42" y="48" width="36" height="11" rx="5.5" fill={away ? clr : "#e8ecf2"} />}
            <path d="M30 60 Q30 50 44 50 L76 50 Q90 50 90 60 L86 120 Q60 124 34 120 Z" fill={u("je")} />
            <path d="M33 54 Q46 48 60 50 Q74 48 87 54" fill="none" stroke={trim} strokeWidth="3.4" strokeLinecap="round" />
            <ellipse cx="46" cy="62" rx="10" ry="4" fill="#fff" opacity=".18" />
            <rect x="35" y="114" width="50" height="7" rx="3" fill="#1f2937" />
            {g.towel && <rect x="63" y="119" width="9" height="22" rx="3" fill="#f8fafc" />}
            <text x="60" y="101" textAnchor="middle" fontSize="30" fontWeight="900" fontFamily="'Arial Black', Impact, sans-serif" fill={away ? clr : "#f8fafc"} stroke={away ? ac : trim} strokeWidth="1.6" paintOrder="stroke">{num}</text>
          </g>
          {/* head: helmet, face, facemask */}
          <g className={`${id}hd`}>
            <rect x="53" y="42" width="14" height="12" rx="4" fill={u("sk")} />
            <circle cx="60" cy="29" r="23" fill={u("hm")} />
            <path d="M60 6.5 Q61.5 18 60 30" stroke={ac} strokeWidth="4.5" fill="none" strokeLinecap="round" />
            <ellipse cx="60" cy="36" rx="13.5" ry="13" fill={u("sk")} />
            <circle cx="55" cy="34" r="1.9" fill="#111" /><circle cx="65" cy="34" r="1.9" fill="#111" />
            <circle cx="55.6" cy="33.4" r=".6" fill="#fff" /><circle cx="65.6" cy="33.4" r=".6" fill="#fff" />
            <path d="M56 42 Q60 44.5 64 42" stroke="#5b3a29" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            {g.eyeBlack === "stripes" && <><rect x="51.5" y="37" width="7" height="2.4" rx="1.2" fill="#111" /><rect x="61.5" y="37" width="7" height="2.4" rx="1.2" fill="#111" /></>}
            {g.eyeBlack === "sticker" && <><rect x="51" y="36.5" width="8" height="3.6" rx="1" fill="#111" /><rect x="61" y="36.5" width="8" height="3.6" rx="1" fill="#111" /></>}
            {g.visor !== "none" && <rect x="47" y="28.5" width="26" height="10" rx="4" fill={g.visor === "iridescent" ? `url(#${id}vi)` : g.visor === "smoke" ? "#0f172a" : "#dbeafe"} opacity={g.visor === "clear" ? 0.4 : 0.9} />}
            <g stroke="#d1d5db" strokeWidth="2.2" fill="none" strokeLinecap="round">
              <path d="M44 39 Q60 47 76 39" />
              {g.mask !== "open" && <path d="M46 45 Q60 52 74 45" />}
              {(g.mask === "bar3" || g.mask === "cage") && <path d="M49 50 Q60 55 71 50" />}
              {g.mask === "cage" && <><line x1="60" y1="40" x2="60" y2="53" /><line x1="53" y1="41" x2="53" y2="51" /><line x1="67" y1="41" x2="67" y2="51" /></>}
            </g>
            <ellipse cx="50" cy="17" rx="9" ry="5" fill="#fff" opacity=".35" transform="rotate(-25 50 17)" />
          </g>
        </g>
      </svg>
      {label && <div style={{ fontSize: Math.max(10, Math.round(h / 15)), fontWeight: 800, color: "#e2e8f0", marginTop: 2, whiteSpace: "nowrap", textAlign: "center" }}>{(p.name || "").split(" ").slice(1).join(" ") || p.name} <span style={{ color: "#94a3b8", fontWeight: 700 }}>{p.pos} {p.ovr}</span></div>}
    </div>
  );
}

// A club's best healthy player (kickers and punters aside).
export const starOf = (t) => [...(t?.roster || [])].filter((p) => !p.injured && !p.holdout && p.pos !== "K" && p.pos !== "P").sort((a, b) => (b.ovr || 0) - (a.ovr || 0))[0] || null;
