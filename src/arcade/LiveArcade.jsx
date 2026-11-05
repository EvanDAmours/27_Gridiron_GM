// The arcade field inside the franchise's live game screen (App.jsx). It shows the same engine game
// the broadcast view does: watch it (the computer plays both offenses on the field) or take your
// own snaps (the live game's "Call plays"), and switch between the two at any snap. Every play is
// handed to the app as it's booked, so the score, the drives, the box score and the season are the
// live game's own. Loaded lazily: none of the arcade is in the GM app's first load.
import { useEffect, useRef } from "react";
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
  return (
    <div role="application" aria-label="Arcade field" style={fill ? { position: "absolute", inset: 0, background: "#0b0e14", overflow: "hidden" } : { position: "relative", width: "100%", aspectRatio: aspect, background: "#0b0e14", borderRadius: 10, overflow: "hidden" }}>
      <canvas ref={ref} tabIndex={0} style={{ display: "block", touchAction: "none", imageRendering: "pixelated", outline: "none" }} />
    </div>
  );
}
