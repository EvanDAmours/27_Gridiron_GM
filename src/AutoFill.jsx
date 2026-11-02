// The depth chart's Auto-fill button (desktop field and list views). It asks first, since it
// replaces every starter you picked and the snap shares and locks you set, and it can be undone
// for a few seconds afterwards.
import React, { useEffect, useRef, useState } from "react";

const btn = { minHeight: 38, borderRadius: 10, border: 0, padding: "0 14px", fontSize: 14, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" };
export default function AutoFill({ onAutoFill, depthOrder, setDepthOrder, snaps, setSnaps, locks, setLocks }) {
  const [ask, setAsk] = useState(false);
  const [undo, setUndo] = useState(null); // what the depth chart looked like before
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const run = () => {
    setUndo({ depthOrder, snaps, locks });
    onAutoFill();
    if (setSnaps) setSnaps({});
    if (setLocks) setLocks(new Set());
    setAsk(false);
    clearTimeout(timer.current); timer.current = setTimeout(() => setUndo(null), 12000);
  };
  const back = () => { setDepthOrder(undo.depthOrder); if (setSnaps) setSnaps(undo.snaps); if (setLocks && undo.locks) setLocks(undo.locks); setUndo(null); clearTimeout(timer.current); };
  if (undo) return <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 13, color: "#86efac", fontWeight: 700 }}>Auto-filled</span><button type="button" onClick={back} style={{ ...btn, background: "#facc15", color: "#0b0f17" }}>Undo</button></span>;
  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <button type="button" aria-expanded={ask} onClick={() => setAsk((v) => !v)} style={{ ...btn, background: ask ? "#3b82f6" : "#ffffff12", color: "#fff" }}>Auto-fill</button>
      {ask && <div role="dialog" aria-label="Auto-fill the depth chart" style={{ position: "absolute", right: 0, top: 46, zIndex: 20, width: 330, background: "#1b2436", border: "1px solid #3b82f6", borderRadius: 14, boxShadow: "0 18px 50px #000c", padding: "14px 16px", color: "#f3f5f8" }}>
        <b style={{ fontSize: 15 }}>Auto-fill the whole depth chart?</b>
        <div style={{ fontSize: 13, color: "#a3adbd", margin: "6px 0 12px", lineHeight: 1.45 }}>Every position starts its best players by rating, each at the spot he fits (halfbacks ahead of fullbacks). Your starters, snap shares and locks are replaced. You can undo it for a few seconds.</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={() => setAsk(false)} style={{ ...btn, background: "transparent", color: "#cbd5e1" }}>Cancel</button>
          <button type="button" onClick={run} style={{ ...btn, background: "#3b82f6", color: "#fff" }}>Auto-fill</button>
        </div>
      </div>}
    </span>
  );
}
