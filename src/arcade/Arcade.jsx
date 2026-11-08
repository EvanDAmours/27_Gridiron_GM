// Arcade mode (beta): a full-screen canvas; the title screen, team picker and menus are drawn on
// it by game.js, so touch, mouse and keyboard all work the same way everywhere. Before each game
// a drone shot of the home stadium (StadiumFlyover) plays over it.
import { useEffect, useRef, useState } from "react";
import { ArcadeGame } from "./game.js";
import { poseProbe } from "./retro.js";
import { TEAMS } from "./bridge.js";
import StadiumFlyover from "../StadiumFlyover.jsx";
import { hasFlyover } from "../flyovers.js";

export default function Arcade() {
  const ref = useRef(null);
  const [fly, setFly] = useState(null), gameRef = useRef(null);
  useEffect(() => {
    const game = new ArcadeGame(ref.current, { userTi: 17, oppTi: 8, onQuit: () => { location.href = import.meta.env.BASE_URL; } }); // Giants vs Texans to start
    gameRef.current = game; game.wantsIntro = () => hasFlyover(TEAMS[game.userTi]?.ab); // (a new game at a stadium with a flyover holds dark until it's done)
    if (typeof window !== "undefined") { window.arcadeGame = game; window.arcadePoseProbe = poseProbe; window.arcadeTeams = TEAMS; } // (for playtesting)
    // a new game starting: the flyover, for the home club. (Keyed on the game's start count, not on seeing the
    // loading screen: with the league already loaded that screen lasts a few milliseconds and a poll can miss it.)
    let last = game.startSeq || 0, n = 0;
    const iv = setInterval(() => { const s = game.startSeq || 0; if (s !== last) { last = s; if (hasFlyover(TEAMS[game.userTi]?.ab)) setFly({ home: TEAMS[game.userTi], away: TEAMS[game.oppTi], wx: game.wxNow, key: ++n }); } }, 60);
    return () => { clearInterval(iv); game.destroy(); };
  }, []);
  return (
    <div style={{ height: "100dvh", width: "100vw", boxSizing: "border-box", padding: "env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)", background: "#0b0e14", userSelect: "none", overflow: "hidden" }}>
      <canvas ref={ref} style={{ display: "block", touchAction: "none", imageRendering: "pixelated", outline: "none" }} />
      {fly && <StadiumFlyover key={fly.key} home={fly.home} away={fly.away} wx={fly.wx} onDone={() => { setFly(null); if (gameRef.current) gameRef.current.intro = 0; }} />}
    </div>
  );
}
