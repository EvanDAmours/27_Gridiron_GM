// The big result card shown after you sim: did you win, the score, your record and
// standing, who starred, and the rest of the week's scores.
import React from "react";
import { C, Btn } from "./ui.jsx";

const fmtRec = (t) => `${t.w}-${t.l}${t.t ? `-${t.t}` : ""}`;
const pct = (t) => (t.w + t.t * 0.5) / Math.max(1, t.w + t.l + t.t);

// Division place, 1st to 4th.
function divPlace(teams, me) {
  const div = teams.filter((t) => t.c === me.c && t.d === me.d).sort((a, b) => pct(b) - pct(a) || (b.pf - b.pa) - (a.pf - a.pa));
  const i = div.findIndex((t) => t.id === me.id);
  return `${["1st", "2nd", "3rd", "4th"][i] || `${i + 1}th`} in the ${me.c} ${me.d}`;
}

// The best few lines from one side's box score.
function topLines(box) {
  const lines = [];
  for (const s of Object.values(box || {})) {
    const cand = [
      [s.passYds || 0, `${s.comp || 0}/${s.att || 0}, ${s.passYds} yds, ${s.passTD || 0} TD${s.passInt ? `, ${s.passInt} INT` : ""}`],
      [(s.rushYds || 0) * 1.6, `${s.rushAtt || 0} car, ${s.rushYds} yds${s.rushTD ? `, ${s.rushTD} TD` : ""}`],
      [(s.recYds || 0) * 1.6, `${s.rec || 0} rec, ${s.recYds} yds${s.recTD ? `, ${s.recTD} TD` : ""}`],
      [(s.sacks || 0) * 60 + (s.ints || 0) * 70 + (s.tkl || 0) * 8, [s.tkl ? `${s.tkl} tkl` : "", s.sacks ? `${s.sacks} sk` : "", s.ints ? `${s.ints} INT` : ""].filter(Boolean).join(", ")],
    ].sort((a, b) => b[0] - a[0])[0];
    if (cand[0] > 0 && cand[1]) lines.push({ score: cand[0], name: s.name, pos: s.pos, line: cand[1] });
  }
  return lines.sort((a, b) => b.score - a.score).slice(0, 3);
}

