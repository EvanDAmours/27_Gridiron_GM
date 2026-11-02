// The depth chart as a two-deep sheet (desktop list view): the way NFL clubs publish theirs. One
// row per spot on the field (QB, RB, WR1-3, TE, the five linemen; the front four, linebackers,
// corners and safeties), with the starter, the 2nd and the 3rd. Pick a row and the panel beside it
// edits that spot: the snap shares (split bars, SnapBars.jsx) and who could start there. Injured
// players are out of the sheet and listed under it.
import React, { useState } from "react";
import { C, oC, Face, Chips } from "./ui.jsx";
import { depthOrderFor } from "./depth.js";
import { SNAP_SLOTS } from "./snaps.js";
import { laneSplit, sharesOf } from "./snapEdit.js";
import { SplitBars } from "./SnapBars.jsx";
import { spotName } from "./DepthChart.jsx";
import AutoFill from "./AutoFill.jsx";
import { NameTags } from "./PlayerTags.jsx";

const SIDES = {
  offense: { label: "Offense", rows: [["QB", 0], ["RB", 0], ["WR", 0], ["WR", 1], ["WR", 2], ["TE", 0], ["LT", 0], ["LG", 0], ["C", 0], ["RG", 0], ["RT", 0]] },
  defense: { label: "Defense", rows: [["DL", 0], ["DL", 1], ["DL", 2], ["DL", 3], ["LB", 0], ["LB", 1], ["LB", 2], ["CB", 0], ["CB", 1], ["CB", 2], ["S", 0], ["S", 1]] },
  special: { label: "Special teams", rows: [["K", 0], ["P", 0]] },
};
const NAME = { QB: "Quarterback", RB: "Running back", WR: "Wide receiver", TE: "Tight end", LT: "Left tackle", LG: "Left guard", C: "Center", RG: "Right guard", RT: "Right tackle", DL: "Defensive line", LB: "Linebacker", CB: "Cornerback", S: "Safety", K: "Kicker", P: "Punter" };
// the spot's name, the same as on the field: X, Z, SLOT; SAM, MIKE, WILL; CB1, CB2, NB; LE, DT1...
const label = (pos, k) => spotName(pos, k);
const injNote = (p) => `${p.injType || "Injured"}${p.injWk ? `, ${p.injWk} wk${p.injWk > 1 ? "s" : ""}` : ""}`;

