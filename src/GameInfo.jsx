// Game Updates: the patch notes, newest first, with a search box. Only the latest 15 show at
// first; older ones render when you open the dropdown (a search looks through all of them).
import React, { useState } from "react";
import { C } from "./ui.jsx";
import { PATCH_NOTES } from "./patchNotes.js";

const RECENT = 15;
const fmtDate = (d) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export default function GameInfo() {
  const [q, setQ] = useState("");
  const [older, setOlder] = useState(false);
  const all = [...PATCH_NOTES].reverse();
  const needle = q.trim().toLowerCase();
  const found = needle ? all.filter((p) => `${p.title} ${p.notes.join(" ")}`.toLowerCase().includes(needle)) : all;
  const shown = needle || older ? found : found.slice(0, RECENT);
  const hidden = found.length - shown.length;
  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 900 }}>Game Updates</div>
          <div style={{ fontSize: 14, color: C.mt }}>Patch notes: every change to Football GM, newest first. Current version {all[0].v}.</div>
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search patch notes" aria-label="Search patch notes"
          style={{ background: C.cd, color: C.tx, border: `1px solid ${C.bd}`, borderRadius: 6, padding: "8px 10px", fontSize: 14, minWidth: 0, width: 240, maxWidth: "100%" }} />
      </div>
      {shown.map((p, i) => (
        <div key={p.v} style={{ background: C.cd, border: `1px solid ${!needle && i === 0 ? C.gn : C.bd}`, borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 900, color: C.gd, border: `1px solid ${C.gd}66`, borderRadius: 4, padding: "1px 6px" }}>v{p.v}</span>
            <span style={{ fontSize: 18, fontWeight: 800 }}>{p.title}</span>
            {!needle && i === 0 && <span style={{ fontSize: 11, fontWeight: 900, color: C.gn, letterSpacing: 1 }}>LATEST</span>}
            <span style={{ marginLeft: "auto", fontSize: 12, color: C.mt }}>{fmtDate(p.date)}</span>
          </div>
          <ul style={{ margin: "8px 0 0", paddingLeft: 20, fontSize: 14, lineHeight: 1.5, color: "#cbd5e1" }}>
            {p.notes.map((n, j) => <li key={j}>{n}</li>)}
          </ul>
        </div>
      ))}
      {!needle && all.length > RECENT && (
        <button onClick={() => setOlder(!older)} style={{ width: "100%", background: C.cd, color: C.tx, border: `1px solid ${C.bd}`, borderRadius: 10, padding: "12px 14px", fontSize: 15, fontWeight: 800, cursor: "pointer", textAlign: "left" }}>
          {older ? "▲ Hide older updates" : `▼ Older updates (${hidden})`}
        </button>
      )}
      {!shown.length && <div style={{ color: C.mt, fontSize: 14 }}>No patch notes match "{q}".</div>}
    </div>
  );
}
