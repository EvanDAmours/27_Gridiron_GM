// Retire as GM: the whole career on one sheet (record, titles, the best players you drafted, the
// records your teams set) and its legacy score ranked among the greatest GMs in NFL history.
import React from "react";
import { C, TeamLogo, CloseX, sheetWrap, sheetBox, SheetGrip } from "./ui.jsx";
import { MOBILE } from "./mobile.js";
import { GREATS, legacyRank, legacyTier } from "./gmLegacy.js";
import { ACHIEVEMENTS } from "./achievements.js";

const box = { background: "#ffffff08", border: "1px solid #ffffff14", borderRadius: 10, padding: "10px 12px", marginBottom: 10 };
const head = (c) => ({ fontSize: 11, fontWeight: 900, letterSpacing: 1.3, color: c, marginBottom: 6 });
const btn = (bg, fg = "#fff") => ({ background: bg, color: fg, border: "none", borderRadius: 8, padding: "9px 14px", fontWeight: 800, fontSize: 14, cursor: "pointer" });

export default function GmRetire({ career: c, team, gmName, retired, yr, achievements = {}, onRetire, onUnretire, onMenu, onClose }) {
  const rank = legacyRank(c.score);
  const board = [...GREATS.map((g) => ({ ...g, you: false })), { name: gmName || "You", club: team ? `${team.city} ${team.name}` : "", yrs: c.seasons ? `${yr - c.seasons + 1}–${yr}` : `${yr}`, score: c.score, titles: c.titles.length, you: true }].sort((a, b) => b.score - a.score || (a.you ? 1 : -1));
  const youAt = board.findIndex((g) => g.you);
  const shown = youAt < 10 ? board.slice(0, 11) : [...board.slice(0, 10), board[youAt]];
  const pct = (c.pct * 100).toFixed(1);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(2,6,15,.9)", zIndex: 2300, display: "flex", alignItems: "center", justifyContent: "center", padding: 14, ...sheetWrap(MOBILE) }}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label="GM career" style={{ position: "relative", width: "100%", maxWidth: 760, maxHeight: "92vh", overflowY: "auto", borderRadius: 16, background: "#0b1220", border: "1px solid #f59e0b55", padding: 14, color: C.tx, fontFamily: C.f, ...sheetBox(MOBILE) }}>
        {MOBILE && <SheetGrip onClose={onClose} />}
        <CloseX onClick={onClose} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, paddingRight: 40 }}>
          {team && <TeamLogo t={team} sz={MOBILE ? 44 : 56} />}
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2, color: C.gd }}>{retired ? "A CAREER IN FULL" : "YOUR CAREER SO FAR"}</div>
            <div style={{ fontSize: MOBILE ? 20 : 24, fontWeight: 900 }}>{gmName || "Your"} GM career</div>
            <div style={{ fontSize: 13, color: C.mt }}>{c.seasons} season{c.seasons === 1 ? "" : "s"} · {c.w}-{c.l} ({pct}%){team ? ` · ${team.city} ${team.name}` : ""}</div>
          </div>
        </div>
        <div style={{ ...box, display: "flex", alignItems: "center", gap: 14, background: "linear-gradient(135deg,#78350f44,#0b1220)", border: "1px solid #f59e0b66" }}>
          <div style={{ textAlign: "center", minWidth: 90 }}>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.5, color: "#fcd34d" }}>LEGACY</div>
            <div style={{ fontSize: MOBILE ? 36 : 44, fontWeight: 900, color: "#fde68a", lineHeight: 1 }}>{c.score}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 900 }}>{legacyTier(c.score)}</div>
            <div style={{ fontSize: 13, color: "#cbd5e1" }}>{rank <= 10 ? `#${rank} among the greatest GMs of all time` : "Outside the all-time top 10"}{rank <= 10 && rank > 1 ? `, behind ${GREATS[rank - 2].name}` : rank === 1 ? ", ahead of Bill Belichick" : ""}.</div>
            <div style={{ fontSize: 11, color: C.mt, marginTop: 3 }}>100 per title · 15 per playoff trip · 2 per game over .500 · 4 per season · 25 per Hall of Famer you drafted · 6 per All-Pro season from your picks · 3 per record set</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: MOBILE ? "repeat(3,1fr)" : "repeat(6,1fr)", gap: 6, marginBottom: 10 }}>
          {[["SEASONS", c.seasons], ["RECORD", `${c.w}-${c.l}`], ["WIN %", `${pct}%`], ["SUPER BOWLS", c.titles.length], ["PLAYOFFS", c.playoffs], ["RECORDS", c.recordCount]].map(([l, v]) => (
            <div key={l} style={{ ...box, marginBottom: 0, textAlign: "center", padding: "8px 4px" }}><div style={{ fontSize: 18, fontWeight: 900, color: l === "SUPER BOWLS" && c.titles.length ? "#fbbf24" : C.tx }}>{v}</div><div style={{ fontSize: 10, fontWeight: 800, color: C.mt, letterSpacing: 1 }}>{l}</div></div>
          ))}
        </div>
        {c.titles.length > 0 && <div style={box}><div style={head("#fbbf24")}>🏆 SUPER BOWL TITLES</div><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{c.titles.map((y) => <span key={y} style={{ background: "#92400e44", color: "#fde68a", borderRadius: 6, padding: "3px 10px", fontWeight: 800 }}>{y}</span>)}</div></div>}
        {c.best && <div style={{ fontSize: 13, color: "#cbd5e1", marginBottom: 10 }}>Best season: <b>{c.best.yr}</b>, {c.best.w}-{c.best.l}.</div>}
        <div style={{ display: "grid", gridTemplateColumns: MOBILE ? "1fr" : "1fr 1fr", gap: 10 }}>
          <div style={box}>
            <div style={head("#38bdf8")}>⭐ GREAT PLAYERS YOU DRAFTED</div>
            {c.draftees.length ? c.draftees.map((d) => <div key={d.id} style={{ display: "flex", gap: 6, fontSize: 13, padding: "3px 0", borderBottom: "1px solid #ffffff0d" }}><span style={{ flex: 1, minWidth: 0 }}><b>{d.name}</b> <span style={{ color: C.mt }}>{d.pos} · {d.yr} R{d.rd} #{d.overall}</span></span><span style={{ color: "#fcd34d", whiteSpace: "nowrap" }}>{d.hof ? "HOF · " : ""}{d.ap ? `${d.ap}× AP · ` : ""}{d.pb ? `${d.pb}× PB · ` : ""}{d.peak} peak</span></div>) : <div style={{ fontSize: 13, color: C.mt }}>No drafts yet.</div>}
          </div>
          <div style={box}>
            <div style={head("#a78bfa")}>📜 RECORDS YOUR TEAMS SET</div>
            {c.records.length ? c.records.map((r, i) => <div key={i} style={{ fontSize: 13, padding: "3px 0", borderBottom: "1px solid #ffffff0d" }}><span style={{ color: C.mt }}>{r.yr}</span> · <b>{r.name}</b> · {r.label} <span style={{ color: "#c4b5fd" }}>{r.val}</span>{r.league && <span style={{ color: "#fcd34d" }}> · NFL record</span>}</div>) : <div style={{ fontSize: 13, color: C.mt }}>No records set yet.</div>}
          </div>
        </div>
        <div style={box}>
          <div style={head("#34d399")}>🏅 ACHIEVEMENTS · {ACHIEVEMENTS.filter((a) => achievements[a.id]).length}/{ACHIEVEMENTS.length}</div>
          <div style={{ display: "grid", gridTemplateColumns: MOBILE ? "1fr 1fr" : "repeat(5,1fr)", gap: 6 }}>
            {ACHIEVEMENTS.map((a) => { const got = achievements[a.id]; return (
              <div key={a.id} title={a.desc} style={{ borderRadius: 8, padding: "6px 8px", background: got ? "#064e3b55" : "#ffffff06", border: `1px solid ${got ? "#34d39966" : "#ffffff10"}`, opacity: got ? 1 : 0.55 }}>
                <div style={{ fontSize: 13, fontWeight: 800 }}>{got ? a.icon : "🔒"} {a.name}</div>
                <div style={{ fontSize: 11, color: got ? "#a7f3d0" : C.mt, marginTop: 1 }}>{got ? `Earned ${got}` : a.desc}</div>
              </div>
            ); })}
          </div>
        </div>
        <div style={box}>
          <div style={head(C.gd)}>👔 THE GREATEST GMs OF ALL TIME</div>
          {shown.map((g) => {
            const n = board.indexOf(g) + 1;
            return <div key={g.name + g.you} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 6px", borderRadius: 6, background: g.you ? "#22c55e22" : "transparent", border: g.you ? `1px solid ${C.gn}` : "1px solid transparent", fontSize: 13 }}>
              <span style={{ width: 26, fontWeight: 900, color: n <= 3 ? "#fbbf24" : C.mt }}>#{n}</span>
              <span style={{ flex: 1, minWidth: 0 }}><b>{g.name}</b> <span style={{ color: C.mt }}>{g.club} · {g.yrs}</span>{!g.you && !MOBILE && <div style={{ fontSize: 11, color: "#94a3b8" }}>{g.note}</div>}</span>
              <span style={{ color: "#fbbf24", whiteSpace: "nowrap" }}>{"🏆".repeat(Math.min(6, g.titles))}</span>
              <span style={{ width: 48, textAlign: "right", fontWeight: 900 }}>{g.score}</span>
            </div>;
          })}
          <div style={{ fontSize: 11, color: C.mt, marginTop: 4 }}>Real GMs are scored the same way from approximate totals for the years they ran their clubs.</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {retired ? <>
            <button onClick={onUnretire} style={btn("#1e293b", C.tx)}>Come out of retirement</button>
            <button onClick={onMenu} style={btn("#b45309")}>Main menu</button>
          </> : <>
            <button onClick={onClose} style={btn("#1e293b", C.tx)}>Keep building</button>
            <button onClick={onRetire} style={btn("#b45309")}>🎓 Retire as GM</button>
          </>}
        </div>
      </div>
    </div>
  );
}
