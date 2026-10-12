// The Front Office's cap picture: where the money is this year and next, what's dead, where it
// goes by position, and the cap advisor's suggestions (restructures, cuts that free real money,
// extensions to get done early, and what to do with room to spare).
import React from "react";
import { C, Bdg } from "./ui.jsx";

const GROUPS = [["QB", ["QB"]], ["Skill", ["RB", "WR", "TE"]], ["O-line", ["LT", "LG", "C", "RG", "RT"]], ["D-line", ["DL"]], ["LB", ["LB"]], ["Secondary", ["CB", "S"]], ["Specialists", ["K", "P"]]];
const $ = (v) => `$${(+v || 0).toFixed(1)}M`;

// rows: [{ p, yl (years left), dm (dead money if cut: {total}), rp (restructure plan or null) }]
export function capAdvice({ rows, space, nextRoom, canExtend, starters }) {
  const tips = [];
  for (const r of rows.filter((r) => r.rp).sort((a, b) => b.rp.saved - a.rp.saved).slice(0, 2))
    tips.push({ kind: "restructure", tone: "#38bdf8", p: r.p, title: `Restructure ${r.p.name}`, text: `Turns salary into bonus: ${$(r.rp.saved)} of room this year, spread over the rest of his deal.` });
  for (const r of rows) {
    const save = (r.p.salary || 0) - (r.dm?.total || 0);
    if (save >= 3 && !starters.has(r.p.id) && (r.p.age || 0) >= 27) tips.push({ kind: "cut", tone: "#f87171", p: r.p, save, title: `Release ${r.p.name}?`, text: `A backup at ${$(r.p.salary)}. Cutting him frees ${$(save)} (${$(r.dm?.total || 0)} stays as dead money).` });
  }
  const cuts = tips.filter((t) => t.kind === "cut").sort((a, b) => b.save - a.save).slice(0, 2);
  const ext = rows.filter((r) => canExtend(r.p) && r.p.ovr >= 78 && (r.p.age || 30) <= 29 && !r.p.holdout).sort((a, b) => b.p.ovr - a.p.ovr).slice(0, 2)
    .map((r) => ({ kind: "extend", tone: "#a78bfa", p: r.p, title: `Extend ${r.p.name} now`, text: `${r.p.ovr} OVR at ${r.p.age}, ${r.yl} year${r.yl === 1 ? "" : "s"} left. Deals only get pricier once he's close to the market.` }));
  const out = [...tips.filter((t) => t.kind === "restructure"), ...cuts, ...ext];
  if (space < 0) out.unshift({ kind: "warn", tone: C.rd, title: "You're over the cap", text: `${$(-space)} over. Restructure or release someone before the next game or penalties hit.` });
  else if (space > 40) out.push({ kind: "room", tone: C.gn, title: `${$(space)} of room`, text: "Enough to take on a big contract in a trade, front-load a free agent, or extend a starter early." });
  if (nextRoom < 0) out.push({ kind: "warn", tone: "#f59e0b", title: "Next season is already over the cap", text: `${$(-nextRoom)} short before re-signing anyone. Plan restructures or cuts this year.` });
  return out;
}

