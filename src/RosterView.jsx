// The roster table, in the same clean style as trades and free agency: one row per player,
// large type, grouped by position in depth-chart order, with every column sortable.
import Select from "./Select.jsx";
import React, { useState } from "react";
import { naturalDL } from "./dline.js";
import { C, oC, Bdg, Face } from "./ui.jsx";
import { InjTag } from "./InjuryTag.jsx";
import { DevChip } from "./ScoutingUI.jsx";
import { MOBILE } from "./mobile.js";

const POS = ["QB", "RB", "WR", "TE", "LT", "LG", "C", "RG", "RT", "DL", "LB", "CB", "S", "K", "P"];
const GROUPS = { ALL: null, OFF: ["QB", "RB", "WR", "TE", "LT", "LG", "C", "RG", "RT"], DEF: ["DL", "LB", "CB", "S"], ST: ["K", "P"] };
const sel = { background: C.bg, color: C.tx, border: `1px solid ${C.bd}`, borderRadius: 6, padding: "8px 10px", fontSize: 15, minHeight: MOBILE ? 44 : undefined };
const DEV_RANK = { generational: 4, superstar: 3, star: 2, normal: 1, late: 0 };

// Little status badges next to a name, so the whole roster reads at a glance.
function Badges({ p, focus, mine }) {
  const b = [];
  const isFocus = focus && ["off", "def"].some((k) => focus[k] != null && String(focus[k]) === String(p.id));
  if (isFocus) b.push(["🔬", "Development focus: can gain a point each regular-season week"]);
  if (mine && (p.contract || 0) === 1 && !p.ext) b.push(["✍️", p.cyr?.choice === "bet" ? "Contract year: playing out his deal" : "Contract year: last year of his deal"]);
  if (p.ext) b.push(["📝", "Extended: his new deal starts next season"]);
  if (p.potRev && p.potRev.stage < 3) b.push(["~", "Unproven: his real ceiling is still coming into focus"]);
  if (p.tradeRequest) b.push(["🔁", "Has asked for a trade"]);
  if (p.suspended) b.push(["🚫", `Suspended${p.suspWksLeft ? ` (${p.suspWksLeft} more game${p.suspWksLeft === 1 ? "" : "s"})` : ""}`]);
  if (!b.length) return null;
  return <span style={{ marginLeft: 6, display: "inline-flex", gap: 3, verticalAlign: "middle" }}>{b.map(([i, t]) => <span key={t} title={t} style={{ fontSize: 12, fontWeight: 900, color: "#cbd5e1", cursor: "help" }}>{i}</span>)}</span>;
}

