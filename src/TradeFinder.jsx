// The trade finder: deals built around your biggest needs, with who you get and who
// you send side by side, one compact row each. "Load" puts it on the Make a trade tab to tweak and propose.
import React, { useEffect } from "react";
import { C, Bdg, Btn, Face, TeamLogo, oC } from "./ui.jsx";
import { MOBILE } from "./mobile.js";

function PlayerSide({ label, p, tone, onPlayer }) {
  return (
    <div onClick={() => onPlayer(p)} title={`${label === "GET" ? "You get" : "You send"} ${p.name}. Tap for his card.`} style={{ flex: "1 1 210px", minWidth: 0, display: "flex", alignItems: "center", gap: 8, background: C.bg, border: `1px solid ${tone}33`, borderRadius: 8, padding: "4px 8px", cursor: "pointer" }}>
      <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1, color: tone, width: 30 }}>{label}</span>
      <Face s={p.face} sz={28} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
        <div style={{ fontSize: 12, color: "#94a3b8", display: "flex", gap: 5, alignItems: "center", whiteSpace: "nowrap" }}><Bdg pos={p.pos} /> Age {p.age} · ${(p.salary || 0).toFixed(1)}M · {p.contract || 0} yr</div>
      </div>
      <b style={{ fontSize: 19, color: oC(p.ovr) }}>{p.ovr}</b>
    </div>
  );
}

// results: [{ team, get, send, rating, ratingColor }]
export default function TradeFinder({ results, needs = [], onRun, onLoad, onPlayer }) {
  useEffect(() => { if (!results.length) onRun(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 20, fontWeight: 900 }}>Trade finder</div>
          <div style={{ fontSize: 14, color: C.mt }}>Deals for your biggest needs{needs.length ? `: ${needs.join(", ")}` : ""}. {MOBILE ? "They'd accept every one." : "Every deal here is one they would accept; the tag says how much you overpay to get it."}</div>
        </div>
        <Btn onClick={onRun} bg="#1e3a5f" c="#bfdbfe" style={{ fontSize: 15, padding: "9px 16px" }}>↺ Find new deals</Btn>
      </div>
      {!results.length && <div style={{ background: C.cd, border: `1px dashed ${C.bd}`, borderRadius: 12, padding: 24, textAlign: "center", color: C.mt, fontSize: 15 }}>No fair deals right now. Your roster may be balanced, or nobody has what you need at a price that works.</div>}
      <div style={{ display: "grid", gap: 6 }}>
        {results.map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", background: C.cd, border: `1px solid ${C.bd}`, borderLeft: `4px solid ${r.ratingColor}`, borderRadius: 10, padding: "6px 10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, width: MOBILE ? "auto" : 128, flex: MOBILE ? 1 : "none", minWidth: 0, order: 0 }} title={`${r.team.city} ${r.team.name}`}>
              <TeamLogo t={r.team} sz={26} glow />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.team.name}{MOBILE && <span style={{ color: C.mt, fontWeight: 600, fontSize: 12 }}> {r.team.w}-{r.team.l}</span>}</div>
                <div style={{ display: MOBILE ? "none" : "block", fontSize: 12, color: C.mt }}>{r.team.w}-{r.team.l}</div>
              </div>
            </div>
            <div style={{ flex: "1 1 460px", minWidth: 0, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", order: MOBILE ? 2 : 1 }}>
              <PlayerSide label="GET" p={r.get} tone={C.gn} onPlayer={onPlayer} />
              {!MOBILE && <span style={{ fontSize: 16, color: C.mt }}>⇄</span>}
              <PlayerSide label="SEND" p={r.send} tone={C.rd} onPlayer={onPlayer} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto", order: MOBILE ? 1 : 2 }}>
              <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1, color: r.ratingColor, background: `${r.ratingColor}22`, borderRadius: 999, padding: "3px 9px", whiteSpace: "nowrap" }}>{r.rating}</span>
              <Btn onClick={() => onLoad(r)} bg={C.bl} style={{ fontSize: 13, padding: "6px 12px", whiteSpace: "nowrap" }}>Load →</Btn>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
