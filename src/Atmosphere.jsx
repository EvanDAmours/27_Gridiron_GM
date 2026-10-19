// Atmosphere for special games: the sky behind the whole game screen (rain or snow falling, and
// the holiday's own touches: autumn leaves on Thanksgiving, lights and snow on Christmas, bats
// and a full moon on Halloween), the holiday intro before kickoff, and the holiday result card.
import React from "react";
import { TeamLogo } from "./ui.jsx";
import { MOBILE } from "./mobile.js";
import { HOLIDAYS, themeOf } from "./holidays.js";
import { wxOf } from "./weather.js";

// The holiday art (public/holiday/): a frame around the field, trim for the scoreboard, and four
// stickers per holiday (halloween: pumpkin, bat, ghost, candy corn; thanksgiving: turkey, pie,
// cornucopia, football; christmas: snowman, ornament, gift, candy cane; newyear: champagne,
// midnight clock, party hat, starburst).
const BASE = import.meta.env?.BASE_URL ?? "/";
export const holArt = (holiday, piece) => (HOLIDAYS[holiday] ? `${BASE}holiday/${themeOf(holiday)}_${piece}.webp` : null);
const sticker = (holiday, i) => holArt(holiday, `s${i}`);
// which stickers each look uses: the intro's hero, the two that keep the corners, and the touchdown one
const ART = { halloween: { hero: 0, corners: [0, 2], td: 0, side: [1, 3] }, thanksgiving: { hero: 0, corners: [0, 2], td: 3, side: [1, 2] }, christmas: { hero: 0, corners: [0, 2], td: 1, side: [1, 3] }, newyear: { hero: 0, corners: [0, 1], td: 3, side: [2, 3] } };
const artOf = (holiday) => ART[themeOf(holiday)] || ART.christmas;

const rnd = (i, k) => { const x = Math.sin(i * 91.7 + k * 47.3) * 24634.6345; return x - Math.floor(x); };
const CSS = `
@keyframes atRain { from { transform: translate(0, -12vh) } to { transform: translate(-8vh, 112vh) } }
@keyframes atSnow { 0% { transform: translate(0, -6vh) } 50% { transform: translate(3vw, 50vh) } 100% { transform: translate(-2vw, 108vh) } }
@keyframes atLeaf { 0% { transform: translate(0, -8vh) rotate(0) } 25% { transform: translate(6vw, 22vh) rotate(120deg) } 50% { transform: translate(-3vw, 50vh) rotate(220deg) } 75% { transform: translate(5vw, 78vh) rotate(320deg) } 100% { transform: translate(0, 110vh) rotate(420deg) } }
@keyframes atBat { 0% { transform: translate(-10vw, 0) scaleY(1) } 25% { transform: translate(25vw, -4vh) scaleY(.6) } 50% { transform: translate(55vw, 3vh) scaleY(1) } 75% { transform: translate(85vw, -3vh) scaleY(.6) } 100% { transform: translate(115vw, 0) scaleY(1) } }
@keyframes atTwinkle { 0%,100% { opacity: 1 } 50% { opacity: .35 } }
@keyframes atGlow { 0%,100% { opacity: .55 } 50% { opacity: .85 } }
@keyframes atIn { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
@keyframes atFade { 0% { opacity: 0 } 8% { opacity: 1 } 88% { opacity: 1 } 100% { opacity: 0 } }
@keyframes atBurst { 0% { transform: scale(.05); opacity: 0 } 10% { opacity: 1 } 60% { opacity: .9 } 100% { transform: scale(1); opacity: 0 } }
@keyframes atConf { 0% { transform: translate(0, -8vh) rotate(0) } 100% { transform: translate(4vw, 110vh) rotate(900deg) } }
@keyframes atCount { 0% { transform: scale(2.2); opacity: 0 } 15% { transform: scale(1); opacity: 1 } 75% { opacity: 1 } 100% { transform: scale(.6); opacity: 0 } }
@keyframes atBob { 0%,100% { transform: translateY(0) rotate(-3deg) } 50% { transform: translateY(-10px) rotate(3deg) } }
@keyframes atDrift { 0%,100% { transform: translate(0, 0) rotate(-4deg) } 50% { transform: translate(-14px, -18px) rotate(5deg) } }
@keyframes atLightsGlow { 0%,100% { filter: drop-shadow(0 0 4px #fbbf2466) brightness(1) } 50% { filter: drop-shadow(0 0 12px #fbbf24cc) brightness(1.2) } }
@keyframes atFlicker { 0%,100% { filter: drop-shadow(0 0 6px #f9731655) brightness(1) } 45% { filter: drop-shadow(0 0 3px #f9731633) brightness(.85) } 50% { filter: drop-shadow(0 0 10px #f97316aa) brightness(1.1) } 55% { filter: brightness(.92) } }
@keyframes atShimmer { 0%,100% { filter: drop-shadow(0 0 3px #fde68a55) brightness(1) } 50% { filter: drop-shadow(0 0 10px #fde68acc) brightness(1.15) } }
@keyframes atWarm { 0%,100% { filter: drop-shadow(0 0 4px #f59e0b44) } 50% { filter: drop-shadow(0 0 9px #f59e0b88) } }
@keyframes atPop { 0% { transform: translate(-50%, -50%) scale(.2) rotate(-25deg); opacity: 0 } 18% { transform: translate(-50%, -50%) scale(1.15) rotate(8deg); opacity: 1 } 30% { transform: translate(-50%, -50%) scale(1) rotate(0) } 75% { opacity: 1 } 100% { transform: translate(-50%, -80%) scale(.9); opacity: 0 } }
@keyframes atHero { 0% { transform: scale(.4) rotate(-12deg); opacity: 0 } 60% { transform: scale(1.08) rotate(4deg); opacity: 1 } 100% { transform: scale(1) rotate(0); opacity: 1 } }
@keyframes atSlideL { from { transform: translateX(-60px) rotate(-20deg); opacity: 0 } to { transform: rotate(-10deg); opacity: 1 } }
@keyframes atSlideR { from { transform: translateX(60px) rotate(20deg); opacity: 0 } to { transform: rotate(10deg); opacity: 1 } }
@media (prefers-reduced-motion: reduce) { .at-sky *, .at-deco { animation: none !important } }
`;

