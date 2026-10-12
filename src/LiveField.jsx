// The live-game field: both teams' starters lined up in formation at the line of scrimmage,
// redrawn (and slid into place) after every play. Offense drives left to right.
import React from "react";
import { depthOrderFor } from "./DepthChart.jsx";
import SpritePlayer from "./pixel/SpritePlayer.jsx";
import { snapPose, celebrationPose, SPRITES as ART } from "./pixel/sprites.js";
import { UNIFORMS, teamKey, uniformFor } from "./teamUniforms.js";
import { logoUrl } from "./ui.jsx";
import { MOBILE } from "./mobile.js";

const FORMATION = {
  // [pos, depth index, yards behind (-) / past (+) the line, yards from the middle].
  // Spacing is stretched a little past real life so every player stays readable.
  off: [["LT", 0, -2, -11], ["LG", 0, -2, -5.5], ["C", 0, -2, 0], ["RG", 0, -2, 5.5], ["RT", 0, -2, 11], ["TE", 0, -2.5, 16.5],
    ["WR", 0, -2, -24], ["WR", 1, -2, 24], ["WR", 2, -3.5, -17.5], ["QB", 0, -8, 0], ["RB", 0, -8.5, 5]],
  def: [["DL", 0, 2, -9], ["DL", 1, 2, -3], ["DL", 2, 2, 3], ["DL", 3, 2, 9], ["LB", 0, 7.5, -14], ["LB", 1, 7.5, 0], ["LB", 2, 7.5, 14],
    ["CB", 0, 8, -23.5], ["CB", 1, 8, 23.5], ["S", 0, 15, -9], ["S", 1, 15, 9]],
};
const W = 800, H = 360, EZ = 60;
const xOf = (yard) => EZ + (yard / 100) * (W - 2 * EZ);
const yOf = (lat) => H / 2 + lat * (H / 53.3);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// A team's healthy starters at each position: the order the game engine is playing (snap
// share first), or the depth chart if none is given.
function starters(team, depth, order) {
  const healthy = (team?.roster || []).filter((p) => !p.injured && !p.holdout && !p.suspended);
  const by = {};
  for (const pos of ["QB", "RB", "WR", "TE", "LT", "LG", "C", "RG", "RT", "DL", "LB", "CB", "S"]) by[pos] = order ? order(pos) : depthOrderFor(healthy, depth, pos);
  return by;
}

// One player: a pixel-art sprite in his team's uniform, posed for the snap (linemen down in a
// three-point stance, the quarterback with the ball, defenders in a ready stance). After a
// touchdown the scoring team's backs and receivers celebrate. Offense faces right, defense left.
// Pixel-art players are built but switched off until they're approved; circles until then.
const SPRITE_SCALE = 0.25; // every pose drawn at the same pixel size
const SPRITES = typeof location !== "undefined" && /[?&]sprites=1\b/.test(location.search); // off unless ?sprites=1
const uni = (team, away) => uniformFor(team, { away });
const SHOW_NAME = { off: new Set(["QB", "RB", "WR", "TE"]), def: new Set(MOBILE ? [] : ["CB", "S"]) };
function Player({ p, pos, x, y, team, side, away, td }) {
  const last = p ? p.name.split(" ").slice(1).join(" ") || p.name : pos;
  if (!SPRITES) return (
    <g style={{ transform: `translate(${x}px, ${y}px)`, transition: "transform .55s ease" }}>
      <title>{p ? `${pos} ${p.name} (${p.ovr})` : pos}</title>
      {/* the jersey (home color or road white), ringed in the helmet color, number in the club's number color */}
      <ellipse cx="1.5" cy="3" rx="11" ry="10" fill="#000" opacity=".28" />
      <circle r="10.5" fill={uni(team, away).jersey} stroke={uni(team, away).helmet} strokeWidth="2.6" />
      <circle r="7.9" fill="none" stroke="#fff" strokeOpacity=".18" strokeWidth="1" />
      <text y="4" textAnchor="middle" fontSize="11" fontWeight="900" fill={uni(team, away).number} stroke={uni(team, away).numberEdge} strokeWidth=".9" paintOrder="stroke">{p?.num ?? pos}</text>
      {/* names only where they help (the ball handlers and receivers, and on desktop the secondary
          covering them); linemen are just numbers so the fronts don't turn into a pile of text.
          Names hang away from the line of scrimmage so the two sides never overlap. */}
      {SHOW_NAME[side].has(pos) && <text x={side === "off" ? 8 : -8} y="21" textAnchor={side === "off" ? "end" : "start"} fontSize="8.5" fontWeight="700" fill="#fff" stroke="#0009" strokeWidth="2.5" paintOrder="stroke">{last.length > 10 ? `${last.slice(0, 9)}.` : last}</text>}
    </g>
  );
  const pose = (side === "off" && td && celebrationPose(pos)) || snapPose(pos, side);
  const hgt = (ART[pose] || ART.DB).h * SPRITE_SCALE;
  return (
    <g style={{ transform: `translate(${x}px, ${y}px)`, transition: "transform .55s ease" }}>
      <SpritePlayer x={0} y={Math.round(hgt * 0.5)} height={hgt} pose={pose} team={team} away={away} number={p?.num} skin={p?.face?.sk} facing={side === "off" ? "right" : "left"} title={p ? `${pos} ${p.name} (${p.ovr})` : pos} />
    </g>
  );
}

