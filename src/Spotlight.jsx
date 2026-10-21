// The spotlight: a full-screen stage for a player's biggest moments (awards, records, draft night,
// signing day, Canton). The headline on the left in tall block letters, the player standing on the
// right in his team's uniform, a big faint number behind him. On a phone he stands on top and the
// words sit below. A team without art yet shows his face in a ring instead.
import React, { useEffect, useState } from "react";
import { Face } from "./ui.jsx";
import { MOBILE } from "./mobile.js";
import PlayerArt from "./PlayerArt.jsx";
import oswald from "./assets/oswald-latin.woff2";

export const BLOCK = "'Oswald', 'Arial Narrow', Impact, sans-serif";
// the block lettering (bundled, so it works offline); any screen that uses BLOCK includes FONT_CSS
export const FONT_CSS = `@font-face { font-family: 'Oswald'; font-weight: 200 700; font-display: swap; src: url(${oswald}) format('woff2'); }`;
const CSS = `
${FONT_CSS}
@keyframes spIn { from { opacity: 0; transform: translateX(-22px) } to { opacity: 1; transform: none } }
@keyframes spRise { from { opacity: 0; transform: translateY(40px) } to { opacity: 1; transform: none } }
@keyframes spFall { 0% { transform: translateY(-40px) rotate(0deg); opacity: 0 } 8% { opacity: 1 } 100% { transform: translateY(105vh) rotate(540deg); opacity: .9 } }
`;
const BITS = Array.from({ length: 46 }, (_, i) => ({ left: (i * 37) % 100, delay: (i * 0.13) % 2.4, dur: 2.8 + ((i * 7) % 10) / 10, rot: (i * 47) % 360, w: 6 + (i % 3) * 2 }));

function useVh() {
  const [vh, setVh] = useState(() => (typeof window === "undefined" ? 800 : window.innerHeight));
  useEffect(() => { const f = () => setVh(window.innerHeight); addEventListener("resize", f); return () => removeEventListener("resize", f); }, []);
  return vh;
}

