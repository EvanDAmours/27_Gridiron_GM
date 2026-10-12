// Stats: league leaders and full stat tables for the whole league, a conference, a division or a
// single team. Pick a team and you get its leader at every position; click a column to sort.
import React, { useMemo, useState } from "react";
import { C, Bdg, Face, TeamLogo } from "./ui.jsx";

const pct = (a, b) => (b ? ((a / b) * 100).toFixed(1) : "–");
const avg = (a, b) => (b ? (a / b).toFixed(1) : "–");
const n = (v) => (typeof v === "number" ? (Number.isInteger(v) ? v.toLocaleString() : v.toFixed(1)) : v ?? 0);

// Each table: who's in it, its columns ([label, value(ss), sort?]) and the default sort column.
const TABLES = {
  Passing: { has: (s) => (s.att || 0) >= 10, sort: "YDS", cols: [["CMP", (s) => s.comp || 0], ["ATT", (s) => s.att || 0], ["PCT", (s) => pct(s.comp || 0, s.att || 0), (s) => (s.att ? s.comp / s.att : 0)], ["YDS", (s) => s.passYds || 0], ["TD", (s) => s.passTD || 0], ["INT", (s) => s.passInt || 0], ["RATE", (s) => s.rate || 0]] },
  Rushing: { has: (s) => (s.rushAtt || 0) > 0, sort: "YDS", cols: [["ATT", (s) => s.rushAtt || 0], ["YDS", (s) => s.rushYds || 0], ["AVG", (s) => avg(s.rushYds || 0, s.rushAtt || 0), (s) => (s.rushAtt ? s.rushYds / s.rushAtt : 0)], ["TD", (s) => s.rushTD || 0], ["FUM", (s) => s.fum || 0]] },
  Receiving: { has: (s) => (s.rec || 0) > 0, sort: "YDS", cols: [["TGT", (s) => s.tgt || 0], ["REC", (s) => s.rec || 0], ["YDS", (s) => s.recYds || 0], ["AVG", (s) => avg(s.recYds || 0, s.rec || 0), (s) => (s.rec ? s.recYds / s.rec : 0)], ["TD", (s) => s.recTD || 0]] },
  Defense: { has: (s) => (s.tkl || 0) + (s.ast || 0) + (s.sacks || 0) + (s.ints || 0) + (s.pd || 0) > 0, sort: "TKL", cols: [["TKL", (s) => (s.tkl || 0) + (s.ast || 0)], ["SCK", (s) => s.sacks || 0], ["TFL", (s) => s.tfl || 0], ["INT", (s) => s.ints || 0], ["PD", (s) => s.pd || 0], ["FF", (s) => s.ff || 0]] },
  Kicking: { has: (s) => (s.fgA || 0) + (s.xpA || 0) > 0, sort: "PTS", cols: [["FGM", (s) => s.fgM || 0], ["FGA", (s) => s.fgA || 0], ["FG%", (s) => pct(s.fgM || 0, s.fgA || 0), (s) => (s.fgA ? s.fgM / s.fgA : 0)], ["XPM", (s) => s.xpM || 0], ["LNG", (s) => s.lng || 0], ["PTS", (s) => s.pts || (s.fgM || 0) * 3 + (s.xpM || 0)]] },
  Punting: { has: (s) => (s.punts || 0) > 0, sort: "AVG", cols: [["PUNTS", (s) => s.punts || 0], ["YDS", (s) => s.puntYds || 0], ["AVG", (s) => avg(s.puntYds || 0, s.punts || 0), (s) => (s.punts ? s.puntYds / s.punts : 0)], ["IN20", (s) => s.in20 || 0]] },
  Returns: { has: (s) => (s.kr || 0) + (s.pr || 0) + (s.krYds || 0) + (s.prYds || 0) > 0, sort: "KR YDS", cols: [["KR", (s) => s.kr || 0], ["KR YDS", (s) => s.krYds || 0], ["KR TD", (s) => s.krTD || 0], ["PR", (s) => s.pr || 0], ["PR YDS", (s) => s.prYds || 0], ["PR TD", (s) => s.prTD || 0]] },
};