// String lights: a sagging wire with bulbs in red, green and gold, twinkling out of step.
function Lights({ top = 0 }) {
  const n = MOBILE ? 14 : 26;
  return (
    <svg viewBox="0 0 1000 60" preserveAspectRatio="none" style={{ position: "absolute", left: 0, right: 0, top, width: "100%", height: 46 }}>
      <path d={`M0 6 ${[...Array(n)].map((_, i) => `Q ${(i + 0.5) * (1000 / n)} 34 ${(i + 1) * (1000 / n)} 6`).join(" ")}`} fill="none" stroke="#1f2937" strokeWidth="2" />
      {[...Array(n)].map((_, i) => {
        const x = (i + 0.5) * (1000 / n), c = ["#ef4444", "#22c55e", "#facc15", "#3b82f6"][i % 4];
        return <g key={i} style={{ animation: `atTwinkle ${1.4 + (i % 3) * 0.5}s ${-(i % 5) * 0.3}s ease-in-out infinite` }}><ellipse cx={x} cy="26" rx="5" ry="8" fill={c} /><ellipse cx={x} cy="26" rx="11" ry="14" fill={c} opacity=".25" /></g>;
      })}
    </svg>
  );
}

// Fireworks: rings of sparks bursting at spots across the sky, out of step, in gold, silver and color.
function Fireworks({ n = 7 }) {
  return [...Array(n)].map((_, i) => {
    const c = ["#fbbf24", "#e5e7eb", "#f472b6", "#60a5fa", "#fde68a", "#a78bfa", "#34d399"][i % 7], size = 90 + rnd(i, 31) * 120, dur = 2.2 + rnd(i, 32) * 1.6;
    return (
      <div key={`f${i}`} style={{ position: "absolute", left: `${8 + rnd(i, 33) * 84}%`, top: `${6 + rnd(i, 34) * 42}%`, width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, animation: `atBurst ${dur}s ${-rnd(i, 35) * dur}s ease-out infinite` }}>
        {[...Array(16)].map((__, k) => { const a = (k / 16) * Math.PI * 2; return <span key={k} style={{ position: "absolute", left: "50%", top: "50%", width: 5, height: 5, marginLeft: -2.5, marginTop: -2.5, borderRadius: "50%", background: c, boxShadow: `0 0 8px ${c}`, transform: `translate(${Math.cos(a) * size / 2}px, ${Math.sin(a) * size / 2}px)` }} />; })}
      </div>
    );
  });
}