export default function CapOverview({ team, cap, space, nextRoom, dead, deadNext, rows, canExtend, starters, onPlayer, mobile, leagueAvg, onContracts }) {
  const used = cap - space;
  const byGroup = GROUPS.map(([g, ps]) => [g, team.roster.filter((p) => ps.includes(p.pos)).reduce((s, p) => s + (p.salary || 0), 0), leagueAvg ? leagueAvg(ps) : null]);
  const top = [...team.roster].sort((a, b) => (b.salary || 0) - (a.salary || 0)).slice(0, 5);
  const tips = capAdvice({ rows, space, nextRoom, canExtend, starters });
  const card = { background: C.cd, border: `1px solid ${C.bd}`, borderRadius: 12, padding: "12px 14px" };
  const head = { fontSize: 12, fontWeight: 900, letterSpacing: 1.4, color: C.gd, marginBottom: 8 };
  return (
    <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit,minmax(${mobile ? 150 : 180}px,1fr))`, gap: 8 }}>
        {[["CAP SPACE", $(space), space < 0 ? C.rd : space < 15 ? C.gd : C.gn, `of ${$(cap)}`], ["NEXT SEASON'S ROOM", $(nextRoom), nextRoom < 0 ? C.rd : C.gn, "before re-signings"], ["DEAD MONEY", $(dead), dead > 0 ? C.rd : C.mt, deadNext ? `+${$(deadNext)} next year` : "none next year"], ["EXPIRING DEALS", rows.filter((r) => r.yl <= 1).length, C.tx, onContracts ? "after this season · see them →" : "after this season", "expiring"]].map(([l, v, c, sub, f]) => (
          <div key={l} onClick={f && onContracts ? () => onContracts(f) : undefined} style={{ ...card, cursor: f && onContracts ? "pointer" : "default" }}>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.2, color: C.mt }}>{l}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: c }}>{v}</div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>{sub}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit,minmax(${mobile ? 280 : 340}px,1fr))`, gap: 10 }}>
        <div style={card}>
          <div style={head}>WHERE THE MONEY GOES</div>
          <div style={{ height: 12, borderRadius: 6, background: C.bd, overflow: "hidden", display: "flex", marginBottom: 10 }} title={`${$(used)} used of ${$(cap)}`}>
            {byGroup.map(([g, v], i) => <div key={g} style={{ width: `${(v / cap) * 100}%`, background: ["#f59e0b", "#38bdf8", "#22c55e", "#ef4444", "#a78bfa", "#ec4899", "#94a3b8"][i] }} />)}
          </div>
          {byGroup[0][2] != null && <div style={{ display: "flex", fontSize: 11, fontWeight: 800, color: C.mt, letterSpacing: 0.8, padding: "0 0 2px 18px" }}><span style={{ flex: 1 }}>GROUP</span><span style={{ width: 64, textAlign: "right" }}>YOU</span><span style={{ width: 92, textAlign: "right" }}>LEAGUE AVG</span><span style={{ width: 64, textAlign: "right" }}>VS AVG</span></div>}
          {byGroup.map(([g, v, avg], i) => {
            const d = avg ? (v - avg) / avg : 0;
            return (
              <div key={g} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, padding: "3px 0" }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: ["#f59e0b", "#38bdf8", "#22c55e", "#ef4444", "#a78bfa", "#ec4899", "#94a3b8"][i] }} />
                <span style={{ flex: 1 }}>{g}</span><b style={{ width: 64, textAlign: "right" }}>{$(v)}</b>
                {avg != null ? <>
                  <span style={{ color: C.mt, width: 92, textAlign: "right" }}>{$(avg)}</span>
                  <span title={d > 0.25 ? "Well above what the average club spends here" : d < -0.25 ? "Well below the league average" : "About average"} style={{ width: 64, textAlign: "right", fontWeight: 800, color: d > 0.25 ? C.rd : d < -0.25 ? C.gn : C.mt }}>{d > 0 ? "+" : ""}{Math.round(d * 100)}%</span>
                </> : <span style={{ color: C.mt, minWidth: 44, textAlign: "right" }}>{Math.round((v / cap) * 100)}%</span>}
              </div>
            );
          })}
          <div style={{ fontSize: 12, fontWeight: 800, color: C.mt, margin: "10px 0 4px" }}>BIGGEST CAP HITS</div>
          {onContracts && <button onClick={() => onContracts("all")} style={{ float: "right", marginTop: -22, background: "transparent", border: 0, color: "#7dd3fc", fontSize: 13, cursor: "pointer" }}>All {rows.length} contracts →</button>}
          {top.map((p) => <div key={p.id} onClick={() => onPlayer(p)} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, padding: "3px 0", cursor: "pointer" }}><Bdg pos={p.pos} /><span style={{ flex: 1 }}>{p.name}</span><b style={{ color: C.gd }}>{$(p.salary)}</b><span style={{ color: C.mt, minWidth: 44, textAlign: "right" }}>{Math.round(((p.salary || 0) / cap) * 100)}%</span></div>)}
        </div>
        <div style={card}>
          <div style={head}>CAP ADVISOR</div>
          {!tips.length && <div style={{ fontSize: 14, color: "#94a3b8" }}>Your books are in good shape. Nothing needs doing right now.</div>}
          {tips.map((t, i) => (
            <div key={i} onClick={() => t.p && onPlayer(t.p)} style={{ borderLeft: `3px solid ${t.tone}`, background: C.bg, borderRadius: 8, padding: "8px 10px", marginBottom: 6, cursor: t.p ? "pointer" : "default" }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{t.title}</div>
              <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.4 }}>{t.text}</div>
            </div>
          ))}
          <div style={{ fontSize: 12, color: C.mt, marginTop: 4 }}>Tap a suggestion to open the player. Restructures and extensions are also on the Contracts tab.</div>
        </div>
      </div>
    </div>
  );
}
