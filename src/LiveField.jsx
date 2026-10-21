// The live-game field: both teams' starters lined up in formation at the line of scrimmage,
// redrawn (and slid into place) after every play. Offense drives left to right.
import React from "react";
import { calloutOf } from "./callout.js";
import { depthOrderFor } from "./DepthChart.jsx";
import SpritePlayer from "./pixel/SpritePlayer.jsx";
import { snapPose, celebrationPose, SPRITES as ART } from "./pixel/sprites.js";
import { UNIFORMS, teamKey, uniformFor } from "./teamUniforms.js";
import { logoUrl } from "./ui.jsx";
import lombardiArt from "./assets/lombardi.webp";
import { MOBILE } from "./mobile.js";
import { wxOf } from "./weather.js";
import { themeOf } from "./holidays.js";

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

// Weather on the field (weather.js): snow settles over the grass (more in heavy snow, trampled
// down the middle), rain darkens it with mud between the hashes and puddles, and rain or snow falls
// over the whole field. Positions come from a fixed sequence so nothing jumps between plays.
const rnd = (i, k) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const WX_CSS = `@keyframes lfRain { from { transform: translate(0, -30px) } to { transform: translate(-36px, ${H + 30}px) } }
@keyframes lfPour { from { transform: translate(0, -40px) } to { transform: translate(-90px, ${H + 40}px) } }
@keyframes lfSnow { 0% { transform: translate(0, -10px) } 50% { transform: translate(10px, ${H / 2}px) } 100% { transform: translate(-6px, ${H + 10}px) } }
@keyframes lfBlizzard { 0% { transform: translate(0, -10px) } 50% { transform: translate(-70px, ${H / 2}px) } 100% { transform: translate(-150px, ${H + 10}px) } }
@keyframes lfSplash { 0%, 70% { transform: scale(.1); opacity: 0 } 75% { opacity: .7 } 100% { transform: scale(1); opacity: 0 } }
@keyframes lfGust { 0%,100% { opacity: .14 } 50% { opacity: .26 } }
@media (prefers-reduced-motion: reduce) { .lf-fall * { animation: none !important } }`;
// The ground under rain and snow: illustrated overlays (public/weather/, one per condition) laid
// over the turf with the field's own geometry, under the paint, the players and the falling weather.
const BASE = import.meta.env?.BASE_URL ?? "/";
// where each overlay sits on the field, [x, y, width, height]: full field unless the art was drawn
// on a tighter canvas (heavy snow: its cleared lanes measured against the yard numbers)
const PLACE = { heavySnow: [-12.7, -46.4, 825, 456], lightSnow: [-12.7, -46.4, 825, 456] };
function Ground({ wx, kind }) {
  if (!wx.rain && !wx.snow) return null;
  return (
    <g pointerEvents="none" clipPath="url(#lf-wxclip)">
      <defs><clipPath id="lf-wxclip"><rect x="0" y="0" width={W} height={H} rx="9" /></clipPath></defs>
      {/* rain darkens the whole field a touch: wet grass */}
      {wx.rain && <rect x="0" y="0" width={W} height={H} fill="#041008" opacity={wx.rain === 2 ? 0.24 : 0.14} />}
      {(() => { const [x, y, w, h] = PLACE[kind] || [0, 0, W, H]; return <image href={`${BASE}weather/${kind}.webp`} x={x} y={y} width={w} height={h} preserveAspectRatio="none" />; })()}
    </g>
  );
}
// Holiday touches on the field: Christmas lights strung down both sidelines, a Halloween dusk with
// glowing jack-o'-lanterns at the pylons, autumn leaves blown onto the Thanksgiving sidelines.
const HOL_CSS = `@keyframes lfTw { 0%,100% { opacity: 1 } 50% { opacity: .3 } } @keyframes lfFlick { 0%,100% { opacity: .9 } 40% { opacity: .55 } 70% { opacity: 1 } }`;
function HolidayDecor({ holiday: hk }) {
  // New Year's Eve and Day share one look
  const holiday = themeOf(hk);
  if (holiday === "newyear") return (
    <g pointerEvents="none"><style>{HOL_CSS}</style>
      {/* gold and silver sequins down both sidelines, confetti scattered in the end zones */}
      {[4, H - 4].map((y) => [...Array(40)].map((_, i) => { const c = ["#fbbf24", "#e5e7eb", "#fde68a", "#cbd5e1"][i % 4]; return <g key={`${y}-${i}`} style={{ animation: `lfTw ${0.8 + (i % 4) * 0.3}s ${-(i % 6) * 0.2}s ease-in-out infinite` }}><circle cx={10 + i * ((W - 20) / 39)} cy={y} r="2" fill={c} /><circle cx={10 + i * ((W - 20) / 39)} cy={y} r="5" fill={c} opacity=".3" /></g>; }))}
      {[...Array(28)].map((_, i) => { const x = i < 14 ? 6 + rnd(i, 51) * (EZ - 12) : W - EZ + 6 + rnd(i, 51) * (EZ - 12), y = 14 + rnd(i, 52) * (H - 28); return <rect key={`c${i}`} x={x} y={y} width="3.5" height="6" rx=".8" fill={["#fbbf24", "#e5e7eb", "#fde68a", "#94a3b8"][i % 4]} opacity=".85" transform={`rotate(${rnd(i, 53) * 360} ${x} ${y})`} />; })}
    </g>
  );
  if (holiday === "christmas") return (
    <g pointerEvents="none"><style>{HOL_CSS}</style>
      {[4, H - 4].map((y) => [...Array(32)].map((_, i) => { const c = ["#ef4444", "#22c55e", "#facc15", "#3b82f6"][i % 4]; return <g key={`${y}-${i}`} style={{ animation: `lfTw ${1.2 + (i % 3) * 0.4}s ${-(i % 5) * 0.25}s ease-in-out infinite` }}><circle cx={12 + i * ((W - 24) / 31)} cy={y} r="2.6" fill={c} /><circle cx={12 + i * ((W - 24) / 31)} cy={y} r="6" fill={c} opacity=".3" /></g>; }))}
    </g>
  );
  if (holiday === "halloween") return (
    <g pointerEvents="none"><style>{HOL_CSS}</style>
      <rect x="0" y="0" width={W} height={H} fill="#2e1065" opacity=".22" />
      {[[EZ, 14], [EZ, H - 6], [W - EZ, 14], [W - EZ, H - 6]].map(([x, y], i) => <g key={i} style={{ animation: `lfFlick ${1.6 + i * 0.3}s ease-in-out infinite` }}><circle cx={x} cy={y - 6} r="16" fill="#f97316" opacity=".3" /><text x={x} y={y} fontSize="16" textAnchor="middle">🎃</text></g>)}
    </g>
  );
  if (holiday === "thanksgiving") return (
    <g pointerEvents="none">
      {[...Array(18)].map((_, i) => <text key={i} x={10 + rnd(i, 21) * (W - 20)} y={i % 2 ? 12 + rnd(i, 22) * 8 : H - 4 - rnd(i, 22) * 8} fontSize={9 + rnd(i, 23) * 6} transform={`rotate(${rnd(i, 24) * 360} ${10 + rnd(i, 21) * (W - 20)} ${i % 2 ? 12 : H - 8})`} opacity=".85">{["🍂", "🍁"][i % 2]}</text>)}
    </g>
  );
  return null;
}
// What's falling matches the ground: light rain a fine drizzle, heavy rain a slanting downpour
// with splashes on the turf; light snow gentle flurries, heavy snow a wind-driven blizzard with
// the far side of the field half lost in white.
function Falling({ wx }) {
  if (!wx.rain && !wx.snow) return null;
  const heavy = (wx.rain || wx.snow) === 2;
  if (wx.rain) {
    const n = heavy ? 300 : 45;
    return (
      <g className="lf-fall" pointerEvents="none">
        <style>{WX_CSS}</style>
        {heavy && <rect x="0" y="0" width={W} height={H} fill="#94a3b8" style={{ animation: "lfGust 3s ease-in-out infinite" }} />}
        {[...Array(n)].map((_, i) => {
          const x = rnd(i, 11) * (W + (heavy ? 110 : 40)), dur = heavy ? 0.32 + rnd(i, 12) * 0.2 : 0.7 + rnd(i, 12) * 0.4, delay = -rnd(i, 13) * dur;
          return heavy
            ? <line key={i} x1={x} y1="0" x2={x - 9} y2={22 + rnd(i, 14) * 16} stroke="#e2e8f0" strokeOpacity={0.4 + rnd(i, 15) * 0.4} strokeWidth={1.2 + rnd(i, 16) * 0.8} style={{ animation: `lfPour ${dur}s ${delay}s linear infinite` }} />
            : <line key={i} x1={x} y1="0" x2={x - 2} y2={6 + rnd(i, 14) * 5} stroke="#e2e8f0" strokeOpacity={0.3 + rnd(i, 15) * 0.25} strokeWidth=".9" style={{ animation: `lfRain ${dur}s ${delay}s linear infinite` }} />;
        })}
        {/* splashes where it lands */}
        {heavy && [...Array(28)].map((_, i) => { const dur = 0.9 + rnd(i, 61) * 0.7; return <ellipse key={`sp${i}`} cx={rnd(i, 62) * W} cy={rnd(i, 63) * H} rx="7" ry="2.6" fill="none" stroke="#e2e8f0" strokeWidth="1" style={{ transformBox: "fill-box", transformOrigin: "center", animation: `lfSplash ${dur}s ${-rnd(i, 64) * dur}s ease-out infinite` }} />; })}
      </g>
    );
  }
  const n = heavy ? 320 : 70;
  return (
    <g className="lf-fall" pointerEvents="none">
      <style>{WX_CSS}</style>
      {heavy && <rect x="0" y="0" width={W} height={H} fill="#f1f5f9" style={{ animation: "lfGust 4s ease-in-out infinite" }} />}
      {[...Array(n)].map((_, i) => {
        const big = i % 6 === 0, x = rnd(i, 11) * (W + (heavy ? 160 : 20)), dur = heavy ? 1.8 + rnd(i, 12) * 1.6 : 5 + rnd(i, 12) * 4, delay = -rnd(i, 13) * dur;
        const r = heavy ? (big ? 3.2 + rnd(i, 14) * 2.4 : 1.2 + rnd(i, 14) * 1.8) : big ? 2.2 + rnd(i, 14) * 1.2 : 0.9 + rnd(i, 14) * 1.2;
        return <circle key={i} cx={x} cy="0" r={r} fill="#fff" opacity={big ? 0.6 : 0.7 + rnd(i, 15) * 0.25} style={{ animation: `${heavy ? "lfBlizzard" : "lfSnow"} ${dur}s ${delay}s linear infinite`, filter: big ? "blur(1.1px)" : undefined }} />;
      })}
    </g>
  );
}
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
// The old numbered circles are still there behind ?sprites=0.
const SPRITE_SCALE = 0.25; // every pose drawn at the same pixel size
const SPRITES = !(typeof location !== "undefined" && /[?&]sprites=0\b/.test(location.search));
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

