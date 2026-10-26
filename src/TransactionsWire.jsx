// The League > Transactions page: the wire (transactions.js), newest first, filtered by kind, club
// and season, grouped by season and week.
import React, { useState, useMemo } from "react";
import { C, TeamLogo } from "./ui.jsx";
import { MOBILE } from "./mobile.js";
import Select from "./Select.jsx";
import { KINDS } from "./transactions.js";

const ICON = { trade: "🔁", sign: "✍️", release: "✂️", coach: "📋", retire: "👋" };
const TAG = { trade: "Trade", sign: "Signing", release: "Release", coach: "Coaching", retire: "Retirement" };
const TONE = { trade: "#a78bfa", sign: C.gn, release: "#f87171", coach: "#7dd3fc", retire: "#fbbf24" };

export default function TransactionsWire({ wire = [], teams = [], ui }) {
  const [kind, setKind] = useState("all");
  const [team, setTeam] = useState("all");
  const seasons = useMemo(() => [...new Set(wire.map((e) => e.y))].sort((a, b) => b - a), [wire]);
  const [season, setSeason] = useState("all");
  const list = wire.filter((e) => (kind === "all" || e.k === kind) && (team === "all" || (e.tm || []).includes(+team)) && (season === "all" || e.y === +season));
  const total = Object.fromEntries(KINDS.map(([k]) => [k, wire.filter((e) => e.k === k).length]));
  const counts = Object.fromEntries(KINDS.map(([k]) => [k, wire.filter((e) => e.k === k && (season === "all" || e.y === +season)).length]));
  // group by "season · when", in wire order (newest first)
  const groups = [];
  for (const e of list.slice(0, 400)) {
    const key = `${e.y} · ${e.when}`;
    if (groups[groups.length - 1]?.key !== key) groups.push({ key, items: [] });
    groups[groups.length - 1].items.push(e);
  }
  const chip = (on) => ({ background: on ? "#ffffff24" : "transparent", color: on ? "#fff" : "#94a3b8", border: 0, borderRadius: 999, padding: MOBILE ? "8px 12px" : "5px 12px", fontSize: 14, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" });
  const selStyle = { background: "#ffffff12", color: C.tx, border: 0, borderRadius: 999, padding: "8px 14px", fontSize: 14, flex: MOBILE ? 1 : "0 0 auto", minWidth: 0 };
  const filters = (<>
    <Select value={team} onChange={(e) => setTeam(e.target.value)} aria-label="Club" style={selStyle}>
      <option value="all">All clubs</option>
      {teams.map((t, i) => <option key={i} value={i}>{i === ui ? "★ " : ""}{t.city} {t.name}</option>)}
    </Select>
    <Select value={season} onChange={(e) => setSeason(e.target.value)} aria-label="Season" style={selStyle}>
      <option value="all">All seasons</option>
      {seasons.map((y) => <option key={y} value={y}>{y}</option>)}
    </Select>
  </>);
  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
        {MOBILE && <div style={{ fontSize: 20, fontWeight: 900 }}>Transactions</div>}
        {!MOBILE && <div style={{ fontSize: 14, color: C.mt }}>Every trade, signing, release, coaching move and retirement around the league.</div>}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: MOBILE ? "nowrap" : "wrap", overflowX: MOBILE ? "auto" : "visible", alignItems: "center", marginBottom: MOBILE ? 6 : 10, paddingBottom: MOBILE ? 2 : 0 }}>
        <button onClick={() => setKind("all")} style={chip(kind === "all")}>All</button>
        {KINDS.filter(([k]) => total[k] || kind === k).map(([k, l]) => <button key={k} onClick={() => setKind(k)} style={chip(kind === k)}>{ICON[k]} {l} <span style={{ color: C.mt, fontWeight: 600 }}>{counts[k]}</span></button>)}
        {!MOBILE && <><span style={{ flex: 1 }} />{filters}</>}
      </div>
      {MOBILE && <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>{filters}</div>}
      {!groups.length && <div style={{ background: "#ffffff0d", borderRadius: 18, padding: 16, color: C.mt, fontSize: 14 }}>Nothing on the wire yet. Trades, signings and coaching moves show up here as they happen.</div>}
      {groups.map((g) => (
        <div key={g.key} style={{ background: "#ffffff0d", borderRadius: 18, padding: "12px 16px", marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", marginBottom: 6 }}>{g.key}</div>
          {g.items.map((e, i) => {
            const mine = (e.tm || []).includes(ui);
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: i ? `1px solid ${C.bd}55` : "none", background: mine ? "#14532d22" : "transparent" }}>
                {!MOBILE && <span style={{ width: 22, textAlign: "center", fontSize: 14 }} title={e.k}>{ICON[e.k]}</span>}
                <span style={{ display: "inline-flex", gap: 2, minWidth: MOBILE ? 24 : 48 }}>{(e.tm || []).slice(0, MOBILE ? 1 : 2).map((ti) => teams[ti] && <TeamLogo key={ti} t={teams[ti]} sz={22} />)}</span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: "#e2e8f0", lineHeight: 1.35 }}><b style={{ color: TONE[e.k], fontSize: 12, marginRight: 6 }}>{TAG[e.k]}</b>{e.t}</span>
              </div>
            );
          })}
        </div>
      ))}
      {list.length > 400 && <div style={{ fontSize: 12, color: C.mt }}>Showing the latest 400. Filter by club or season to see more.</div>}
    </div>
  );
}