export default function RosterTable({ players, depth, setSel, devOf, wk = 0, focus = null, mine = false }) {
  const [filter, setFilter] = useState("ALL");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState(["pos", 1]);
  const slot = (p) => depth?.[p.id];
  const depthNum = (p) => { const l = slot(p)?.label || ""; const m = l.match(/(\d+)$/); return m ? +m[1] : 99; };
  const key = {
    pos: (p) => POS.indexOf(p.pos) * 100 + depthNum(p),
    name: (p) => p.name, age: (p) => p.age, ovr: (p) => p.ovr, pot: (p) => p.pot || p.ovr,
    dev: (p) => DEV_RANK[devOf(p)] ?? 1, sal: (p) => p.salary || 0,
  };
  const rows = players
    .filter((p) => filter === "ALL" || (GROUPS[filter] ? GROUPS[filter].includes(p.pos) : p.pos === filter))
    .filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => { const x = key[sort[0]](a), y = key[sort[0]](b); return (typeof x === "string" ? x.localeCompare(y) : x - y) * sort[1] || b.ovr - a.ovr; });
  const th = (k, label, opts = {}) => (
    <th className={opts.hide ? "ro-hide" : undefined} onClick={() => setSort(([s, d]) => [k, s === k ? -d : ["pos", "name"].includes(k) ? 1 : -1])} style={{ padding: "8px 6px", fontSize: 12, fontWeight: 800, letterSpacing: 1, color: sort[0] === k ? "#fff" : C.mt, borderBottom: `1px solid ${C.bd}`, textAlign: opts.left ? "left" : "center", cursor: "pointer", whiteSpace: "nowrap", position: "sticky", top: 0, background: C.cd }}>
      {label}{sort[0] === k ? (sort[1] < 0 ? " ▼" : " ▲") : ""}
    </th>
  );
  const td = { padding: "9px 6px", borderBottom: `1px solid ${C.bd}55`, textAlign: "center", fontSize: 15 };
  let lastPos = null;
  return (
    <div style={{ background: C.cd, border: `1px solid ${C.bd}`, borderRadius: 10, padding: 12 }}>
      <style>{"@media (max-width: 640px) { .ro-hide { display: none } }"}</style>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <Select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Position" style={sel}>
          <option value="ALL">All positions</option><option value="OFF">Offense</option><option value="DEF">Defense</option><option value="ST">Special teams</option>
          {POS.map((x) => <option key={x} value={x}>{x}</option>)}
        </Select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name" aria-label="Search roster" style={{ ...sel, flex: "1 1 160px" }} />
      </div>
      {mine && <div style={{ fontSize: 12, color: C.mt, margin: "-4px 0 8px" }}>🔬 development focus · ✍️ contract year · 📝 extended · ~ unproven rookie · 🔁 trade request · 🚫 suspended</div>}
      {MOBILE && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: C.mt }}>Sort</span>
          <Select value={sort[0]} onChange={(e) => setSort([e.target.value, ["pos", "name"].includes(e.target.value) ? 1 : -1])} aria-label="Sort roster" style={{ ...sel, flex: 1, minHeight: 44 }}>
            {[["pos", "Position & depth"], ["ovr", "Overall"], ["pot", "Potential"], ["age", "Age"], ["sal", "Salary"], ["name", "Name"]].map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </Select>
        </div>
      )}
      {MOBILE ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {rows.map((p) => {
            const s = slot(p);
            return (
              <button key={p.id} onClick={() => setSel(p)} style={{ display: "flex", alignItems: "center", gap: 10, textAlign: "left", background: C.bg, border: `1px solid ${C.bd}`, borderLeft: `3px solid ${s?.starter ? C.gn : C.bd}`, borderRadius: 10, padding: "8px 10px", minHeight: 56, color: C.tx, cursor: "pointer" }}>
                <Face s={p.face} sz={34} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontWeight: 800, fontSize: 15, color: "#f1f5f9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}<Badges p={p} focus={focus} mine={mine} /></span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#94a3b8", marginTop: 2, flexWrap: "wrap" }}>
                    <Bdg pos={p.pos} /><span style={{ color: s?.starter ? C.gn : "#94a3b8", fontWeight: 700 }}>{s?.label || "—"}</span><span>Age {p.age}</span><span>${(p.salary || 0).toFixed(1)}M · {p.contract}y</span>
                    <InjTag p={p} wk={wk} />{p.holdout && <span style={{ color: C.gd, fontWeight: 800 }}>Holdout</span>}
                  </span>
                </span>
                <span style={{ textAlign: "right" }}>
                  <span style={{ display: "block", fontSize: 22, fontWeight: 900, color: oC(p.ovr), lineHeight: 1 }}>{p.ovr}</span>
                  <span style={{ fontSize: 11, color: C.mt }}>POT {p.potRev && p.potRev.stage < 3 ? "~" : ""}{p.pot || p.ovr}</span>
                </span>
              </button>
            );
          })}
          {!rows.length && <div style={{ padding: 16, color: C.mt, fontSize: 15 }}>Nobody matches.</div>}
        </div>
      ) : (
      <div style={{ maxHeight: "72vh", overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{th("name", "PLAYER", { left: true })}{th("pos", "POS")}{th("pos", "DEPTH", { hide: true })}{th("age", "AGE")}{th("ovr", "OVR")}{th("pot", "POT", { hide: true })}{th("dev", "DEV", { hide: true })}{th("sal", "CONTRACT", { hide: true })}</tr></thead>
          <tbody>
            {rows.map((p) => {
              const s = slot(p);
              const groupStart = sort[0] === "pos" && p.pos !== lastPos;
              lastPos = p.pos;
              return (
                <tr key={p.id} onClick={() => setSel(p)} style={{ cursor: "pointer", borderTop: groupStart ? `2px solid ${C.bd}` : undefined }} onMouseOver={(e) => (e.currentTarget.style.background = "#1e293b66")} onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ ...td, textAlign: "left" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <Face s={p.face} sz={28} />
                      <span>
                        <span style={{ fontWeight: 700, color: "#f1f5f9" }}>{p.name}</span>
                        <Badges p={p} focus={focus} mine={mine} />
                        {p.xf && <span title={`X-Factor: ${p.xf}`} style={{ marginLeft: 6, fontSize: 11, fontWeight: 900, color: "#f472b6" }}>XF</span>}
                        <InjTag p={p} wk={wk} showNote />
                        {p.holdout && <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 800, color: C.gd }}>Holdout</span>}
                      </span>
                    </span>
                  </td>
                  <td style={td}><Bdg pos={p.pos} />{p.pos === "DL" && <span title={naturalDL(p) === "DT" ? "Defensive tackle by trade" : "Edge rusher by trade"} style={{ display: "block", fontSize: 10, fontWeight: 800, color: naturalDL(p) === "DT" ? "#fb923c" : "#f472b6" }}>{naturalDL(p)}</span>}</td>
                  <td className="ro-hide" style={{ ...td, fontWeight: 800, color: s?.starter ? C.gn : "#64748b", whiteSpace: "nowrap" }}>{s?.label || "—"}</td>
                  <td style={{ ...td, color: "#cbd5e1" }}>{p.age}</td>
                  <td style={{ ...td, fontWeight: 900, fontSize: 18, color: oC(p.ovr) }}>{p.ovr}</td>
                  <td className="ro-hide" style={{ ...td, color: oC(p.pot || p.ovr) }}>{p.pot || p.ovr}</td>
                  <td className="ro-hide" style={td}><DevChip dev={devOf(p)} /></td>
                  <td className="ro-hide" style={{ ...td, color: "#cbd5e1", whiteSpace: "nowrap", fontSize: 14 }}>${(p.salary || 0).toFixed(1)}M · {p.contract}y</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length && <div style={{ padding: 16, color: C.mt, fontSize: 15 }}>Nobody matches.</div>}
      </div>
      )}
    </div>
  );
}
