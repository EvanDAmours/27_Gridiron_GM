// The League landing page: a short menu on the left, the week's games with every club's record in
// the middle, and the league leaders on the right (all on one screen, no scrolling).
import React, { useMemo, useState } from "react";
import { C, Face, TeamLogo } from "./ui.jsx";
import { posTag } from "./dline.js";

const LEADERS = [
  ["PASSING", (s) => s.passYds || 0, (p) => p.pos === "QB", [["CMP%", (s) => (s.att ? Math.round((100 * (s.comp || 0)) / s.att) : 0)], ["YDS", (s) => s.passYds || 0], ["TD", (s) => s.passTD || 0]]],
  ["RUSHING", (s) => s.rushYds || 0, () => true, [["ATT", (s) => s.rushAtt || 0], ["YDS", (s) => s.rushYds || 0], ["TD", (s) => s.rushTD || 0]]],
  ["RECEIVING", (s) => s.recYds || 0, () => true, [["REC", (s) => s.rec || 0], ["YDS", (s) => s.recYds || 0], ["TD", (s) => s.recTD || 0]]],
  ["SACKS", (s) => s.sacks || 0, () => true, [["POS", null], ["SCK", (s) => s.sacks || 0], ["TFL", (s) => s.tfl || 0]]],
  ["INTERCEPTIONS", (s) => (s.ints || 0) * 100 + (s.pd || 0), () => true, [["POS", null], ["INT", (s) => s.ints || 0], ["PD", (s) => s.pd || 0]]],
  ["TACKLES", (s) => (s.tkl || 0) + (s.ast || 0), () => true, [["POS", null], ["TKL", (s) => (s.tkl || 0) + (s.ast || 0)], ["TFL", (s) => s.tfl || 0]]],
];
const rec = (t) => `${t.w || 0}-${t.l || 0}${t.t ? `-${t.t}` : ""}`;
const short = (n) => { const a = String(n || "").split(" "); return a.length > 1 ? `${a[0][0]}. ${a.slice(1).join(" ")}` : n; };