function Others({ list, teams, onBox }) {
  return (
    <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.bd}` }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.5, color: C.mt, marginBottom: 6 }}>AROUND THE LEAGUE</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {list.map((x, i) => {
          const hw = x.hs > x.as, aw = x.as > x.hs;
          return (
            <button key={i} onClick={() => onBox(x)} style={{ background: C.bg, border: `1px solid ${C.bd}`, borderRadius: 6, padding: "4px 8px", fontSize: 13, color: C.tx, cursor: "pointer" }}>
              <span style={{ fontWeight: aw ? 800 : 400, color: aw ? "#fff" : C.mt }}>{teams[x.a]?.ab} {x.as}</span>
              <span style={{ color: C.mt }}> @ </span>
              <span style={{ fontWeight: hw ? 800 : 400, color: hw ? "#fff" : C.mt }}>{teams[x.h]?.ab} {x.hs}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function WeekResult({ result, teams, ui, sched, onClose, onBox, onTeam }) {
  if (!result) return null;
  const me = teams[ui];
  if (!me) return null;
  const card = { background: "linear-gradient(135deg,#0f172a,#111827)", border: `1px solid ${C.bd}`, borderRadius: 14, padding: "16px 18px", marginBottom: 14, position: "relative" };
  const close = <button onClick={onClose} aria-label="Dismiss result" style={{ position: "absolute", top: 10, right: 12, background: "transparent", border: 0, color: C.mt, fontSize: 20, cursor: "pointer" }}>✕</button>;

  if (result.season) {
    return (
      <div style={{ ...card, borderColor: C.gd }}>
        {close}
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2, color: C.gd }}>REGULAR SEASON COMPLETE</div>
        <div style={{ fontSize: 44, fontWeight: 900, lineHeight: 1.1, marginTop: 4 }}>{me.city} {me.name} {fmtRec(me)}</div>
        <div style={{ fontSize: 18, color: "#cbd5e1", marginTop: 4 }}>{divPlace(teams, me)} · {result.playoffs ? "Playoff bound!" : "Missed the playoffs"}</div>
      </div>
    );
  }

  const g = result.game;
  if (!g && result.playoff) {
    const champ = result.champ != null ? teams[result.champ] : null;
    return (
      <div style={{ ...card, borderColor: champ ? C.gd : C.bd }}>
        {close}
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2, color: C.mt }}>{result.round.toUpperCase()}</div>
        <div style={{ fontSize: 36, fontWeight: 900, color: result.bye ? "#a78bfa" : "#cbd5e1" }}>{result.bye ? "FIRST-ROUND BYE" : champ ? `${champ.city} ${champ.name} win it all` : "Playoff results"}</div>
        {(result.others || []).length > 0 && <Others list={result.others} teams={teams} onBox={onBox} />}
      </div>
    );
  }
  if (!g) {
    return (
      <div style={card}>
        {close}
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2, color: C.mt }}>WEEK {result.wk}</div>
        <div style={{ fontSize: 40, fontWeight: 900, color: "#a78bfa" }}>BYE WEEK</div>
        <div style={{ fontSize: 18, color: "#cbd5e1" }}>{fmtRec(me)} · {divPlace(teams, me)}</div>
      </div>
    );
  }
  const home = g.h === ui;
  const us = home ? g.hs : g.as, them = home ? g.as : g.hs;
  const opp = teams[home ? g.a : g.h];
  const outcome = us > them ? "WIN" : us < them ? "LOSS" : "TIE";
  const col = outcome === "WIN" ? C.gn : outcome === "LOSS" ? C.rd : C.gd;
  const stars = topLines(home ? g.boxH : g.boxA);
  const others = result.others || (sched || []).filter((x) => x.wk === result.wk && x.played && x !== g && x.h !== ui && x.a !== ui);
  const champs = result.playoff && result.champ === ui;
  const Side = ({ t, pts, win }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
      <span style={{ width: 54, height: 54, borderRadius: 10, flexShrink: 0, background: `linear-gradient(135deg,${t.clr},${t.ac})`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 16, color: "#fff" }}>{t.ab}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, color: C.mt, whiteSpace: "nowrap" }}>{t.city}</div>
        <div style={{ fontSize: 22, fontWeight: 900, whiteSpace: "nowrap" }}>{t.name}</div>
      </div>
      <span style={{ marginLeft: "auto", fontSize: 52, fontWeight: 900, color: win ? "#fff" : "#64748b", fontVariantNumeric: "tabular-nums" }}>{pts}</span>
    </div>
  );
  return (
    <div style={{ ...card, borderColor: col, boxShadow: `0 0 0 1px ${col}55, 0 10px 30px #0008` }}>
      {close}
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2, color: C.mt }}>{result.playoff ? result.round.toUpperCase() : `WEEK ${result.wk}`} · {result.round === "Super Bowl" ? "NEUTRAL SITE" : home ? "HOME" : "AWAY"}</span>
        <span style={{ fontSize: 15, color: "#cbd5e1" }}>{fmtRec(me)} · {divPlace(teams, me)}</span>
      </div>
      <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap", marginTop: 6 }}>
        <div style={{ fontSize: champs ? 44 : 64, fontWeight: 900, fontStyle: "italic", color: champs ? C.gd : col, lineHeight: 1, minWidth: 190 }}>{champs ? "SUPER BOWL CHAMPIONS" : result.playoff && outcome === "LOSS" ? "ELIMINATED" : outcome}</div>
        <div style={{ flex: "1 1 300px", display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
          <Side t={me} pts={us} win={us >= them} />
          <Side t={opp} pts={them} win={them >= us} />
        </div>
        <div style={{ flex: "1 1 240px", minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.5, color: C.mt, marginBottom: 4 }}>YOUR STARS</div>
          {stars.map((s) => <div key={s.name} style={{ fontSize: 15, padding: "2px 0" }}><b>{s.name}</b> <span style={{ color: C.mt, fontSize: 12 }}>{s.pos}</span> <span style={{ color: "#cbd5e1" }}>{s.line}</span></div>)}
          {!stars.length && <div style={{ color: C.mt }}>No standout performances.</div>}
          <div style={{ marginTop: 8 }}><Btn onClick={() => onBox(g)} bg={C.bl} style={{ fontSize: 13 }}>Box score</Btn></div>
        </div>
      </div>
      {others.length > 0 && <Others list={others} teams={teams} onBox={onBox} />}
    </div>
  );
}
