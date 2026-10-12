// Franchise at a glance: the numbers that run a team (record and division place, cap room, roster
// health, owner and locker room), always at the top of Home, each one a shortcut to the screen
// where you fix it. Anything waiting on you comes first, full width; when nothing is, it's gone.
// Desktop: one row. Phone: a two-column grid.
import React from "react";
import { C } from "./ui.jsx";

function Tile({ label, value, sub, tone = C.tx, onClick, accent, wide, mobile }) {
  return (
    <button onClick={onClick} style={{ gridColumn: wide && mobile ? "1 / -1" : undefined, flex: mobile ? undefined : wide ? "1.4 0 220px" : "1 0 150px", minWidth: 0, textAlign: "left", background: wide ? `${tone}14` : C.cd, border: `1px solid ${wide ? `${tone}66` : C.bd}`, borderTop: `3px solid ${wide ? tone : accent || C.bd}`, borderRadius: 10, padding: mobile ? "8px 10px" : "9px 12px", cursor: onClick ? "pointer" : "default", color: C.tx }}>
      <div style={{ fontSize: mobile ? 10 : 11, fontWeight: 800, letterSpacing: 1.1, color: wide ? tone : C.mt }}>{label}</div>
      <div style={{ fontSize: mobile ? 18 : 21, fontWeight: 900, color: tone, lineHeight: 1.15, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
      {sub && <div style={{ fontSize: mobile ? 11.5 : 12, color: "#94a3b8", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>}
    </button>
  );
}

// tiles: [{ label, value, sub, tone, onClick, wide }]; accent: the team color for the top edge
export default function FranchiseStrip({ tiles, accent, mobile }) {
  return (
    <div data-tour="strip" style={mobile ? { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 } : { display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
      {tiles.map((t) => <Tile key={t.label} {...t} accent={accent} mobile={mobile} />)}
    </div>
  );
}
