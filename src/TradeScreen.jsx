// The trade screen, laid out like the original Gridiron GM: pick a team, tick players and
// picks on two big roster tables, and the summary tells you plainly whether they'd take it.
import Select from "./Select.jsx";
import React, { useState } from "react";
import { C, oC, Bdg, Btn, Face, TeamLogo } from "./ui.jsx";
import { deadMoney, proration, yearsLeft } from "./bonus.js";
import { getCapPhase } from "./cap.js";

// Years left on his deal as of now (in the off-season his contract count hasn't ticked down yet).
const yrsLeft = (p) => { const { yr, sp } = getCapPhase(); return yearsLeft(p, yr, sp); };
import { MOBILE } from "./mobile.js";

const POS = ["QB", "RB", "WR", "TE", "LT", "LG", "C", "RG", "RT", "DL", "LB", "CB", "S", "K", "P"];
// Ways to order a roster table; dir is the first click's order (-1 = biggest first).
const SORTS = {
  ovr: { label: "Overall", key: (p) => p.ovr, dir: -1 },
  salary: { label: "Salary", key: (p) => +p.salary || 0, dir: -1 },
  years: { label: "Years left", key: (p) => yrsLeft(p), dir: -1 },
  val: { label: "Trade value", key: (p) => +p.tradeVal || 0, dir: -1 },
  age: { label: "Age", key: (p) => p.age, dir: 1 },
};
const money = (n) => `$${(+n || 0).toFixed(1)}M`;
const sel = { background: C.bg, color: C.tx, border: `1px solid ${C.bd}`, borderRadius: 6, padding: "8px 10px", fontSize: 15 };