// wx: weather key; holiday: holidays.js key; z: stacking (0 behind the screen's panels).
export function Sky({ wx, holiday, z = 0, density = 1, corners = false }) {
  const w = wxOf(wx), h = HOLIDAYS[holiday], th = themeOf(holiday);
  const heavy = (w.rain || w.snow) === 2;
  const snow = w.snow || th === "christmas";
  const nSnow = Math.round((w.snow ? (heavy ? 110 : 60) : 35) * density), nRain = Math.round((heavy ? 120 : 60) * density);
  return (
    <div className="at-sky" aria-hidden style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: z }}>
      <style>{CSS}</style>
      {h && <div style={{ position: "absolute", inset: 0, background: th === "newyear" ? "radial-gradient(ellipse at 50% 120%, #fbbf2418, transparent 60%)" : th === "halloween" ? "radial-gradient(ellipse at 50% 120%, #7c3aed33, transparent 60%)" : th === "thanksgiving" ? "radial-gradient(ellipse at 50% 110%, #d9770624, transparent 60%)" : "radial-gradient(ellipse at 50% 110%, #15803d26, transparent 60%)" }} />}
      {th === "newyear" && <><div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% -10%, #fbbf2422, transparent 55%)" }} /><Fireworks n={Math.round(7 * density)} />{[...Array(Math.round(50 * density))].map((_, i) => <span key={`c${i}`} style={{ position: "absolute", top: 0, left: `${rnd(i, 41) * 100}%`, width: 5, height: 9, borderRadius: 1, background: ["#fbbf24", "#e5e7eb", "#fde68a", "#cbd5e1"][i % 4], opacity: 0.85, animation: `atConf ${5 + rnd(i, 42) * 5}s ${-rnd(i, 43) * 10}s linear infinite` }} />)}</>}
      {th === "halloween" && <div style={{ position: "absolute", right: "6vw", top: "6vh", width: 90, height: 90, borderRadius: "50%", background: "radial-gradient(circle at 40% 40%, #fff7d6, #fde68a 55%, #f59e0b 100%)", boxShadow: "0 0 60px 20px #fde68a44", animation: "atGlow 5s ease-in-out infinite" }} />}
      {th === "christmas" && <Lights />}
      {w.rain && [...Array(nRain)].map((_, i) => <span key={`r${i}`} style={{ position: "absolute", top: 0, left: `${rnd(i, 1) * 110}%`, width: 1.5, height: 18 + rnd(i, 2) * 14, background: "linear-gradient(#cbd5e100, #cbd5e1aa)", transform: "rotate(14deg)", animation: `atRain ${0.6 + rnd(i, 3) * 0.4}s ${-rnd(i, 4)}s linear infinite` }} />)}
      {snow && [...Array(nSnow)].map((_, i) => { const big = i % 6 === 0; return <span key={`s${i}`} style={{ position: "absolute", top: 0, left: `${rnd(i, 5) * 100}%`, width: big ? 7 : 3 + rnd(i, 6) * 3, height: big ? 7 : 3 + rnd(i, 6) * 3, borderRadius: "50%", background: "#fff", opacity: big ? 0.5 : 0.75, filter: big ? "blur(1.5px)" : undefined, animation: `atSnow ${6 + rnd(i, 7) * 6}s ${-rnd(i, 8) * 12}s linear infinite` }} />; })}
      {th === "thanksgiving" && [...Array(Math.round(18 * density))].map((_, i) => <span key={`l${i}`} style={{ position: "absolute", top: 0, left: `${rnd(i, 9) * 100}%`, fontSize: 14 + rnd(i, 10) * 14, opacity: 0.8, animation: `atLeaf ${9 + rnd(i, 11) * 7}s ${-rnd(i, 12) * 16}s linear infinite` }}>{["🍂", "🍁", "🍂"][i % 3]}</span>)}
      {th === "halloween" && [...Array(Math.round(7 * density))].map((_, i) => <img key={`b${i}`} alt="" src={sticker(holiday, 1)} style={{ position: "absolute", left: 0, top: `${8 + rnd(i, 13) * 40}%`, width: 34 + rnd(i, 14) * 34, animation: `atBat ${11 + rnd(i, 15) * 8}s ${-rnd(i, 16) * 18}s linear infinite` }} />)}
      {/* two of the holiday's stickers keep the bottom corners, bobbing gently */}
      {corners && h && artOf(holiday).corners.map((t, i) => <img key={`k${i}`} alt="" src={sticker(holiday, t)} className="at-deco" style={{ position: "absolute", bottom: MOBILE ? 64 : 10, [i ? "right" : "left"]: MOBILE ? 4 : 14, width: MOBILE ? 64 : 112, filter: "drop-shadow(0 8px 16px #000a)", animation: `${i ? "atDrift" : "atBob"} ${4.5 + i}s ease-in-out infinite` }} />)}
    </div>
  );
}

