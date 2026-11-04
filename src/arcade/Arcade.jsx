// Arcade mode (beta): the team picker, and the canvas the game runs on (game.js).
import { useEffect, useRef, useState } from "react";
import { TEAMS } from "./bridge.js";
import { ArcadeGame } from "./game.js";

const BG = "#0b0e14", TXT = "#eef2f5", MUTED = "#9aa7b2";
const PIX = { fontFamily: "'Courier New', ui-monospace, monospace", fontWeight: 900, letterSpacing: 1, textTransform: "uppercase" };
const btn = (extra = {}) => ({ ...PIX, background: "#1b2230", color: TXT, border: "3px solid #3d4a56", boxShadow: "inset -3px -3px 0 #0b0e14, inset 3px 3px 0 #2c3744", borderRadius: 0, padding: "12px 10px", fontSize: 13, cursor: "pointer", touchAction: "manipulation", ...extra });

export default function Arcade() {
  const [userTi, setUser] = useState(0), [oppTi, setOpp] = useState(1);
  const [game, setGame] = useState(null);
  if (!game) {
    const sel = (v, set) => (
      <select value={v} onChange={(e) => set(+e.target.value)} style={{ ...btn(), width: "100%", appearance: "auto", textTransform: "none", letterSpacing: 0, fontWeight: 700 }}>
        {TEAMS.map((t, i) => <option key={t.ab} value={i}>{t.city} {t.name}</option>)}
      </select>
    );
    return (
      <div style={{ minHeight: "100dvh", background: BG, color: TXT, fontFamily: PIX.fontFamily, padding: 20, display: "flex", flexDirection: "column", gap: 14, maxWidth: 420, margin: "0 auto" }}>
        <h1 style={{ ...PIX, margin: "20px 0 0", fontSize: 26, color: "#ffd166", textShadow: "3px 3px 0 #000" }}>Gridiron Arcade</h1>
        <div style={{ color: MUTED, fontSize: 13, lineHeight: 1.4 }}>Beta. You run the offense; the engine plays everything else. Touch the field to snap, pull back to throw, release to let it fly. Swipe up or down to steer a runner.</div>
        <label style={{ fontSize: 12, color: MUTED, ...PIX }}>Your team{sel(userTi, setUser)}</label>
        <label style={{ fontSize: 12, color: MUTED, ...PIX }}>Opponent{sel(oppTi, setOpp)}</label>
        <button style={btn({ background: TEAMS[userTi].clr, borderColor: TEAMS[userTi].ac, fontSize: 18, padding: 16 })} onClick={() => setGame({ userTi, oppTi })}>Kick off</button>
        <a href={import.meta.env.BASE_URL} style={{ color: MUTED, fontSize: 12, textAlign: "center", marginTop: 6, ...PIX }}>← Back to Football GM</a>
      </div>
    );
  }
  return <GameCanvas userTi={game.userTi} oppTi={game.oppTi} onQuit={() => setGame(null)} />;
}

function GameCanvas({ userTi, oppTi, onQuit }) {
  const ref = useRef(null), gameRef = useRef(null);
  const [muted, setMuted] = useState(false);
  useEffect(() => {
    const game = new ArcadeGame(ref.current, { userTi, oppTi, teams: { user: TEAMS[userTi], opp: TEAMS[oppTi] }, onQuit });
    gameRef.current = game; setMuted(game.muted);
    return () => game.destroy();
  }, [userTi, oppTi, onQuit]);
  return (
    <div style={{ height: "100dvh", background: BG, userSelect: "none", position: "relative" }}>
      <canvas ref={ref} style={{ display: "block", touchAction: "none", imageRendering: "pixelated" }} />
      <button onClick={() => setMuted(gameRef.current?.toggleMute())} style={{ ...btn({ padding: "4px 8px", fontSize: 10 }), position: "absolute", right: 58, top: 30, opacity: 0.6 }}>{muted ? "Sound off" : "Sound on"}</button>
      <button onClick={onQuit} style={{ ...btn({ padding: "4px 8px", fontSize: 10 }), position: "absolute", right: 6, top: 30, opacity: 0.6 }}>Quit</button>
    </div>
  );
}
