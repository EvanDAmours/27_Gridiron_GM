// The big result card shown after you sim: did you win, the score, your record and
// standing, who starred, and the rest of the week's scores. It closes itself after 10 seconds (a bar
// along the bottom counts down); hovering pauses it, and clicking anything in it keeps it up. On
// phones it slides up from the bottom, above the action bar, and a swipe down dismisses it.
import React, { useEffect, useRef, useState } from "react";
import { WinProbChart } from "./GameRecap.jsx";
import { C, Btn, TeamLogo } from "./ui.jsx";
import { MOBILE } from "./mobile.js";
import { isScorigami } from "./scorigami.js";

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

const SHOW_MS = 6000;
export default function WeekResult(props) {
  const { result, onClose } = props;
  const [hover, setHover] = useState(false);
  const [kept, setKept] = useState(false);
  const startY = useRef(null); // phones: swipe the card down to dismiss it
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  // one timer, not a re-render every tick (that made the card stutter): it pauses while you hover,
  // and the bar below runs as a CSS animation that pauses with it
  const left = useRef(SHOW_MS), since = useRef(0);
  useEffect(() => { left.current = SHOW_MS; setKept(false); }, [result]);
  useEffect(() => {
    if (!result || hover || kept) return;
    since.current = Date.now();
    const t = setTimeout(() => closeRef.current(), left.current);
    return () => { clearTimeout(t); left.current = Math.max(0, left.current - (Date.now() - since.current)); };
  }, [result, hover, kept]);
  if (!result) return null;
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClickCapture={() => setKept(true)}
      onTouchStart={MOBILE ? (e) => { startY.current = e.touches[0].clientY; } : undefined}
      onTouchEnd={MOBILE ? (e) => { if (startY.current != null && e.changedTouches[0].clientY - startY.current > 60) onClose(); startY.current = null; } : undefined}
      style={MOBILE ? { position: "fixed", left: 8, right: 8, bottom: "calc(126px + env(safe-area-inset-bottom))", zIndex: 392, animation: "sheetUp .25s ease-out", boxShadow: "0 -8px 30px #000b", borderRadius: 12 } : { position: "fixed", top: 92, right: 16, width: "min(780px, calc(100% - 32px))", zIndex: 380, animation: "toastDown .25s ease-out", boxShadow: "0 14px 44px #000d", borderRadius: 12 }}>
      <style>{"@keyframes wrBar{from{width:100%}to{width:0%}}"}</style>
      <Card {...props} />
      {!kept && <div style={{ position: "absolute", left: 12, right: 12, bottom: 1, height: 3, borderRadius: 2, background: "#ffffff14", overflow: "hidden", pointerEvents: "none" }}>
        <div key={String(result?.wk ?? "") + String(result?.round ?? "")} style={{ height: "100%", background: hover ? "#64748b" : "#94a3b8", animation: `wrBar ${SHOW_MS}ms linear forwards`, animationPlayState: hover ? "paused" : "running" }} />
      </div>}
    </div>
  );
}

