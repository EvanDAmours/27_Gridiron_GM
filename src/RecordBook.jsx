// The record book: every single-season and career record, who holds it (the NFL's mark until
// someone in your league beats it), the records your league has broken, and who's chasing one.
import React, { useMemo, useState } from "react";
import { C, TeamLogo } from "./ui.jsx";
import { MOBILE } from "./mobile.js";
import { RECORD_DEFS, recordWatch, recordValue } from "./records.js";
import { CAREER_DEFS, newCareerBook, careerChasers } from "./careerRecords.js";

export default function RecordBook({ book, teams, yr, inSeason, setSel, findPlayer }) {
  const [view, setView] = useState("season");
  const watch = inSeason ? recordWatch(book, teams, { margin: 0.9 }) : [];
  const career = { ...newCareerBook(), ...(book.career || {}) };
  const chase = useMemo(() => (view === "career" ? careerChasers(book, teams) : {}), [view, book, teams]);
  const byAb = (ab) => teams.find((t) => t.ab === ab);
  const panel = { background: "#ffffff0d", borderRadius: 18, padding: "14px 16px", marginBottom: 12 };
  const head = { fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 10 };
  const open = (pid) => { const p = pid && findPlayer(pid); if (p) setSel(p); };
  return (
    <div style={{ maxWidth: 1100 }}>
      {MOBILE && <div style={{ fontSize: 26, fontWeight: 900 }}>Record Book</div>}
      <div style={{ fontSize: 15, color: C.mt, marginBottom: 12 }}>Regular season only. The NFL's marks stand until someone in your league beats them.</div>
      <div style={{ display: "inline-flex", gap: 4, background: "#ffffff0d", borderRadius: 999, padding: 3, marginBottom: 12 }}>
        {[["season", "Single season"], ["career", "Career"]].map(([k, l]) => <button key={k} onClick={() => setView(k)} style={{ background: view === k ? "#ffffff24" : "transparent", color: view === k ? "#fff" : C.mt, border: 0, borderRadius: 999, padding: "7px 16px", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>{l}</button>)}
      </div>
      {view === "career" && (
        <div style={panel}>
          <div style={head}>NFL career records</div>
          {/* a phone: one stacked block per record */}
          {MOBILE && CAREER_DEFS.map((d) => {
            const r = career[d.key], mine = !r.nfl, c = chase[d.key];
            return (
              <div key={d.key} style={{ padding: "9px 6px", borderBottom: `1px solid ${C.bd}66`, background: mine ? "#22c55e10" : "transparent" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><b style={{ flex: 1 }}>{d.label}</b><span style={{ fontSize: 18, fontWeight: 900, color: mine ? C.gn : "#fff" }}>{recordValue(d.key, r.val)}</span></div>
                <div style={{ fontSize: 13 }}><span onClick={() => open(r.pid)} style={{ fontWeight: 800 }}>{r.name}</span> <span style={{ color: C.mt }}>({r.team}{r.nfl ? `, ${r.yrs}` : `, record since ${r.yr}`})</span>{mine && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 900, color: C.gn }}>YOUR LEAGUE</span>}</div>
                {c && <div style={{ fontSize: 12, color: C.mt }}>Closest active: <span onClick={() => open(c.pid)} style={{ color: "#e2e8f0", fontWeight: 700 }}>{c.name}</span> ({c.team}) {recordValue(d.key, c.v)} · <span style={{ color: c.v >= r.val * 0.85 ? "#facc15" : C.mt }}>{recordValue(d.key, r.val - c.v)} to go</span></div>}
              </div>
            );
          })}
          {!MOBILE && <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["RECORD", "MARK", "HELD BY", "CLOSEST ACTIVE"].map((h) => <th key={h} style={{ textAlign: "left", fontSize: 12, color: C.mt, letterSpacing: 1, padding: "6px 4px", borderBottom: `1px solid ${C.bd}` }}>{h}</th>)}</tr></thead>
              <tbody>
                {CAREER_DEFS.map((d) => {
                  const r = career[d.key], mine = !r.nfl, c = chase[d.key];
                  return (
                    <tr key={d.key} style={{ borderBottom: `1px solid ${C.bd}66`, background: mine ? "#22c55e10" : "transparent" }}>
                      <td style={{ padding: "9px 4px", fontWeight: 700 }}>{d.label}</td>
                      <td style={{ padding: "9px 4px", fontSize: 18, fontWeight: 900, color: mine ? C.gn : "#fff" }}>{recordValue(d.key, r.val)}</td>
                      <td style={{ padding: "9px 4px" }}>
                        <span onClick={() => open(r.pid)} style={{ fontWeight: 800, cursor: r.pid ? "pointer" : "default" }}>{r.name}</span> <span style={{ color: C.mt, whiteSpace: "nowrap" }}>({r.team}{r.nfl ? `, ${r.yrs}` : `, record since ${r.yr}`})</span>
                        {mine && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 900, color: C.gn }}>SET IN YOUR LEAGUE</span>}
                        {mine && r.prev && <div style={{ fontSize: 12, color: C.mt }}>Passed {r.prev.name}'s {recordValue(d.key, r.prev.val)}{r.prev.yr ? ` (${r.prev.yr})` : ""}</div>}
                      </td>
                      <td style={{ padding: "9px 4px", fontSize: 14 }}>
                        {c ? <><span onClick={() => open(c.pid)} style={{ fontWeight: 800, cursor: "pointer" }}>{c.name}</span> <span style={{ color: C.mt }}>({c.team})</span> <b>{recordValue(d.key, c.v)}</b>
                          <div style={{ fontSize: 12, color: c.v >= r.val * 0.85 ? "#facc15" : C.mt }}>{recordValue(d.key, r.val - c.v)} to go</div></> : <span style={{ color: C.mt }}>–</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>}
        </div>
      )}
      {view === "season" && watch.length > 0 && (
        <div style={{ ...panel, borderColor: "#f59e0b88" }}>
          <div style={head}>Record watch · {yr}</div>
          {watch.slice(0, 6).map((w) => (
            <div key={`${w.key}${w.pid}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px solid ${C.bd}66` }}>
              {byAb(w.team) && <TeamLogo t={byAb(w.team)} sz={26} />}
              <div style={{ flex: 1, minWidth: 0, fontSize: 14 }}><b onClick={() => open(w.pid)} style={{ cursor: "pointer" }}>{w.name}</b> <span style={{ color: C.mt }}>· {w.label}</span></div>
              <div style={{ fontSize: 14, textAlign: "right" }}>{recordValue(w.key, w.val)} so far · on pace for <b style={{ color: w.pace > w.record.val ? C.gn : "#facc15" }}>{recordValue(w.key, w.pace)}</b> <span style={{ color: C.mt }}>(record {recordValue(w.key, w.record.val)})</span></div>
            </div>
          ))}
        </div>
      )}
      {view === "season" && <div style={panel}>
        <div style={head}>Single-season records</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["RECORD", "MARK", "HELD BY"].map((h) => <th key={h} style={{ textAlign: "left", fontSize: 12, color: C.mt, letterSpacing: 1, padding: "6px 4px", borderBottom: `1px solid ${C.bd}` }}>{h}</th>)}</tr></thead>
            <tbody>
              {RECORD_DEFS.map((d) => {
                const r = book.best[d.key];
                const mine = !r.nfl;
                return (
                  <tr key={d.key} style={{ borderBottom: `1px solid ${C.bd}66`, background: mine ? "#22c55e10" : "transparent" }}>
                    <td style={{ padding: "9px 4px", fontWeight: 700 }}>{d.label}</td>
                    <td style={{ padding: "9px 4px", fontSize: 18, fontWeight: 900, color: mine ? C.gn : "#fff" }}>{recordValue(d.key, r.val)}</td>
                    <td style={{ padding: "9px 4px" }}>
                      <span onClick={() => open(r.pid)} style={{ fontWeight: 800, cursor: r.pid ? "pointer" : "default" }}>{r.name}</span> <span style={{ color: C.mt, whiteSpace: "nowrap" }}>({r.team}, {r.yr})</span>
                      {mine && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 900, color: C.gn }}>SET IN YOUR LEAGUE</span>}
                      {mine && r.prev && <div style={{ fontSize: 12, color: C.mt }}>Broke {r.prev.name}'s {recordValue(d.key, r.prev.val)} ({r.prev.yr})</div>}
                      {(r.ties || []).map((x, j) => <div key={j} style={{ fontSize: 12, color: "#fbbf24" }}>🤝 Tied by <span onClick={() => open(x.pid)} style={{ fontWeight: 800, cursor: "pointer" }}>{x.name}</span> ({x.team}, {x.yr})</div>)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>}
      <div style={panel}>
        <div style={head}>Records broken or tied in your league</div>
        {[...book.history].reverse().map((h, i) => (
          <div key={i} style={{ fontSize: 14, padding: "6px 0", borderBottom: `1px solid ${C.bd}66` }}>
            <b>{h.yr}</b> · <span onClick={() => open(h.pid)} style={{ fontWeight: 800, cursor: "pointer" }}>{h.name}</span> ({h.team}) {h.tie ? <>tied {h.prev.name}'s {h.label.toLowerCase()} record ({recordValue(h.key, h.val)}) 🤝</> : <>took the {h.career ? "career " : ""}{h.label.toLowerCase()} record from {h.prev.name} ({recordValue(h.key, h.prev.val)})</>}
          </div>
        ))}
        {!book.history.length && <div style={{ fontSize: 14, color: C.mt }}>No records have fallen yet. When one does, it's written here.</div>}
      </div>
    </div>
  );
}