// kicker: the small gold line on top. title: the big words (a string; "\n" breaks lines).
// children: what goes under the title. bg: the faint word or number behind him. side: something
// at his side (a trophy). confetti: colors, or nothing. gold: the gold stage instead of team colors.
export default function Spotlight({ p, team, num, kicker, title, children, bg, side, confetti, gold, cta = "CONTINUE →", onNext, label, more }) {
  const vh = useVh();
  const clr = gold ? "#a16207" : team?.clr || "#1e3a8a";
  const artH = MOBILE ? Math.round(vh * 0.5) : Math.min(Math.round(vh * 0.92), 900);
  const who = num != null ? { ...p, num } : p;
  const fallback = (
    <div style={{ height: artH, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ borderRadius: "50%", padding: 5, background: gold ? "conic-gradient(#fde68a,#b45309,#fde68a,#b45309,#fde68a)" : `linear-gradient(135deg, ${team?.ac || "#fff"}, ${clr})` }}><Face s={p?.face} sz={MOBILE ? 130 : 200} /></div>
    </div>
  );
  return (
    <div role="dialog" aria-label={label || String(title).replace(/\n/g, " ")} onClick={onNext} style={{ position: "fixed", inset: 0, zIndex: 4400, overflow: "hidden", color: "#fff", cursor: "pointer",
      background: `radial-gradient(ellipse at ${MOBILE ? "50% 28%" : "70% 45%"}, ${clr}${gold ? "88" : "aa"}, transparent 60%), linear-gradient(180deg, #050a18, #02040b)` }}>
      <style>{CSS}</style>
      {confetti && <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {BITS.map((b, i) => <span key={i} style={{ position: "absolute", top: -20, left: `${b.left}%`, width: b.w, height: b.w * 1.6, background: confetti[i % confetti.length], borderRadius: 1, transform: `rotate(${b.rot}deg)`, animation: `spFall ${b.dur}s ${b.delay}s linear infinite` }} />)}
      </div>}
      {bg != null && <div aria-hidden style={{ position: "absolute", ...(MOBILE ? { top: 20, left: 0, right: 0, textAlign: "center" } : { right: "6%", top: "8%" }), fontFamily: BLOCK, fontWeight: 700, fontSize: MOBILE ? vh * 0.36 : vh * 0.62, lineHeight: 1, color: "#ffffff0d", pointerEvents: "none", whiteSpace: "nowrap" }}>{bg}</div>}
      {/* the player */}
      <div style={{ position: "absolute", bottom: MOBILE ? "auto" : 0, top: MOBILE ? 12 : "auto", ...(MOBILE ? { left: 0, right: 0 } : { right: side ? "14%" : "9%" }), display: "flex", justifyContent: "center", alignItems: "flex-end", animation: "spRise .7s .1s ease-out both" }}>
        <div style={{ position: "relative" }}>
        <PlayerArt p={who} ab={team?.ab} width={Math.round(artH * 0.75)} style={{ filter: `drop-shadow(0 0 40px ${clr}66) drop-shadow(0 20px 30px #000c)`, ...(MOBILE ? { maskImage: "linear-gradient(#000 82%, transparent)", WebkitMaskImage: "linear-gradient(#000 82%, transparent)" } : {}) }} fallback={fallback} />
        {/* hung off his side, so it never pushes him toward the words */}
        {side && <div style={{ position: "absolute", left: MOBILE ? "72%" : "78%", bottom: MOBILE ? 24 : "5vh", width: MOBILE ? 120 : "19vw", zIndex: 1 }}>{side}</div>}
        </div>
      </div>
      {/* the words */}
      <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", cursor: "default", ...(MOBILE ? { left: 18, right: 18, top: artH - 10, bottom: 18, display: "flex", flexDirection: "column" } : { left: "6%", top: 0, bottom: 0, width: "40%", display: "flex", flexDirection: "column", justifyContent: "center" }) }}>
        <div style={{ animation: "spIn .6s .25s ease-out both" }}>
          {kicker && <div style={{ fontSize: MOBILE ? 12 : 15, fontWeight: 900, letterSpacing: MOBILE ? 2.5 : 4, color: "#fcd34d", textTransform: "uppercase" }}>{kicker}</div>}
          <div style={{ fontFamily: BLOCK, fontWeight: 700, fontSize: MOBILE ? Math.min(54, vh * 0.065) : Math.min(108, vh * 0.12), lineHeight: 0.98, letterSpacing: 0.5, marginTop: MOBILE ? 4 : 8, textTransform: "uppercase", whiteSpace: "pre-line", textShadow: "0 4px 24px #0008" }}>{title}</div>
          <div style={{ marginTop: MOBILE ? 8 : 14, fontSize: MOBILE ? 15 : 20, lineHeight: 1.45, color: "#e2e8f0" }}>{children}</div>
        </div>
        <div style={{ flex: MOBILE ? 1 : "0 0 auto" }} />
        <div style={{ display: "flex", gap: 10, marginTop: MOBILE ? 12 : 34, animation: "spIn .5s .9s ease-out both", ...(MOBILE ? {} : { alignSelf: "flex-start" }) }}>
          <button onClick={onNext} style={{ flex: MOBILE ? 1 : "0 0 auto", background: gold ? "linear-gradient(90deg,#b45309,#fbbf24,#b45309)" : "#fff", color: gold ? "#1c1206" : "#0b1220", border: 0, borderRadius: 10, padding: MOBILE ? "13px 0" : "13px 34px", fontSize: 16, fontWeight: 900, letterSpacing: 2, cursor: "pointer", boxShadow: "0 8px 24px #0008" }}>{cta}</button>
          {/* more: a second, quieter button { label, onClick } */}
          {more && <button onClick={more.onClick} style={{ background: "#ffffff14", color: "#fff", border: "1px solid #ffffff40", borderRadius: 10, padding: MOBILE ? "13px 14px" : "13px 22px", fontSize: 15, fontWeight: 800, letterSpacing: 1, cursor: "pointer" }}>{more.label}</button>}
        </div>
      </div>
    </div>
  );
}

// A dim second line ("Top traits revealed: ..."), for children.
export const Dim = ({ children }) => <div style={{ color: "#94a3b8", marginTop: 4 }}>{children}</div>;
