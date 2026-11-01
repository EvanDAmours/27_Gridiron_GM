// The depth chart's snap editors (logic in snapEdit.js). SplitBars: one bar per spot on the field,
// split between the players who play it; drag the line between two players to trade snaps
// between them. LinkedSnap: one player's slider row for the list view, linked to the others,
// with -/+ steps and a lock.
import React from "react";
import { laneSplit, transfer, sharesOf } from "./snapEdit.js";

const PAL = ["#2563eb", "#7c3aed", "#0891b2", "#b45309", "#be185d", "#4d7c0f", "#475569", "#0f766e"];
// a player's color in the bars (the rows beside them use the same)
export const snapColor = (players, id) => { const i = players.filter((p) => !p.injured).findIndex((p) => p.id === id); return i < 0 ? null : PAL[i % PAL.length]; };
// what the grey part of a bar is: the snaps the club's personnel gives that spot to someone else
const OTHER = { WR: "TE & FB sets", TE: "other sets", LB: "nickel & dime", CB: "base defense", S: "other packages", DL: "other fronts" };
const lastName = (n) => { const w = (n || "").split(" ").filter((x) => !/^(Jr\.?|Sr\.?|II|III|IV|V)$/.test(x)); return w[w.length - 1] || n; };

// players: everyone at the position in depth order. overrides: your snap settings. onChange(next).
// laneName(k): what to call spot k (RB, WR1, SLOT, LE...).
export function SplitBars({ pos, players, overrides, shape, onChange, laneName, mobile }) {
  const healthy = players.filter((p) => !p.injured);
  const lanes = laneSplit(pos, players, overrides, shape);
  const shares = sharesOf(pos, players, overrides, shape);
  const color = Object.fromEntries(healthy.map((p, i) => [p.id, PAL[i % PAL.length]]));
  const name = Object.fromEntries(healthy.map((p) => [p.id, lastName(p.name)]));
  const H = mobile ? 44 : 38;
  const drag = (e, lane, a, b) => {
    e.preventDefault();
    const bar = e.currentTarget.parentElement, r = bar.getBoundingClientRect(), x0 = e.clientX, start = overrides;
    const move = (ev) => {
      const d = Math.round(((ev.clientX - x0) / r.width) * 100);
      // never past the edges of the two segments: each keeps what he plays in other spots
      const lo = -lane.segs.find((s) => s.id === a).v, hi = lane.segs.find((s) => s.id === b).v;
      onChange(transfer(pos, players, start, shape, b, a, Math.max(lo, Math.min(hi, d))));
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const bench = healthy.filter((p) => !shares[p.id]);
  // rotate a bench man in: ten snaps from whoever plays most of the last spot
  const rotateIn = (p) => {
    const last = [...lanes].reverse().find((l) => l.segs.length), top = last && [...last.segs].sort((x, y) => y.v - x.v)[0];
    if (top) onChange(transfer(pos, players, overrides, shape, top.id, p.id, Math.min(10, top.v)));
  };
  return (
    <div>
      {lanes.map((lane, k) => {
        let acc = 0;
        return (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0" }}>
            <span style={{ width: mobile ? 38 : 44, fontSize: 12, fontWeight: 900, color: "#4ade80", flexShrink: 0 }}>{laneName(k)}</span>
            <div style={{ position: "relative", flex: 1, minWidth: 0, height: H, borderRadius: 10, overflow: "hidden", display: "flex", background: "#0b1220", userSelect: "none", touchAction: "none" }}>
              {lane.segs.map((s) => (
                <div key={s.id} title={`${name[s.id]} ${s.v}%`} style={{ width: `${s.v}%`, background: color[s.id], display: "flex", alignItems: "center", justifyContent: "center", minWidth: 0, overflow: "hidden", color: "#fff", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" }}>
                  {s.v >= 14 && <span style={{ padding: "0 4px" }}>{s.v >= 45 && name[s.id].length <= 11 ? `${name[s.id]} ` : ""}{s.v}%</span>}
                </div>
              ))}
              {lane.open > 0 && <div title="Nobody's playing these snaps" style={{ width: `${lane.open}%`, background: "repeating-linear-gradient(135deg,#ffffff08 0 6px,transparent 6px 12px)" }} />}
              {lane.other > 0 && <div title={`${OTHER[pos] || "Other personnel"}: your formations put someone else in this spot`} style={{ width: `${lane.other}%`, background: "#334155", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden" }}>{lane.other >= 24 ? (OTHER[pos] || "other personnel") : lane.other >= 12 ? `${lane.other}%` : ""}</div>}
              {lane.segs.slice(0, -1).map((s, j) => {
                acc += s.v;
                const b = lane.segs[j + 1];
                return <div key={`h${s.id}`} role="slider" aria-label={`Trade snaps between ${name[s.id]} and ${name[b.id]}`} aria-valuenow={s.v} onPointerDown={(e) => drag(e, lane, s.id, b.id)} style={{ position: "absolute", top: 0, left: `${acc}%`, width: 22, marginLeft: -11, height: "100%", cursor: "ew-resize", display: "grid", placeItems: "center", touchAction: "none" }}><span style={{ width: 4, height: H * 0.55, borderRadius: 2, background: "#fff", boxShadow: "0 0 0 2px #0009" }} /></div>;
              })}
            </div>
          </div>
        );
      })}
      {lanes.length > 1 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>{healthy.filter((p) => shares[p.id] > 0).map((p) => <span key={p.id} style={{ background: "#ffffff0d", borderRadius: 999, padding: "3px 10px", fontSize: 12, boxShadow: `inset 3px 0 0 ${color[p.id]}` }}>{name[p.id]} <b>{shares[p.id]}%</b></span>)}</div>}
      {bench.length > 0 && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>Rotate in: {bench.map((p) => <button key={p.id} type="button" onClick={() => rotateIn(p)} style={{ background: "transparent", border: 0, padding: 0, color: "#7dd3fc", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ {p.name}</button>)}</div>}
    </div>
  );
}

// One player's linked slider (the list view). value: his share; locked: you've pinned it.
export function LinkedSnap({ value, locked, onSet, onLock, disabled, compact }) {
  const step = (d) => !disabled && onSet(value + d);
  const btn = { width: compact ? 30 : 26, height: compact ? 30 : 26, borderRadius: 8, border: 0, background: "#ffffff10", color: "#fff", fontWeight: 900, fontSize: 15, cursor: disabled ? "default" : "pointer", flexShrink: 0 };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", minWidth: 0, opacity: disabled ? 0.5 : 1 }}>
      <input type="range" min={0} max={100} step={1} value={value} disabled={disabled} onChange={(e) => onSet(+e.target.value)} aria-label="snap share" style={{ flex: 1, minWidth: 60, height: 26, accentColor: locked ? "#facc15" : "#22c55e", cursor: disabled ? "not-allowed" : "pointer" }} />
      <button type="button" aria-label="5 fewer snaps" onClick={() => step(-5)} style={btn}>−</button>
      <b style={{ width: 38, textAlign: "center", fontSize: 13, color: locked ? "#fde68a" : "#e5e7eb" }}>{value}%</b>
      <button type="button" aria-label="5 more snaps" onClick={() => step(5)} style={btn}>+</button>
      <button type="button" onClick={onLock} disabled={disabled} title={locked ? "Locked: other sliders won't move him. Click to unlock." : "Lock his share so other sliders don't move it"} style={{ height: compact ? 30 : 26, padding: "0 8px", borderRadius: 8, border: 0, background: locked ? "#facc1526" : "#ffffff0a", color: locked ? "#facc15" : "#94a3b8", fontSize: 10, fontWeight: 900, letterSpacing: 0.5, cursor: disabled ? "default" : "pointer", flexShrink: 0 }}>{locked ? "LOCKED" : "LOCK"}</button>
    </div>
  );
}