export default function DepthSheet({ roster, depthOrder, setDepthOrder, snaps, setSnaps, shape, setSel, onAutoFill, viewToggle, locks, setLocks, onSpecialists, yr }) {
  const [side, setSide] = useState("offense");
  const [row, setRow] = useState(null); // [pos, k]
  const rows = SIDES[side].rows;
  const list = (pos) => depthOrderFor(roster, depthOrder, pos);
  // the order game day plays them in (your snap shares included): the starters by role, as the field shows
  const field = (pos) => depthOrderFor(roster, depthOrder, pos, snaps);
  const healthy = (pos) => list(pos).filter((p) => !p.injured);
  const byId = Object.fromEntries(roster.map((p) => [p.id, p]));
  const memo = {};
  const view = (pos) => (memo[pos] ||= (() => {
    const lanes = laneSplit(pos, field(pos), snaps || {}, shape), sh = sharesOf(pos, list(pos), snaps || {}, shape);
    const starters = lanes.map((l) => l.segs[0]?.id).filter(Boolean);
    const bench = healthy(pos).filter((p) => !starters.includes(p.id));
    return { lanes, sh, starters, bench };
  })());
  // the starter, 2nd and 3rd at a spot: the men who share his spot first, then the bench by depth
  const trio = (pos, k) => {
    const { lanes, starters, bench } = view(pos), lane = lanes[k] || { segs: [] };
    const st = byId[lane.segs[0]?.id] || null;
    const single = (SNAP_SLOTS[pos] || 1) === 1;
    const backs = [...lane.segs.slice(1).map((s) => byId[s.id]), ...(single ? healthy(pos).filter((p) => p !== st) : [bench[k % Math.max(1, bench.length)]])].filter(Boolean);
    const seen = new Set([st?.id]), out = [];
    for (const p of backs) if (p && !seen.has(p.id) && out.length < 2) { seen.add(p.id); out.push(p); }
    return [st, out[0] || null, out[1] || null];
  };
  // start a player at a spot: he trades places in the depth order with the man starting there
  const start = (pos, k, p) => {
    const ids = list(pos).map((x) => x.id), cur = view(pos).starters[k];
    const a = ids.indexOf(p.id), b = ids.indexOf(cur);
    if (a < 0) return;
    if (b >= 0) [ids[a], ids[b]] = [ids[b], ids[a]];
    else { ids.splice(a, 1); ids.splice(Math.min(k, ids.length), 0, p.id); } // a spot nobody holds: he moves up to it
    setDepthOrder((d) => ({ ...d, [pos]: ids }));
    setSnaps && setSnaps((s) => { const n = { ...s }; for (const x of roster) if (x.pos === pos) delete n[x.id]; return n; });
  };
  const resetPos = (pos) => setSnaps && setSnaps((s) => { const n = { ...s }; for (const x of roster) if (x.pos === pos) delete n[x.id]; return n; });
  const sel = row && rows.some(([p, k]) => p === row[0] && k === row[1]) ? row : rows[0];
  const outNow = roster.filter((p) => p.injured && rows.some(([pos]) => pos === p.pos));

  const name = (p) => <span onClick={(e) => { e.stopPropagation(); setSel && setSel(p); }} style={{ cursor: "pointer" }}>{p.name}<NameTags p={p} yr={yr} /></span>;
  const cell = (pos, p, first) => {
    if (!p) return <td style={{ padding: "8px 14px", color: C.mt, fontSize: first ? 13 : 14 }}>{first ? "Your formations put another position here" : "—"}</td>;
    const v = view(pos).sh[p.id] || 0, q = p.hurt?.wks > 0;
    return (
      <td style={{ padding: "5px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <Face s={p.face} sz={first ? 28 : 24} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: first ? 800 : 600, fontSize: first ? 15 : 14, whiteSpace: "nowrap" }}>{name(p)} <b style={{ color: oC(p.ovr), marginLeft: 4 }}>{p.ovr}</b></div>
            {first ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <div style={{ flex: 1, maxWidth: 170, height: 7, borderRadius: 99, background: "#ffffff10", overflow: "hidden" }}><div style={{ width: `${v}%`, height: "100%", background: C.gn, borderRadius: 99 }} /></div>
                <span style={{ fontSize: 12, fontWeight: 800, color: C.mt }}>{v}%</span>
                {q && <span style={{ fontSize: 12, fontWeight: 800, color: "#eab308" }}>Questionable</span>}
              </div>
            ) : <div style={{ fontSize: 12, color: q ? "#eab308" : C.mt, fontWeight: q ? 700 : 500 }}>{q ? "Questionable" : v ? `${v}% of snaps` : "Backup"}</div>}
          </div>
        </div>
      </td>
    );
  };

  const [sp, sk] = sel;
  // who could start here: the man starting, then the best of the rest
  const cands = [...healthy(sp)].sort((x, y) => (y.id === view(sp).starters[sk]) - (x.id === view(sp).starters[sk]) || y.ovr - x.ovr).slice(0, 6);
  const startsHere = view(sp).starters[sk];
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <Chips items={[...Object.entries(SIDES).map(([k, s]) => [k, s.label]), ...(onSpecialists ? [["specialists", "Specialists"]] : [])]} value={side} onChange={(k) => { if (k === "specialists") { onSpecialists(); return; } setSide(k); setRow(null); }} />
        <span style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>{viewToggle}<AutoFill onAutoFill={onAutoFill} depthOrder={depthOrder} setDepthOrder={setDepthOrder} snaps={snaps} setSnaps={setSnaps} locks={locks} setLocks={setLocks} /></span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 360px", gap: 16, alignItems: "start" }}>
        <div style={{ background: "#111827", borderRadius: 14, padding: "4px 0", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <colgroup><col style={{ width: 72 }} /><col style={{ width: "40%" }} /><col /><col /></colgroup>
            <thead><tr>{["", "Starter", "2nd", "3rd"].map((h) => <th key={h} style={{ textAlign: "left", padding: "9px 14px", fontSize: 12, fontWeight: 800, letterSpacing: 1, color: C.mt, textTransform: "uppercase" }}>{h}</th>)}</tr></thead>
            <tbody>
              {rows.map(([pos, k]) => {
                const [a, b, c] = trio(pos, k), on = sel[0] === pos && sel[1] === k;
                return (
                  <tr key={`${pos}${k}`} onClick={() => setRow([pos, k])} style={{ borderTop: "1px solid #ffffff12", cursor: "pointer", background: on ? "#3b82f614" : "transparent", boxShadow: on ? "inset 3px 0 0 #3b82f6" : "none" }}>
                    <td style={{ padding: "8px 14px" }}><span style={{ fontSize: 11, fontWeight: 900, background: "#ffffff12", borderRadius: 5, padding: "2px 6px" }}>{label(pos, k)}</span></td>
                    {cell(pos, a, true)}{cell(pos, b)}{cell(pos, c)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "#111827", borderRadius: 14, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><b style={{ fontSize: 16 }}>{label(sp, sk)}</b><span style={{ color: C.mt, fontSize: 13 }}>{NAME[sp]}</span><button onClick={() => resetPos(sp)} style={{ marginLeft: "auto", background: "transparent", border: 0, color: "#7dd3fc", fontSize: 12, cursor: "pointer", padding: 0 }}>Reset to auto</button></div>
            {setSnaps && cands.length > 0 && <>
              <div style={{ fontSize: 12, color: C.mt, margin: "4px 0 2px" }}>Drag a line to trade snaps between two players</div>
              <SplitBars pos={sp} players={field(sp)} overrides={snaps || {}} shape={shape} onChange={(n) => setSnaps(n)} laneName={(k) => label(sp, k)} />
            </>}
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, color: C.mt, textTransform: "uppercase", margin: "14px 0 4px" }}>Could start here</div>
            {cands.map((p) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0", borderTop: "1px solid #ffffff12" }}>
                <Face s={p.face} sz={26} />
                <b style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: 14, cursor: "pointer" }} onClick={() => setSel && setSel(p)}>{p.name}<NameTags p={p} yr={yr} /></b>
                <b style={{ color: oC(p.ovr), width: 26, textAlign: "right" }}>{p.ovr}</b>
                {p.id === startsHere ? <span style={{ width: 92, textAlign: "right", fontSize: 12, fontWeight: 800, color: C.gn }}>Starting</span>
                  : <button onClick={() => start(sp, sk, p)} style={{ width: 92, textAlign: "right", background: "transparent", border: 0, padding: 0, fontSize: 12, fontWeight: 800, color: p.hurt?.wks > 0 ? "#eab308" : "#7dd3fc", cursor: "pointer" }}>{p.hurt?.wks > 0 ? "Start (Q)" : "Start here"}</button>}
              </div>
            ))}
          </div>
          {outNow.length > 0 && <div style={{ background: "#111827", borderRadius: 14, padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, color: "#f87171", textTransform: "uppercase", marginBottom: 2 }}>Out this week · {outNow.length}</div>
            {outNow.map((p) => <div key={p.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "7px 0", borderTop: "1px solid #ffffff12", fontSize: 14 }}><span style={{ whiteSpace: "nowrap" }}><b style={{ cursor: "pointer" }} onClick={() => setSel && setSel(p)}>{p.name}<NameTags p={p} yr={yr} /></b> <span style={{ color: C.mt }}>{p.pos}</span></span><span style={{ color: "#f87171", fontSize: 12, fontWeight: 700, textAlign: "right" }}>{injNote(p)}</span></div>)}
          </div>}
        </div>
      </div>
    </div>
  );
}