export default function LeagueView({ teams, ui, sched, wk, sp, mobile, onPlayer, onTeam, go }) {
  const weeks = useMemo(() => [...new Set((sched || []).filter((g) => typeof g.wk === "number" && g.wk <= 18).map((g) => g.wk))].sort((a, b) => a - b), [sched]);
  // in season, the week coming up; otherwise the last week played (or week 1 before the season)
  const def = sp === "regular" ? Math.min(Math.max(wk + 1, 1), weeks[weeks.length - 1] || 18) : (sched || []).some((g) => g.played && g.wk <= 18) ? Math.max(...(sched || []).filter((g) => g.played && g.wk <= 18).map((g) => g.wk)) : weeks[0] || 1;
  const [w, setW] = useState(null);
  const week = w ?? def;
  const games = (sched || []).filter((g) => g.wk === week);
  const byes = teams.filter((t, i) => !games.some((g) => g.h === i || g.a === i)).map((t) => t.ab);
  const leaders = useMemo(() => {
    const all = [];
    teams.forEach((t, ti) => [...t.roster, ...(t.ir || [])].forEach((p) => { if (p.ss && (p.ss.gp || 0) > 0) all.push({ p, t, ti }); }));
    return LEADERS.map(([title, v, ok, cols]) => ({ title, cols, top: all.filter((x) => ok(x.p) && v(x.p.ss) > 0).sort((a, b) => v(b.p.ss) - v(a.p.ss)).slice(0, 3) }));
  }, [teams]);
  const panel = { background: C.cd, border: `1px solid ${C.bd}`, borderRadius: 12, padding: "10px 12px" };
  const head = { fontSize: 13, fontWeight: 900, letterSpacing: 1.4, color: "#e2e8f0" };
  const Side = ({ t, i, s, won }) => (
    <span onClick={() => onTeam?.(i)} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", minWidth: 0, opacity: won === false ? 0.55 : 1 }}>
      <TeamLogo t={t} sz={mobile ? 26 : 30} />
      <span style={{ lineHeight: 1.1 }}>
        <b style={{ fontSize: 15, color: i === ui ? C.gn : "#fff" }}>{t.ab}</b>
        <span style={{ display: "block", fontSize: 12, color: C.mt }}>{rec(t)}</span>
      </span>
      {s != null && <b style={{ marginLeft: "auto", fontSize: 18, fontVariantNumeric: "tabular-nums", color: won ? "#fff" : "#94a3b8" }}>{s}</b>}
    </span>
  );
  const menu = [["standings", "Standings"], ["schedule", "Schedule"], ["stats", "Stats & Awards"], ["wire", "Transactions"], ["records", "Record Book"], ["history", "League History"], ["hub", "Franchise History"]];
  return (
    <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "170px minmax(0,1.25fr) minmax(360px,1fr)", gap: 12, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: mobile ? "row" : "column", gap: 6, overflowX: mobile ? "auto" : undefined, scrollbarWidth: "none" }}>
        {(mobile ? menu.slice(0, 4) : menu).map(([k, l]) => <button key={k} onClick={() => go(k)} style={{ textAlign: "left", background: "transparent", border: `1px solid ${C.bd}`, borderRadius: 8, color: "#cbd5e1", padding: "8px 12px", fontSize: 14, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>{l}</button>)}
      </div>
      <div style={panel}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={head}>WEEKLY SCHEDULE</span>
          <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <button aria-label="Previous week" disabled={week <= (weeks[0] || 1)} onClick={() => setW(Math.max(weeks[0] || 1, week - 1))} style={{ background: C.bg, color: "#fff", border: `1px solid ${C.bd}`, borderRadius: 6, padding: "2px 9px", cursor: "pointer" }}>‹</button>
            <b style={{ fontSize: 14, minWidth: 64, textAlign: "center" }}>Week {week}</b>
            <button aria-label="Next week" disabled={week >= (weeks[weeks.length - 1] || 18)} onClick={() => setW(Math.min(weeks[weeks.length - 1] || 18, week + 1))} style={{ background: C.bg, color: "#fff", border: `1px solid ${C.bd}`, borderRadius: 6, padding: "2px 9px", cursor: "pointer" }}>›</button>
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 6 }}>
          {games.map((g, k) => {
            const A = teams[g.a], H = teams[g.h];
            const mine = g.h === ui || g.a === ui;
            return (
              <div key={k} style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 8, background: mine ? "#16a34a1a" : C.bg, border: `1px solid ${mine ? "#16a34a66" : C.bd + "88"}`, borderRadius: 8, padding: "6px 10px" }}>
                <Side t={A} i={g.a} s={g.played ? g.as : null} won={g.played ? g.as > g.hs : undefined} />
                <span style={{ fontSize: 11, color: C.mt, fontWeight: 800 }}>{g.played ? "FINAL" : "AT"}</span>
                <Side t={H} i={g.h} s={g.played ? g.hs : null} won={g.played ? g.hs > g.as : undefined} />
              </div>
            );
          })}
        </div>
        {!games.length && <div style={{ color: C.mt, fontSize: 14 }}>No games this week.</div>}
        {games.length > 0 && byes.length > 0 && <div style={{ fontSize: 12, color: C.mt, marginTop: 8 }}>Bye: {byes.join(", ")}</div>}
      </div>
      <div style={panel}>
        <div style={{ ...head, marginBottom: 6 }}>LEAGUE LEADERS</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 14px" }}>
          {leaders.map((b) => (
            <div key={b.title} style={{ minWidth: 0 }}>
              <div style={{ display: "flex", fontSize: 10.5, fontWeight: 900, letterSpacing: 1, color: C.mt, borderBottom: `1px solid ${C.bd}`, paddingBottom: 3, marginBottom: 3 }}>
                <span style={{ flex: 1 }}>{b.title}</span>
                {b.cols.map(([l]) => <span key={l} style={{ width: 34, textAlign: "right" }}>{l}</span>)}
              </div>
              {b.top.map(({ p, t, ti }) => (
                <div key={p.id} onClick={() => onPlayer?.(p)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0", cursor: "pointer", fontSize: 12.5 }}>
                  <Face s={p.face} sz={24} />
                  <span style={{ flex: 1, minWidth: 0, lineHeight: 1.1 }}>
                    <span style={{ display: "block", fontSize: 10, color: ti === ui ? C.gn : C.mt, fontWeight: 800 }}>{t.ab}</span>
                    <b style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: ti === ui ? C.gn : "#f1f5f9" }}>{short(p.name)}</b>
                  </span>
                  {b.cols.map(([l, f]) => <span key={l} style={{ width: 34, textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: l === "YDS" || l === "SCK" || l === "INT" || l === "TKL" ? 900 : 600, color: "#e2e8f0" }}>{f ? f(p.ss).toLocaleString() : posTag(p)}</span>)}
                </div>
              ))}
              {!b.top.length && <div style={{ fontSize: 12, color: C.mt, padding: "4px 0" }}>No games yet.</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