// Headline leader boards: [title, value(ss), unit, who qualifies]
const BOARDS = [
  ["Passing yards", (s) => s.passYds || 0, "yds", (p) => p.pos === "QB"],
  ["Passing TDs", (s) => s.passTD || 0, "TD", (p) => p.pos === "QB"],
  ["Rushing yards", (s) => s.rushYds || 0, "yds", () => true],
  ["Receiving yards", (s) => s.recYds || 0, "yds", () => true],
  ["Sacks", (s) => s.sacks || 0, "sk", () => true],
  ["Tackles", (s) => (s.tkl || 0) + (s.ast || 0), "tkl", () => true],
  ["Interceptions", (s) => s.ints || 0, "INT", () => true],
];

// The stat that makes a player his position's leader on a team, and the line shown for him.
const POS_LEAD = [
  ["QB", (s) => s.passYds || 0, (s) => `${n(s.passYds || 0)} yds · ${s.passTD || 0} TD · ${s.passInt || 0} INT · ${(s.rate || 0).toFixed(1)} rate`],
  ["RB", (s) => (s.rushYds || 0) + (s.recYds || 0), (s) => `${n(s.rushYds || 0)} rush yds · ${s.rushTD || 0} TD · ${s.rec || 0} rec`],
  ["WR", (s) => s.recYds || 0, (s) => `${s.rec || 0} rec · ${n(s.recYds || 0)} yds · ${s.recTD || 0} TD`],
  ["TE", (s) => s.recYds || 0, (s) => `${s.rec || 0} rec · ${n(s.recYds || 0)} yds · ${s.recTD || 0} TD`],
  ["DL", (s) => (s.sacks || 0) * 4 + (s.tkl || 0) + (s.tfl || 0), (s) => `${n(s.sacks || 0)} sk · ${(s.tkl || 0) + (s.ast || 0)} tkl · ${s.tfl || 0} TFL`],
  ["LB", (s) => (s.tkl || 0) + (s.ast || 0) + (s.sacks || 0) * 3, (s) => `${(s.tkl || 0) + (s.ast || 0)} tkl · ${n(s.sacks || 0)} sk · ${s.ints || 0} INT`],
  ["CB", (s) => (s.ints || 0) * 5 + (s.pd || 0) * 2 + (s.tkl || 0), (s) => `${s.ints || 0} INT · ${s.pd || 0} PD · ${(s.tkl || 0) + (s.ast || 0)} tkl`],
  ["S", (s) => (s.ints || 0) * 5 + (s.pd || 0) * 2 + (s.tkl || 0), (s) => `${(s.tkl || 0) + (s.ast || 0)} tkl · ${s.ints || 0} INT · ${s.pd || 0} PD`],
  ["K", (s) => s.fgM || 0, (s) => `${s.fgM || 0}/${s.fgA || 0} FG · ${s.xpM || 0} XP · long ${s.lng || 0}`],
  ["P", (s) => s.punts || 0, (s) => `${s.punts || 0} punts · ${avg(s.puntYds || 0, s.punts || 0)} avg · ${s.in20 || 0} in 20`],
];

const GRADE_C = { "A+": "#f59e0b", A: "#22c55e", B: "#60a5fa", C: "#94a3b8", D: "#f97316", F: "#ef4444" };