// A final never seen in NFL history (or in this league before).
const Scorigami = ({ us, them, compact }) => (
  <div style={{ marginTop: compact ? 4 : 8, background: "linear-gradient(90deg,#7c3aed33,#db277733)", border: "1px solid #a855f7", borderRadius: 8, padding: compact ? "3px 8px" : "6px 10px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
    <b style={{ fontSize: compact ? 13 : 15, letterSpacing: 1.5, color: "#e9d5ff" }}>🎲 SCORIGAMI</b>
    <span style={{ fontSize: compact ? 12 : 13, color: "#ddd6fe" }}>{Math.max(us, them)}-{Math.min(us, them)} has never been a final score in NFL history</span>
  </div>
);

function Card({ result, teams, ui, sched, sgLog, yr, onClose, onBox, onTeam, onPaper, onRecap }) {
  const [showOthers, setShowOthers] = useState(false);
  if (!result) return null;
  const me = teams[ui];
  if (!me) return null;
  const card = { background: "linear-gradient(135deg,#0f172a,#111827)", border: `1px solid ${C.bd}`, borderRadius: 12, padding: MOBILE ? "8px 10px" : "12px 14px", position: "relative" };
  const close = <button onClick={onClose} aria-label="Dismiss result" style={{ position: "absolute", top: 10, right: 12, background: "transparent", border: 0, color: C.mt, fontSize: 20, cursor: "pointer" }}>✕</button>;

  if (result.season) {
    return (
      <div style={{ ...card, borderColor: C.gd }}>
        {close}
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2, color: C.gd }}>REGULAR SEASON COMPLETE</div>
        <div style={{ fontSize: MOBILE ? 22 : 34, fontWeight: 900, lineHeight: 1.1, marginTop: 4 }}>{me.city} {me.name} {fmtRec(me)}</div>
        <div style={{ fontSize: MOBILE ? 13 : 16, color: "#cbd5e1", marginTop: 4 }}>{divPlace(teams, me)} · {result.playoffs ? "Playoff bound!" : "Missed the playoffs"}</div>
        {onRecap && <Btn onClick={onRecap} bg={C.bd} c="#7dd3fc" style={{ fontSize: 13, padding: "6px 12px", marginTop: 8 }}>📊 Season recap card</Btn>}
      </div>
    );
  }

  const g = result.game;
  if (!g && result.playoff) {
    const champ = result.champ != null ? teams[result.champ] : null;
    // the Super Bowl: a final scoreboard (the bracket below already names the champion)
    const sb = champ && (result.others || []).find((x) => x.h === result.champ || x.a === result.champ);
    if (sb) {
      const loser = teams[sb.h === result.champ ? sb.a : sb.h];
      const ws = sb.h === result.champ ? sb.hs : sb.as, ls = sb.h === result.champ ? sb.as : sb.hs;
      const side = (t, sc, win) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10, opacity: win ? 1 : 0.6 }}>
          <TeamLogo t={t} sz={MOBILE ? 30 : 40} />
          <span style={{ fontSize: MOBILE ? 15 : 18, fontWeight: 800 }}>{t.city} {t.name}</span>
          <span style={{ fontSize: MOBILE ? 24 : 32, fontWeight: 900, color: win ? C.gd : C.mt, marginLeft: 4 }}>{sc}</span>
        </div>
      );
      return (
        <div style={{ ...card, borderColor: C.gd }}>
          {close}
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2, color: C.gd, marginBottom: 6 }}>🏆 SUPER BOWL · FINAL</div>
          <div style={{ display: "flex", alignItems: "center", gap: MOBILE ? 10 : 22, flexWrap: "wrap" }}>
            {side(champ, ws, true)}<span style={{ color: C.mt, fontWeight: 800 }}>–</span>{side(loser, ls, false)}
            <Btn onClick={() => onBox(sb)} bg={C.bd} c="#7dd3fc" style={{ fontSize: 13, padding: "6px 12px", marginLeft: "auto" }}>Box score</Btn>
          </div>
        </div>
      );
    }
    return (
      <div style={{ ...card, borderColor: champ ? C.gd : C.bd }}>
        {close}
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2, color: C.mt }}>{result.round.toUpperCase()}</div>
        <div style={{ fontSize: MOBILE ? 20 : 30, fontWeight: 900, color: result.bye ? "#a78bfa" : "#cbd5e1" }}>{result.bye ? "FIRST-ROUND BYE" : champ ? `${champ.city} ${champ.name} win it all` : "Playoff results"}</div>
        {(result.others || []).length > 0 && <Others list={result.others} teams={teams} onBox={onBox} />}
      </div>
    );
  }
  if (!g) {
    return (
      <div style={card}>
        {close}
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2, color: C.mt }}>WEEK {result.wk}</div>
        <div style={{ fontSize: MOBILE ? 20 : 32, fontWeight: 900, color: "#a78bfa" }}>BYE WEEK</div>
        <div style={{ fontSize: MOBILE ? 13 : 16, color: "#cbd5e1" }}>{fmtRec(me)} · {divPlace(teams, me)}</div>
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
  const sg = isScorigami(g, sgLog, yr);
  // Phones: a compact two-line strip.
  if (MOBILE) {
    const top = stars[0];
    return (
      <div style={{ ...card, borderColor: col }}>
        <button onClick={onClose} aria-label="Dismiss result" style={{ position: "absolute", top: 4, right: 6, background: "transparent", border: 0, color: C.mt, fontSize: 18, cursor: "pointer" }}>✕</button>
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingRight: 22 }}>
          <span style={{ fontSize: 20, fontWeight: 900, fontStyle: "italic", color: champs ? C.gd : col, minWidth: 0 }}>{champs ? "CHAMPS" : result.playoff && outcome === "LOSS" ? "OUT" : outcome[0]}</span>
          <TeamLogo t={me} sz={24} /><b style={{ fontSize: 18, color: us >= them ? "#fff" : "#64748b" }}>{us}</b>
          <span style={{ color: C.mt }}>–</span>
          <b style={{ fontSize: 18, color: them >= us ? "#fff" : "#64748b" }}>{them}</b><TeamLogo t={opp} sz={24} />
          <span style={{ fontSize: 12, color: C.mt, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{result.playoff ? result.round : `Wk ${result.wk}`} · {fmtRec(me)}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, fontSize: 12 }}>
          {top && <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#cbd5e1" }}><b style={{ color: "#fff" }}>{top.name}</b> {top.line}</span>}
          {!top && <span style={{ flex: 1 }} />}
          <button onClick={() => onBox(g)} style={{ background: C.bl, color: "#fff", border: 0, borderRadius: 5, padding: "3px 8px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Box</button>
          {result.paper && onPaper && <button onClick={() => onPaper(result.paper)} style={{ background: "#d4a017", color: "#111", border: 0, borderRadius: 5, padding: "3px 8px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>📰 Paper</button>}
          {others.length > 0 && <button onClick={() => setShowOthers((v) => !v)} style={{ background: "transparent", color: C.mt, border: `1px solid ${C.bd}`, borderRadius: 5, padding: "3px 8px", fontSize: 12, cursor: "pointer" }}>Scores {showOthers ? "▴" : "▾"}</button>}
        </div>
        {sg && <Scorigami us={us} them={them} compact />}
        {showOthers && <Others list={others} teams={teams} onBox={onBox} />}
      </div>
    );
  }
  const Side = ({ t, pts, win }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
      <TeamLogo t={t} sz={32} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, color: C.mt, whiteSpace: "nowrap" }}>{t.city}</div>
        <div style={{ fontSize: 16, fontWeight: 900, whiteSpace: "nowrap" }}>{t.name}</div>
      </div>
      <span style={{ marginLeft: "auto", fontSize: 30, fontWeight: 900, color: win ? "#fff" : "#64748b", fontVariantNumeric: "tabular-nums" }}>{pts}</span>
    </div>
  );
  return (
    <div style={{ ...card, borderColor: col, boxShadow: `0 0 0 1px ${col}55, 0 10px 30px #0008` }}>
      {close}
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2, color: C.mt }}>{result.playoff ? result.round.toUpperCase() : `WEEK ${result.wk}`} · {result.round === "Super Bowl" || g.neutral ? `NEUTRAL SITE${g.intl ? ` · ${(g.city || "").toUpperCase()}` : ""}` : home ? "HOME" : "AWAY"}</span>
        <span style={{ fontSize: 15, color: "#cbd5e1" }}>{fmtRec(me)} · {divPlace(teams, me)}</span>
      </div>
      <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
        <div style={{ fontSize: champs ? 28 : 36, fontWeight: 900, fontStyle: "italic", color: champs ? C.gd : col, lineHeight: 1, minWidth: 120 }}>{champs ? "SUPER BOWL CHAMPIONS" : result.playoff && outcome === "LOSS" ? "ELIMINATED" : outcome}</div>
        <div style={{ flex: "1 1 300px", display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
          <Side t={me} pts={us} win={us >= them} />
          <Side t={opp} pts={them} win={them >= us} />
        </div>
        <div style={{ flex: "1 1 240px", minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.5, color: C.mt, marginBottom: 4 }}>{g.gd?.top ? "TOP PERFORMERS" : "YOUR STARS"}</div>
          {(g.gd?.top || stars).map((s) => <div key={s.name} style={{ fontSize: 14, padding: "1px 0" }}><b>{s.name}</b> <span style={{ color: C.mt, fontSize: 12 }}>{s.pos}{s.side ? ` · ${teams[s.side === "h" ? g.h : g.a]?.ab}` : ""}</span> <span style={{ color: "#cbd5e1" }}>{s.line}</span></div>)}
          {!(g.gd?.top || stars).length && <div style={{ color: C.mt }}>No standout performances.</div>}
          <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}><Btn onClick={() => onBox(g)} bg={C.bl} style={{ fontSize: 13 }}>{g.gd ? "Game recap & box score" : "Box score"}</Btn>{result.paper && onPaper && <Btn onClick={() => onPaper(result.paper)} bg="#d4a017" c="#111" style={{ fontSize: 13, fontWeight: 800 }}>📰 Read the Gazette</Btn>}</div>
        </div>
      </div>
      {sg && <Scorigami us={us} them={them} />}
      {/* league scores a tap away (the win probability lives in the game recap) */}
      {others.length > 0 && <button onClick={() => setShowOthers((v) => !v)} style={{ marginTop: 8, background: "transparent", color: C.mt, border: `1px solid ${C.bd}`, borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Scores around the league {showOthers ? "▴" : "▾"}</button>}
      {showOthers && <Others list={others} teams={teams} onBox={onBox} />}
    </div>
  );
}
