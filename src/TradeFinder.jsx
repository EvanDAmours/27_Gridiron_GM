// The trade finder: deals built around your biggest needs, one card each, with who you get and who
// you send side by side. "Load into the trade" puts it on the Make a trade tab to tweak and propose.
import React, { useEffect } from "react";
import { C, Bdg, Btn, Face, TeamLogo, oC } from "./ui.jsx";

function PlayerSide({ label, p, tone, onPlayer }) {
  return (
    <div onClick={() => onPlayer(p)} style={{ flex: "1 1 200px", minWidth: 0, background: C.bg, border: `1px solid ${tone}44`, borderRadius: 10, padding: "8px 10px", cursor: "pointer" }}>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.2, color: tone }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
        <Face s={p.face} sz={34} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
          <div style={{ fontSize: 13, color: "#94a3b8", display: "flex", gap: 6, alignItems: "center" }}><Bdg pos={p.pos} /> Age {p.age} · ${(p.salary || 0).toFixed(1)}M · {p.contract || 0} yr</div>
        </div>
        <b style={{ fontSize: 22, color: oC(p.ovr) }}>{p.ovr}</b>
      </div>
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
          <div style={{ fontSize: 14, color: C.mt }}>Deals for your biggest needs{needs.length ? `: ${needs.join(", ")}` : ""}. Fairness is how close the two sides are in trade value.</div>
        </div>
        <Btn onClick={onRun} bg="#1e3a5f" c="#bfdbfe" style={{ fontSize: 15, padding: "9px 16px" }}>↺ Find new deals</Btn>
      </div>
      {!results.length && <div style={{ background: C.cd, border: `1px dashed ${C.bd}`, borderRadius: 12, padding: 24, textAlign: "center", color: C.mt, fontSize: 15 }}>No fair deals right now. Your roster may be balanced, or nobody has what you need at a price that works.</div>}
      <div style={{ display: "grid", gap: 10 }}>
        {results.map((r, i) => (
          <div key={i} style={{ background: C.cd, border: `1px solid ${C.bd}`, borderLeft: `4px solid ${r.ratingColor}`, borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <TeamLogo t={r.team} sz={28} glow />
              <span style={{ fontSize: 15, fontWeight: 800 }}>{r.team.city} {r.team.name}</span>
              <span style={{ fontSize: 13, color: C.mt }}>{r.team.w}-{r.team.l}</span>
              <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 900, letterSpacing: 1, color: r.ratingColor, background: `${r.ratingColor}22`, borderRadius: 999, padding: "3px 10px" }}>{r.rating}</span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "stretch", flexWrap: "wrap" }}>
              <PlayerSide label="YOU GET" p={r.get} tone={C.gn} onPlayer={onPlayer} />
              <div style={{ alignSelf: "center", fontSize: 20, color: C.mt }}>⇄</div>
              <PlayerSide label="YOU SEND" p={r.send} tone={C.rd} onPlayer={onPlayer} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <Btn onClick={() => onLoad(r)} bg={C.bl} style={{ fontSize: 14, padding: "8px 16px" }}>Load into the trade →</Btn>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
