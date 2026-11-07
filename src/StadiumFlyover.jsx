// The drone shot before kickoff: the home club's stadium (Stadium.jsx, its real bowl and crowd) seen
// from high up and off to one side, the camera sweeping round and dropping in until the field fills
// the screen, then a fade into the game. A few seconds; a tap (or any key) skips it.
import React, { useEffect, useRef } from "react";
import Stadium, { STADIUMS } from "./Stadium.jsx";

const LEN = 5600; // ms, start to finish
const CSS = `
@keyframes flyCam {
  0%   { transform: perspective(1300px) rotateX(58deg) rotateZ(-28deg) scale(0.62) translateY(-4%); }
  45%  { transform: perspective(1300px) rotateX(46deg) rotateZ(-12deg) scale(0.92) translateY(-2%); }
  78%  { transform: perspective(1300px) rotateX(24deg) rotateZ(-3deg) scale(1.55) translateY(0); }
  100% { transform: perspective(1300px) rotateX(0deg) rotateZ(0deg) scale(2.7) translateY(0); }
}
@keyframes flyFade { 0% { opacity: 0 } 8% { opacity: 1 } 86% { opacity: 1 } 100% { opacity: 0 } }
@keyframes flyText { 0% { opacity: 0; transform: translateY(14px) } 14% { opacity: 1; transform: none } 70% { opacity: 1 } 84% { opacity: 0 } 100% { opacity: 0 } }
@keyframes flyClouds { from { transform: translateX(0) } to { transform: translateX(-18%) } }
`;

// a plain field for the shot: striped grass, white lines every ten yards, each club's end zone
function Field({ home, away }) {
  const lines = Array.from({ length: 11 }, (_, i) => 10 + i * 8);
  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "1 / 0.45", background: "repeating-linear-gradient(90deg, #5f9a45 0 4%, #578f3f 4% 8%)", boxShadow: "inset 0 0 0 3px #e8ecdf" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "8.33%", background: away?.clr || "#334155", opacity: 0.9 }} />
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "8.33%", background: home?.clr || "#334155", opacity: 0.9 }} />
      {lines.map((x) => <div key={x} style={{ position: "absolute", left: `${x}%`, top: 0, bottom: 0, width: 2, background: "#eef2e6", opacity: 0.85 }} />)}
    </div>
  );
}

export default function StadiumFlyover({ home, away, night = false, label, onDone }) {
  const done = useRef(false);
  const finish = () => { if (!done.current) { done.current = true; onDone?.(); } };
  useEffect(() => {
    const t = setTimeout(finish, LEN);
    const key = () => finish();
    window.addEventListener("keydown", key);
    return () => { clearTimeout(t); window.removeEventListener("keydown", key); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const st = STADIUMS[home?.ab];
  const sky = night ? "radial-gradient(ellipse at 50% 20%, #1b2a4a, #05070d 70%)" : "radial-gradient(ellipse at 50% 15%, #8fb8e8, #3b5f8f 55%, #1a2a40)";
  return (
    <div onClick={finish} role="presentation" style={{ position: "fixed", inset: 0, zIndex: 9600, background: sky, overflow: "hidden", cursor: "pointer", animation: `flyFade ${LEN}ms ease-in-out forwards` }}>
      <style>{CSS}</style>
      {/* the stadium, the camera sweeping in */}
      <div style={{ position: "absolute", left: "50%", top: "52%", width: "min(1200px, 120vw)", transform: "translate(-50%, -50%)" }}>
        <div style={{ transformOrigin: "50% 50%", animation: `flyCam ${LEN}ms cubic-bezier(.45,.05,.35,1) forwards`, filter: night ? "brightness(.9)" : "none" }}>
          <Stadium home={home?.ab} night={night}><Field home={home} away={away} /></Stadium>
        </div>
      </div>
      {/* a little haze drifting past the lens */}
      {!night && <div aria-hidden style={{ position: "absolute", inset: "-10% -30% auto -10%", height: "45%", background: "radial-gradient(ellipse at 30% 50%, #ffffff55, transparent 60%), radial-gradient(ellipse at 75% 40%, #ffffff33, transparent 55%)", animation: `flyClouds ${LEN}ms linear forwards`, pointerEvents: "none" }} />}
      {/* the lower third: where we are and who's playing */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: "9%", textAlign: "center", pointerEvents: "none" }}>
        <div style={{ display: "inline-block", animation: `flyText ${LEN}ms ease forwards`, background: "#0b0e14e6", borderTop: `4px solid ${home?.clr || "#ffd166"}`, padding: "10px 22px 12px" }}>
          <div style={{ font: "700 13px/1.2 system-ui, sans-serif", letterSpacing: 3, color: "#ffd166" }}>{label || "LIVE FROM"}</div>
          <div style={{ font: "900 clamp(20px, 3.4vw, 34px)/1.1 system-ui, sans-serif", color: "#fff", letterSpacing: 1 }}>{st?.name || `${home?.city || ""}`.toUpperCase()}</div>
          {away && home && <div style={{ font: "800 clamp(13px, 1.7vw, 17px)/1.3 system-ui, sans-serif", color: "#cbd5e1", marginTop: 4 }}>{(away.name || away.ab || "").toUpperCase()} AT {(home.name || home.ab || "").toUpperCase()}</div>}
        </div>
      </div>
      <div style={{ position: "absolute", right: 14, bottom: 12, font: "700 12px system-ui, sans-serif", color: "#ffffffaa", letterSpacing: 1 }}>TAP TO SKIP</div>
    </div>
  );
}