// sb: the Super Bowl's name ("Super Bowl LXI") on a neutral field: pinstriped end zones in each
// club's color framed in gold, a gold medallion at midfield with the trophy, the game's name and the
// host city (sbCity), each club's logo at its own 25, and gold trim around the field.
function Callout({ play, W, H }) {
  const c = calloutOf(play);
  if (!c) return null;
  const big = c.t.length > 12 ? 40 : 52, w = Math.max(c.t.length * big * 0.62, (c.s || "").length * 11) + 60;
  return (
    <g pointerEvents="none" style={{ animation: "lfCallout .45s ease-out" }}>
      <style>{"@keyframes lfCallout { 0% { opacity: 0; transform: scale(.85); transform-origin: center } 100% { opacity: 1; transform: none } }"}</style>
      <rect x={W / 2 - w / 2} y={H / 2 - 92} width={w} height={c.s ? 104 : 78} rx="14" fill="#060b18" fillOpacity=".82" stroke={c.c} strokeWidth="3" />
      <text x={W / 2} y={H / 2 - 92 + big + 8} textAnchor="middle" fill={c.c} fontSize={big} fontWeight="900" fontFamily="'Arial Black', Arial, sans-serif">{c.t}</text>
      {c.s && <text x={W / 2} y={H / 2 - 92 + big + 36} textAnchor="middle" fill="#e2e8f0" fontSize="17" fontWeight="700" fontFamily="system-ui">{c.s}</text>}
    </g>
  );
}

