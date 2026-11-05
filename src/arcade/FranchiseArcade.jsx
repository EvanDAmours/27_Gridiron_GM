// Play in Arcade: your franchise game of the week on the arcade field, over the whole app. The app
// builds the game (franchise.js) and books it when you leave the final box score. Loaded lazily, so
// none of the arcade is in the GM app's first load.
import { useEffect, useRef } from "react";
import { ArcadeGame } from "./game.js";

export default function FranchiseArcade({ g, teams, onPlay, onFinish }) {
  const ref = useRef(null);
  const cb = useRef({ onPlay, onFinish }); cb.current = { onPlay, onFinish };
  useEffect(() => {
    const game = new ArcadeGame(ref.current, {
      game: g, teams, skipMenu: true, locked: true,
      onPlay: (x) => cb.current.onPlay?.(x),
      onFinish: (x) => { const d = document; if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen?.() ?? d.webkitExitFullscreen?.())?.catch?.(() => {}); cb.current.onFinish?.(x); },
    });
    if (typeof window !== "undefined") window.arcadeGame = game; // (for playtesting)
    return () => game.destroy();
  }, [g]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div role="application" aria-label="Arcade game" style={{ position: "fixed", inset: 0, zIndex: 9000, height: "100dvh", width: "100vw", background: "#0b0e14", userSelect: "none", overflow: "hidden" }}>
      <canvas ref={ref} tabIndex={0} style={{ display: "block", touchAction: "none", imageRendering: "pixelated", outline: "none" }} />
    </div>
  );
}
