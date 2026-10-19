// Atmosphere for special games: the sky behind the whole game screen (rain or snow falling, and
// the holiday's own touches: autumn leaves on Thanksgiving, lights and snow on Christmas, bats
// and a full moon on Halloween), the holiday intro before kickoff, and the holiday result card.
import React from "react";
import { TeamLogo } from "./ui.jsx";
import { MOBILE } from "./mobile.js";
import { HOLIDAYS } from "./holidays.js";
import { wxOf } from "./weather.js";

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
@media (prefers-reduced-motion: reduce) { .at-sky * { animation: none !important } }
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

// wx: weather key; holiday: holidays.js key; z: stacking (0 behind the screen's panels).
export function Sky({ wx, holiday, z = 0, density = 1 }) {
  const w = wxOf(wx), h = HOLIDAYS[holiday];
  const heavy = (w.rain || w.snow) === 2;
  const snow = w.snow || holiday === "christmas";
  const nSnow = Math.round((w.snow ? (heavy ? 110 : 60) : 35) * density), nRain = Math.round((heavy ? 120 : 60) * density);
  return (
    <div className="at-sky" aria-hidden style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: z }}>
      <style>{CSS}</style>
      {h && <div style={{ position: "absolute", inset: 0, background: holiday === "halloween" ? "radial-gradient(ellipse at 50% 120%, #7c3aed33, transparent 60%)" : holiday === "thanksgiving" ? "radial-gradient(ellipse at 50% 110%, #d9770624, transparent 60%)" : "radial-gradient(ellipse at 50% 110%, #15803d26, transparent 60%)" }} />}
      {holiday === "halloween" && <div style={{ position: "absolute", right: "6vw", top: "6vh", width: 90, height: 90, borderRadius: "50%", background: "radial-gradient(circle at 40% 40%, #fff7d6, #fde68a 55%, #f59e0b 100%)", boxShadow: "0 0 60px 20px #fde68a44", animation: "atGlow 5s ease-in-out infinite" }} />}
      {holiday === "christmas" && <Lights />}
      {w.rain && [...Array(nRain)].map((_, i) => <span key={`r${i}`} style={{ position: "absolute", top: 0, left: `${rnd(i, 1) * 110}%`, width: 1.5, height: 18 + rnd(i, 2) * 14, background: "linear-gradient(#cbd5e100, #cbd5e1aa)", transform: "rotate(14deg)", animation: `atRain ${0.6 + rnd(i, 3) * 0.4}s ${-rnd(i, 4)}s linear infinite` }} />)}
      {snow && [...Array(nSnow)].map((_, i) => { const big = i % 6 === 0; return <span key={`s${i}`} style={{ position: "absolute", top: 0, left: `${rnd(i, 5) * 100}%`, width: big ? 7 : 3 + rnd(i, 6) * 3, height: big ? 7 : 3 + rnd(i, 6) * 3, borderRadius: "50%", background: "#fff", opacity: big ? 0.5 : 0.75, filter: big ? "blur(1.5px)" : undefined, animation: `atSnow ${6 + rnd(i, 7) * 6}s ${-rnd(i, 8) * 12}s linear infinite` }} />; })}
      {holiday === "thanksgiving" && [...Array(Math.round(18 * density))].map((_, i) => <span key={`l${i}`} style={{ position: "absolute", top: 0, left: `${rnd(i, 9) * 100}%`, fontSize: 14 + rnd(i, 10) * 14, opacity: 0.8, animation: `atLeaf ${9 + rnd(i, 11) * 7}s ${-rnd(i, 12) * 16}s linear infinite` }}>{["🍂", "🍁", "🍂"][i % 3]}</span>)}
      {holiday === "halloween" && [...Array(Math.round(7 * density))].map((_, i) => <span key={`b${i}`} style={{ position: "absolute", left: 0, top: `${8 + rnd(i, 13) * 40}%`, fontSize: 16 + rnd(i, 14) * 16, animation: `atBat ${11 + rnd(i, 15) * 8}s ${-rnd(i, 16) * 18}s linear infinite` }}>🦇</span>)}
      {holiday === "halloween" && <><span style={{ position: "absolute", left: 14, bottom: 8, fontSize: 38, opacity: 0.85 }}>🎃</span><span style={{ position: "absolute", right: 14, bottom: 8, fontSize: 30, opacity: 0.85 }}>🎃</span></>}
    </div>
  );
}

