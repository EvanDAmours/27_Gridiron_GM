// The big moments, each its own full-screen card in your team's colors: clinching a playoff spot,
// the division or the top seed; one of your players breaking a record; signing a star in free
// agency; a blockbuster trade; and the season kickoff preview. One look for all of them, like the Super Bowl's.
import React from "react";
import { C, TeamLogo, Face, Bdg } from "./ui.jsx";
import { MOBILE } from "./mobile.js";
import goldJacket from "./assets/gold-jacket.webp";
import { Jersey } from "./Jersey.jsx";
import ChampionRing from "./ChampionRing.jsx";

const CONFETTI = Array.from({ length: 42 }, (_, i) => ({ left: (i * 37) % 100, delay: (i * 0.13) % 2.4, dur: 2.6 + ((i * 7) % 10) / 10, rot: (i * 47) % 360, size: 6 + (i % 4) * 2 }));
const CSS = `
@keyframes mmFall { 0% { transform: translateY(-40px) rotate(0deg); opacity: 0 } 8% { opacity: 1 } 100% { transform: translateY(105vh) rotate(540deg); opacity: .9 } }
@keyframes mmIn { from { transform: translateY(18px) scale(.97); opacity: 0 } to { transform: none; opacity: 1 } }
@keyframes mmShine { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
@keyframes mmPulse { 0%, 100% { box-shadow: 0 0 0 0 var(--mm-glow) } 50% { box-shadow: 0 0 40px 6px var(--mm-glow) } }
.mm-title { background: linear-gradient(100deg, #fff 30%, #fde68a 50%, #fff 70%); background-size: 200% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; animation: mmShine 3.2s linear infinite; }
`;

const KICKER = { top: "THE ROAD GOES THROUGH", div: "DIVISION CHAMPIONS", berth: "PLAYOFF BOUND" };

function Confetti({ colors }) {
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {CONFETTI.map((c, i) => <span key={i} style={{ position: "absolute", top: 0, left: `${c.left}%`, width: c.size, height: c.size * 1.6, background: colors[i % colors.length], borderRadius: 2, transform: `rotate(${c.rot}deg)`, animation: `mmFall ${c.dur}s ${c.delay}s linear infinite` }} />)}
    </div>
  );
}

const Line = ({ k, v, tone }) => (
  <div style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "6px 0", borderBottom: "1px solid #ffffff14" }}>
    <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.3, color: "#cbd5e1", minWidth: MOBILE ? 92 : 128 }}>{k}</span>
    <span style={{ fontSize: MOBILE ? 14 : 15.5, fontWeight: 700, color: tone || "#fff" }}>{v}</span>
  </div>
);

