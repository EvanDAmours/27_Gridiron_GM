// Draft recap: after the draft, every pick with his real ratings and development trait revealed,
// so you can see where you (and everyone else) hit or missed. Past drafts stay here, with what
// each pick has become since.
import Select from "./Select.jsx";
import React, { useMemo, useState } from "react";
import { C, TeamLogo, Bdg, Btn, Hero, Row, Sheet, Segments } from "./ui.jsx";
import { MOBILE } from "./mobile.js";
import { DevChip } from "./ScoutingUI.jsx";
import { recapEntry, gradePicks, classGrades, devCounts, VERDICT } from "./draftRecap.js";
import { DEV_TRAITS } from "./scouting.js";
import { posTag } from "./dline.js";

const GRADE_C = { A: "#22c55e", "B+": "#84cc16", B: "#a3e635", "C+": "#f59e0b", C: "#fb923c", D: "#ef4444" };

export default function DraftRecap({ teams, ui, yr, draftLog = [], history = {}, current, onNext, setSel, findPlayer }) {
  // The draft just held (this off-season) plus every archived one.
  const years = useMemo(() => {
    const ys = Object.keys(history).map(Number);
    if (current && draftLog.length && !ys.includes(yr)) ys.push(yr);
    return ys.sort((a, b) => b - a);
  }, [history, draftLog.length, current, yr]);
  const [pickYr, setPickYr] = useState(null);
  const [show, setShow] = useState("all");
  const [teamF, setTeamF] = useState(-1);
  const view = pickYr ?? years[0];
  const entries = useMemo(() => (view === yr && current && draftLog.length ? draftLog.map(recapEntry) : history[view] || []), [view, yr, current, draftLog, history]);
  // Players still being figured out (see scoutMiss.js) show the club's current read of their
  // ceiling, and no gem or bust call until the truth is out.
  const rows = useMemo(() => gradePicks(entries.map((e) => {
    const live = e.id != null ? findPlayer(e.id) : null;
    return live?.potRev && live.potRev.stage < 3 ? { ...e, pot: live.pot, gem: false, bust: false, pending: true } : e;
  })), [entries, findPlayer]);
  const grades = useMemo(() => classGrades(rows, teams.length), [rows, teams.length]);
  const counts = devCounts(rows);
  const mine = grades[ui];
  const past = view < yr || !current;
  const panel = { background: C.cd, border: `1px solid ${C.bd}`, borderRadius: 12, padding: 14, marginBottom: 12 };
  const head = { fontSize: 13, fontWeight: 900, letterSpacing: 1.5, color: "#fcd34d", marginBottom: 10 };
  const open = (id) => { const p = id != null && findPlayer(id); if (p) setSel(p); };
  const now = (id) => (past ? findPlayer(id) : null);

  if (!years.length) return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ fontSize: 26, fontWeight: 900 }}>Draft Recap</div>
      <div style={{ fontSize: 15, color: C.mt, marginTop: 8 }}>No draft has been held in your league yet. After the draft, every pick shows up here with his real ratings and development trait.</div>
    </div>
  );

  const shown = rows.filter((r) => (teamF >= 0 ? r.owner === teamF : true) && (show === "hits" ? ["gem", "jackpot", "hit"].includes(r.verdict) : show === "mine" ? r.owner === ui : true));
  const jackpots = rows.filter((r) => ["gem", "jackpot", "hit"].includes(r.verdict)).sort((a, b) => b.score - a.score || a.overall - b.overall);
  const topClasses = [...grades].filter((g) => g.picks.length).sort((a, b) => a.rank - b.rank);

  if (MOBILE) return <PhoneRecap {...{ teams, ui, view, years, setPickYr, onNext, mine, topClasses, jackpots, counts, rows, shown, show, setShow, open, now, past }} />;
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontSize: 26, fontWeight: 900, flex: 1 }}>{view + 1} Draft Recap</div>
        {years.length > 1 && <Select value={view} onChange={(e) => setPickYr(+e.target.value)} style={{ background: C.cd, color: "#e2e8f0", border: `1px solid ${C.bd}`, borderRadius: 6, padding: "6px 8px", fontSize: 14 }}>{years.map((y) => <option key={y} value={y}>{y + 1} draft</option>)}</Select>}
        {onNext && <Btn onClick={onNext} bg={C.gn} style={{ fontSize: 15, padding: "8px 14px" }}>→ Next Season</Btn>}
      </div>
      <div style={{ fontSize: 14, color: C.mt, marginBottom: 12 }}>Every pick with his true ratings and development trait revealed. {past ? "\"Now\" shows what each player has become since." : "Development traits decide how fast a player grows, so this is where you find out if you hit."}</div>

      {mine && mine.picks.length > 0 && <div style={{ ...panel, border: `1px solid ${GRADE_C[mine.grade]}66` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 40, fontWeight: 900, color: GRADE_C[mine.grade], lineHeight: 1 }}>{mine.grade}</div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: 1.5, color: "#fcd34d" }}>YOUR CLASS</div>
            <div style={{ fontSize: 14, color: C.mt }}>{mine.picks.length} picks · {mine.hits} hit{mine.hits === 1 ? "" : "s"} (Star or better) · ranked {mine.rank} of {topClasses.length}</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 8 }}>
          {mine.picks.map((r) => { const [vt, vc] = VERDICT[r.verdict]; const n = now(r.id); return (
            <div key={r.id} onClick={() => open(r.id)} style={{ background: C.bg, border: `1px solid ${vc}55`, borderRadius: 8, padding: 10, cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}><Bdg pos={posTag(r)} /><b style={{ flex: 1, fontSize: 15, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</b></div>
              <div style={{ fontSize: 12, color: C.mt, marginBottom: 6 }}>Round {r.rd}, pick {r.overall} · age {r.age}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 14 }}>OVR <b>{r.ovr}</b> · POT <b>{r.pot}</b>{n ? <span style={{ color: C.gd }}> · now {n.ovr}</span> : null}</span>
                <DevChip dev={r.dev} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: vc, marginTop: 6 }}>{vt}</div>
            </div>
          ); })}
        </div>
      </div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 12 }}>
        <div style={panel}>
          <div style={head}>💎 HIDDEN GEMS AND BEST TRAITS</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {Object.keys(DEV_TRAITS).map((k) => <span key={k} style={{ fontSize: 13, color: C.mt }}><DevChip dev={k} /> {counts[k] || 0}</span>)}
          </div>
          {jackpots.slice(0, 10).map((r) => (
            <div key={r.id} onClick={() => open(r.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: `1px solid ${C.bd}55`, cursor: "pointer", background: r.owner === ui ? "#22c55e12" : "transparent" }}>
              <span style={{ width: 34, fontSize: 12, color: C.mt }}>#{r.overall}</span>
              {teams[r.owner] && <TeamLogo t={teams[r.owner]} sz={20} />}
              <Bdg pos={posTag(r)} />
              <span style={{ flex: 1, minWidth: 0, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
              <DevChip dev={r.dev} />
            </div>
          ))}
          {!jackpots.length && <div style={{ fontSize: 14, color: C.mt }}>No Star-or-better traits in this class.</div>}
        </div>
        <div style={panel}>
          <div style={head}>📊 CLASS GRADES</div>
          {topClasses.map((g) => (
            <div key={g.ti} onClick={() => setTeamF(teamF === g.ti ? -1 : g.ti)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: `1px solid ${C.bd}44`, cursor: "pointer", background: g.ti === ui ? "#22c55e12" : teamF === g.ti ? "#3b82f61a" : "transparent" }}>
              <span style={{ width: 22, fontSize: 12, color: C.mt }}>{g.rank}</span>
              {teams[g.ti] && <TeamLogo t={teams[g.ti]} sz={20} />}
              <span style={{ flex: 1, fontSize: 14 }}>{teams[g.ti]?.city} {teams[g.ti]?.name}</span>
              <span style={{ fontSize: 12, color: C.mt }}>{g.picks.length} picks · {g.hits} hits</span>
              <b style={{ width: 28, textAlign: "right", color: GRADE_C[g.grade] }}>{g.grade}</b>
            </div>
          ))}
        </div>
      </div>

      <div style={panel}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <div style={{ ...head, marginBottom: 0, flex: 1 }}>📋 EVERY PICK</div>
          {[["all", "All"], ["mine", "Mine"], ["hits", "Hits"]].map(([k, l]) => <Btn key={k} onClick={() => setShow(k)} bg={show === k ? "#1e3a5f" : "transparent"} c={show === k ? "#7dd3fc" : C.mt} style={{ fontSize: 13, padding: "4px 10px", border: `1px solid ${C.bd}` }}>{l}</Btn>)}
          {teamF >= 0 && <Btn onClick={() => setTeamF(-1)} bg="transparent" c={C.mt} style={{ fontSize: 13, padding: "4px 10px", border: `1px solid ${C.bd}` }}>{teams[teamF]?.ab} ✕</Btn>}
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead><tr style={{ color: C.mt, fontSize: 12, textAlign: "left" }}>{["Pick", "Team", "Player", "Pos", "OVR", "POT", ...(past ? ["Now"] : []), "Dev", "Verdict"].map((h) => <th key={h} style={{ padding: "6px 6px", borderBottom: `1px solid ${C.bd}` }}>{h}</th>)}</tr></thead>
            <tbody>
              {shown.map((r) => { const [vt, vc] = VERDICT[r.verdict]; const n = now(r.id); return (
                <tr key={r.id} onClick={() => open(r.id)} style={{ cursor: "pointer", background: r.owner === ui ? "#22c55e12" : "transparent", borderTop: r.overall > 1 && rows.find((x) => x.overall === r.overall - 1)?.rd !== r.rd ? `2px solid ${C.bd}` : undefined }}>
                  <td style={{ padding: "5px 6px", color: C.mt, whiteSpace: "nowrap" }}>{r.rd}-{r.overall}</td>
                  <td style={{ padding: "5px 6px" }}>{teams[r.owner]?.ab}</td>
                  <td style={{ padding: "5px 6px", fontWeight: 600 }}>{r.name}</td>
                  <td style={{ padding: "5px 6px" }}><Bdg pos={posTag(r)} /></td>
                  <td style={{ padding: "5px 6px" }}>{r.ovr}</td>
                  <td style={{ padding: "5px 6px" }}>{r.pot}</td>
                  {past && <td style={{ padding: "5px 6px", color: C.gd }}>{n ? n.ovr : <span style={{ color: C.mt }}>gone</span>}</td>}
                  <td style={{ padding: "5px 6px" }}><DevChip dev={r.dev} /></td>
                  <td style={{ padding: "5px 6px", color: vc, fontWeight: 700, whiteSpace: "nowrap" }}>{vt}</td>
                </tr>
              ); })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Phones: your class first (one clean row a pick, the verdict on the right), the best traits in the
// class after it, and the league's grades and the full pick list a tap away.
function PhoneRecap({ teams, ui, view, years, setPickYr, onNext, mine, topClasses, jackpots, counts, shown, show, setShow, open, now, past }) {
  const [sheet, setSheet] = useState(null);
  const soft = { background: "#ffffff0f", borderRadius: 18, padding: "0 14px" };
  const label = { fontSize: 12, fontWeight: 900, letterSpacing: 1.4, color: "#94a3b8", margin: "24px 2px 8px" };
  const me = teams[ui];
  const line = (r, i, sub) => { const [vt, vc] = VERDICT[r.verdict]; const n = now(r.id); return (
    <div key={r.id} onClick={() => open(r.id)} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 62, padding: "6px 0", borderTop: i ? "1px solid #ffffff10" : 0, cursor: "pointer" }}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 16, fontWeight: 800, minWidth: 0 }}><Bdg pos={posTag(r)} /><span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</span></span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#94a3b8", marginTop: 4, flexWrap: "wrap" }}>{sub}<DevChip dev={r.dev} /></span>
      </span>
      <span style={{ textAlign: "right", lineHeight: 1.15 }}>
        <b style={{ fontSize: 16 }}>{r.ovr}<span style={{ color: "#94a3b8", fontWeight: 700 }}> / {r.pot}</span></b>
        <span style={{ display: "block", fontSize: 12, fontWeight: 800, color: vc, marginTop: 2 }}>{n ? <span style={{ color: C.gd }}>now {n.ovr} · </span> : null}{vt.replace(/^\S*\p{Extended_Pictographic}\S*\s*/u, "")}</span>
      </span>
    </div>
  ); };
  return (
    <div>
      <Hero compact clr={me?.clr} logo={me} eyebrow={`${view + 1} draft recap`} title={mine?.picks.length ? `Class grade ${mine.grade}` : "Draft recap"}
        sub={mine?.picks.length ? `${mine.picks.length} picks · ${mine.hits} hit${mine.hits === 1 ? "" : "s"} · #${mine.rank} of ${topClasses.length}` : "Every pick with his true ratings revealed"}
        right={onNext ? <button onClick={onNext} style={{ minHeight: 44, padding: "0 16px", borderRadius: 14, border: 0, background: C.gn, color: "#fff", fontSize: 15, fontWeight: 900, cursor: "pointer", whiteSpace: "nowrap" }}>Next season ›</button> : null} />
      {years.length > 1 && <div style={{ marginTop: 12 }}><Segments items={years.slice(0, 4).map((y) => [y, `${y + 1}`])} value={view} onChange={(y) => setPickYr(+y)} /></div>}
      <div style={{ fontSize: 14, color: "#94a3b8", margin: "12px 2px 0" }}>{past ? "What each pick has become since." : "Development traits decide how fast a player grows: this is where you find out if you hit."}</div>
      {mine?.picks.length > 0 && <><div style={label}>YOUR CLASS</div><div style={soft}>{mine.picks.map((r, i) => line(r, i, `Rd ${r.rd} · #${r.overall} · age ${r.age} ·`))}</div></>}
      <div style={label}>BEST TRAITS IN THE CLASS</div>
      <div style={soft}>
        {jackpots.slice(0, 5).map((r, i) => line(r, i, <>#{r.overall} {teams[r.owner] && <TeamLogo t={teams[r.owner]} sz={16} />} {teams[r.owner]?.ab} ·</>))}
        {!jackpots.length && <div style={{ padding: "16px 0", color: "#94a3b8", fontSize: 15 }}>No Star-or-better traits in this class.</div>}
      </div>
      <div style={{ ...soft, marginTop: 12 }}>
        <Row first label="League class grades" value={topClasses[0] ? `Best: ${teams[topClasses[0].ti]?.ab} ${topClasses[0].grade}` : ""} onClick={() => setSheet("grades")} />
        <Row label="Every pick" value={`${Object.keys(DEV_TRAITS).filter((k) => k !== "normal").map((k) => `${counts[k] || 0} ${DEV_TRAITS[k].name.toLowerCase()}`).slice(0, 2).join(", ")}`} onClick={() => setSheet("all")} />
      </div>
      {sheet === "grades" && <Sheet title="Class grades" onClose={() => setSheet(null)}>
        <div style={soft}>{topClasses.map((g, i) => <div key={g.ti} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 50, borderTop: i ? "1px solid #ffffff10" : 0, color: g.ti === ui ? C.gn : "#e2e8f0" }}><span style={{ width: 22, color: "#94a3b8" }}>{g.rank}</span>{teams[g.ti] && <TeamLogo t={teams[g.ti]} sz={26} />}<span style={{ flex: 1, minWidth: 0 }}><b style={{ display: "block", fontSize: 15 }}>{teams[g.ti]?.city} {teams[g.ti]?.name}</b><span style={{ fontSize: 12, color: "#94a3b8" }}>{g.picks.length} picks · {g.hits} hits</span></span><b style={{ fontSize: 18, color: GRADE_C[g.grade] }}>{g.grade}</b></div>)}</div>
        <div style={{ height: 10 }} />
      </Sheet>}
      {sheet === "all" && <Sheet title="Every pick" onClose={() => setSheet(null)}>
        <Segments items={[["all", "All"], ["mine", "Mine"], ["hits", "Hits"]]} value={show} onChange={setShow} />
        <div style={soft}>{shown.map((r, i) => line(r, i, <>{r.rd}-{r.overall} {teams[r.owner]?.ab} ·</>))}</div>
        <div style={{ height: 10 }} />
      </Sheet>}
    </div>
  );
}