// How wide the field may get (it keeps its shape, so this caps its height to fit the screen).
// A frame around it (HolidayFrame) takes the same cap, so it hugs the field.
export const fieldMaxW = (tall) => `calc(${MOBILE ? "min(42vh, 390px)" : tall ? "min(calc(var(--vh, 100vh) - 470px), 700px)" : "min(calc(var(--vh, 100vh) - 330px), 570px)"} * ${W / H})`;

export default function LiveField({ ballYard, toGo, off, def, offHome = true, offDepth, defDepth, offOrder, defOrder, lastPlay, sb, sbCity, night, wx, holiday, tall }) {
  const W8 = wxOf(wx);
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
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", borderRadius: 10, maxWidth: fieldMaxW(tall), margin: "0 auto" }}>
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
        {/* a night game: the stadium lights throw four pools of light onto a darker field */}
        <radialGradient id="lf-light" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#fffbe6" stopOpacity=".38" /><stop offset="1" stopColor="#fffbe6" stopOpacity="0" /></radialGradient>
        {/* painted on the grass: a white border around the logo, like a real midfield logo */}
        <filter id="lf-paint" x="-10%" y="-10%" width="120%" height="120%">
          <feMorphology in="SourceAlpha" operator="dilate" radius="2.2" result="d" />
          <feFlood floodColor="#fff" result="w" /><feComposite in="w" in2="d" operator="in" result="edge" />
          <feMerge><feMergeNode in="edge" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        {sb && <>
          <linearGradient id="lf-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff1b8" /><stop offset=".35" stopColor="#e8c45a" /><stop offset=".65" stopColor="#a8822a" /><stop offset="1" stopColor="#f5d77a" /></linearGradient>
          <radialGradient id="lf-medal" cx=".5" cy=".4" r=".65"><stop offset="0" stopColor="#1e2a44" /><stop offset="1" stopColor="#070b16" /></radialGradient>
          <linearGradient id="lf-ezshade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#000" stopOpacity=".38" /><stop offset=".5" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".38" /></linearGradient>
          <pattern id="lf-pin" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="none" /><line x1="0" y1="0" x2="0" y2="10" stroke="#fff" strokeOpacity=".07" strokeWidth="3" /></pattern>
          <path id="lf-arc-top" d={`M ${W / 2 - 55} ${H / 2 + 6} A 55 55 0 0 1 ${W / 2 + 55} ${H / 2 + 6}`} />
          <path id="lf-arc-bot" d={`M ${W / 2 - 57} ${H / 2} A 57 57 0 0 0 ${W / 2 + 57} ${H / 2}`} />
        </>}
      </defs>
      {/* mowed stripes, five yards each, running through the end zones */}
      {[...Array(24)].map((_, i) => <rect key={`e${i}`} x={i < 12 ? i * (EZ / 12) : W - EZ + (i - 12) * (EZ / 12)} y="0" width={EZ / 12 + 0.5} height={H} fill={i % 2 ? "#2f8a3a" : "#287c33"} />)}
      {[...Array(20)].map((_, i) => <rect key={i} x={xOf(i * 5)} y="0" width={xOf(5) - xOf(0) + 0.5} height={H} fill={i % 2 ? "#2f8a3a" : "#287c33"} />)}
      {/* end zones: plain grass with the club's wordmark painted big across it (club color, white
          outline), its logo painted at each end, and orange pylons at the four corners */}
      {[[0, off, -90], [W - EZ, def, 90]].map(([x, t, rot], i) => t && (sb ? (
        // the Super Bowl: each club's end zone painted solid in its color, pinstriped, framed in gold,
        // its name big in white with a trim in its second color, and its logo at both ends
        <g key={i}>
          <rect x={x} y="0" width={EZ} height={H} fill={t.clr || "#334155"} />
          <rect x={x} y="0" width={EZ} height={H} fill="url(#lf-pin)" />
          <rect x={x} y="0" width={EZ} height={H} fill="url(#lf-ezshade)" />
          <rect x={x + 6} y="6" width={EZ - 12} height={H - 12} rx="4" fill="none" stroke="url(#lf-gold)" strokeWidth="2" />
          <text x={x + EZ / 2} y={H / 2} fill="#fff" fontSize="40" fontWeight="900" fontStyle="italic" fontFamily="'Arial Black', Arial, sans-serif" textAnchor="middle" dominantBaseline="central" textLength={H - 170} lengthAdjust="spacingAndGlyphs" stroke={t.ac && t.ac !== t.clr ? t.ac : "#0b1220"} strokeWidth="5" paintOrder="stroke" strokeLinejoin="round" transform={`rotate(${rot} ${x + EZ / 2} ${H / 2})`}>{(t.name || "").toUpperCase()}</text>
          {[44, H - 44].map((cy) => <image key={cy} href={logoUrl(t.ab)} x={x + EZ / 2 - 22} y={cy - 22} width="44" height="44" filter="url(#lf-paint)" transform={`rotate(${rot} ${x + EZ / 2} ${cy})`} />)}
        </g>
      ) : (
        <g key={i}>
          <text x={x + EZ / 2} y={H / 2} fill={t.clr || "#334155"} fontSize="34" fontWeight="900" fontFamily="'Arial Black', Arial, sans-serif" textAnchor="middle" dominantBaseline="central" textLength={H - 120} lengthAdjust="spacingAndGlyphs" stroke="#fff" strokeWidth="2.5" paintOrder="stroke" opacity=".92" transform={`rotate(${rot} ${x + EZ / 2} ${H / 2})`}>{(t.name || "").toUpperCase()}</text>
          {[30, H - 30].map((cy) => <image key={cy} href={logoUrl(t.ab)} x={x + EZ / 2 - 16} y={cy - 16} width="32" height="32" opacity=".5" filter="url(#lf-paint)" transform={`rotate(${rot} ${x + EZ / 2} ${cy})`} />)}
        </g>
      )))}
      {/* the home club's logo at midfield */}
      {!sb && (offHome ? off : def)?.ab && <image href={logoUrl((offHome ? off : def).ab)} x={W / 2 - 44} y={H / 2 - 44} width="88" height="88" opacity=".26" filter="url(#lf-paint)" />}
      {/* the Super Bowl: no home team, so the trophy takes midfield, ringed in gold with the game's name */}
      {sb && <g>
        <circle cx={W / 2} cy={H / 2} r="76" fill="#000" opacity=".25" />
        <circle cx={W / 2} cy={H / 2} r="72" fill="url(#lf-medal)" stroke="url(#lf-gold)" strokeWidth="5" />
        <circle cx={W / 2} cy={H / 2} r="44" fill="none" stroke="url(#lf-gold)" strokeWidth="1.5" strokeOpacity=".8" />
        <text fill="url(#lf-gold)" fontSize="11" fontWeight="900" fontFamily="Georgia, serif" letterSpacing="1.2" textAnchor="middle"><textPath href="#lf-arc-top" startOffset="50%" textAnchor="middle">{sb.toUpperCase()}</textPath></text>
        {sbCity && <text fill="#fde68a" fontSize="9" fontWeight="800" fontFamily="system-ui" letterSpacing="2" textAnchor="middle"><textPath href="#lf-arc-bot" startOffset="50%" textAnchor="middle">{sbCity.toUpperCase()}</textPath></text>}
        <image href={lombardiArt} x={W / 2 - 18} y={H / 2 - 38} width="36" height="72" preserveAspectRatio="xMidYMid meet" />
      </g>}
      {/* each club's logo painted at its own 25 */}
      {sb && [[25, off, -90], [75, def, 90]].map(([y, t, rot]) => t?.ab && <image key={y} href={logoUrl(t.ab)} x={xOf(y) - 30} y={H / 2 - 30} width="60" height="60" opacity=".8" filter="url(#lf-paint)" transform={`rotate(${rot} ${xOf(y)} ${H / 2})`} />)}
      <rect x="0" y="0" width={W} height={H} filter="url(#lf-grain)" opacity=".55" />
      <Ground wx={W8} kind={wx} />
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
      {night && <g pointerEvents="none"><rect x="0" y="0" width={W} height={H} fill="#050c24" opacity=".55" />{[[0.18, 0], [0.82, 0], [0.18, 1], [0.82, 1]].map(([fx, fy], i) => <ellipse key={i} cx={W * fx} cy={H * fy} rx={W * 0.34} ry={H * 0.7} fill="url(#lf-light)" />)}</g>}
      <rect x="1" y="1" width={W - 2} height={H - 2} fill="none" stroke={sb ? "url(#lf-gold)" : "#fff"} strokeOpacity=".85" strokeWidth={sb ? 5 : 2} rx="9" />
      {[2, EZ - 3, W - EZ - 3, W - 8].flatMap((x) => [2, H - 8].map((y) => <rect key={`${x}-${y}`} x={x} y={y} width="6" height="6" rx="1" fill="#f97316" stroke="#7c2d12" strokeWidth=".6" />))}
      {/* line of scrimmage and the line to gain, with a soft glow */}
      <line x1={x0} y1="0" x2={x0} y2={H} stroke="#3b82f6" strokeWidth="8" strokeOpacity=".25" />
      <line x1={x0} y1="0" x2={x0} y2={H} stroke="#60a5fa" strokeWidth="3" />
      {toGo > 0 && los + toGo < 100 && <><line x1={xOf(los + toGo)} y1="0" x2={xOf(los + toGo)} y2={H} stroke="#facc15" strokeWidth="8" strokeOpacity=".25" /><line x1={xOf(los + toGo)} y1="0" x2={xOf(los + toGo)} y2={H} stroke="#fde047" strokeWidth="3" /></>}
      {place("def", d, def)}
      {place("off", o, off)}
      <HolidayDecor holiday={holiday} />
      <Falling wx={W8} />
      {(W8.rain || W8.snow || wx === "wind") && <g pointerEvents="none"><rect x="10" y="12" width={W8.label.length * 7.4 + 34} height="22" rx="11" fill="#0b1220" opacity=".72" /><text x="20" y="27" fontSize="12" fontWeight="800" fill="#e2e8f0" fontFamily="system-ui">{W8.icon} {W8.label}</text></g>}
      {!SPRITES && <ellipse cx={x0 - 4} cy={H / 2} rx="7" ry="4.5" fill="#8B4513" stroke="#fff" strokeWidth="1" style={{ transition: "cx .55s ease" }} />}
      <Callout play={lastPlay} W={W} H={H} />
    </svg>
  );
}
