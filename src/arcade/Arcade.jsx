// Arcade mode (beta): a full-screen canvas; the title screen, team picker and menus are drawn on
// it by game.js, so touch, mouse and keyboard all work the same way everywhere. Before each game
// a drone shot of the home stadium (StadiumFlyover) plays over it.
import { useEffect, useRef, useState } from "react";
import { ArcadeGame } from "./game.js";
import { poseProbe } from "./retro.js";
import { TEAMS } from "./bridge.js";
import StadiumFlyover from "../StadiumFlyover.jsx";

export default function Arcade() {
  const ref = useRef(null);
  const [fly, setFly] = useState(null);
  useEffect(() => {
    const game = new ArcadeGame(ref.current, { userTi: 17, oppTi: 8, onQuit: () => { location.href = import.meta.env.BASE_URL; } }); // Giants vs Texans to start
    if (typeof window !== "undefined") { window.arcadeGame = game; window.arcadePoseProbe = poseProbe; } // (for playtesting)
    // a new game starting (the title screen gives way to the loading one): the flyover, for the home club
    let last = game.mode, n = 0;
    const iv = setInterval(() => { const m = game.mode; if (m === "loading" && last !== "loading") setFly({ home: TEAMS[game.userTi], away: TEAMS[game.oppTi], wx: game.wxNow, key: ++n }); last = m; }, 60);
    return () => { clearInterval(iv); game.destroy(); };
  }, []);
  return (
    <div style={{ height: "100dvh", width: "100vw", background: "#0b0e14", userSelect: "none", overflow: "hidden" }}>
      <canvas ref={ref} style={{ display: "block", touchAction: "none", imageRendering: "pixelated", outline: "none" }} />
      {fly && <StadiumFlyover key={fly.key} home={fly.home} away={fly.away} wx={fly.wx} onDone={() => setFly(null)} />}
    </div>
  );
}