// The league's best at one position (other clubs' players): pick one and he's loaded into a trade
// with his team.
function BestAt({ teams, ui, pos, setPos, onPick, setSel }) {
  const rows = teams.flatMap((t) => (t.id === ui ? [] : (t.roster || []).filter((p) => p.pos === pos).map((p) => ({ t, p })))).sort((a, b) => b.p.ovr - a.p.ovr || a.p.age - b.p.age).slice(0, 15);
  return (
    <div style={{ background: C.cd, border: `1px solid ${C.bd}`, borderRadius: 10, padding: 10 }}>
      <div style={{ display: "flex", gap: 5, flexWrap: MOBILE ? "nowrap" : "wrap", overflowX: MOBILE ? "auto" : undefined, marginBottom: 8, paddingBottom: 2 }}>
        {POS.map((x) => <button key={x} onClick={() => setPos(x)} style={{ flex: "0 0 auto", background: pos === x ? `${C.bl}33` : C.bg, color: pos === x ? "#fff" : "#cbd5e1", border: `1px solid ${pos === x ? C.bl : C.bd}`, borderRadius: 999, padding: "5px 11px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>{x}</button>)}
      </div>
      {rows.map(({ t, p }, i) => (
        <div key={p.id} onClick={() => onPick(t, p)} title={`Trade for ${p.name}`} style={{ display: "grid", gridTemplateColumns: MOBILE ? "20px 26px 1fr auto auto" : "22px 30px 1fr 70px 60px 110px 70px auto", alignItems: "center", gap: 8, padding: "7px 4px", borderTop: i ? `1px solid ${C.bd}66` : "none", cursor: "pointer" }}>
          <span style={{ fontSize: 12, color: C.mt, fontWeight: 800 }}>{i + 1}</span>
          <TeamLogo t={t} sz={MOBILE ? 24 : 28} />
          <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><span onClick={(e) => { e.stopPropagation(); setSel(p); }} style={{ fontWeight: 800, textDecoration: "underline", textDecorationColor: "#334155", textUnderlineOffset: 3 }}>{p.name}</span> <span style={{ fontSize: 12, color: C.mt }}>{t.ab}{MOBILE ? ` · ${p.age}` : ""}</span></span>
          {!MOBILE && <span style={{ fontSize: 13, color: "#cbd5e1" }}>age {p.age}</span>}
          <b style={{ fontSize: 17, color: oC(p.ovr), textAlign: "center" }}>{p.ovr}</b>
          {!MOBILE && <span style={{ fontSize: 13, color: "#cbd5e1", whiteSpace: "nowrap" }}>{money(p.salary)} · {yrsLeft(p)}y</span>}
          {!MOBILE && <span style={{ fontSize: 13, fontWeight: 800, color: "#fbbf24" }} title="Trade value">{p.tradeVal}</span>}
          <span style={{ fontSize: 12, fontWeight: 800, color: C.bl, whiteSpace: "nowrap" }}>Trade →</span>
        </div>
      ))}
      {!rows.length && <div style={{ fontSize: 14, color: C.mt, padding: 8 }}>No players at {pos} elsewhere in the league.</div>}
    </div>
  );
}

function Side({ title, color, team, players, picks, chosen, chosenPk, toggle, togglePk, pickVal, setSel }) {
  const [pos, setPos] = useState("ALL");
  const [sort, setSort] = useState("ovr");
  const [dir, setDir] = useState(-1);
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const rows = [...(players || [])]
    .filter((p) => (pos === "ALL" || p.pos === pos) && (!needle || p.name.toLowerCase().includes(needle)))
    .sort((a, b) => dir * (SORTS[sort].key(a) - SORTS[sort].key(b)) || b.ovr - a.ovr);
  // Click a column to sort by it; click it again to flip the order.
  const by = (k) => { if (k === sort) setDir(-dir); else { setSort(k); setDir(SORTS[k].dir); } };
  const arrow = (k) => (k === sort ? (dir < 0 ? " ▼" : " ▲") : "");
  // Phones hide the contract column, so a pay sort shows pay where trade value usually sits.
  const payCol = MOBILE && (sort === "salary" || sort === "years");
  const sh = (k) => ({ cursor: "pointer", color: k === sort ? C.tx : C.mt, userSelect: "none" });
  const th = { padding: "6px 6px", fontSize: 12, fontWeight: 800, letterSpacing: 1, color: C.mt, borderBottom: `1px solid ${C.bd}`, textAlign: "center", position: "sticky", top: 0, background: C.cd };
  const td = { padding: "8px 6px", borderBottom: `1px solid ${C.bd}55`, textAlign: "center", fontSize: 15 };
  return (
    <div style={{ flex: "1 1 420px", minWidth: 0, background: C.cd, border: `1px solid ${C.bd}`, borderRadius: 10, padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <TeamLogo t={team} sz={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.5, color }}>{title}</div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>{team.city} {team.name} <span style={{ fontSize: 14, color: C.mt, fontWeight: 600 }}>{team.w}-{team.l}{team.t ? `-${team.t}` : ""}</span></div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: MOBILE ? "nowrap" : "wrap" }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Search players" aria-label="Search players" style={{ ...sel, padding: "6px 9px", fontSize: 14, flex: "1 1 140px", minWidth: 0 }} />
        <Select value={pos} onChange={(e) => setPos(e.target.value)} aria-label="Position" style={{ ...sel, padding: "6px 8px", fontSize: 14, flex: "0 0 auto" }}>
          {["ALL", ...POS].map((x) => <option key={x} value={x}>{x === "ALL" ? (MOBILE ? "All" : "All positions") : x}</option>)}
        </Select>
        <Select value={sort} onChange={(e) => { setSort(e.target.value); setDir(SORTS[e.target.value].dir); }} aria-label="Sort by" style={{ ...sel, padding: "6px 8px", fontSize: 14, flex: "0 0 auto" }}>
          {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
      </div>
      <div style={{ maxHeight: 460, overflowY: "auto", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={th}></th><th style={{ ...th, textAlign: "left" }}>PLAYER</th><th style={th}>POS</th><th className="tr-hide" style={{ ...th, ...sh("age") }} onClick={() => by("age")}>AGE{arrow("age")}</th><th style={{ ...th, ...sh("ovr") }} onClick={() => by("ovr")}>OVR{arrow("ovr")}</th><th className="tr-hide" style={{ ...th, ...sh(sort === "years" ? "years" : "salary") }} onClick={() => by("salary")}>CONTRACT{arrow("salary")}{arrow("years")}</th>{payCol ? <th style={{ ...th, ...sh(sort) }}>{sort === "years" ? "YEARS" : "SALARY"}{arrow(sort)}</th> : <th style={{ ...th, ...sh("val") }} onClick={() => by("val")}>VALUE{arrow("val")}</th>}</tr></thead>
          <tbody>
            {rows.map((p) => {
              const on = chosen.some((x) => x.id === p.id);
              return (
                <tr key={p.id} onClick={() => toggle(p)} style={{ cursor: "pointer", background: on ? `${color}26` : "transparent" }}>
                  <td style={{ ...td, width: 30 }}><input type="checkbox" readOnly checked={on} style={{ width: 18, height: 18, accentColor: color, pointerEvents: "none" }} /></td>
                  <td style={{ ...td, textAlign: "left" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <Face s={p.face} sz={26} />
                      <span onClick={(e) => { e.stopPropagation(); setSel(p); }} style={{ fontWeight: 700, color: "#f1f5f9", textDecoration: "underline", textDecorationColor: "#334155", textUnderlineOffset: 3 }}>{p.name}</span>
                      {p.xf && <span title={`X-Factor: ${p.xf}`} style={{ fontSize: 11, fontWeight: 900, color: "#f472b6" }}>XF</span>}
                      {p.injured && <span title="Injured" style={{ fontSize: 12, color: C.rd, fontWeight: 900 }}>+</span>}
                    </span>
                  </td>
                  <td style={td}><Bdg pos={p.pos} /></td>
                  <td className="tr-hide" style={{ ...td, color: "#cbd5e1" }}>{p.age}</td>
                  <td style={{ ...td, fontWeight: 900, fontSize: 17, color: oC(p.ovr) }}>{p.ovr}</td>
                  <td className="tr-hide" style={{ ...td, color: "#cbd5e1", whiteSpace: "nowrap", fontSize: 14 }}>{money(p.salary)} · {yrsLeft(p)}y</td>
                  {payCol ? <td style={{ ...td, color: "#cbd5e1", whiteSpace: "nowrap", fontSize: 14 }}>{sort === "years" ? `${yrsLeft(p)}y` : money(p.salary)}</td> : <td style={{ ...td, fontWeight: 800, color: "#fbbf24" }}>{p.tradeVal}</td>}
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={7} style={{ ...td, color: C.mt, fontSize: 14 }}>{needle ? `No one named "${q.trim()}"` : "No players"}</td></tr>}
            {!needle && picks.length > 0 && <tr><td colSpan={7} style={{ padding: "12px 6px 4px", fontSize: 12, fontWeight: 800, letterSpacing: 1.5, color: C.gd }}>DRAFT PICKS</td></tr>}
            {!needle && picks.map((pk) => {
              const on = chosenPk.some((x) => x.id === pk.id);
              return (
                <tr key={pk.id} onClick={() => togglePk(pk)} style={{ cursor: "pointer", background: on ? `${C.gd}26` : "transparent" }}>
                  <td style={{ ...td, width: 30 }}><input type="checkbox" readOnly checked={on} style={{ width: 18, height: 18, accentColor: C.gd, pointerEvents: "none" }} /></td>
                  <td style={{ ...td, textAlign: "left", fontWeight: 700 }} colSpan={2}>{pk.yr || ""} Round {pk.rd}{pk.overall ? ` · #${pk.overall}` : ""}{pk.orig !== team.id ? <span style={{ color: C.mt, fontWeight: 400 }}> (via {pk.origAb})</span> : null}</td>
                  <td className="tr-hide" style={td}></td><td style={td}></td><td className="tr-hide" style={td}></td>
                  <td style={{ ...td, fontWeight: 800, color: "#fbbf24" }}>{Math.round(pickVal(pk))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function TradeScreen({ teams, ui, trTm, setTrTm, trOff, setTrOff, draftPicks: thisDraft, futurePicks = [], pickVal, evalTr, execTr, setSel, capSpace, closed, modes, yr, sp }) {
  const me = teams[ui];
  // this year's picks, then the next three drafts'
  const draftPicks = [...thisDraft, ...futurePicks];
  const [view, setView] = useState("teams");
  const [bpos, setBpos] = useState("QB");
  const them = trTm != null ? teams[trTm] : null;
  const withAb = (pk) => ({ ...pk, origAb: teams[pk.orig]?.ab });
  const flip = (key, x) => setTrOff((o) => ({ ...o, [key]: o[key].some((y) => y.id === x.id) ? o[key].filter((y) => y.id !== x.id) : [...o[key], x] }));
  const any = trOff.g.length + trOff.r.length + trOff.gPk.length + trOff.rPk.length > 0;
  const ev = any ? evalTr() : { gv: 0, rv: 0, ask: 0, gap: 0, accept: false, over: false, nextWeight: 1 };
  const accept = ev.accept;
  // Players you send leave their signing bonus behind as dead money; players you get arrive on their base salary.
  const dead = trOff.g.reduce((s, p) => { const d = deadMoney(p, { yr, sp }); return { now: s.now + d.now, next: s.next + d.next }; }, { now: 0, next: 0 });
  const salOut = trOff.g.reduce((s, p) => s + (p.salary || 0), 0), salIn = trOff.r.reduce((s, p) => s + (p.salary || 0) - proration(p), 0);
  const capAfter = capSpace(me) + salOut - salIn - dead.now;

  // Balance the deal: add the smallest asset of yours that covers what they still want, or, if
  // you're overpaying, the best extra piece of theirs that keeps it acceptable.
  const balance = () => {
    if (!them) return;
    if (ev.gap > 0) {
      // Their GM counts your next piece at a discount, so it has to cover gap / weight.
      const need = ev.gap; // checked per asset below: picks count in full, players at nextWeight
      const mine = [
        ...me.roster.filter((p) => !trOff.g.some((x) => x.id === p.id)).map((p) => ({ k: "g", x: p, v: p.tradeVal })),
        ...draftPicks.filter((pk) => pk.owner === ui && !trOff.gPk.some((x) => x.id === pk.id)).map((pk) => ({ k: "gPk", x: pk, v: pickVal(pk) })),
      ].sort((a, b) => a.v - b.v);
      const counts = (a) => (a.k === "g" ? a.v * ev.nextWeight : a.v);
      const fit = mine.find((a) => counts(a) >= need) || mine[mine.length - 1];
      if (fit) flip(fit.k, fit.x);
    } else if (ev.over) {
      const room = (ev.gv - ev.ask) / 1.25; // what they could add and still come out ahead
      const theirs = them.roster.filter((p) => !trOff.r.some((x) => x.id === p.id) && p.tradeVal <= room).sort((a, b) => b.tradeVal - a.tradeVal);
      if (theirs[0]) flip("r", theirs[0]);
    }
  };

  const verdict = !any ? null
    : !(trOff.g.length || trOff.gPk.length) ? ["Add something you'll send", C.mt]
    : !(trOff.r.length || trOff.rPk.length) ? ["Add something you want back", C.mt]
    : accept && ev.close ? [`A little short, but they'd take it${ev.close.length ? `: ${ev.close.join("; ")}` : ""}`, C.gd]
    : accept ? [ev.over ? "They'd accept — but you're overpaying" : "They'd accept this trade", C.gn]
    : [`They want about ${ev.gap} more value`, C.rd];
  const chip = (x, key, label, color) => (
    <span key={x.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.bg, border: `1px solid ${color}55`, borderRadius: 8, padding: "5px 8px", fontSize: 14 }}>
      {label}<button onClick={() => flip(key, x)} aria-label="Remove" style={{ background: "transparent", border: 0, color: C.mt, cursor: "pointer", fontSize: 15, padding: 0 }}>✕</button>
    </span>
  );
  const pick = (id) => { setTrTm(id); setTrOff({ g: [], r: [], gPk: [], rPk: [] }); };
  const pkLabel = (pk) => `${pk.yr || ""} Rd ${pk.rd}${pk.overall ? ` #${pk.overall}` : ""}`;
  // Left of centre: short of what they ask. Right: comfortably over it.
  const meter = Math.max(-1, Math.min(1, (ev.gv - ev.ask) / Math.max(40, ev.ask)));

  return (
    <div>
      <style>{"@media (max-width: 640px) { .tr-hide { display: none } }"}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <span style={{ fontSize: 24, fontWeight: 900 }}>Trade with</span>
        {them && <button onClick={() => pick(null)} title="Pick a different team" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.cd, border: `1px solid ${C.bd}`, borderRadius: 10, padding: "4px 12px 4px 6px", color: "#e2e8f0", cursor: "pointer", fontSize: 16, fontWeight: 800 }}><TeamLogo t={them} sz={28} />{MOBILE ? them.ab : `${them.city} ${them.name}`}<span style={{ fontSize: 12, color: C.mt, fontWeight: 700 }}>change ▾</span></button>}
        <span style={{ fontSize: 14, color: C.mt }}>Your cap space: <b style={{ color: capSpace(me) >= 0 ? C.gn : C.rd }}>{money(capSpace(me))}</b></span>
      </div>

      {them && (
        <div style={{ background: C.cd, border: `1px solid ${verdict ? verdict[1] : C.bd}`, borderRadius: 10, padding: "14px 16px", marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 260px", minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.5, color: C.rd, marginBottom: 6 }}>YOU SEND · worth {ev.gv} to them</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {trOff.g.map((p) => chip(p, "g", <><Bdg pos={p.pos} /> <b>{p.name}</b> <span style={{ color: oC(p.ovr) }}>{p.ovr}</span></>, C.rd))}
                {trOff.gPk.map((pk) => chip(pk, "gPk", <b>{pkLabel(pk)}</b>, C.gd))}
                {!trOff.g.length && !trOff.gPk.length && <span style={{ color: C.mt, fontSize: 14 }}>Tick players or picks on your side</span>}
              </div>
            </div>
            <div style={{ flex: "1 1 260px", minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.5, color: C.gn, marginBottom: 6 }}>YOU RECEIVE · value {ev.rv}{ev.ask > ev.rv ? ` · they ask ${ev.ask}` : ""}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {trOff.r.map((p) => chip(p, "r", <><Bdg pos={p.pos} /> <b>{p.name}</b> <span style={{ color: oC(p.ovr) }}>{p.ovr}</span></>, C.gn))}
                {trOff.rPk.map((pk) => chip(pk, "rPk", <b>{pkLabel(pk)}</b>, C.gd))}
                {!trOff.r.length && !trOff.rPk.length && <span style={{ color: C.mt, fontSize: 14 }}>Tick players or picks on their side</span>}
              </div>
            </div>
          </div>
          {any && (
            <>
              <div style={{ position: "relative", height: 10, background: C.bg, borderRadius: 5, margin: "14px 0 6px" }}>
                <div style={{ position: "absolute", left: "50%", top: -3, bottom: -3, width: 2, background: C.mt }} />
                <div style={{ position: "absolute", top: 0, bottom: 0, borderRadius: 5, background: meter >= 0 ? C.gn : C.rd, left: meter >= 0 ? "50%" : `${50 + meter * 50}%`, width: `${Math.abs(meter) * 50}%` }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.mt }}><span>Not enough</span><span>Their asking price</span><span>More than enough</span></div>
            </>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            {verdict && <span style={{ fontSize: 20, fontWeight: 900, color: verdict[1], flex: "1 1 240px" }}>{verdict[0]}{ev.why && !accept && <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#fca5a5" }}>{ev.why}</span>}</span>}
            {any && <span style={{ fontSize: 14, color: C.mt }}>Cap space after: <b style={{ color: capAfter >= 0 ? C.gn : C.rd }}>{money(capAfter)}</b>{dead.now + dead.next > 0.05 && <span style={{ display: "block", fontSize: 12 }}>incl. {money(dead.now)} dead money{dead.next > 0.05 ? ` (+${money(dead.next)} next year)` : ""}</span>}</span>}
            {any && <Btn onClick={balance} bg={C.bd} c="#e2e8f0" style={{ fontSize: 15, padding: "9px 14px" }}>What would make this work?</Btn>}
            {any && <Btn onClick={() => setTrOff({ g: [], r: [], gPk: [], rPk: [] })} bg="transparent" c={C.mt} style={{ fontSize: 15, padding: "9px 12px", border: `1px solid ${C.bd}` }}>Clear</Btn>}
            <Btn onClick={execTr} disabled={!accept || closed} bg={C.gn} style={{ fontSize: 16, padding: "10px 20px", fontWeight: 900 }}>{closed ? "Trade deadline passed" : "Propose trade"}</Btn>
          </div>
        </div>
      )}

      {them ? (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
          <Side title="YOUR TEAM" color={C.rd} team={me} players={me.roster} picks={draftPicks.filter((pk) => pk.owner === ui).map(withAb)} chosen={trOff.g} chosenPk={trOff.gPk} toggle={(p) => flip("g", p)} togglePk={(pk) => flip("gPk", pk)} pickVal={pickVal} setSel={setSel} />
          <Side title="THEIR TEAM" color={C.gn} team={them} players={them.roster} picks={draftPicks.filter((pk) => pk.owner === trTm).map(withAb)} chosen={trOff.r} chosenPk={trOff.rPk} toggle={(p) => flip("r", p)} togglePk={(pk) => flip("rPk", pk)} pickVal={pickVal} setSel={setSel} />
        </div>
      ) : (<>
        <div role="tablist" style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {[["teams", "By team"], ["best", "League's best by position"]].map(([k, l]) => <button key={k} role="tab" aria-selected={view === k} onClick={() => setView(k)} style={{ background: view === k ? `${C.bl}33` : C.cd, color: view === k ? "#fff" : "#cbd5e1", border: `1px solid ${view === k ? C.bl : C.bd}`, borderRadius: 999, padding: "6px 14px", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>{l}</button>)}
        </div>
        {view === "best" ? <BestAt teams={teams} ui={ui} pos={bpos} setPos={setBpos} onPick={(t, p) => { setTrTm(t.id); setTrOff({ g: [], r: [p], gPk: [], rPk: [] }); }} setSel={setSel} /> :
        // a grid of logos beats a 31-line dropdown
        <div style={{ display: "grid", gridTemplateColumns: MOBILE ? "repeat(4, 1fr)" : "repeat(auto-fill, minmax(92px, 1fr))", gap: 6 }}>
          {teams.filter((t) => t.id !== ui).sort((a, b) => a.city.localeCompare(b.city)).map((t) => {
            const m = modes?.[t.id];
            return (
              <button key={t.id} onClick={() => pick(t.id)} title={`${t.city} ${t.name}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 2px 6px", background: C.cd, border: `1px solid ${m === "buyer" ? C.gn + "88" : m === "seller" ? C.gd + "88" : C.bd}`, borderRadius: 10, color: "#e2e8f0", cursor: "pointer" }}>
                <TeamLogo t={t} sz={34} />
                <b style={{ fontSize: 13 }}>{t.ab}</b>
                <span style={{ fontSize: 11, color: C.mt }}>{t.w}-{t.l}</span>
                {m && <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: 0.8, color: m === "buyer" ? C.gn : C.gd }}>{m === "buyer" ? "BUYING" : "SELLING"}</span>}
              </button>
            );
          })}
        </div>}
      </>)}
    </div>
  );
}