export default function StatsScreen({ teams, ui, onPlayer, grade, mobile }) {
  const me = teams[ui];
  const [scope, setScope] = useState("league"); // league | AFC | NFC | div | team:<id>
  const [cat, setCat] = useState("Passing");
  const [sort, setSort] = useState(null);
  const teamId = scope.startsWith("team:") ? +scope.slice(5) : null;
  const inScope = (t) => scope === "league" || (scope === "AFC" || scope === "NFC" ? t.c === scope : scope === "div" ? t.c === me.c && t.d === me.d : t.id === teamId);
  const players = useMemo(() => {
    const out = [];
    teams.forEach((t, ti) => { if (!inScope(t)) return; [...t.roster, ...(t.ir || [])].forEach((p) => { if (p.ss && (p.ss.gp || 0) > 0) out.push({ p, t, ti }); }); });
    return out;
  }, [teams, scope]); // eslint-disable-line react-hooks/exhaustive-deps

  const T = TABLES[cat];
  const col = T.cols.find((c) => c[0] === (sort || T.sort)) || T.cols[0];
  const sv = (x) => (col[2] || col[1])(x.p.ss);
  const rows = players.filter((x) => T.has(x.p.ss)).sort((a, b) => sv(b) - sv(a)).slice(0, teamId != null ? 60 : 40);
  const team = teamId != null ? teams[teamId] : null;
  const pill = (on) => ({ background: on ? "#3b82f633" : C.cd, color: on ? "#fff" : "#cbd5e1", border: `1px solid ${on ? C.bl : C.bd}`, borderRadius: 999, padding: "6px 13px", fontSize: 14, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" });
  const th = { padding: "8px 8px", fontSize: 12, fontWeight: 900, letterSpacing: 0.8, color: C.mt, textAlign: "right", borderBottom: `1px solid ${C.bd}`, whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" };
  const td = { padding: "8px 8px", fontSize: 14, textAlign: "right", borderBottom: `1px solid ${C.bd}55`, whiteSpace: "nowrap" };

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        {[["league", "League"], ["AFC", "AFC"], ["NFC", "NFC"], ["div", `${me.c} ${me.d}`], [`team:${ui}`, `My team (${me.ab})`]].map(([k, l]) => <button key={k} onClick={() => setScope(k)} style={pill(scope === k)}>{l}</button>)}
        <select value={teamId != null && teamId !== ui ? scope : ""} onChange={(e) => e.target.value && setScope(e.target.value)} style={{ background: C.cd, color: C.tx, border: `1px solid ${teamId != null && teamId !== ui ? C.bl : C.bd}`, borderRadius: 999, padding: "6px 10px", fontSize: 14, fontWeight: 700 }}>
          <option value="">Another team…</option>
          {teams.map((t, i) => ({ t, i })).sort((a, b) => a.t.city.localeCompare(b.t.city)).map(({ t, i }) => <option key={i} value={`team:${i}`}>{t.city} {t.name}</option>)}
        </select>
      </div>

      {team ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <TeamLogo t={team} sz={40} glow />
            <div><div style={{ fontSize: 20, fontWeight: 900 }}>{team.city} {team.name}</div><div style={{ fontSize: 13, color: C.mt }}>Leader at every position · {team.w}-{team.l}{team.t ? `-${team.t}` : ""}</div></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill,minmax(${mobile ? 260 : 300}px,1fr))`, gap: 8, marginBottom: 16 }}>
            {POS_LEAD.map(([pos, val, line]) => {
              const best = players.filter((x) => x.p.pos === pos && val(x.p.ss) > 0).sort((a, b) => val(b.p.ss) - val(a.p.ss))[0];
              return (
                <div key={pos} onClick={() => best && onPlayer(best.p)} style={{ display: "flex", gap: 10, alignItems: "center", background: C.cd, border: `1px solid ${C.bd}`, borderRadius: 10, padding: "9px 12px", cursor: best ? "pointer" : "default" }}>
                  <Bdg pos={pos} />
                  {best ? <>
                    <Face s={best.p.face} sz={30} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{best.p.name}{grade && teamId === ui && <span style={{ marginLeft: 6, fontSize: 13, fontWeight: 900, color: GRADE_C[grade(best.p)] || C.mt }}>{grade(best.p)}</span>}</div>
                      <div style={{ fontSize: 13, color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{line(best.p.ss)}</div>
                    </div>
                  </> : <span style={{ color: C.mt, fontSize: 14 }}>No stats yet</span>}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill,minmax(${mobile ? 250 : 270}px,1fr))`, gap: 10, marginBottom: 16 }}>
          {BOARDS.map(([title, val, unit, ok]) => {
            const top = players.filter((x) => ok(x.p) && val(x.p.ss) > 0).sort((a, b) => val(b.p.ss) - val(a.p.ss)).slice(0, 5);
            return (
              <div key={title} style={{ background: C.cd, border: `1px solid ${C.bd}`, borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.4, color: C.gd, marginBottom: 8 }}>{title.toUpperCase()}</div>
                {!top.length && <div style={{ fontSize: 13, color: C.mt }}>No stats yet</div>}
                {top.map((x, i) => (
                  <div key={x.p.id} onClick={() => onPlayer(x.p)} style={{ display: "grid", gridTemplateColumns: i ? "18px 1fr auto" : "18px 30px 1fr auto", alignItems: "center", gap: 8, padding: i ? "5px 0" : "2px 0 8px", borderTop: i ? `1px solid ${C.bd}66` : "none", cursor: "pointer" }}>
                    <span style={{ fontSize: 12, color: i ? C.mt : C.gd, fontWeight: 800 }}>{i + 1}</span>
                    {!i && <Face s={x.p.face} sz={30} />}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: i ? 14 : 16, fontWeight: i ? 600 : 900, color: i ? "#cbd5e1" : "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.p.name}</div>
                      <div style={{ fontSize: 11, color: x.ti === ui ? C.gn : C.mt, fontWeight: 700 }}>{x.t.ab} · {x.p.pos}</div>
                    </div>
                    <span style={{ fontSize: i ? 15 : 20, fontWeight: 900, color: i ? C.tx : C.gd }}>{n(val(x.p.ss))}<span style={{ fontSize: 11, color: C.mt, fontWeight: 700, marginLeft: 3 }}>{unit}</span></span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {Object.keys(TABLES).map((k) => <button key={k} onClick={() => { setCat(k); setSort(null); }} style={pill(cat === k)}>{k}</button>)}
      </div>
      <div style={{ overflowX: "auto", background: C.cd, border: `1px solid ${C.bd}`, borderRadius: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            <th style={{ ...th, textAlign: "left", position: "sticky", left: 0, background: C.cd, cursor: "default" }}>PLAYER</th>
            {T.cols.map(([l]) => <th key={l} onClick={() => setSort(l)} style={{ ...th, color: l === col[0] ? "#fde68a" : C.mt }}>{l}{l === col[0] ? " ▼" : ""}</th>)}
          </tr></thead>
          <tbody>
            {rows.map((x, i) => (
              <tr key={x.p.id} style={{ background: x.ti === ui ? "#22c55e10" : "transparent" }}>
                <td onClick={() => onPlayer(x.p)} style={{ ...td, textAlign: "left", position: "sticky", left: 0, background: x.ti === ui ? "#13261d" : C.cd, cursor: "pointer", minWidth: mobile ? 150 : 220 }}>
                  <span style={{ color: C.mt, fontSize: 12, marginRight: 8, display: "inline-block", minWidth: 16 }}>{i + 1}</span>
                  <span style={{ fontWeight: 700 }}>{x.p.name}</span>
                  <span style={{ marginLeft: 6, fontSize: 12, color: C.mt }}>{x.p.pos} · {x.t.ab}</span>
                </td>
                {T.cols.map(([l, f]) => <td key={l} style={{ ...td, fontWeight: l === col[0] ? 900 : 500, color: l === col[0] ? "#fff" : "#cbd5e1" }}>{n(f(x.p.ss))}</td>)}
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={T.cols.length + 1} style={{ ...td, textAlign: "center", color: C.mt }}>No {cat.toLowerCase()} stats yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
