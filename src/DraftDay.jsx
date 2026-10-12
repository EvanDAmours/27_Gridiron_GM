// Draft day presentation: the on-the-clock stage, the commissioner's "pick is in" card, the
// steal/reach ticker and the trade-up phone bank.
import React, { useEffect, useRef } from "react";
import { C, Bdg, Btn, TeamLogo } from "./ui.jsx";
import { pickValueTag, pickLabel } from "./draftTrade.js";

const ord = (n) => { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const TAG = { steal: { txt: "STEAL", bg: "#14532d", c: "#86efac" }, reach: { txt: "REACH", bg: "#7f1d1d", c: "#fca5a5" } };

export function ValueTag({ overall, csr, small }) {
  const t = pickValueTag(overall, csr);
  if (!t) return null;
  const s = TAG[t.kind];
  return <span title={`Consensus board #${csr}`} style={{ background: s.bg, color: s.c, borderRadius: 4, padding: small ? "0 4px" : "1px 6px", fontSize: small ? 10 : 12, fontWeight: 900, letterSpacing: 1 }}>{s.txt} {t.d > 0 ? `+${t.d}` : t.d}</span>;
}

// The latest picks, newest first, steals and reaches called out. It stays still (a loop showed every
// pick twice); swipe or scroll it sideways for older picks.
export function DraftTickerBar({ log, ui }) {
  if (!log.length) return null;
  const items = log.slice(-32).reverse();
  return (
    <div style={{ display: "flex", alignItems: "stretch", background: "#020617", border: `1px solid ${C.bd}`, borderRadius: 8, marginBottom: 10, height: 34, overflow: "hidden" }}>
      <div style={{ flexShrink: 0, background: "#b91c1c", color: "#fff", fontWeight: 900, fontSize: 12, letterSpacing: 1.5, padding: "0 10px", display: "flex", alignItems: "center" }}>LATEST</div>
      <div style={{ display: "flex", whiteSpace: "nowrap", overflowX: "auto", scrollbarWidth: "none" }}>
        {items.map((d, i) => (
          <span key={d.overall ?? i} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "0 16px", fontSize: 13, borderRight: `1px solid ${C.bd}`, color: d.owner === ui ? C.gn : "#e2e8f0", opacity: i === 0 ? 1 : 0.85 }}>
            <span style={{ color: C.mt }}>#{d.overall}</span><b>{d.ab || ""}</b><span>{d.player?.name}</span><span style={{ color: C.mt }}>{d.player?.pos}</span><ValueTag overall={d.overall} csr={d.csr} small />
          </span>
        ))}
      </div>
    </div>
  );
}

// The commissioner at the podium. entry: { overall, rd, owner, player, grade, csr }.
export function PickIsIn({ entry, team, yr, onDone, ms = 2300 }) {
  const done = useRef(onDone);
  done.current = onDone;
  // keyed on the pick only: the draft clock re-renders every second and must not restart this
  useEffect(() => { const t = setTimeout(() => done.current(), ms); return () => clearTimeout(t); }, [entry, ms]);
  const p = entry.player || {};
  return (
    <div onClick={onDone} style={{ position: "fixed", left: 0, right: 0, top: 70, zIndex: 1500, display: "flex", justifyContent: "center", padding: "0 12px", cursor: "pointer" }}>
      <style>{`@keyframes dd-in{from{opacity:0;transform:translateY(-14px) scale(.97)}to{opacity:1;transform:none}}`}</style>
      <div style={{ width: "100%", maxWidth: 560, borderRadius: 14, overflow: "hidden", boxShadow: "0 18px 50px #000c", animation: "dd-in .35s ease-out", border: "1px solid #ffffff22" }}>
        <div style={{ height: 6, background: "linear-gradient(90deg,#1d4ed8 0 33%,#fff 33% 66%,#b91c1c 66%)" }} />
        <div style={{ background: `linear-gradient(120deg,${team.clr} 0%,#0b1120 75%)`, padding: "14px 18px", display: "flex", gap: 14, alignItems: "center" }}>
          <TeamLogo t={team} sz={64} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, letterSpacing: 3, fontWeight: 900, color: "#fbbf24" }}>THE PICK IS IN</div>
            <div style={{ fontSize: 13, color: "#fffd", fontStyle: "italic", lineHeight: 1.35, margin: "2px 0 4px" }}>"With the {ord(entry.overall)} pick in the {yr} NFL Draft, the {team.city} {team.name} select…"</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#fff", lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 4, fontSize: 13, color: "#fffc" }}>
              <Bdg pos={p.pos} /><span>{p.college || ""}</span>{entry.grade && <span style={{ background: "#0008", borderRadius: 4, padding: "1px 6px", fontWeight: 800 }}>Grade {entry.grade}</span>}<ValueTag overall={entry.overall} csr={entry.csr} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// The on-the-clock stage. needs: positions the club is short at; fits: best available for them.