export default function LiveField({ ballYard, toGo, off, def, offHome = true, offDepth, defDepth, offOrder, defOrder, lastPlay }) {
  const los = clamp(ballYard, 1, 99);
  const x0 = xOf(los);
  const o = starters(off, offDepth, offOrder), d = starters(def, defDepth, defOrder);
  // the visitors wear white, unless the home team wears white at home (Dallas): then they wear color
  const home = offHome ? off : def, homeWhite = !!UNIFORMS[teamKey(home)]?.whiteHome;
  const awayFor = (side) => (homeWhite ? false : side === "off" ? !offHome : offHome);
  const place = (side, list, team) =>
    FORMATION[side].map(([pos, i, dx, lat]) => {
      // with sprites, set each line's depth so the two rows of helmets meet evenly over the ball
      if (SPRITES && ["LT", "LG", "C", "RG", "RT"].includes(pos)) dx = -1.5;
      if (SPRITES && pos === "DL") dx = 4.8;
      if (SPRITES && pos === "LB") dx = 9.5;
      if (SPRITES && pos === "RB") lat = 7;
      const x = clamp(xOf(los + dx), 20, W - 20), y = clamp(yOf(lat), SPRITES ? 26 : 22, H - (SPRITES ? 26 : 34));
      return <Player key={`${side}${pos}${i}`} p={list[pos]?.[i]} pos={pos} x={x} y={y} team={team} side={side} away={awayFor(side)} td={!!lastPlay?.td} />;
    });
  return (
    <svg viewBox={MOBILE ? `${clamp(x0 - 250, 0, W - 500)} 0 500 ${H}` : `0 0 ${W} ${H}`} width="100%" style={{ display: "block", borderRadius: 10, maxHeight: MOBILE ? "none" : "min(46vh, 420px)", transition: "all .4s ease" }}>
      <defs>
        {/* turf grain: fine noise over the grass */}
        <filter id="lf-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .55 -.2" />
        </filter>
        <linearGradient id="lf-shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity=".18" /><stop offset=".25" stopColor="#000" stopOpacity="0" />
          <stop offset=".75" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".22" />
        </linearGradient>
        {/* painted on the grass: a white border around the logo, like a real midfield logo */}
        <filter id="lf-paint" x="-10%" y="-10%" width="120%" height="120%">
          <feMorphology in="SourceAlpha" operator="dilate" radius="2.2" result="d" />
          <feFlood floodColor="#fff" result="w" /><feComposite in="w" in2="d" operator="in" result="edge" />
          <feMerge><feMergeNode in="edge" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* mowed stripes, five yards each, running through the end zones */}
      {[...Array(24)].map((_, i) => <rect key={`e${i}`} x={i < 12 ? i * (EZ / 12) : W - EZ + (i - 12) * (EZ / 12)} y="0" width={EZ / 12 + 0.5} height={H} fill={i % 2 ? "#2f8a3a" : "#287c33"} />)}
      {[...Array(20)].map((_, i) => <rect key={i} x={xOf(i * 5)} y="0" width={xOf(5) - xOf(0) + 0.5} height={H} fill={i % 2 ? "#2f8a3a" : "#287c33"} />)}
      {/* end zones: plain grass with the club's wordmark painted big across it (club color, white
          outline), its logo painted at each end, and orange pylons at the four corners */}
      {[[0, off, -90], [W - EZ, def, 90]].map(([x, t, rot], i) => t && (
        <g key={i}>
          <text x={x + EZ / 2} y={H / 2} fill={t.clr || "#334155"} fontSize="34" fontWeight="900" fontFamily="'Arial Black', Arial, sans-serif" textAnchor="middle" dominantBaseline="central" textLength={H - 120} lengthAdjust="spacingAndGlyphs" stroke="#fff" strokeWidth="2.5" paintOrder="stroke" opacity=".92" transform={`rotate(${rot} ${x + EZ / 2} ${H / 2})`}>{(t.name || "").toUpperCase()}</text>
          {[30, H - 30].map((cy) => <image key={cy} href={logoUrl(t.ab)} x={x + EZ / 2 - 16} y={cy - 16} width="32" height="32" opacity=".5" filter="url(#lf-paint)" transform={`rotate(${rot} ${x + EZ / 2} ${cy})`} />)}
        </g>
      ))}
      {/* the home club's logo at midfield */}
      {(offHome ? off : def)?.ab && <image href={logoUrl((offHome ? off : def).ab)} x={W / 2 - 44} y={H / 2 - 44} width="88" height="88" opacity=".26" filter="url(#lf-paint)" />}
      <rect x="0" y="0" width={W} height={H} filter="url(#lf-grain)" opacity=".55" />
      {/* yard lines every five, goal lines heavier */}
      {[...Array(21)].map((_, i) => <line key={i} x1={xOf(i * 5)} y1="0" x2={xOf(i * 5)} y2={H} stroke="#fff" strokeOpacity={i % 20 === 0 ? 0.95 : i % 2 ? 0.4 : 0.7} strokeWidth={i % 20 === 0 ? 3 : i % 2 ? 1.2 : 1.8} />)}
      {/* hash marks every yard: along both sidelines and the two inbound rows */}
      {[...Array(99)].map((_, i) => (i + 1) % 5 !== 0 && <g key={i} stroke="#fff" strokeOpacity=".55" strokeWidth="1">
        <line x1={xOf(i + 1)} y1="2" x2={xOf(i + 1)} y2="9" /><line x1={xOf(i + 1)} y1={H - 9} x2={xOf(i + 1)} y2={H - 2} />
        <line x1={xOf(i + 1)} y1={yOf(-3.1) - 3} x2={xOf(i + 1)} y2={yOf(-3.1) + 3} /><line x1={xOf(i + 1)} y1={yOf(3.1) - 3} x2={xOf(i + 1)} y2={yOf(3.1) + 3} />
      </g>)}
      {/* numbers, upright at the bottom and upside down at the top, like a real field */}
      {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((y) => (
        <g key={y} fill="#fff" fillOpacity=".8" fontSize="20" fontWeight="900" textAnchor="middle" fontFamily="'Arial Black', Arial, sans-serif">
          <text x={xOf(y)} y={H - 16}>{y <= 50 ? y : 100 - y}</text>
          <text x={xOf(y)} y={30} transform={`rotate(180 ${xOf(y)} 23)`}>{y <= 50 ? y : 100 - y}</text>
        </g>
      ))}
      <rect x="0" y="0" width={W} height={H} fill="url(#lf-shade)" />
      <rect x="1" y="1" width={W - 2} height={H - 2} fill="none" stroke="#fff" strokeOpacity=".85" strokeWidth="2" rx="9" />
      {[2, EZ - 3, W - EZ - 3, W - 8].flatMap((x) => [2, H - 8].map((y) => <rect key={`${x}-${y}`} x={x} y={y} width="6" height="6" rx="1" fill="#f97316" stroke="#7c2d12" strokeWidth=".6" />))}
      {/* line of scrimmage and the line to gain, with a soft glow */}
      <line x1={x0} y1="0" x2={x0} y2={H} stroke="#3b82f6" strokeWidth="8" strokeOpacity=".25" />
      <line x1={x0} y1="0" x2={x0} y2={H} stroke="#60a5fa" strokeWidth="3" />
      {toGo > 0 && los + toGo < 100 && <><line x1={xOf(los + toGo)} y1="0" x2={xOf(los + toGo)} y2={H} stroke="#facc15" strokeWidth="8" strokeOpacity=".25" /><line x1={xOf(los + toGo)} y1="0" x2={xOf(los + toGo)} y2={H} stroke="#fde047" strokeWidth="3" /></>}
      {place("def", d, def)}
      {place("off", o, off)}
      {!SPRITES && <ellipse cx={x0 - 4} cy={H / 2} rx="7" ry="4.5" fill="#8B4513" stroke="#fff" strokeWidth="1" style={{ transition: "cx .55s ease" }} />}
      {lastPlay?.td && <text x={W / 2} y={H / 2 - 40} textAnchor="middle" fill="#facc15" fontSize="54" fontWeight="900" stroke="#000" strokeWidth="3" paintOrder="stroke">TOUCHDOWN!</text>}
      {lastPlay?.type === "int" && <text x={W / 2} y={H / 2 - 40} textAnchor="middle" fill="#ef4444" fontSize="44" fontWeight="900" stroke="#000" strokeWidth="3" paintOrder="stroke">INTERCEPTED!</text>}
    </svg>
  );
}
