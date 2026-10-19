// Save slots: each shows the team's logo, the season and phase, the record and titles. Plus the
// "how the cap works" glossary for new players.
import React, { useState } from "react";
import { C, Btn, TeamLogo } from "./ui.jsx";

export const SLOT_COUNT = 4;
const PHASE = { preseason: "Preseason", regular: "Regular season", playoffs: "Playoffs", combine: "Combine", resign: "Re-sign week", freeagency: "Free agency", draft: "Draft" };
export const metaKey = (i) => `gm_slot_meta_${i}`;

export function readSlotMeta(i) {
  try { const m = JSON.parse(localStorage.getItem(metaKey(i)) || "null"); return m && localStorage.getItem(`gm_slot_${i}`) ? m : null; } catch { return null; }
}
export function slotMetaFor(d, team) {
  return { ab: team?.ab, city: team?.city, name: team?.name, clr: team?.clr, yr: d.yr, wk: d.wk, sp: d.sp, w: team?.w || 0, l: team?.l || 0, t: team?.t || 0, champs: (d.champs || []).filter((c) => (c?.ti ?? c?.team ?? c) === d.ui).length, savedAt: Date.now() };
}

function SlotCard({ i, meta, teams, onSave, onLoad, onDelete }) {
  const t = meta && (teams?.find((x) => x.ab === meta.ab) || meta);
  return (
    <div style={{ background: meta ? `linear-gradient(120deg,${meta.clr || C.cd}44,${C.cd} 60%)` : C.cd, border: `1px solid ${meta ? "#3b82f6aa" : C.bd}`, borderRadius: 12, padding: 12, display: "flex", gap: 12, alignItems: "center", minHeight: 76 }}>
      {meta ? <TeamLogo t={t} sz={48} /> : <div style={{ width: 48, height: 48, borderRadius: 24, border: `2px dashed ${C.bd}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.mt, fontWeight: 900 }}>{i + 1}</div>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: C.mt, fontWeight: 800, letterSpacing: 1 }}>SLOT {i + 1}</div>
        {meta ? (<>
          <div style={{ fontSize: 16, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meta.city} {meta.name}</div>
          <div style={{ fontSize: 13, color: C.tx }}>{meta.yr} · {PHASE[meta.sp] || meta.sp}{meta.sp === "regular" ? ` wk ${meta.wk}` : ""} · <b>{meta.w}-{meta.l}{meta.t ? `-${meta.t}` : ""}</b>{meta.champs ? ` · 🏆×${meta.champs}` : ""}</div>
          <div style={{ fontSize: 11, color: C.mt }}>Saved {new Date(meta.savedAt).toLocaleString()}</div>
        </>) : <div style={{ fontSize: 14, color: C.mt }}>Empty</div>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {onSave && <Btn onClick={() => onSave(i)} bg="#1e3a5f" c="#7dd3fc" style={{ fontSize: 13, padding: "5px 12px" }}>{meta ? "Overwrite" : "Save here"}</Btn>}
        {meta && onLoad && <Btn onClick={() => onLoad(i)} bg="#14532d" c="#86efac" style={{ fontSize: 13, padding: "5px 12px" }}>Load</Btn>}
        {meta && onDelete && <button onClick={() => onDelete(i)} style={{ background: "transparent", border: 0, color: C.mt, fontSize: 11, cursor: "pointer" }}>Delete</button>}
      </div>
    </div>
  );
}

// onSave(i) / onLoad(i): pass null to hide that button (the title screen only loads).
export function SaveSlots({ teams, onSave, onLoad, title = "Save slots", version = 0 }) {
  const [, bump] = useState(0);
  const metas = Array.from({ length: SLOT_COUNT }, (_, i) => readSlotMeta(i));
  const del = (i) => { if (!window.confirm(`Delete slot ${i + 1}?`)) return; try { localStorage.removeItem(`gm_slot_${i}`); localStorage.removeItem(metaKey(i)); } catch { /* ignore */ } bump((n) => n + 1); };
  const save = onSave && ((i) => { if (metas[i] && !window.confirm(`Overwrite slot ${i + 1} (${metas[i].city} ${metas[i].name}, ${metas[i].yr})?`)) return; onSave(i); setTimeout(() => bump((n) => n + 1), 400); });
  return (
    <div key={version} style={{ marginBottom: 14 }}>
      {title && <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: 1, color: "#7dd3fc", marginBottom: 8 }}>💾 {title.toUpperCase()}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 8 }}>
        {metas.map((m, i) => (onSave || m) && <SlotCard key={i} i={i} meta={m} teams={teams} onSave={save} onLoad={onLoad} onDelete={onSave ? del : null} />)}
      </div>
      {!onSave && !metas.some(Boolean) && <div style={{ fontSize: 13, color: C.mt }}>No saved slots yet.</div>}
    </div>
  );
}

// One save across phone and computer: export the franchise as a file, import it on the other device.
export function DeviceTransfer({ onExport, onImport, mobile }) {
  const [busy, setBusy] = useState(false);
  const go = async () => { setBusy(true); try { await onExport(); } finally { setBusy(false); } };
  const btn = { borderRadius: 8, padding: mobile ? "12px 14px" : "9px 16px", fontSize: 14, fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, flex: mobile ? 1 : "0 0 auto" };
  return (
    <div style={{ background: `linear-gradient(120deg,#1e3a5f55,${C.cd} 65%)`, border: "1px solid #3b82f655", borderRadius: 12, padding: "12px 14px", marginBottom: 14, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ fontSize: 30, lineHeight: 1 }}>📲</div>
      <div style={{ flex: "1 1 260px", minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: 1, color: "#7dd3fc" }}>PLAY ON ANOTHER DEVICE</div>
        <div style={{ fontSize: 13, color: C.mt, lineHeight: 1.45 }}>Export this franchise as a save file, send it over (AirDrop, Messages, email, a cloud drive), then import it on your phone or computer. Import also works from the title screen.</div>
      </div>
      <div style={{ display: "flex", gap: 8, width: mobile ? "100%" : "auto" }}>
        <button onClick={go} disabled={busy} style={{ ...btn, background: "#1d4ed8", color: "#fff", border: "1px solid #3b82f6", opacity: busy ? 0.6 : 1 }}>{busy ? "Packing…" : mobile ? "📤 Share save" : "⬇ Export save"}</button>
        <label style={{ ...btn, background: "transparent", color: "#e0f2fe", border: "1px solid #3b82f6" }}>📂 Import save<input type="file" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onImport(f); }} /></label>
      </div>
    </div>
  );
}

export const CAP_TERMS = [
  ["Salary cap", "The most a team can spend on players this season ($301.2M in 2026, growing every year). You can't sign anyone who'd put you over it."],
  ["Cap hit", "What a player counts against the cap this season: his base salary plus his signing bonus proration. It's the number that matters, not the headline value of the deal."],
  ["Cap space", "The cap minus every cap hit and all dead money. It's what you have left to sign free agents, rookies and extensions."],
  ["Signing bonus & proration", "Money paid up front but spread evenly over the deal's years (up to five) for the cap. A bonus lowers this year's hit and pushes cost into later years."],
  ["Dead money", "Bonus money not yet counted when a player is cut or traded. It all lands on your cap at once, and you get nothing on the field for it."],
  ["Restructure", "Turn part of a player's salary into bonus. You get cap space now, but every later year of his deal gets more expensive (and cutting him later costs more dead money)."],
  ["Void years", "Fake years added to the end of a deal to spread a bonus thinner. The player is gone when the real years end, but the bonus left on the void years becomes dead money then."],
  ["Incentives", "Bonuses a player earns by hitting a target (sacks, yards, Pro Bowl). Likely ones count against the cap now; unlikely ones only count the next season if he earns them."],
  ["Rookie wage scale", "Draft picks' salaries are set by where they're picked: the first overall pick earns the most, late rounds near the minimum. Four-year deals."],
  ["Fifth-year option", "For first-round picks: keep a player for a fifth season at a set (higher) salary, decided before his fourth year."],
  ["Franchise tag", "A one-year deal at a top-of-position salary that keeps a star from hitting free agency. Other teams can still sign him to an offer sheet."],
  ["Offer sheet", "A contract another team offers a tagged player. His team can match it and keep him, or let him go and take draft picks as compensation."],
  ["Minimum salary", "The least any player can earn. Cheap depth signed at the minimum is how good teams fill out a roster under the cap."],
];

export function CapGlossary({ compact = false }) {
  const [open, setOpen] = useState(!compact);
  return (
    <div style={{ background: C.cd, border: `1px solid ${C.bd}`, borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
      <div onClick={() => setOpen((o) => !o)} style={{ cursor: "pointer", fontSize: 15, fontWeight: 900, letterSpacing: 1, color: C.gd, display: "flex", alignItems: "center" }}>📘 HOW THE CAP WORKS <span style={{ marginLeft: "auto", fontSize: 12, color: C.mt }}>{open ? "▲" : "▼"}</span></div>
      {open && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 10, marginTop: 10 }}>
        {CAP_TERMS.map(([k, v]) => <div key={k} style={{ background: C.bg, borderRadius: 8, padding: "8px 10px" }}><div style={{ fontWeight: 800, fontSize: 14, marginBottom: 2 }}>{k}</div><div style={{ fontSize: 13, color: C.mt, lineHeight: 1.45 }}>{v}</div></div>)}
      </div>}
    </div>
  );
}
