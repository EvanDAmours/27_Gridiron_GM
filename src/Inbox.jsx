// The inbox: everything that needs your attention in one list (trade offers, expiring deals,
// injuries, unspent scouting points, messages), instead of popups. An item opens the screen or
// the decision it's about.
import React from "react";
import { C, Btn } from "./ui.jsx";

const TONE = { urgent: C.rd, action: C.gd, info: "#38bdf8" };

export function InboxButton({ count, onClick, open }) {
  return (
    <button onClick={onClick} aria-label={`Inbox, ${count} item${count === 1 ? "" : "s"}`} style={{ position: "relative", background: open ? "#1e3a5f" : "#1e293b", color: "#e2e8f0", border: `1px solid ${open ? "#3b82f6" : "#334155"}`, borderRadius: 6, padding: "4px 10px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
      📥 Inbox
      {count > 0 && <span style={{ position: "absolute", top: -7, right: -7, minWidth: 18, height: 18, padding: "0 4px", borderRadius: 9, background: C.rd, color: "#fff", fontSize: 11, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #0b1220" }}>{count}</span>}
    </button>
  );
}

// items: [{ key, icon, title, sub, tone: "urgent" | "action" | "info", cta, onOpen, onDismiss, dismissLabel }]
export default function Inbox({ items, onClose, mobile }) {
  const urgent = items.filter((i) => i.tone === "urgent").length;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1200, background: mobile ? C.bg : "#0007", display: "flex", justifyContent: mobile ? "stretch" : "flex-end", alignItems: "flex-start", padding: mobile ? 0 : "56px 14px 14px" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: mobile ? "100%" : 440, maxHeight: mobile ? "100vh" : "80vh", overflowY: "auto", background: C.cd, border: mobile ? "none" : `1px solid ${C.bd}`, borderRadius: mobile ? 0 : 14, boxShadow: "0 18px 40px #000b", padding: mobile ? "14px 14px 96px" : 14 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 20, fontWeight: 900 }}>📥 Inbox</span>
          <span style={{ marginLeft: 8, fontSize: 13, color: C.mt }}>{items.length ? `${items.length} item${items.length === 1 ? "" : "s"}${urgent ? ` · ${urgent} urgent` : ""}` : "All caught up"}</span>
          <button onClick={onClose} aria-label="Close inbox" style={{ marginLeft: "auto", background: C.bg, border: `1px solid ${C.bd}`, color: C.tx, borderRadius: 8, width: 34, height: 34, fontSize: 16, cursor: "pointer" }}>✕</button>
        </div>
        {!items.length && <div style={{ color: C.mt, fontSize: 14, padding: "20px 4px", textAlign: "center" }}>Nothing needs your attention right now.</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((it) => (
            <div key={it.key} style={{ display: "flex", gap: 10, alignItems: "center", background: C.bg, border: `1px solid ${C.bd}`, borderLeft: `4px solid ${TONE[it.tone] || C.bd}`, borderRadius: 10, padding: "10px 12px" }}>
              <span style={{ fontSize: 22 }}>{it.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{it.title}</div>
                {it.sub && <div style={{ fontSize: 12, color: C.mt, lineHeight: 1.4 }}>{it.sub}</div>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                {it.onOpen && <Btn onClick={it.onOpen} bg={it.tone === "urgent" ? C.rd : C.bl} style={{ fontSize: 13, padding: "5px 12px", whiteSpace: "nowrap" }}>{it.cta || "Open"}</Btn>}
                {it.onDismiss && <button onClick={it.onDismiss} style={it.dismissLabel ? { background: "transparent", border: `1px solid ${C.bd}`, borderRadius: 6, padding: "3px 8px", color: "#cbd5e1", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" } : { background: "transparent", border: 0, color: C.mt, fontSize: 11, cursor: "pointer" }}>{it.dismissLabel || "Dismiss"}</button>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
