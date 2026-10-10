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

export default function PlayerFigure({ p, t, away = false, h = 180, label = true }) {
  if (!p || !t) return null;
  const g = gearFor(p);
  const clr = t.clr || "#334155", ac = t.ac || "#e2e8f0";
  const tc = (c) => (c === "team" ? clr : c);
  const skin = p.face?.sk || "#c68642";
  const jersey = away ? "#f8fafc" : clr, numClr = away ? clr : "#f8fafc", numStroke = away ? ac : ac;
  const pants = away ? clr : "#f1f5f9";
  const sockClr = away ? clr : "#f8fafc";
  const big = BIG.has(p.pos), skill = SKILL.has(p.pos);
  const w = big ? 1.14 : skill ? 0.94 : 1; // build
  const id = `pf${hash(p.id) % 100000}`;
  const delay = `${(-g.sway * 3).toFixed(2)}s`;
  const arm = (x1, x2, side) => {
    const sleeve = g.sleeves === "both" || (g.sleeves === "one" && side === "L");
    const glove = g.gloves === "both" || (g.gloves === "one" && side === "R");
    return (
      <g className={`${id}-arm${side}`} style={{ transformOrigin: `${x1}px 64px` }}>
        <line x1={x1} y1={66} x2={x2} y2={118} stroke={skin} strokeWidth={14 * w} strokeLinecap="round" />
        {sleeve && <line x1={x1 + (x2 - x1) * 0.35} y1={84} x2={x2} y2={116} stroke={tc(g.sleeveClr)} strokeWidth={14.5 * w} strokeLinecap="round" />}
        {g.armTape && !sleeve && <><line x1={x1 + (x2 - x1) * 0.62} y1={98} x2={x1 + (x2 - x1) * 0.7} y2={102} stroke="#f8fafc" strokeWidth={14.6 * w} /><line x1={x1 + (x2 - x1) * 0.76} y1={105} x2={x1 + (x2 - x1) * 0.8} y2={107} stroke="#f8fafc" strokeWidth={14.6 * w} /></>}
        {g.wristbands && <line x1={x1 + (x2 - x1) * 0.9} y1={111} x2={x2} y2={116} stroke={tc(g.bandClr)} strokeWidth={15 * w} />}
        <circle cx={x2} cy={124} r={7.5 * w} fill={glove ? tc(g.gloveClr) : skin} stroke="#0003" strokeWidth={0.6} />
        {/* jersey sleeve over the shoulder */}
        <line x1={x1} y1={64} x2={x1 + (x2 - x1) * 0.22} y2={78} stroke={jersey} strokeWidth={18 * w} strokeLinecap="round" />
      </g>
    );
  };
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}>
      <svg viewBox="0 0 120 214" width={h * (120 / 214)} height={h} role="img" aria-label={`${p.name}, #${jerseyNum(p)}`} style={{ overflow: "visible" }}>
        <style>{`
          .${id} { animation: ${id}b 3.2s ease-in-out infinite; animation-delay: ${delay}; transform-origin: 60px 200px; }
          .${id}-armL { animation: ${id}l 3.2s ease-in-out infinite; animation-delay: ${delay}; }
          .${id}-armR { animation: ${id}r 3.2s ease-in-out infinite; animation-delay: ${delay}; }
          @keyframes ${id}b { 0%,100% { transform: translateY(0) scaleY(1); } 50% { transform: translateY(-1.2px) scaleY(1.008); } }
          @keyframes ${id}l { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(2.5deg); } }
          @keyframes ${id}r { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(-2.5deg); } }
          @media (prefers-reduced-motion: reduce) { .${id}, .${id}-armL, .${id}-armR { animation: none; } }
        `}</style>
        <defs>
          <linearGradient id={`${id}iri`} x1="0" x2="1"><stop offset="0" stopColor="#f59e0b" /><stop offset=".5" stopColor="#a855f7" /><stop offset="1" stopColor="#22d3ee" /></linearGradient>
        </defs>
        <ellipse cx="60" cy="206" rx="34" ry="5" fill="#0006" />
        <g className={id} transform={`translate(60 0) scale(${w} 1) translate(-60 0)`}>
          {/* legs: pants, socks, cleats */}
          <path d="M36 116 L84 116 L82 168 L62 168 L60 134 L58 168 L38 168 Z" fill={pants} />
          <line x1="39" y1="122" x2="40" y2="166" stroke={ac} strokeWidth="2" opacity=".8" />
          <line x1="81" y1="122" x2="80" y2="166" stroke={ac} strokeWidth="2" opacity=".8" />
          <rect x="41.5" y={g.socks === "high" ? 166 : 182} width="15" height={g.socks === "high" ? 30 : 14} rx="3" fill={sockClr} />
          <rect x="63.5" y={g.socks === "high" ? 166 : 182} width="15" height={g.socks === "high" ? 30 : 14} rx="3" fill={sockClr} />
          {g.socks === "low" && <><rect x="42" y="166" width="14" height="16" fill={skin} /><rect x="64" y="166" width="14" height="16" fill={skin} /></>}
          <ellipse cx="48" cy="200" rx="11" ry="5.5" fill={tc(g.cleats)} stroke="#0005" strokeWidth=".6" />
          <ellipse cx="72" cy="200" rx="11" ry="5.5" fill={tc(g.cleats)} stroke="#0005" strokeWidth=".6" />
          {/* arms behind the torso */}
          {arm(30, 21, "L")}
          {arm(90, 99, "R")}
          {/* torso: shoulder pads and jersey */}
          {g.neckRoll && <rect x="44" y="50" width="32" height="8" rx="4" fill={away ? clr : "#f8fafc"} />}
          <path d="M24 64 Q24 50 44 52 L76 52 Q96 50 96 64 L88 120 L32 120 Z" fill={jersey} stroke="#0003" strokeWidth=".8" />
          <path d="M24 64 Q25 55 38 54" fill="none" stroke={away ? clr : ac} strokeWidth="3" />
          <path d="M96 64 Q95 55 82 54" fill="none" stroke={away ? clr : ac} strokeWidth="3" />
          <rect x="34" y="116" width="52" height="5" rx="1.5" fill="#111827" />
          {g.towel && <rect x="63" y="120" width="8" height="22" rx="2" fill="#f8fafc" stroke="#cbd5e1" strokeWidth=".5" />}
          <text x="60" y="100" textAnchor="middle" fontSize="27" fontWeight="900" fontFamily="Impact, 'Arial Black', sans-serif" fill={numClr} stroke={numStroke} strokeWidth="1.2" paintOrder="stroke">{jerseyNum(p)}</text>
          {/* neck and helmet */}
          <rect x="54" y="44" width="12" height="12" fill={skin} />
          <circle cx="60" cy="31" r="20" fill={away ? "#f8fafc" : clr} stroke="#0004" strokeWidth=".8" />
          <path d="M60 11 L60 22" stroke={ac} strokeWidth="4" />
          <ellipse cx="60" cy="37" rx="11" ry="11" fill={skin} />
          <circle cx="55.5" cy="35" r="1.5" fill="#111" /><circle cx="64.5" cy="35" r="1.5" fill="#111" />
          {g.eyeBlack === "stripes" && <><rect x="52.5" y="38" width="6" height="2.2" rx="1" fill="#111" /><rect x="61.5" y="38" width="6" height="2.2" rx="1" fill="#111" /></>}
          {g.eyeBlack === "sticker" && <><rect x="52" y="37.5" width="7" height="3.4" rx="1" fill="#111" /><rect x="61" y="37.5" width="7" height="3.4" rx="1" fill="#111" /><rect x="53.5" y="38.7" width="4" height="1" fill={ac} /><rect x="62.5" y="38.7" width="4" height="1" fill={ac} /></>}
          {g.visor !== "none" && <rect x="49" y="30" width="22" height="9" rx="3" fill={g.visor === "clear" ? "#e2e8f055" : g.visor === "smoke" ? "#0f172ae6" : `url(#${id}iri)`} opacity={g.visor === "iridescent" ? 0.85 : 1} />}
          {/* facemask */}
          <g stroke="#cbd5e1" strokeWidth="1.6" fill="none" strokeLinecap="round">
            <path d="M47 40 Q60 46 73 40" />
            {g.mask !== "open" && <path d="M48 45 Q60 51 72 45" />}
            {(g.mask === "bar3" || g.mask === "cage") && <path d="M50 49 Q60 53 70 49" />}
            {g.mask === "cage" && <><line x1="60" y1="41" x2="60" y2="52" /><line x1="54" y1="42" x2="54" y2="50" /><line x1="66" y1="42" x2="66" y2="50" /></>}
          </g>
        </g>
      </svg>
      {label && <div style={{ fontSize: Math.max(10, Math.round(h / 15)), fontWeight: 800, color: "#e2e8f0", marginTop: 2, whiteSpace: "nowrap", textAlign: "center" }}>{(p.name || "").split(" ").slice(1).join(" ") || p.name} <span style={{ color: "#94a3b8", fontWeight: 700 }}>{p.pos} {p.ovr}</span></div>}
    </div>
  );
}

// A club's best healthy player (kickers and punters aside).
export const starOf = (t) => [...(t?.roster || [])].filter((p) => !p.injured && !p.holdout && p.pos !== "K" && p.pos !== "P").sort((a, b) => (b.ovr || 0) - (a.ovr || 0))[0] || null;