// m: { kind: clinch | record | signing | kickoff, team, ... } (see App for each one's fields)
// The Hall of Fame: the gold jacket comes down, the bust is unveiled, Canton welcomes him.
function HofCeremony({ m, onClose }) {
  const t = m.team;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 4300, background: "radial-gradient(ellipse at 50% 25%, #78350fcc, #0a0603f5 70%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <style>{CSS + "@keyframes hofDrop{0%{transform:translateY(-120px) rotate(-6deg);opacity:0}60%{transform:translateY(8px) rotate(2deg);opacity:1}100%{transform:none}} @keyframes hofSway{0%,100%{transform:rotate(-1.5deg)}50%{transform:rotate(1.5deg)}} @keyframes hofRays{to{transform:rotate(360deg)}}"}</style>
      <div aria-hidden style={{ position: "absolute", width: 900, height: 900, top: "50%", left: "50%", marginLeft: -450, marginTop: -560, background: "repeating-conic-gradient(#fde68a14 0 6deg, transparent 6deg 18deg)", animation: "hofRays 60s linear infinite", pointerEvents: "none", borderRadius: "50%", maskImage: "radial-gradient(circle, #000 20%, transparent 65%)", WebkitMaskImage: "radial-gradient(circle, #000 20%, transparent 65%)" }} />
      <div role="dialog" aria-label="Hall of Fame" onClick={(e) => e.stopPropagation()} style={{ position: "relative", width: "min(620px, 100%)", maxHeight: "calc(var(--vh, 100vh) - 32px)", overflowY: "auto", textAlign: "center", background: "linear-gradient(170deg, #1c1206, #0b0703 70%)", border: "2px solid #d4a017", borderRadius: 18, padding: MOBILE ? "18px 16px" : "22px 30px 26px", color: "#fff", boxShadow: "0 0 90px #d4a01744, 0 30px 80px #000c", animation: "mmIn .5s ease-out" }}>
        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 4, color: "#d4a017" }}>PRO FOOTBALL HALL OF FAME</div>
        <div style={{ fontFamily: "Georgia, serif", fontSize: MOBILE ? 15 : 17, color: "#fde68a", letterSpacing: 3, marginTop: 2 }}>CLASS OF {m.cls}</div>
        <div style={{ position: "relative", height: MOBILE ? 190 : 230, marginTop: 6 }}>
          <img src={goldJacket} alt="The gold jacket" style={{ position: "absolute", left: "50%", marginLeft: MOBILE ? -95 : -115, width: MOBILE ? 190 : 230, height: MOBILE ? 190 : 230, objectFit: "contain", animation: "hofDrop 1.2s cubic-bezier(.2,.8,.3,1) both, hofSway 5s 1.2s ease-in-out infinite", filter: "drop-shadow(0 12px 28px #000c) drop-shadow(0 0 22px #fbbf2455)" }} />
          {m.p.face && <div style={{ position: "absolute", left: "50%", bottom: -6, transform: "translateX(-50%)", borderRadius: "50%", padding: 4, background: "linear-gradient(135deg,#fde68a,#b45309,#fde68a)", boxShadow: "0 6px 20px #000b", animation: "mmIn .6s 1s ease-out both" }}><Face s={m.p.face} sz={MOBILE ? 64 : 78} /></div>}
        </div>
        <div className="mm-title" style={{ fontFamily: "Georgia, serif", fontSize: MOBILE ? 30 : 42, fontWeight: 900, letterSpacing: 1, marginTop: 14, lineHeight: 1.05 }}>{m.p.name}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 6 }}><Bdg pos={m.p.pos} /><TeamLogo t={t} sz={24} /><span style={{ fontSize: 14, color: "#e7cf8a" }}>{m.tagline || `${t.city} ${t.name}`}</span></div>
        {m.sub && <div style={{ fontSize: MOBILE ? 14 : 15.5, color: "#e2e8f0", marginTop: 12, lineHeight: 1.5, fontStyle: "italic" }}>{m.sub}</div>}
        {m.lines?.length > 0 && <div style={{ marginTop: 12, textAlign: "left" }}>{m.lines.map(([k, v, tone]) => <Line key={k} k={k} v={v} tone={tone || "#fde68a"} />)}</div>}
        <button onClick={onClose} style={{ marginTop: 18, width: "100%", background: "linear-gradient(90deg,#b45309,#fbbf24,#b45309)", color: "#1c1206", border: 0, borderRadius: 10, padding: "12px 0", fontSize: 16, fontWeight: 900, letterSpacing: 2, cursor: "pointer" }}>WELCOME TO CANTON →</button>
      </div>
    </div>
  );
}

