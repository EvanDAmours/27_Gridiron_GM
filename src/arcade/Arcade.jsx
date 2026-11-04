// Arcade mode (beta): a full-screen canvas; the title screen, team picker and menus are drawn on
// it by game.js, so touch, mouse and keyboard all work the same way everywhere.
import { useEffect, useRef } from "react";
import { ArcadeGame } from "./game.js";

export default function Arcade() {
  const ref = useRef(null);
  useEffect(() => {
    const game = new ArcadeGame(ref.current, { userTi: 17, oppTi: 8, onQuit: () => { location.href = import.meta.env.BASE_URL; } }); // Giants vs Texans to start
    return () => game.destroy();
  }, []);
  return (
    <div style={{ height: "100dvh", width: "100vw", background: "#0b0e14", userSelect: "none", overflow: "hidden" }}>
      <canvas ref={ref} style={{ display: "block", touchAction: "none", imageRendering: "pixelated", outline: "none" }} />
    </div>
  );
}
