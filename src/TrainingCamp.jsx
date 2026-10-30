// Training camp (preseason): the preseason games, your practice sessions (camp.js: each one is a
// chance at a point for that player in the off-season, capped by age and ceiling, up to three per
// player; any you leave, the staff assigns at kickoff) and the extensions.
import React, { useState } from "react";
import { C, oC, Bdg, Btn, Face, Hero, Section } from "./ui.jsx";
import { MOBILE } from "./mobile.js";
import { yearlyAsk } from "./negotiation.js";
import { posTag } from "./dline.js";
import { expectedGain, sessionOdds, MAX_PER_PLAYER } from "./camp.js";

const panel = { background: "#ffffff0d", borderRadius: 18, padding: "14px 16px", minWidth: 0 };
const row = { display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "#ffffff08", borderRadius: 12, fontSize: 14, minWidth: 0 };
const money = (n) => `$${(+n || 0).toFixed(1)}M`;
const HOW = "Each session is a chance at a point for that player when the season's over: young players short of their ceiling gain most, veterans hold off some decline, and anyone at his ceiling gains nothing. Up to three each; the second and third are worth less.";
// Who's worth a session: the players his next one would help most (young and short of his
// ceiling first), with the ones you've already given sessions to on top.
const campList = (roster, alloc) => roster.filter((p) => !p.injured && sessionOdds(p) > 0)
  .map((p) => ({ p, n: alloc[p.id] || 0, next: expectedGain(p, (alloc[p.id] || 0) + 1) - expectedGain(p, alloc[p.id] || 0) }))
  .sort((a, b) => (b.n > 0) - (a.n > 0) || b.next - a.next || b.p.ovr - a.p.ovr);