export function OnTheClock({ pick, team, mine, paused, timer, nextMine, needs = [], fits = [], onSim, onCalls, callsOpen, onForPick, forPickOpen }) {
  return (
    <div style={{ borderRadius: 14, overflow: "hidden", marginBottom: 10, border: mine ? `2px solid ${C.gn}` : `1px solid ${C.bd}` }}>
      <div style={{ height: 5, background: "linear-gradient(90deg,#1d4ed8 0 33%,#fff 33% 66%,#b91c1c 66%)" }} />
      <div style={{ background: `linear-gradient(120deg,${team.clr} 0%,#0b1120 80%)`, padding: "14px 18px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <TeamLogo t={team} sz={64} />
        <div style={{ flex: "1 1 220px", minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ background: paused ? "#475569" : "#b91c1c", color: "#fff", fontSize: 11, fontWeight: 900, letterSpacing: 2, padding: "2px 8px", borderRadius: 4 }}>{paused ? "PAUSED" : "ON THE CLOCK"}</span>
            <span style={{ fontSize: 13, color: "#fffa", letterSpacing: 2, fontWeight: 800 }}>ROUND {pick.rd} · PICK {pick.num} · #{pick.overall} OVERALL</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", lineHeight: 1.15, marginTop: 2 }}>{team.city} {team.name}{mine ? " (YOU)" : ""}</div>
          {needs.length > 0 && <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}><span style={{ fontSize: 11, color: "#fffa", fontWeight: 800, letterSpacing: 1 }}>NEEDS</span>{needs.map((n) => <Bdg key={n} pos={n} />)}</div>}
          {!mine && fits.length > 0 && <div style={{ fontSize: 12, color: "#fffc", marginTop: 4 }}>Mock pick: {fits.map((p) => `${p.name} (${p.pos})`).join(" · ")}</div>}
          {!mine && nextMine && <div style={{ fontSize: 13, color: "#fffc", marginTop: 2 }}>Your next pick: #{nextMine.overall} ({nextMine.overall - pick.overall} away)</div>}
          {mine && <div style={{ fontSize: 14, color: "#fffc", marginTop: 2 }}>{paused ? "Draft paused" : "Make your pick from the board below"}</div>}
        </div>
        {mine ? (
          <div style={{ textAlign: "right" }}><div style={{ fontSize: 40, fontWeight: 900, color: timer <= 10 ? C.rd : C.gd, fontVariantNumeric: "tabular-nums" }}>{Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}</div><div style={{ fontSize: 12, color: "#fffa" }}>TIME LEFT</div></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ textAlign: "right", lineHeight: 1 }}><span style={{ fontSize: 28, fontWeight: 900, color: timer <= 10 ? C.rd : "#fff", fontVariantNumeric: "tabular-nums" }}>{Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}</span><div style={{ fontSize: 11, color: "#fffa", marginTop: 2 }}>ON THE CLOCK</div></div>
            {nextMine && <Btn onClick={onSim} bg={C.gn} style={{ fontSize: 15, padding: "9px 16px", fontWeight: 900 }}>⏩ Sim to my pick</Btn>}
            {nextMine && <Btn onClick={onForPick} bg={forPickOpen ? "#854d0e" : "#422006"} c="#fde68a" style={{ fontSize: 14, padding: "8px 14px", fontWeight: 800 }}>🔁 {forPickOpen ? "Never mind" : "Trade for this pick"}</Btn>}
            {nextMine && <Btn onClick={onCalls} bg={callsOpen ? "#4c1d95" : "#1e1b4b"} c="#c4b5fd" style={{ fontSize: 14, padding: "8px 14px", fontWeight: 800 }}>📞 {callsOpen ? "Hide calls" : "Trade up"}</Btn>}
          </div>
        )}
      </div>
    </div>
  );
}

