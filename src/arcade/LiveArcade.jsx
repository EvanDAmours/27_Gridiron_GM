// The arcade field inside the franchise's live game screen (App.jsx). It shows the same engine game
// the broadcast view does: watch it (the computer plays both offenses on the field) or take your
// own snaps (the live game's "Call plays"), and switch between the two at any snap. Every play is
// handed to the app as it's booked, so the score, the drives, the box score and the season are the
// live game's own. Loaded lazily: none of the arcade is in the GM app's first load.
import { useEffect, useRef, useState } from "react";
import { ArcadeGame, DEF_NAME } from "./game.js";

const SPEED = { Slow: 0.75, Normal: 1, Fast: 2, Condensed: 3 };
const cornerBtn = { display: "flex", alignItems: "center", gap: 6, minHeight: 32, padding: "0 11px", borderRadius: 8, border: "1px solid #ffffff33", background: "#0b0e14b3", color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" };

// aspect: the box on the page (inside a stadium it takes the field's shape, so the stands fit round it)
export default function LiveArcade({ g, userSide, watch, speed, paused, teams, onEvent, apiRef, fill = false, aspect = "16 / 9", maxH = null, night = false, ceremony = null, onSim = null }) {
  const ref = useRef(null), game = useRef(null);
  const cb = useRef(onEvent); cb.current = onEvent;
  useEffect(() => {
    const a = new ArcadeGame(ref.current, { skipMenu: true, live: { g, userSide, watch, teams, night, fill, onEvent: (ev, off) => cb.current?.(ev, off) } });
    a.speed = SPEED[speed] || 1; a.paused = !!paused;
    game.current = a; if (apiRef) apiRef.current = a;
    if (typeof window !== "undefined") window.arcadeGame = a; // (for playtesting)
    return () => { a.release(); a.destroy(); game.current = null; if (apiRef && apiRef.current === a) apiRef.current = null; };
  }, [g]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { game.current?.setWatch(watch); }, [watch]);
  useEffect(() => { if (game.current) game.current.speed = SPEED[speed] || 1; }, [speed]);
  useEffect(() => { if (game.current) game.current.paused = !!paused; }, [paused]);
  // you won the Super Bowl: the trophy ceremony on the field
  useEffect(() => { if (ceremony && game.current) { game.current.paused = false; game.current.startCeremony(ceremony); } }, [ceremony?.winner]); // eslint-disable-line react-hooks/exhaustive-deps
  // full screen: the field alone fills the screen (F on a keyboard, or the button in its corner).
  // Where the browser has no full screen for a page (an iPhone), the same button pins the field over
  // the whole screen instead, clear of the notch and the home bar, and the game resizes to fill it.
  const canFs = typeof document !== "undefined" && !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  const [natFs, setFs] = useState(false), [pinned, setPinned] = useState(false), fs = natFs || pinned;
  // the sim button asks once more before it ends the game (a stray tap shouldn't); the ask lapses after a few seconds
  const [simArm, setSimArm] = useState(false), [defCall, setDefCall] = useState("balanced");
  useEffect(() => { if (game.current?.defCall) setDefCall(game.current.defCall); }, [g]);
  useEffect(() => { if (!simArm) return; const t = setTimeout(() => setSimArm(false), 3500); return () => clearTimeout(t); }, [simArm]);
  useEffect(() => {
    if (!pinned) return;
    const key = (e) => { if (e.key === "Escape") setPinned(false); }, prev = document.body.style.overflow;
    document.body.style.overflow = "hidden"; window.addEventListener("keydown", key);
    // anything else pinned to the screen (the app's controls, its tab bar) steps out of the way, so
    // nothing can sit over the field however the page above it is stacked
    const mine = ref.current?.parentElement, hid = [];
    for (const n of document.body.querySelectorAll("*")) { if (n === mine || n.contains(mine) || mine?.contains(n)) continue; const cs = getComputedStyle(n); if (cs.position === "fixed" && cs.visibility !== "hidden") { hid.push([n, n.style.visibility]); n.style.visibility = "hidden"; } }
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", key); for (const [n, v] of hid) n.style.visibility = v; };
  }, [pinned]);
  useEffect(() => {
    const on = () => setFs(!!(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener("fullscreenchange", on); document.addEventListener("webkitfullscreenchange", on);
    return () => { document.removeEventListener("fullscreenchange", on); document.removeEventListener("webkitfullscreenchange", on); };
  }, []);
  return (
    <div role="application" aria-label="Arcade field" style={pinned ? { position: "fixed", inset: 0, zIndex: 9500, boxSizing: "border-box", padding: "env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)", background: "#0b0e14", overflow: "hidden" } : fill ? { position: "absolute", inset: 0, background: "#0b0e14", overflow: "hidden" } : { position: "relative", width: "100%", aspectRatio: aspect, ...(maxH ? { maxHeight: maxH } : {}), background: "#0b0e14", borderRadius: 10, overflow: "hidden" }}>
      <canvas ref={ref} tabIndex={0} style={{ display: "block", touchAction: "none", imageRendering: "pixelated", outline: "none" }} />
      {/* the corner buttons: sim the rest of the game out (a second tap to be sure), and full screen */}
      <div style={{ position: "absolute", ...(fs ? { top: "calc(env(safe-area-inset-top) + 74px)", left: "calc(env(safe-area-inset-left) + 8px)" } /* (under the score strip and the weather, clear of the play cards along the bottom) */ : fill ? { top: "calc(env(safe-area-inset-top) + 46px)", left: 8 } /* (a phone: up top, clear of the app's controls along the bottom) */ : { top: 8, right: 8 }), zIndex: 2, display: "flex", gap: 6, opacity: fs ? 0.85 : 1 }}>
        {!ceremony && <button type="button" onClick={() => { const c = game.current?.cycleDef(); if (c) setDefCall(c); ref.current?.focus(); }} aria-label="Your defense's call" title="Your defense: balanced, blitz heavy, coverage or stop the run" style={cornerBtn}>D: {DEF_NAME[defCall] || "BALANCED"}</button>}
        {onSim && !ceremony && <button type="button" onClick={() => { if (simArm) { setSimArm(false); setPinned(false); if (natFs) game.current?.fullscreen(false); onSim(); } else setSimArm(true); }} aria-label="Sim to the end of the game" title="Sim the rest of the game" style={{ ...cornerBtn, ...(simArm ? { background: "#b45309", borderColor: "#fbbf24" } : {}) }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true"><path d="M1 2l6 5-6 5zM7 2l6 5-6 5z" /></svg>{simArm ? "Tap again to sim" : "Sim to end"}
        </button>}
        <button type="button" onClick={() => { if (canFs) game.current?.fullscreen(!natFs); else setPinned((v) => !v); ref.current?.focus(); }} aria-label={fs ? "Exit full screen" : "Full screen"} title={fs ? "Exit full screen (F or Esc)" : "Full screen (F)"} style={cornerBtn}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">{fs ? <path d="M5 1v4H1M9 1v4h4M5 13V9H1M9 13V9h4" /> : <path d="M1 5V1h4M13 5V1H9M1 9v4h4M13 9v4H9" />}</svg>{fs ? "Exit full screen" : "Full screen"}
        </button>
      </div>
    </div>
  );
}