// Jersey night: his number goes up to the rafters (or his name onto the Ring of Honor) under the lights.
function RaftersNight({ m, onClose }) {
  const t = m.team, ring = m.kind === "ring";
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 2600, background: `radial-gradient(ellipse at 50% 0%, ${t.clr || "#1e3a8a"}cc, #02040af5 65%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <style>{CSS + "@keyframes raise{0%{transform:translateY(160px) scale(.9);opacity:0}70%{transform:translateY(-6px)}100%{transform:none;opacity:1}} @keyframes beam{0%,100%{opacity:.35}50%{opacity:.7}}"}</style>
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "conic-gradient(from 160deg at 20% -5%, transparent 0deg, #ffffff22 12deg, transparent 26deg), conic-gradient(from 174deg at 80% -5%, transparent 0deg, #ffffff22 12deg, transparent 26deg)", animation: "beam 4s ease-in-out infinite" }} />
      <div role="dialog" aria-label={ring ? "Ring of Honor" : "Jersey retirement"} onClick={(e) => e.stopPropagation()} style={{ position: "relative", width: "min(560px, 100%)", textAlign: "center", color: "#fff", animation: "mmIn .45s ease-out" }}>
        <div style={{ fontSize: 12.5, fontWeight: 900, letterSpacing: 4, color: t.ac === "#ffffff" ? "#fde68a" : (t.ac || "#fde68a") }}>{ring ? "RING OF HONOR" : "JERSEY RETIREMENT NIGHT"}</div>
        <div style={{ fontSize: 13, color: "#cbd5e1", marginTop: 2 }}>{t.city} {t.name} · {m.yr}</div>
        <div style={{ display: "flex", justifyContent: "center", margin: "18px 0 6px", animation: "raise 1.6s cubic-bezier(.2,.8,.3,1) both" }}>
          {ring ? (
            <div style={{ border: `3px solid ${t.ac || "#fde68a"}`, borderRadius: 10, background: `linear-gradient(180deg, ${t.clr}, #0b1220)`, padding: "14px 26px", boxShadow: "0 10px 40px #000c" }}>
              <div style={{ fontSize: 11, letterSpacing: 3, color: "#fde68a", fontWeight: 900 }}>{t.name.toUpperCase()} RING OF HONOR</div>
              <div style={{ fontSize: MOBILE ? 26 : 34, fontWeight: 900, letterSpacing: 2 }}>{m.p.name.toUpperCase()}</div>
              <div style={{ fontSize: 13, color: "#cbd5e1" }}>{m.p.pos}{m.p.num ? ` · #${m.p.num}` : ""}</div>
            </div>
          ) : (
            <div style={{ position: "relative", padding: "10px 18px 4px", border: `3px solid ${t.ac || "#fde68a"}`, borderRadius: "6px 6px 50% 50% / 6px 6px 18% 18%", background: `linear-gradient(180deg, ${t.clr}, #0b1220)`, boxShadow: "0 12px 50px #000c" }}>
              <Jersey team={t} name={m.p.name} num={m.p.num} size={MOBILE ? 150 : 190} />
              <div style={{ fontSize: 12, letterSpacing: 2, fontWeight: 900, color: "#fde68a", paddingBottom: 10 }}>NO ONE WILL WEAR #{m.p.num} AGAIN</div>
            </div>
          )}
        </div>
        <div className="mm-title" style={{ fontSize: MOBILE ? 26 : 34, fontWeight: 900, fontStyle: "italic", marginTop: 8 }}>{m.p.name}</div>
        {m.sub && <div style={{ fontSize: 15, color: "#e2e8f0", marginTop: 6, lineHeight: 1.45 }}>{m.sub}</div>}
        {m.lines?.length > 0 && <div style={{ marginTop: 10, textAlign: "left", background: "#00000055", borderRadius: 12, padding: "4px 14px" }}>{m.lines.map(([k, v, tone]) => <Line key={k} k={k} v={v} tone={tone} />)}</div>}
        <button onClick={onClose} style={{ marginTop: 16, width: "100%", background: t.ac || "#fde68a", color: "#0b1220", border: 0, borderRadius: 10, padding: "12px 0", fontSize: 16, fontWeight: 900, letterSpacing: 1, cursor: "pointer" }}>CONTINUE →</button>
      </div>
    </div>
  );
}

// Ring night: before the home opener the champions get their rings and the banner goes up.
function RingNight({ m, onClose }) {
  const t = m.team;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 2600, background: "radial-gradient(ellipse at 50% 30%, #3b2a0acc, #02040af5 70%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <style>{CSS + "@keyframes ringSpin{0%{transform:rotateY(80deg) scale(.6);opacity:0}100%{transform:none;opacity:1}}"}</style>
      <Confetti colors={[t.clr || "#1e3a8a", "#e8c45a", "#fde68a", "#ffffff"]} />
      <div role="dialog" aria-label="Ring night" onClick={(e) => e.stopPropagation()} style={{ position: "relative", width: "min(600px, 100%)", textAlign: "center", color: "#fff", background: "linear-gradient(170deg,#1c1206,#0b0703 70%)", border: "2px solid #d4a017", borderRadius: 18, padding: MOBILE ? "18px 16px" : "22px 28px", boxShadow: "0 0 80px #d4a01744", animation: "mmIn .45s ease-out" }}>
        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 4, color: "#d4a017" }}>RING NIGHT · {m.yr + 1} HOME OPENER</div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 8, perspective: 600 }}><div style={{ animation: "ringSpin 1.3s cubic-bezier(.2,.8,.3,1) both" }}><ChampionRing t={t} yr={m.yr} titles={m.titles} size={MOBILE ? 220 : 270} /></div></div>
        <div className="mm-title" style={{ fontSize: MOBILE ? 26 : 34, fontWeight: 900, fontStyle: "italic", marginTop: 4 }}>{m.sbName || `${m.yr} WORLD CHAMPIONS`}</div>
        <div style={{ fontSize: 15, color: "#e2e8f0", marginTop: 6, lineHeight: 1.45 }}>{m.score ? <>Champions by {m.score}{m.opp ? <> over the {m.opp}</> : null}. </> : null}The {t.city} {t.name} raise the banner and hand out the rings before the {m.yr + 1} opener.</div>
        {m.names?.length > 0 && <div style={{ marginTop: 12, background: "#00000055", borderRadius: 12, padding: "10px 14px", textAlign: "left" }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.5, color: "#d4a017", marginBottom: 4 }}>GETTING THEIR RINGS</div>
          <div style={{ fontSize: 14, color: "#fde68a", lineHeight: 1.6 }}>{m.names.join(" · ")}</div>
        </div>}
        <button onClick={onClose} style={{ marginTop: 16, width: "100%", background: "linear-gradient(90deg,#b45309,#fbbf24,#b45309)", color: "#1c1206", border: 0, borderRadius: 10, padding: "12px 0", fontSize: 16, fontWeight: 900, letterSpacing: 2, cursor: "pointer" }}>DEFEND THE TITLE →</button>
      </div>
    </div>
  );
}