// Clubs ahead of you willing to move down.
// The on-the-clock club's answer to "what would it take for this pick?"
const FORPICK_NO = {
  keep: (t) => `The ${t} like their spot and aren't moving off this pick.`,
  cost: (t) => `You don't have the picks to cover what the ${t} want for this spot.`,
  none: () => "You need a later pick this year to build a deal around.",
};
export function ForPickPanel({ quote, team, yr, onAccept, onClose }) {
  const o = quote.offer;
  return (
    <div style={{ background: C.cd, border: "1px solid #ca8a0466", borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: "#fde68a", marginBottom: 6 }}>🔁 Trade for this pick <span style={{ fontSize: 12, color: C.mt, fontWeight: 500 }}>· the draft is paused. Make the trade and you're on the clock.</span></div>
      {!o && <div style={{ fontSize: 14, color: C.mt }}>{FORPICK_NO[quote.no](team.name)}</div>}
      {o && <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 14 }}>The {team.name} give you <b style={{ color: "#86efac" }}>#{o.theirPick.overall}</b> (up {o.up} spots) for</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{[o.myPick, ...o.extras].map((a, i) => <span key={i} style={{ fontSize: 13, fontWeight: 800, padding: "3px 8px", borderRadius: 6, background: i ? "#1e293b" : "#7f1d1d", color: i ? "#e2e8f0" : "#fca5a5" }}>{pickLabel(a, yr)}</span>)}</div>
        <span style={{ fontSize: 12, color: C.gd }}>Chart: {o.give} for {o.get}</span>
      </div>}
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        {o && <Btn onClick={() => onAccept(o)} bg={C.gn} style={{ fontSize: 14, padding: "7px 16px", fontWeight: 800 }}>Make the trade</Btn>}
        <Btn onClick={onClose} bg={C.bd} c={C.mt} style={{ fontSize: 14, padding: "7px 14px" }}>{o ? "No thanks" : "Close"}</Btn>
      </div>
    </div>
  );
}

export function TradeUpPanel({ offers, yr, onAccept, onPass }) {
  return (
    <div style={{ background: C.cd, border: "1px solid #7c3aed66", borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: "#c4b5fd", marginBottom: 6 }}>📞 Trade up <span style={{ fontSize: 12, color: C.mt, fontWeight: 500 }}>· the draft is paused while you work the phones. Prices from the draft trade chart; moving up costs a premium.</span></div>
      {!offers.length && <div style={{ fontSize: 13, color: C.mt }}>Nobody ahead of you is willing to move down right now (or you don't have the picks to pay for it).</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))", gap: 8 }}>
        {offers.map((o) => (
          <div key={o.id} style={{ background: "#0d1020", border: "1px solid #7c3aed66", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{o.from}</div>
            <div style={{ fontSize: 12, color: C.mt, marginBottom: 4 }}>Their pick <b style={{ color: "#86efac" }}>#{o.theirPick.overall}</b> · move up {o.up} spots</div>
            <div style={{ fontSize: 13, color: C.mt }}>You give</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, margin: "2px 0 6px" }}>{[o.myPick, ...o.extras].map((a, i) => <span key={i} style={{ fontSize: 13, fontWeight: 800, padding: "3px 8px", borderRadius: 6, background: i ? "#1e293b" : "#7f1d1d", color: i ? "#e2e8f0" : "#fca5a5" }}>{pickLabel(a, yr)}</span>)}</div>
            <div style={{ fontSize: 12, color: C.gd, marginBottom: 6 }}>Chart: you give {o.give} for {o.get}</div>
            <div style={{ display: "flex", gap: 6 }}><Btn onClick={() => onAccept(o)} bg={C.gn} style={{ flex: 1, fontSize: 13, padding: "6px 0" }}>Make the trade</Btn><Btn onClick={() => onPass(o)} bg={C.bd} c={C.mt} style={{ fontSize: 13, padding: "6px 8px" }}>✕</Btn></div>
          </div>
        ))}
      </div>
    </div>
  );
}