export default function TrainingCamp({ team, yr, sp, games, risk, onRisk, onSimGame, onReport, sessions, alloc = {}, onCamp, onStaffCamp, onExtend, setSel }) {
  const roster = team.roster;
  const [allExt, setAllExt] = useState(false);
  const [allCamp, setAllCamp] = useState(false);
  const expiring = roster.filter((p) => p.contract === 1 || p.ext || p.resigned?.yr === yr).sort((a, b) => b.ovr - a.ovr);
  const extDone = expiring.filter((p) => p.ext || p.resigned?.yr === yr).length;
  const pre = sp === "preseason";
  const used = Object.values(alloc).reduce((a, b) => a + b, 0), left = Math.max(0, sessions - used);
  const list = campList(roster, alloc);
  const total = Math.round(list.reduce((t, x) => t + expectedGain(x.p, x.n), 0) * 10) / 10;
  const bump = (p, d) => { const n = Math.max(0, Math.min(MAX_PER_PLAYER, (alloc[p.id] || 0) + d)); if (d > 0 && left <= 0) return; onCamp({ ...alloc, [p.id]: n }); };
  const camp = { list, used, left, total, bump, sessions };
  const head = (t, s, extra) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: 16, fontWeight: 800 }}>{t}</span>
      {s && <span style={{ fontSize: 13, color: C.mt, flex: 1, minWidth: 160 }}>{s}</span>}
      {extra}
    </div>
  );
  if (MOBILE) return <PhoneCamp {...{ team, yr, games, risk, onRisk, onSimGame, onReport, onExtend, onStaffCamp, onCamp, setSel, expiring, extDone, pre, camp }} />;
  const more = (open, set, n, k = 5) => n > k && <button onClick={() => set((v) => !v)} style={{ marginTop: 8, background: "#ffffff12", border: 0, color: "#e2e8f0", borderRadius: 999, padding: "6px 14px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>{open ? "Fewer" : `Show all ${n}`}</button>;
  const step = (on) => ({ width: 28, height: 28, borderRadius: 8, border: 0, background: on ? "#ffffff1f" : "#ffffff08", color: on ? "#fff" : "#475569", fontSize: 16, fontWeight: 900, cursor: on ? "pointer" : "default", lineHeight: 1 });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {!pre && <div style={{ ...panel, color: "#fcd34d", fontWeight: 700 }}>Camp is closed for this year. The sessions below pay off at the end of the season.</div>}
      <div style={{ ...panel }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 800 }}>Preseason games {games.length}/4</span>
          <span style={{ fontSize: 13, color: C.mt }}>Starters playing risks injuries.</span>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {games.map((g, i) => <span key={i} style={{ fontSize: 13, fontWeight: 800, padding: "5px 10px", borderRadius: 999, background: g.us > g.them ? "#14532d55" : "#7f1d1d55", color: g.us > g.them ? C.gn : "#fca5a5" }}>{g.us > g.them ? "W" : "L"} {g.us}–{g.them} {g.opp}</span>)}
          <Btn onClick={onSimGame} disabled={!pre || games.length >= 4} bg={C.gn} style={{ fontSize: 13.5, padding: "7px 14px", borderRadius: 999 }}>▶ Play game</Btn>
          <Btn onClick={onRisk} bg={risk ? "#7f1d1d" : "#ffffff12"} c={risk ? "#fca5a5" : "#cbd5e1"} style={{ fontSize: 13.5, padding: "7px 14px", borderRadius: 999 }}>Starters play: {risk ? "yes" : "no"}</Btn>
          {games.length > 0 && <Btn onClick={onReport} bg="#ffffff12" c="#e2e8f0" style={{ fontSize: 13.5, padding: "7px 14px", borderRadius: 999 }}>Practice report</Btn>}
        </div>
      </div>

      <div style={{ ...panel }}>
        {head(`Practice sessions · ${used}/${sessions}`, `${HOW} Any you leave, the staff assigns at kickoff.`,
          <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: C.mt, whiteSpace: "nowrap" }}>Expected <b style={{ color: "#e2e8f0" }}>+{total}</b> overall</span>
            {pre && left > 0 && <Btn onClick={onStaffCamp} bg="#ffffff12" c="#e2e8f0" style={{ fontSize: 13, padding: "6px 14px", borderRadius: 999 }}>Let the staff assign {left}</Btn>}
            {pre && used > 0 && <Btn onClick={() => onCamp({})} bg="transparent" c="#94a3b8" style={{ fontSize: 13, padding: "6px 10px", borderRadius: 999 }}>Clear</Btn>}
          </span>)}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 5 }}>
          {(allCamp ? list : list.slice(0, 12)).map(({ p, n }) => (
            <div key={p.id} style={{ ...row, background: n ? "#22c55e14" : row.background }}>
              <span onClick={() => setSel(p)} style={{ flex: 1, minWidth: 0, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name} <span style={{ fontSize: 12, color: C.mt, fontWeight: 400 }}>{p.age}</span></span><Bdg pos={posTag(p)} />
              <span style={{ fontWeight: 900, color: oC(p.ovr) }}>{p.ovr}</span>
              <span style={{ fontSize: 11.5, color: C.mt, minWidth: 30 }}>/{p.pot || p.ovr}</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: C.gn, minWidth: 34, textAlign: "right" }}>{n ? `+${expectedGain(p, n)}` : ""}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <button aria-label={`One less session for ${p.name}`} disabled={!pre || !n} onClick={() => bump(p, -1)} style={step(pre && n)}>−</button>
                <b style={{ minWidth: 14, textAlign: "center" }}>{n}</b>
                <button aria-label={`One more session for ${p.name}`} disabled={!pre || n >= MAX_PER_PLAYER || left <= 0} onClick={() => bump(p, 1)} style={step(pre && n < MAX_PER_PLAYER && left > 0)}>+</button>
              </span>
            </div>
          ))}
        </div>
        {more(allCamp, setAllCamp, list.length, 12)}
      </div>

      <div style={{ ...panel }}>
        {head(`Extensions · ${extDone}/${expiring.length}`, "The new deal starts next season, so it has to fit next year's cap.")}
        {!expiring.length && <div style={{ fontSize: 13.5, color: C.mt }}>Nobody is in a contract year.</div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(420px,1fr))", gap: 5 }}>
          {(allExt ? expiring : expiring.slice(0, 6)).map((p) => (
            <div key={p.id} style={row}>
              <span onClick={() => setSel(p)} style={{ flex: 1, minWidth: 0, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name} <span style={{ fontSize: 12, color: C.mt, fontWeight: 400 }}>{p.age}</span></span><Bdg pos={posTag(p)} />
              <span style={{ fontWeight: 900, color: oC(p.ovr) }}>{p.ovr}</span>
              {p.ext ? <span style={{ fontSize: 12.5, color: C.gn, fontWeight: 700, whiteSpace: "nowrap" }}>✓ {p.ext.yrs}y · {money(p.ext.apy ?? p.ext.sal)}</span>
                : p.resigned?.yr === yr ? <span style={{ fontSize: 12.5, color: C.gn, fontWeight: 700, whiteSpace: "nowrap" }}>✓ {p.resigned.yrs}y · {money(p.resigned.sal)}</span>
                : <><span style={{ fontSize: 12, color: C.mt, whiteSpace: "nowrap" }}>asks {money(yearlyAsk(p, 2, "extend"))}</span><Btn onClick={() => onExtend(p)} bg={C.gn} style={{ fontSize: 12.5, padding: "4px 12px", borderRadius: 999 }}>Negotiate</Btn></>}
            </div>
          ))}
        </div>
        {more(allExt, setAllExt, expiring.length, 6)}
      </div>
    </div>
  );
}