export default function Moment({ m, onClose }) {
  if (!m?.team) return null;
  if (m.kind === "hof") return <HofCeremony m={m} onClose={onClose} />;
  if (m.kind === "jersey" || m.kind === "ring") return <RaftersNight m={m} onClose={onClose} />;
  if (m.kind === "rings") return <RingNight m={m} onClose={onClose} />;
  const t = m.team;
  const clr = t.clr || "#1e3a8a", ac = t.ac || "#f59e0b";
  const party = m.kind === "clinch" || m.kind === "record";
  const kicker = m.kind === "clinch" ? (m.level === "top" ? "NO. 1 SEED CLINCHED" : m.level === "div" ? "DIVISION CLINCHED" : "PLAYOFF BERTH CLINCHED")
    : m.kind === "record" ? (m.nfl ? "NEW NFL RECORD" : "NEW FRANCHISE RECORD")
    : m.kind === "signing" ? "SIGNING DAY" : m.kind === "trade" ? "BREAKING · BLOCKBUSTER TRADE" : m.kind === "legend" ? "A FRANCHISE LEGEND RETIRES" : `THE ${m.yr} SEASON`;
  const title = m.kind === "clinch" ? (m.level === "top" ? `${KICKER.top} ${t.city.toUpperCase()}` : m.level === "div" ? `${t.c || ""} ${(t.d || "").toUpperCase()} CHAMPIONS`.trim() : `${t.name.toUpperCase()} ARE ${KICKER.berth}`)
    : m.kind === "record" ? m.p.name.toUpperCase()
    : m.kind === "signing" ? `WELCOME TO ${t.city.toUpperCase()}`
    : m.kind === "legend" ? m.p.name.toUpperCase()
    : m.kind === "trade" ? (m.got ? `${t.name.toUpperCase()} LAND ${m.p.name.split(" ").slice(-1)[0].toUpperCase()}` : `${m.p.name.split(" ").slice(-1)[0].toUpperCase()} TRADED`)
    : `${t.city.toUpperCase()} ${t.name.toUpperCase()}`;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 2600, background: `radial-gradient(ellipse at 50% 20%, ${clr}cc, #030712f2 70%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <style>{CSS}</style>
      {party && <Confetti colors={[clr, ac, "#fde68a", "#ffffff"]} />}
      <div role="dialog" aria-label={kicker} onClick={(e) => e.stopPropagation()} style={{ "--mm-glow": `${ac}55`, position: "relative", width: "min(660px, 100%)", maxHeight: "calc(var(--vh, 100vh) - 32px)", overflowY: "auto", background: `linear-gradient(160deg, ${clr}, #0b1220 62%)`, border: `2px solid ${ac}`, borderRadius: 18, padding: MOBILE ? "18px 16px" : "26px 30px", color: "#fff", animation: "mmIn .45s ease-out, mmPulse 2.8s 0.5s ease-in-out infinite", boxShadow: "0 30px 80px #000c" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <TeamLogo t={t} sz={MOBILE ? 56 : 76} glow />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 900, letterSpacing: 3, color: ac === "#ffffff" ? "#fde68a" : ac }}>{kicker}</div>
            <div className="mm-title" style={{ fontSize: MOBILE ? 26 : 38, fontWeight: 900, fontStyle: "italic", lineHeight: 1.02, letterSpacing: 0.5 }}>{title}</div>
          </div>
        </div>
        {m.sub && <div style={{ fontSize: MOBILE ? 14 : 16, color: "#e2e8f0", marginTop: 12, lineHeight: 1.45 }}>{m.sub}</div>}

        {m.kind === "record" && (
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16, background: "#00000040", borderRadius: 12, padding: "14px 16px" }}>
            <Face s={m.p.face} sz={MOBILE ? 64 : 84} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Bdg pos={m.p.pos} /><span style={{ fontSize: 14, color: "#cbd5e1" }}>{m.label}</span></div>
              <div style={{ fontSize: MOBILE ? 40 : 56, fontWeight: 900, lineHeight: 1, color: "#fde68a" }}>{m.value}</div>
              {m.prev && <div style={{ fontSize: 13.5, color: "#cbd5e1", marginTop: 4 }}>Passing {m.prev}</div>}
            </div>
          </div>
        )}
        {m.kind === "legend" && (
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16, background: "linear-gradient(135deg,#78350f66,#00000040)", border: "1px solid #f59e0b55", borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ borderRadius: "50%", padding: 3, background: "linear-gradient(135deg,#fde68a,#b45309)" }}><Face s={m.p.face} sz={MOBILE ? 72 : 96} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Bdg pos={m.p.pos} /><span style={{ fontSize: 14, color: "#fde68a", fontWeight: 800 }}>Thank you, {m.p.name.split(" ").slice(-1)[0]}.</span></div>
              <div style={{ fontSize: MOBILE ? 36 : 48, fontWeight: 900, lineHeight: 1, color: "#fde68a", marginTop: 4 }}>{m.p.peak || m.p.ovr}<span style={{ fontSize: 14, color: "#cbd5e1", marginLeft: 6 }}>peak OVR</span></div>
            </div>
          </div>
        )}
        {m.kind === "signing" && (
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16, background: "#00000040", borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ position: "relative" }}>
              <Face s={m.p.face} sz={MOBILE ? 72 : 96} />
              <span style={{ position: "absolute", right: -8, bottom: -6, background: ac, color: "#0b1220", fontWeight: 900, fontSize: 15, borderRadius: 8, padding: "1px 7px" }}>#{m.num}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: MOBILE ? 20 : 26, fontWeight: 900 }}>{m.p.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}><Bdg pos={m.p.pos} /><span style={{ fontSize: 14, color: "#cbd5e1" }}>{m.p.ovr} OVR · age {m.p.age}</span></div>
              <div style={{ fontSize: MOBILE ? 18 : 22, fontWeight: 900, color: "#fde68a", marginTop: 6 }}>{m.yrs} years · ${(+m.sal).toFixed(1)}M a year</div>
            </div>
          </div>
        )}
        {m.kind === "trade" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 16, background: "#00000040", borderRadius: 12, padding: "14px 16px" }}>
            <TeamLogo t={m.got ? m.other : t} sz={MOBILE ? 44 : 60} />
            <div style={{ textAlign: "center" }}>
              <Face s={m.p.face} sz={MOBILE ? 64 : 84} />
              <div style={{ fontSize: MOBILE ? 16 : 19, fontWeight: 900, marginTop: 4 }}>{m.p.name}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Bdg pos={m.p.pos} /><span style={{ fontSize: 13, color: "#cbd5e1" }}>{m.p.ovr} OVR · age {m.p.age}</span></div>
            </div>
            <span style={{ fontSize: 28, color: "#fde68a", fontWeight: 900 }}>→</span>
            <TeamLogo t={m.got ? t : m.other} sz={MOBILE ? 44 : 60} />
          </div>
        )}
        {m.lines?.length > 0 && <div style={{ marginTop: 14 }}>{m.lines.map(([k, v, tone]) => <Line key={k} k={k} v={v} tone={tone} />)}</div>}
        {m.note && <div style={{ fontSize: 13, color: "#cbd5e1", marginTop: 12, fontStyle: "italic" }}>{m.note}</div>}
        <button onClick={onClose} style={{ marginTop: 18, width: "100%", background: ac, color: "#0b1220", border: 0, borderRadius: 10, padding: "12px 0", fontSize: 16, fontWeight: 900, letterSpacing: 1, cursor: "pointer" }}>{m.kind === "kickoff" ? "LET'S GO →" : "CONTINUE →"}</button>
      </div>
    </div>
  );
}
