// Franchise at a glance: the numbers that run a team (record and division place, cap room, roster
// health, owner and locker room, open issues), always at the top of Home, each one a shortcut to
// the screen where you fix it.
import React from "react";
import { C } from "./ui.jsx";

function Tile({ label, value, sub, tone = C.tx, onClick, accent }) {
  return (
    <button onClick={onClick} style={{ flex: "1 0 150px", minWidth: 0, textAlign: "left", background: C.cd, border: `1px solid ${C.bd}`, borderTop: `3px solid ${accent || C.bd}`, borderRadius: 10, padding: "9px 12px", cursor: onClick ? "pointer" : "default", color: C.tx }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.2, color: C.mt }}>{label}</div>
      <div style={{ fontSize: 21, fontWeight: 900, color: tone, lineHeight: 1.15, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>}
    </button>
  );
}

// tiles: [{ label, value, sub, tone, onClick }]; accent: the team color for the top edge
export default function FranchiseStrip({ tiles, accent, mobile }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 10, overflowX: mobile ? "auto" : "visible", flexWrap: mobile ? "nowrap" : "wrap", paddingBottom: mobile ? 2 : 0 }}>
      {tiles.map((t) => <Tile key={t.label} {...t} accent={accent} />)}
    </div>
  );
}
