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
export default function LiveArcade({ g, userSide, watch, moments = false, speed, paused, teams, onEvent, apiRef, fill = false, aspect = "16 / 9", maxH = null, night = false, ceremony = null, onSim = null }) {
  const ref = useRef(null), game = useRef(null);
  const cb = useRef(onEvent); cb.current = onEvent;
  useEffect(() => {
    const a = new ArcadeGame(ref.current, { skipMenu: true, live: { g, userSide, watch, moments, teams, night, fill, onEvent: (ev, off) => cb.current?.(ev, off) } });
    a.speed = SPEED[speed] || 1; a.paused = !!paused;
    a.onMenu = (rect) => setMenu((m) => (m ? null : rect)); // (the MENU chip in the score strip: open or close)
    game.current = a; if (apiRef) apiRef.current = a;
    if (typeof window !== "undefined") window.arcadeGame = a; // (for playtesting)
    return () => { a.release(); a.destroy(); game.current = null; if (apiRef && apiRef.current === a) apiRef.current = null; };
  }, [g]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { game.current?.setWatch(watch); }, [watch]);
  useEffect(() => { game.current?.setMoments(moments); }, [moments]); // (play the moments: a few drives a quarter are yours)
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
  const [menu, setMenu] = useState(null); // the menu open under the MENU chip: the chip's box on the canvas
  useEffect(() => { if (game.current) game.current.menuOpen = !!menu; if (!menu) setSimArm(false); }, [menu]);
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
      {/* the menu (from the MENU chip the game draws in its score strip, so nothing sits on the field):
          your defense's call, sim the rest of the game out (a second tap to be sure), full screen */}
      {menu && !ceremony && (() => {
        const cv = ref.current, ox = cv?.offsetLeft || 0, oy = cv?.offsetTop || 0, close = () => setMenu(null);
        const item = { ...cornerBtn, width: "100%", justifyContent: "flex-start", minHeight: 40, fontSize: 14, borderRadius: 8 };
        return (<>
          <div onPointerDown={close} style={{ position: "absolute", inset: 0, zIndex: 3 }} />
          <div role="menu" style={{ position: "absolute", zIndex: 4, top: oy + menu.y + menu.h + 4, right: Math.max(4, (cv?.parentElement?.clientWidth || cv?.clientWidth || 0) - (ox + menu.x + menu.w)), minWidth: 190, display: "flex", flexDirection: "column", gap: 6, padding: 8, borderRadius: 10, background: "#0b0e14f2", border: "1px solid #ffffff33", boxShadow: "0 10px 30px #000a" }}>
            <button type="button" role="menuitem" onClick={() => { const c = game.current?.cycleDef(); if (c) setDefCall(c); }} title="Your defense: balanced, blitz heavy, coverage or stop the run" style={item}>Defense: {DEF_NAME[defCall] || "BALANCED"}</button>
            {onSim && <button type="button" role="menuitem" onClick={() => { if (simArm) { setSimArm(false); close(); setPinned(false); if (natFs) game.current?.fullscreen(false); onSim(); } else setSimArm(true); }} style={{ ...item, ...(simArm ? { background: "#b45309", borderColor: "#fbbf24" } : {}) }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true"><path d="M1 2l6 5-6 5zM7 2l6 5-6 5z" /></svg>{simArm ? "Tap again to sim to the end" : "Sim to the end"}
            </button>}
            <button type="button" role="menuitem" onClick={() => { close(); if (canFs) game.current?.fullscreen(!natFs); else setPinned((v) => !v); ref.current?.focus(); }} style={item}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">{fs ? <path d="M5 1v4H1M9 1v4h4M5 13V9H1M9 13V9h4" /> : <path d="M1 5V1h4M13 5V1H9M1 9v4h4M13 9v4H9" />}</svg>{fs ? "Exit full screen" : "Full screen"}
            </button>
          </div>
        </>);
      })()}
    </div>
  );
}