// Phones: camp in the Home screen's look. A hero with the sessions left, then each part of camp as
// a section of clean rows; the session steppers are their own buttons (never the whole row).
function PhoneCamp({ team, yr, games, risk, onRisk, onSimGame, onReport, onExtend, onStaffCamp, onCamp, setSel, expiring, extDone, pre, camp }) {
  const [allCamp, setAllCamp] = useState(false), [allExt, setAllExt] = useState(false);
  const { list, used, left, total, bump, sessions } = camp;
  const soft = { background: "#ffffff0f", borderRadius: 18, padding: "0 14px" };
  const line = { display: "flex", alignItems: "center", gap: 10, minHeight: 58, padding: "6px 0" };
  const act = (on) => ({ minHeight: 40, minWidth: 64, padding: "0 12px", borderRadius: 12, border: 0, background: on ? `${C.bl}33` : "#ffffff0d", color: on ? "#bfdbfe" : "#64748b", fontSize: 14, fontWeight: 900, cursor: on ? "pointer" : "default", whiteSpace: "nowrap", flexShrink: 0 });
  const step = (on) => ({ width: 40, height: 40, borderRadius: 12, border: 0, background: on ? "#ffffff1f" : "#ffffff08", color: on ? "#fff" : "#475569", fontSize: 20, fontWeight: 900, cursor: on ? "pointer" : "default", flexShrink: 0 });
  const who = (p, sub) => (
    <span onClick={() => setSel(p)} style={{ flex: 1, minWidth: 0, cursor: "pointer" }}>
      <span style={{ display: "block", fontSize: 16, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, fontSize: 12, color: C.mt, whiteSpace: "nowrap", overflow: "hidden" }}><Bdg pos={posTag(p)} /><b style={{ color: oC(p.ovr), fontSize: 13 }}>{p.ovr}</b>{sub}</span>
    </span>
  );
  return (
    <div>
      <Hero clr={team.clr} logo={team} eyebrow={pre ? "Preseason" : "Camp is closed"} title="Training Camp" sub={pre ? "Get the roster ready for week 1" : "Your sessions pay off at season's end"}
        right={<div style={{ textAlign: "right" }}><div style={{ fontSize: 34, fontWeight: 900, lineHeight: 1, color: "#93c5fd" }}>{left}</div><div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.2, color: "#ffffffb3", marginTop: 4 }}>SESSIONS LEFT</div></div>} />

      <Section title={`Preseason games · ${games.length}/4`} action={games.length ? "Report" : null} onAction={onReport} style={{ marginTop: 18 }}>
        {games.length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>{games.map((g, i) => <span key={i} style={{ fontSize: 14, fontWeight: 800, padding: "6px 10px", borderRadius: 10, background: g.us > g.them ? "#14532d55" : "#7f1d1d55", color: g.us > g.them ? C.gn : "#fca5a5" }}>{g.us > g.them ? "W" : "L"} {g.us}–{g.them} {g.opp}</span>)}</div>}
        <button onClick={onSimGame} disabled={!pre || games.length >= 4} style={{ width: "100%", minHeight: 52, borderRadius: 14, border: 0, background: pre && games.length < 4 ? C.gn : "#ffffff12", color: pre && games.length < 4 ? "#fff" : "#64748b", fontSize: 17, fontWeight: 900, cursor: "pointer" }}>{games.length >= 4 ? "All four played" : "Play a preseason game"}</button>
        <div style={{ ...soft, marginTop: 10 }}>
          <div style={{ ...line, minHeight: 54 }}>
            <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 16, fontWeight: 800 }}>Starters play</span><span style={{ display: "block", fontSize: 12, color: C.mt }}>Sharper, but they can get hurt</span></span>
            <button onClick={onRisk} aria-pressed={risk} style={{ width: 56, height: 32, borderRadius: 16, border: 0, background: risk ? "#dc2626" : "#475569", position: "relative", cursor: "pointer", flexShrink: 0 }}><span style={{ position: "absolute", top: 3, left: risk ? 27 : 3, width: 26, height: 26, borderRadius: 13, background: "#fff", transition: "left .15s" }} /></button>
          </div>
        </div>
      </Section>

      <Section title={`Practice sessions · ${used}/${sessions}`} action={pre && left > 0 ? `Staff assigns ${left}` : pre && used > 0 ? "Clear" : null} onAction={() => (left > 0 ? onStaffCamp() : onCamp({}))}>
        <div style={{ fontSize: 13, color: C.mt, margin: "0 2px 8px", lineHeight: 1.45 }}>A chance at a point each when the season's over; young players short of their ceiling gain most. Up to three each. Expected <b style={{ color: "#e2e8f0" }}>+{total}</b> overall.</div>
        <div style={soft}>
          {(allCamp ? list : list.slice(0, 8)).map(({ p, n }, i) => (
            <div key={p.id} style={{ ...line, borderTop: i ? "1px solid #ffffff10" : 0 }}>
              <Face s={p.face} sz={36} />
              {who(p, <>{p.age} · to {p.pot || p.ovr}{n ? <b style={{ color: C.gn }}> · +{expectedGain(p, n)}</b> : null}</>)}
              <button aria-label={`One less session for ${p.name}`} disabled={!pre || !n} onClick={() => bump(p, -1)} style={step(pre && n)}>−</button>
              <b style={{ minWidth: 14, textAlign: "center", fontSize: 16 }}>{n}</b>
              <button aria-label={`One more session for ${p.name}`} disabled={!pre || n >= MAX_PER_PLAYER || left <= 0} onClick={() => bump(p, 1)} style={step(pre && n < MAX_PER_PLAYER && left > 0)}>+</button>
            </div>
          ))}
        </div>
        {list.length > 8 && <button onClick={() => setAllCamp((v) => !v)} style={{ width: "100%", minHeight: 44, marginTop: 8, borderRadius: 12, border: 0, background: "transparent", color: "#7dd3fc", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>{allCamp ? "Top eight only" : `Everyone (${list.length})`}</button>}
      </Section>

      <Section title={`Extensions · ${extDone}/${expiring.length}`}>
        <div style={soft}>
          {!expiring.length && <div style={{ ...line, color: C.mt }}>Nobody is in a contract year.</div>}
          {(allExt ? expiring : expiring.slice(0, 5)).map((p, i) => (
            <div key={p.id} style={{ ...line, borderTop: i ? "1px solid #ffffff10" : 0 }}>
              <Face s={p.face} sz={36} />
              {who(p, p.ext ? <span style={{ color: C.gn }}>signed {p.ext.yrs}y · {money(p.ext.apy ?? p.ext.sal)}</span> : p.resigned?.yr === yr ? <span style={{ color: C.gn }}>signed {p.resigned.yrs}y · {money(p.resigned.sal)}</span> : <>asks {money(yearlyAsk(p, 2, "extend"))}</>)}
              {!p.ext && p.resigned?.yr !== yr && <button onClick={() => onExtend(p)} style={act(true)}>Talk</button>}
            </div>
          ))}
        </div>
        {expiring.length > 5 && <button onClick={() => setAllExt((v) => !v)} style={{ width: "100%", minHeight: 44, marginTop: 8, borderRadius: 12, border: 0, background: "transparent", color: "#7dd3fc", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>{allExt ? "Top five only" : `Everyone (${expiring.length})`}</button>}
      </Section>
    </div>
  );
}