// Before kickoff of a holiday game you play: the day's title over its sky, then the matchup.
export function HolidayIntro({ holiday, home, away, wx, onDone }) {
  const h = HOLIDAYS[holiday];
  if (!h) return null;
  const ny = themeOf(holiday) === "newyear", late = ny ? 1.5 : 0;
  const tradition = holiday === "thanksgiving" && home?.ab === "DET" ? "A Thanksgiving tradition in Detroit since 1934" : holiday === "thanksgiving" && home?.ab === "DAL" ? "A Thanksgiving tradition in Dallas since 1966" : h.line;
  return (
    <div onClick={onDone} style={{ position: "fixed", inset: 0, zIndex: 2500, background: `radial-gradient(ellipse at 50% 40%, ${h.bg}ee, #000 78%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "#fff", textAlign: "center", padding: 20, animation: `atFade ${ny ? 5.6 : 4.6}s ease forwards`, cursor: "pointer" }}>
      <Sky wx={wx} holiday={holiday} z={0} density={1.4} />
      {ny && <div style={{ position: "absolute", top: "38%", left: 0, right: 0, height: 0 }}>{[3, 2, 1].map((n, i) => <div key={n} style={{ position: "absolute", left: 0, right: 0, textAlign: "center", fontSize: MOBILE ? 110 : 160, fontWeight: 900, color: "#fde68a", textShadow: "0 0 40px #fbbf24aa", opacity: 0, animation: `atCount .5s ${i * 0.5}s ease-out both`, transform: "translateY(-50%)" }}>{n}</div>)}</div>}
      <div style={{ position: "relative", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: MOBILE ? 4 : 18 }}>
        <img alt="" src={sticker(holiday, artOf(holiday).side[0])} style={{ width: MOBILE ? 56 : 88, filter: "drop-shadow(0 8px 18px #000c)", animation: `atSlideL .8s ${late + 0.35}s cubic-bezier(.2,.9,.3,1.2) both` }} />
        <img alt="" src={sticker(holiday, artOf(holiday).hero)} style={{ width: MOBILE ? 110 : 160, filter: `drop-shadow(0 0 30px ${h.c1}66) drop-shadow(0 10px 20px #000c)`, animation: `atHero .8s ${late}s cubic-bezier(.2,.9,.3,1.2) both` }} />
        <img alt="" src={sticker(holiday, artOf(holiday).side[1])} style={{ width: MOBILE ? 56 : 88, filter: "drop-shadow(0 8px 18px #000c)", animation: `atSlideR .8s ${late + 0.35}s cubic-bezier(.2,.9,.3,1.2) both` }} />
      </div>
      <div style={{ position: "relative", fontSize: MOBILE ? 34 : 58, fontWeight: 900, letterSpacing: 2, lineHeight: 1, background: `linear-gradient(90deg, ${h.c1}, #fff 50%, ${h.c1})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", animation: `atIn .7s ${late + 0.2}s ease-out both` }}>{h.name.toUpperCase()}</div>
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: MOBILE ? 14 : 28, marginTop: 8, animation: `atIn .7s ${late + 0.5}s ease-out both` }}>
        <TeamLogo t={away} sz={MOBILE ? 52 : 76} glow />
        <span style={{ fontSize: MOBILE ? 18 : 24, fontWeight: 900, color: h.c1 }}>at</span>
        <TeamLogo t={home} sz={MOBILE ? 52 : 76} glow />
      </div>
      <div style={{ position: "relative", fontSize: MOBILE ? 16 : 20, fontWeight: 800, animation: `atIn .7s ${late + 0.7}s ease-out both` }}>{away?.city} {away?.name} at {home?.city} {home?.name}</div>
      <div style={{ position: "relative", fontSize: 14, color: "#e2e8f0", fontStyle: "italic", maxWidth: 520, animation: `atIn .7s ${late + 0.9}s ease-out both` }}>{tradition}</div>
    </div>
  );
}

// The holiday result card (Moment kind "holiday"): m = { team (yours), holiday, won, us, them,
// opp, pog: { name, line }, home }.
const WIN = { thanksgiving: "A Thanksgiving to remember", christmas: "Christmas came early", halloween: "All treat, no trick", nye: "Ringing in the new year with a win", nyd: "Starting the year right" };
const LOSS = { thanksgiving: "A tough day to give thanks", christmas: "Coal in the stocking", halloween: "Tricked on Halloween night", nye: "Not how we wanted to end the year", nyd: "Not the resolution we wanted" };
const AWARD = { thanksgiving: "The turkey leg goes to", christmas: "Player of the game", halloween: "Player of the game", nye: "Player of the game", nyd: "Player of the game" };
export function HolidayResult({ m, onClose }) {
  const h = HOLIDAYS[m.holiday];
  if (!h) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 3000, background: `radial-gradient(ellipse at 50% 35%, ${h.bg}, #050505 78%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, color: "#fff" }}>
      <Sky wx={m.wx} holiday={m.holiday} z={0} density={1.2} />
      <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", width: "min(560px, 100%)", textAlign: "center", background: "#0b0b12cc", border: `1px solid ${h.c1}88`, borderRadius: 18, padding: MOBILE ? "22px 16px" : "28px 28px", boxShadow: `0 0 60px ${h.c1}33` }}>
        <img alt="" src={sticker(m.holiday, artOf(m.holiday).hero)} style={{ position: "absolute", left: MOBILE ? -14 : -38, top: MOBILE ? -40 : -56, width: MOBILE ? 84 : 120, transform: "rotate(-12deg)", filter: "drop-shadow(0 10px 18px #000c)", animation: "atHero .7s .15s cubic-bezier(.2,.9,.3,1.2) both" }} />
        <img alt="" src={sticker(m.holiday, artOf(m.holiday).side[1])} style={{ position: "absolute", right: MOBILE ? -10 : -30, bottom: MOBILE ? -26 : -36, width: MOBILE ? 60 : 84, transform: "rotate(12deg)", filter: "drop-shadow(0 10px 18px #000c)", animation: "atHero .7s .35s cubic-bezier(.2,.9,.3,1.2) both" }} />
        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 4, color: h.c1 }}>{h.name.toUpperCase()} · FINAL</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, margin: "14px 0 6px" }}>
          <TeamLogo t={m.team} sz={MOBILE ? 52 : 64} glow />
          <span style={{ fontSize: MOBILE ? 34 : 44, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{m.us}-{m.them}</span>
          <TeamLogo t={m.opp} sz={MOBILE ? 46 : 56} />
        </div>
        <div style={{ fontSize: MOBILE ? 22 : 28, fontWeight: 900, color: m.won ? "#fff" : "#cbd5e1", marginTop: 6 }}>{(m.won ? WIN : LOSS)[m.holiday]}</div>
        <div style={{ fontSize: 14, color: "#cbd5e1", marginTop: 4 }}>{m.won ? "Beat" : "Lost to"} the {m.opp?.city} {m.opp?.name} {m.home ? "at home" : "on the road"}.</div>
        {m.pog && <div style={{ marginTop: 16, display: "inline-block", background: `${h.c1}22`, border: `1px solid ${h.c1}66`, borderRadius: 12, padding: "10px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2, color: h.c1 }}>{AWARD[m.holiday].toUpperCase()}</div>
          <div style={{ fontSize: 19, fontWeight: 900, marginTop: 2 }}>{m.pog.name}</div>
          <div style={{ fontSize: 13, color: "#e2e8f0" }}>{m.pog.line}</div>
        </div>}
        <div><button onClick={onClose} style={{ marginTop: 18, background: `linear-gradient(90deg, ${h.c2}, ${h.c1})`, color: "#fff", border: 0, borderRadius: 10, padding: "11px 28px", fontSize: 15, fontWeight: 900, cursor: "pointer" }}>Continue</button></div>
      </div>
    </div>
  );
}

export function HolidayBadge({ holiday, style }) {
  const h = HOLIDAYS[holiday];
  if (!h) return null;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 900, letterSpacing: 0.5, color: "#fff", background: `linear-gradient(90deg, ${h.c2}, ${h.c1})`, borderRadius: 999, padding: "2px 9px 2px 4px", whiteSpace: "nowrap", ...style }}><img alt="" src={sticker(holiday, artOf(holiday).hero)} style={{ width: 18, height: 18, objectFit: "contain" }} />{h.name}</span>;
}

// The frame around the live field (the art's 2400 x 1080 window sits exactly over the field; its
// border hangs 100 art pixels outside every edge). The lights glow, Halloween flickers, the New
// Year's gold shimmers. Children: the field.
const FRAME_ANIM = { christmas: "atLightsGlow 2.6s ease-in-out infinite", halloween: "atFlicker 3.2s ease-in-out infinite", newyear: "atShimmer 3s ease-in-out infinite", thanksgiving: "atWarm 4s ease-in-out infinite" };
export function HolidayFrame({ holiday, children, tdKey }) {
  if (!HOLIDAYS[holiday]) return children;
  return (
    <div style={{ position: "relative", padding: MOBILE ? "3.6% 4.4%" : "3.4% 4.4%" }}>
      <style>{CSS}</style>
      <div style={{ position: "relative" }}>
        {children}
        {/* New Year's art is just corner flourishes: a fine gold double rule joins them */}
        {themeOf(holiday) === "newyear" && <div className="at-deco" style={{ position: "absolute", inset: "-2.2% -1.1%", border: "2px solid #d4af37", borderRadius: 12, boxShadow: "0 0 0 4px #0b122000, 0 0 0 5px #d4af3766, 0 0 18px #fbbf2455, inset 0 0 18px #fbbf2422", pointerEvents: "none", zIndex: 2, animation: "atShimmer 3s ease-in-out infinite" }} />}
        <img alt="" src={holArt(holiday, "frame")} className="at-deco" style={{ position: "absolute", left: "-4.1667%", top: "-9.259%", width: "108.333%", height: "118.52%", pointerEvents: "none", zIndex: 3, animation: FRAME_ANIM[themeOf(holiday)] }} />
        {/* a touchdown: the holiday's sticker pops over the field */}
        {tdKey != null && <img key={tdKey} alt="" src={sticker(holiday, artOf(holiday).td)} className="at-deco" style={{ position: "absolute", left: "50%", top: "38%", width: "18%", pointerEvents: "none", zIndex: 4, filter: "drop-shadow(0 12px 24px #000c)", animation: "atPop 1.8s ease-out both" }} />}
      </div>
    </div>
  );
}

// Trim over the scoreboard: the art's ends frame the two teams; its middle (the score and clock)
// is clear. Children: the scoreboard.
export function HolidayScoreTrim({ holiday, children }) {
  if (!HOLIDAYS[holiday]) return children;
  return (
    <div style={{ position: "relative" }}>
      {children}
      <img alt="" src={holArt(holiday, "bar")} className="at-deco" style={{ position: "absolute", left: 0, top: "50%", width: "100%", aspectRatio: "15 / 1", transform: "translateY(-64%)", pointerEvents: "none", zIndex: 2, animation: FRAME_ANIM[themeOf(holiday)] }} />
    </div>
  );
}