// Before kickoff of a holiday game you play: the day's title over its sky, then the matchup.
export function HolidayIntro({ holiday, home, away, wx, onDone }) {
  const h = HOLIDAYS[holiday];
  if (!h) return null;
  const tradition = holiday === "thanksgiving" && home?.ab === "DET" ? "A Thanksgiving tradition in Detroit since 1934" : holiday === "thanksgiving" && home?.ab === "DAL" ? "A Thanksgiving tradition in Dallas since 1966" : h.line;
  return (
    <div onClick={onDone} style={{ position: "fixed", inset: 0, zIndex: 2500, background: `radial-gradient(ellipse at 50% 40%, ${h.bg}ee, #000 78%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "#fff", textAlign: "center", padding: 20, animation: "atFade 4.6s ease forwards", cursor: "pointer" }}>
      <Sky wx={wx} holiday={holiday} z={0} density={1.4} />
      <div style={{ position: "relative", fontSize: MOBILE ? 54 : 72, animation: "atIn .6s ease-out both" }}>{h.icon}</div>
      <div style={{ position: "relative", fontSize: MOBILE ? 34 : 58, fontWeight: 900, letterSpacing: 2, lineHeight: 1, background: `linear-gradient(90deg, ${h.c1}, #fff 50%, ${h.c1})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", animation: "atIn .7s .2s ease-out both" }}>{h.name.toUpperCase()}</div>
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: MOBILE ? 14 : 28, marginTop: 8, animation: "atIn .7s .5s ease-out both" }}>
        <TeamLogo t={away} sz={MOBILE ? 52 : 76} glow />
        <span style={{ fontSize: MOBILE ? 18 : 24, fontWeight: 900, color: h.c1 }}>at</span>
        <TeamLogo t={home} sz={MOBILE ? 52 : 76} glow />
      </div>
      <div style={{ position: "relative", fontSize: MOBILE ? 16 : 20, fontWeight: 800, animation: "atIn .7s .7s ease-out both" }}>{away?.city} {away?.name} at {home?.city} {home?.name}</div>
      <div style={{ position: "relative", fontSize: 14, color: "#e2e8f0", fontStyle: "italic", maxWidth: 520, animation: "atIn .7s .9s ease-out both" }}>{tradition}</div>
    </div>
  );
}

// The holiday result card (Moment kind "holiday"): m = { team (yours), holiday, won, us, them,
// opp, pog: { name, line }, home }.
const WIN = { thanksgiving: "A Thanksgiving to remember", christmas: "Christmas came early", halloween: "All treat, no trick" };
const LOSS = { thanksgiving: "A tough day to give thanks", christmas: "Coal in the stocking", halloween: "Tricked on Halloween night" };
const AWARD = { thanksgiving: "The turkey leg goes to", christmas: "Player of the game", halloween: "Player of the game" };
export function HolidayResult({ m, onClose }) {
  const h = HOLIDAYS[m.holiday];
  if (!h) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 3000, background: `radial-gradient(ellipse at 50% 35%, ${h.bg}, #050505 78%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, color: "#fff" }}>
      <Sky wx={m.wx} holiday={m.holiday} z={0} density={1.2} />
      <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", width: "min(560px, 100%)", textAlign: "center", background: "#0b0b12cc", border: `1px solid ${h.c1}88`, borderRadius: 18, padding: MOBILE ? "22px 16px" : "28px 28px", boxShadow: `0 0 60px ${h.c1}33` }}>
        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 4, color: h.c1 }}>{h.icon} {h.name.toUpperCase()} · FINAL</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, margin: "14px 0 6px" }}>
          <TeamLogo t={m.team} sz={MOBILE ? 52 : 64} glow />
          <span style={{ fontSize: MOBILE ? 34 : 44, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{m.us}-{m.them}</span>
          <TeamLogo t={m.opp} sz={MOBILE ? 46 : 56} />
        </div>
        <div style={{ fontSize: MOBILE ? 22 : 28, fontWeight: 900, color: m.won ? "#fff" : "#cbd5e1", marginTop: 6 }}>{(m.won ? WIN : LOSS)[m.holiday]}</div>
        <div style={{ fontSize: 14, color: "#cbd5e1", marginTop: 4 }}>{m.won ? "Beat" : "Lost to"} the {m.opp?.city} {m.opp?.name} {m.home ? "at home" : "on the road"}.</div>
        {m.pog && <div style={{ marginTop: 16, display: "inline-block", background: `${h.c1}22`, border: `1px solid ${h.c1}66`, borderRadius: 12, padding: "10px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2, color: h.c1 }}>{m.holiday === "thanksgiving" ? "🍗 " : ""}{AWARD[m.holiday].toUpperCase()}</div>
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
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 900, letterSpacing: 0.5, color: "#fff", background: `linear-gradient(90deg, ${h.c2}, ${h.c1})`, borderRadius: 999, padding: "2px 9px", whiteSpace: "nowrap", ...style }}>{h.icon} {h.name}</span>;
}
