// The arcade field inside the franchise's live game screen (App.jsx). It shows the same engine game
// the broadcast view does: watch it (the computer plays both offenses on the field) or take your
// own snaps (the live game's "Call plays"), and switch between the two at any snap. Every play is
// handed to the app as it's booked, so the score, the drives, the box score and the season are the
// live game's own. Loaded lazily: none of the arcade is in the GM app's first load.
import { useEffect, useRef, useState } from "react";
import { ArcadeGame } from "./game.js";

const SPEED = { Slow: 0.75, Normal: 1, Fast: 2, Condensed: 3 };

// aspect: the box on the page (inside a stadium it takes the field's shape, so the stands fit round it)
export default function LiveArcade({ g, userSide, watch, speed, paused, teams, onEvent, apiRef, fill = false, aspect = "16 / 9", night = false }) {
  const ref = useRef(null), game = useRef(null);
  const cb = useRef(onEvent); cb.current = onEvent;
  useEffect(() => {
    const a = new ArcadeGame(ref.current, { skipMenu: true, live: { g, userSide, watch, teams, night, onEvent: (ev, off) => cb.current?.(ev, off) } });
    a.speed = SPEED[speed] || 1; a.paused = !!paused;
    game.current = a; if (apiRef) apiRef.current = a;
    if (typeof window !== "undefined") window.arcadeGame = a; // (for playtesting)
    return () => { a.release(); a.destroy(); game.current = null; if (apiRef && apiRef.current === a) apiRef.current = null; };
  }, [g]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { game.current?.setWatch(watch); }, [watch]);
  useEffect(() => { if (game.current) game.current.speed = SPEED[speed] || 1; }, [speed]);
  useEffect(() => { if (game.current) game.current.paused = !!paused; }, [paused]);
  // full screen: the field alone fills the screen (F on a keyboard, or the button in its corner);
  // where the browser can't (an iPhone), there's no button
  const canFs = typeof document !== "undefined" && !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  const [fs, setFs] = useState(false);
  useEffect(() => {
    const on = () => setFs(!!(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener("fullscreenchange", on); document.addEventListener("webkitfullscreenchange", on);
    return () => { document.removeEventListener("fullscreenchange", on); document.removeEventListener("webkitfullscreenchange", on); };
  }, []);
  return (
    <div role="application" aria-label="Arcade field" style={fill ? { position: "absolute", inset: 0, background: "#0b0e14", overflow: "hidden" } : { position: "relative", width: "100%", aspectRatio: aspect, background: "#0b0e14", borderRadius: 10, overflow: "hidden" }}>
      <canvas ref={ref} tabIndex={0} style={{ display: "block", touchAction: "none", imageRendering: "pixelated", outline: "none" }} />
      {canFs && <button type="button" onClick={() => { game.current?.fullscreen(!fs); ref.current?.focus(); }} aria-label={fs ? "Exit full screen" : "Full screen"} title={fs ? "Exit full screen (F or Esc)" : "Full screen (F)"} style={{ position: "absolute", top: fill ? "calc(env(safe-area-inset-top) + 8px)" : 8, right: 8, zIndex: 2, display: "flex", alignItems: "center", gap: 6, minHeight: 32, padding: "0 11px", borderRadius: 8, border: "1px solid #ffffff33", background: "#0b0e14b3", color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">{fs ? <path d="M5 1v4H1M9 1v4h4M5 13V9H1M9 13V9h4" /> : <path d="M1 5V1h4M13 5V1H9M1 9v4h4M13 9v4H9" />}</svg>{fs ? "Exit full screen" : "Full screen"}
      </button>}
    </div>
  );
}
