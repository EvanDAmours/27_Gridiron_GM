// The roster table: one tight row per player, grouped by position in depth-chart order, with every
// column sortable. On a computer the player you pick shows in a card beside it.
import Select from "./Select.jsx";
import React, { useState } from "react";
import { naturalDL, posTag } from "./dline.js";
import { C, oC, Bdg, Face, Segments, Sheet, Row } from "./ui.jsx";
import { InjTag } from "./InjuryTag.jsx";
import { DevChip } from "./ScoutingUI.jsx";
import { MOBILE } from "./mobile.js";
import RoleTag from "./RoleTag.jsx";

const POS = ["QB", "RB", "WR", "TE", "LT", "LG", "C", "RG", "RT", "DL", "LB", "CB", "S", "K", "P"];
const GROUPS = { ALL: null, OFF: ["QB", "RB", "WR", "TE", "LT", "LG", "C", "RG", "RT"], DEF: ["DL", "LB", "CB", "S"], ST: ["K", "P"] };
const sel = { background: C.bg, color: C.tx, border: `1px solid ${C.bd}`, borderRadius: 6, padding: "8px 10px", fontSize: 15, minHeight: MOBILE ? 44 : undefined };
const POS_NAME = { QB: "Quarterbacks", RB: "Running backs", WR: "Wide receivers", TE: "Tight ends", LT: "Left tackles", LG: "Left guards", C: "Centers", RG: "Right guards", RT: "Right tackles", DL: "Defensive line", LB: "Linebackers", CB: "Cornerbacks", S: "Safeties", K: "Kickers", P: "Punters" };
const htS = (i) => (i ? `${Math.floor(i / 12)}'${i % 12}"` : "—");
// the player picked in the table: who he is, his deal and his best ratings
function SideCard({ p, slot, dev, onOpen }) {
  if (!p) return null;
  const top = Object.entries(p.posAttrs || {}).filter(([, v]) => typeof v === "number").sort((a, b) => b[1] - a[1]).slice(0, 4);
  const lbl = (k) => k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
  const stat = (l, v) => <div style={{ textAlign: "center" }}><div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1, color: C.mt }}>{l}</div><div style={{ fontSize: 16, fontWeight: 900 }}>{v}</div></div>;
  return (
    <div style={{ position: "sticky", top: 0, background: C.cd, border: `1px solid ${C.bd}`, borderRadius: 14, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ textAlign: "center", border: `2px solid ${oC(p.ovr)}`, borderRadius: 10, padding: "4px 8px" }}><div style={{ fontSize: 26, fontWeight: 900, color: oC(p.ovr), lineHeight: 1 }}>{p.ovr}</div><div style={{ fontSize: 10, fontWeight: 900, color: C.mt }}>OVR</div></div>
        <Face s={p.face} sz={64} />
      </div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 900, lineHeight: 1.1 }}>{p.name}</div>
        <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>{p.num != null ? `#${p.num} ` : ""}{posTag(p)}{slot?.label ? ` · ${slot.label}` : ""}</div>
      </div>
      <div><DevChip dev={dev} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, borderTop: `1px solid ${C.bd}`, paddingTop: 8 }}>
        {stat("AGE", p.age)}{stat("HT", htS(p.ht_))}{stat("WT", p.wt || "—")}{stat("POT", p.pot || p.ovr)}
      </div>
      <div style={{ fontSize: 13, color: "#cbd5e1" }}>Contract: <b>${(p.salary || 0).toFixed(1)}M</b> a year, {p.contract} year{p.contract === 1 ? "" : "s"} left</div>
      {top.length > 0 && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 10px" }}>{top.map(([k, v]) => <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: C.mt }}>{lbl(k)}</span><b style={{ color: oC(v) }}>{v}</b></div>)}</div>}
      <button onClick={onOpen} style={{ background: C.bl, color: "#fff", border: 0, borderRadius: 8, padding: "8px 10px", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>Open player card</button>
    </div>
  );
}
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
  const [pick, setPick] = useState(null);
  const [find, setFind] = useState(false), [sortOpen, setSortOpen] = useState(false);
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
    <th className={opts.hide ? "ro-hide" : undefined} onClick={() => setSort(([s, d]) => [k, s === k ? -d : ["pos", "name"].includes(k) ? 1 : -1])} style={{ padding: "6px 6px", fontSize: 11, fontWeight: 800, letterSpacing: 1, color: sort[0] === k ? "#fff" : C.mt, borderBottom: `1px solid ${C.bd}`, textAlign: opts.left ? "left" : "center", cursor: "pointer", whiteSpace: "nowrap", position: "sticky", top: 0, background: C.cd }}>
      {label}{sort[0] === k ? (sort[1] < 0 ? " ▼" : " ▲") : ""}
    </th>
  );
  const td = { padding: "2px 6px", borderBottom: `1px solid ${C.bd}44`, textAlign: "center", fontSize: 13.5, height: 26 };
  const picked = rows.find((p) => p.id === pick) || rows[0] || null;
  let lastPos = null;
  if (MOBILE) return <PhoneRoster {...{ rows, slot, sort, setSort, filter, setFilter, q, setQ, find, setFind, sortOpen, setSortOpen, setSel, focus, mine, wk, devOf }} />;
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
      {mine && !MOBILE && <div style={{ fontSize: 12, color: C.mt, margin: "-4px 0 8px" }}>🔬 development focus · ✍️ contract year · 📝 extended · ~ unproven rookie · 🔁 trade request · 🚫 suspended</div>}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", gap: 12, alignItems: "start" }}>
      <div style={{ maxHeight: "calc(var(--vh, 100vh) - 260px)", overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{th("name", "PLAYER", { left: true })}{th("pos", "POS")}{th("pos", "DEPTH", { hide: true })}{th("age", "AGE")}{th("ovr", "OVR")}{th("pot", "POT", { hide: true })}{th("dev", "DEV", { hide: true })}{th("sal", "CONTRACT", { hide: true })}</tr></thead>
          <tbody>
            {rows.map((p) => {
              const s = slot(p);
              const groupStart = sort[0] === "pos" && p.pos !== lastPos;
              lastPos = p.pos;
              const on = picked?.id === p.id;
              return (
                <React.Fragment key={p.id}>
                {groupStart && <tr><td colSpan={8} style={{ padding: "6px 6px 2px", fontSize: 11, fontWeight: 900, letterSpacing: 1.2, color: "#7dd3fc", borderBottom: `1px solid ${C.bd}` }}>{(POS_NAME[p.pos] || p.pos).toUpperCase()}</td></tr>}
                <tr onClick={() => setPick(p.id)} onDoubleClick={() => setSel(p)} style={{ cursor: "pointer", background: on ? "#3b82f62a" : undefined, outline: on ? `1px solid ${C.bl}` : undefined }} onMouseOver={(e) => { if (!on) e.currentTarget.style.background = "#1e293b66"; }} onMouseOut={(e) => { if (!on) e.currentTarget.style.background = "transparent"; }}>
                  <td style={{ ...td, textAlign: "left" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <Face s={p.face} sz={22} />
                      <span>
                        <span style={{ fontWeight: 700, color: "#f1f5f9" }}>{p.name}</span>
                        <Badges p={p} focus={focus} mine={mine} />
                        {p.xf && <span title={`X-Factor: ${p.xf}`} style={{ marginLeft: 6, fontSize: 11, fontWeight: 900, color: "#f472b6" }}>XF</span>}
                        <InjTag p={p} wk={wk} showNote />
                        {p.holdout && <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 800, color: C.gd }}>Holdout</span>}
                      </span>
                    </span>
                  </td>
                  <td style={td}><Bdg pos={posTag(p)} /></td>
                  <td className="ro-hide" style={{ ...td, fontWeight: 800, color: s?.starter ? C.gn : "#64748b", whiteSpace: "nowrap" }}>{s?.label || "—"}</td>
                  <td style={{ ...td, color: "#cbd5e1" }}>{p.age}</td>
                  <td style={{ ...td, fontWeight: 900, fontSize: 16, color: oC(p.ovr) }}>{p.ovr}</td>
                  <td className="ro-hide" style={{ ...td, color: oC(p.pot || p.ovr) }}>{p.pot || p.ovr}</td>
                  <td className="ro-hide" style={td}><DevChip dev={devOf(p)} /></td>
                  <td className="ro-hide" style={{ ...td, color: "#cbd5e1", whiteSpace: "nowrap", fontSize: 13 }}>${(p.salary || 0).toFixed(1)}M · {p.contract}y</td>
                </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        {!rows.length && <div style={{ padding: 16, color: C.mt, fontSize: 15 }}>Nobody matches.</div>}
      </div>
      <SideCard p={picked} slot={picked && slot(picked)} dev={picked && devOf(picked)} onOpen={() => picked && setSel(picked)} />
      </div>
    </div>
  );
}

// Phones: one line a player (position, name, his depth slot, overall), grouped by position. A tap
// opens his card, where the age, contract and potential live. One switch for the side of the ball;
// search and sort tuck behind two small buttons.
const SORTS = [["pos", "Depth chart"], ["ovr", "Overall"], ["pot", "Potential"], ["age", "Age"], ["sal", "Salary"], ["name", "Name"]];
function PhoneRoster({ rows, slot, sort, setSort, filter, setFilter, q, setQ, find, setFind, sortOpen, setSortOpen, setSel, focus, mine, wk, devOf }) {
  const icon = { width: 44, height: 44, borderRadius: 10, border: 0, background: "#ffffff0f", color: "#cbd5e1", fontSize: 18, cursor: "pointer", flexShrink: 0 };
  let last = null;
  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}><Segments items={[["ALL", "All"], ["OFF", "Offense"], ["DEF", "Defense"], ["ST", "Special"]]} value={GROUPS[filter] !== undefined ? filter : "ALL"} onChange={setFilter} /></div>
        <button onClick={() => setFind((v) => !v)} aria-label="Search the roster" style={{ ...icon, background: find || q ? `${C.bl}33` : icon.background }}>⌕</button>
        <button onClick={() => setSortOpen(true)} aria-label="Sort the roster" style={{ ...icon, background: sort[0] !== "pos" ? `${C.bl}33` : icon.background }}>⇅</button>
      </div>
      {(find || q) && <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name" aria-label="Search roster" style={{ ...sel, width: "100%", boxSizing: "border-box", marginBottom: 10 }} />}
      <div style={{ background: C.cd, borderRadius: 14, padding: "0 12px" }}>
        {rows.map((p) => {
          const s = slot(p);
          const head = sort[0] === "pos" && p.pos !== last;
          last = p.pos;
          return (
            <React.Fragment key={p.id}>
              {head && <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.3, color: "#94a3b8", padding: "14px 2px 4px" }}>{(POS_NAME[p.pos] || p.pos).toUpperCase()}</div>}
              <button onClick={() => setSel(p)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 50, textAlign: "left", background: "transparent", border: 0, borderTop: head ? 0 : "1px solid #ffffff10", padding: "0 2px", color: C.tx, cursor: "pointer" }}>
                <span style={{ width: 38, flexShrink: 0 }}><Bdg pos={posTag(p)} /></span>
                <span style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 2, overflow: "hidden" }}>
                  <span style={{ minWidth: 0, fontWeight: 700, fontSize: 16, color: "#f1f5f9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
                  <span style={{ flexShrink: 0, display: "inline-flex", alignItems: "center" }}><RoleTag p={p} />{["generational", "superstar", "star"].includes(devOf(p)) && <span style={{ marginLeft: 4 }}><DevChip dev={devOf(p)} /></span>}<Badges p={p} focus={focus} mine={mine} /><InjTag p={p} wk={wk} />{p.holdout && <span style={{ marginLeft: 6, fontSize: 12, color: C.gd, fontWeight: 800 }}>Holdout</span>}</span>
                </span>
                <span style={{ fontSize: 13, fontWeight: 800, color: s?.starter ? C.gn : "#64748b", whiteSpace: "nowrap" }}>{sort[0] === "age" ? `Age ${p.age}` : sort[0] === "sal" ? `$${(p.salary || 0).toFixed(1)}M` : sort[0] === "pot" ? `POT ${p.pot || p.ovr}` : s?.label || ""}</span>
                <b style={{ fontSize: 20, width: 32, textAlign: "right", color: oC(p.ovr), fontVariantNumeric: "tabular-nums" }}>{p.ovr}</b>
              </button>
            </React.Fragment>
          );
        })}
        {!rows.length && <div style={{ padding: 16, color: C.mt, fontSize: 15 }}>Nobody matches.</div>}
      </div>
      {sortOpen && <Sheet title="Sort by" onClose={() => setSortOpen(false)}>{SORTS.map(([k, l], i) => <Row key={k} first={i === 0} label={l} value={sort[0] === k ? "✓" : ""} tone={C.gn} onClick={() => { setSort([k, ["pos", "name"].includes(k) ? 1 : -1]); setSortOpen(false); }} />)}<div style={{ height: 8 }} /></Sheet>}
    </div>
  );
}
