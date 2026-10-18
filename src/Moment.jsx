// The big moments, each its own full-screen card in your team's colors: clinching a playoff spot,
// the division or the top seed; one of your players breaking a record; signing a star in free
// agency; and the season kickoff preview. One look for all of them, like the Super Bowl's.
import React from "react";
import { C, TeamLogo, Face, Bdg } from "./ui.jsx";
import { MOBILE } from "./mobile.js";

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
export default function Moment({ m, onClose }) {
  if (!m?.team) return null;
  const t = m.team;
  const clr = t.clr || "#1e3a8a", ac = t.ac || "#f59e0b";
  const party = m.kind === "clinch" || m.kind === "record";
  const kicker = m.kind === "clinch" ? (m.level === "top" ? "NO. 1 SEED CLINCHED" : m.level === "div" ? "DIVISION CLINCHED" : "PLAYOFF BERTH CLINCHED")
    : m.kind === "record" ? (m.nfl ? "NEW NFL RECORD" : "NEW FRANCHISE RECORD")
    : m.kind === "signing" ? "SIGNING DAY" : `THE ${m.yr} SEASON`;
  const title = m.kind === "clinch" ? (m.level === "top" ? `${KICKER.top} ${t.city.toUpperCase()}` : m.level === "div" ? `${t.c || ""} ${(t.d || "").toUpperCase()} CHAMPIONS`.trim() : `${t.name.toUpperCase()} ARE ${KICKER.berth}`)
    : m.kind === "record" ? m.p.name.toUpperCase()
    : m.kind === "signing" ? `WELCOME TO ${t.city.toUpperCase()}`
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
        {m.lines?.length > 0 && <div style={{ marginTop: 14 }}>{m.lines.map(([k, v, tone]) => <Line key={k} k={k} v={v} tone={tone} />)}</div>}
        {m.note && <div style={{ fontSize: 13, color: "#cbd5e1", marginTop: 12, fontStyle: "italic" }}>{m.note}</div>}
        <button onClick={onClose} style={{ marginTop: 18, width: "100%", background: ac, color: "#0b1220", border: 0, borderRadius: 10, padding: "12px 0", fontSize: 16, fontWeight: 900, letterSpacing: 1, cursor: "pointer" }}>{m.kind === "kickoff" ? "LET'S GO →" : "CONTINUE →"}</button>
      </div>
    </div>
  );
}
