// Twice a season the sim stops here, at the trade deadline and after the last regular-season week:
// your scouting points (the end-of-season one is the last call: they expire when the playoffs end),
// how the college season moved the public board, and the prospects your scouts want eyes on near your pick.
// Mid-sim (simTo set) the sim only pauses: closing this, or scouting everyone it lists, picks it back
// up, and Stop the sim ends it where it is.
import React, { useEffect, useRef } from "react";
import { C, Bdg, CloseX, sheetWrap, sheetBox, SheetGrip } from "./ui.jsx";
import { MOBILE } from "./mobile.js";
import { prospectRead, scoutCost, SCOUT_CHECKPOINTS, SCOUT_PTS_COMBINE } from "./scouting.js";
import { posTag } from "./dline.js";
import { ScoutPtsBadge, ScoutButton, GradeChip } from "./ScoutingUI.jsx";

const box = { background: "#ffffff0d", borderRadius: 16, padding: "12px 14px", marginBottom: 10 };
const head = (c) => ({ fontSize: 15, fontWeight: 800, color: c, marginBottom: 8 });

export default function ScoutCheckpoint({ g, wk, news = [], targetIds = [], pick, onOpen, onClose, simTo, onStop }) {
  const cls = g.dc?.[g.yr] || [];
  const byId = new Map(cls.map((p) => [p.id, p]));
  const targets = targetIds.map((id) => byId.get(id)).filter(Boolean);
  const sc = g.scouting || {};
  const pts = sc.pts || 0, last = wk >= SCOUT_CHECKPOINTS[SCOUT_CHECKPOINTS.length - 1];
  const cheapest = Math.min(...targets.map((p) => scoutCost(p) || 99), 99);
  // everyone it asked for now has a report: mid-sim, carry on by itself (only once you've scouted here)
  const allDone = targets.length > 0 && targets.every((p) => prospectRead(sc, p).lvl > 0);
  const startedDone = useRef(allDone);
  useEffect(() => {
    if (!simTo || !allDone || startedDone.current) return;
    const t = setTimeout(onClose, 1200);
    return () => clearTimeout(t);
  }, [allDone, simTo]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(2,6,15,.86)", zIndex: 2200, display: "flex", alignItems: "center", justifyContent: "center", padding: 14, ...sheetWrap(MOBILE) }}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Scouting checkpoint" style={{ position: "relative", width: "100%", maxWidth: 760, maxHeight: "90vh", overflowY: "auto", borderRadius: 22, background: "#0d1424", border: 0, boxShadow: "0 30px 80px #000c", padding: 14, color: C.tx, fontFamily: C.f, ...sheetBox(MOBILE) }}>
        {MOBILE && <SheetGrip onClose={onClose} />}
        <CloseX onClick={onClose} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 10, paddingRight: 40 }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2, color: "#38bdf8" }}>🔭 {last ? "END OF THE SEASON" : "TRADE DEADLINE"} · SCOUTING CHECK-IN</div>
            <div style={{ fontSize: MOBILE ? 19 : 23, fontWeight: 900 }}>{last ? "Your scouts' last report of the season" : "Your scouts are back from the road"}</div>
            <div style={{ fontSize: 13, color: "#cbd5e1" }}>You pick around <b>#{pick}</b> right now. Every report you file now is a pick you don't make blind in April.</div>
            {simTo && <div style={{ fontSize: 13, color: "#7dd3fc", fontWeight: 700, marginTop: 4 }}>{allDone && !startedDone.current ? "✓ All scouted. Back to the sim…" : `⏸ Sim paused. It carries on to week ${simTo} when you're done here.`}</div>}
          </div>
          <ScoutPtsBadge pts={pts} sc={sc} />
        </div>
        {last && pts > 0 && <div style={{ ...box, background: "#7c2d1222", fontSize: 13, color: "#fdba74" }}>
          ⚠ Use them or lose them: your <b>{pts}</b> point{pts === 1 ? "" : "s"} expire when the playoffs end. The Combine brings {SCOUT_PTS_COMBINE} fresh ones for draft week, nothing more.
        </div>}
        <div style={{ display: "grid", gridTemplateColumns: MOBILE ? "1fr" : "1fr 1.2fr", gap: 10 }}>
          <div style={box}>
            <div style={head("#fbbf24")}>College stock watch</div>
            <div style={{ fontSize: 11, color: C.mt, marginBottom: 4 }}>The public board moved. Some of it is real, some of it is hype; only a report tells you which.</div>
            {news.length ? news.slice(0, 6).map((n) => <div key={n.pid} style={{ display: "flex", gap: 6, alignItems: "baseline", fontSize: 13, padding: "4px 0", borderBottom: "1px solid #ffffff0d" }}>
              <b style={{ color: n.dir > 0 ? C.gn : C.rd, width: 14 }}>{n.dir > 0 ? "▲" : "▼"}</b>
              <span style={{ flex: 1, minWidth: 0 }}><b>{n.name}</b> <span style={{ color: C.mt }}>{n.pos} · {n.college}</span><div style={{ fontSize: 12, color: "#94a3b8" }}>#{n.from} → #{n.to}: {n.why}</div></span>
            </div>) : <div style={{ fontSize: 13, color: C.mt }}>A quiet stretch on the college beat.</div>}
            {news.length > 6 && <div style={{ fontSize: 12, color: C.mt, marginTop: 4 }}>+{news.length - 6} more moves in your log.</div>}
          </div>
          <div style={box}>
            <div style={head("#38bdf8")}>Your scouts want eyes on</div>
            {targets.length ? targets.map((p) => {
              const r = prospectRead(sc, p);
              return <div key={p.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "5px 0", borderBottom: "1px solid #ffffff0d" }}>
                <Bdg pos={posTag(p)} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: C.mt }}>Board #{p.cons?.now ?? p.cons?.mid} · {p.bio?.college} · {r.lvl === 0 ? "no report yet" : "report filed; workup next"}</div>
                </div>
                <span title="Your read on his ceiling">{r.grade ? <GradeChip g={r.grade} small /> : <span style={{ color: C.mt, fontWeight: 800 }}>??</span>}</span>
                <ScoutButton g={g} p={p} read={r} small />
              </div>;
            }) : <div style={{ fontSize: 13, color: C.mt }}>Everyone near your pick is scouted. Nice work.</div>}
            {targets.length > 0 && pts < cheapest && <div style={{ fontSize: 12, color: "#fca5a5", marginTop: 6 }}>Not enough points for these. More come in every week.</div>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
          {simTo && onStop && <button onClick={onStop} style={{ background: "transparent", color: "#fca5a5", border: "1px solid #ef444466", borderRadius: 14, padding: "10px 16px", fontWeight: 800, fontSize: 14, cursor: "pointer", marginRight: "auto" }}>■ Stop the sim</button>}
          <button onClick={onClose} style={{ background: simTo ? C.gn : "#1e293b", color: simTo ? "#fff" : C.tx, border: 0, borderRadius: 14, padding: "10px 16px", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>{simTo ? "▶ Keep simming" : "Back to the season"}</button>
          <button onClick={onOpen} style={{ background: "#0369a1", color: "#fff", border: 0, borderRadius: 14, padding: "10px 16px", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>Open the scouting board</button>
        </div>
      </div>
    </div>
  );
}
