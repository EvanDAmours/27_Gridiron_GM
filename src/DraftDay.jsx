// Draft day presentation: the on-the-clock stage, the commissioner's "pick is in" card, the
// steal/reach ticker and the trade-up phone bank.
import { MOBILE } from "./mobile.js";
import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { C, Bdg, Btn, TeamLogo, SheetGrip, CloseX, Sheet, Segments, Icon } from "./ui.jsx";
import { pickValueTag, pickLabel } from "./draftTrade.js";
import { posTag } from "./dline.js";

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
          <TeamLogo t={team} sz={MOBILE ? 46 : 64} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, letterSpacing: 3, fontWeight: 900, color: "#fbbf24" }}>THE PICK IS IN{MOBILE ? ` · #${entry.overall} ${team.ab}` : ""}</div>
            {!MOBILE && <div style={{ fontSize: 13, color: "#fffd", fontStyle: "italic", lineHeight: 1.35, margin: "2px 0 4px" }}>"With the {ord(entry.overall)} pick in the {yr} NFL Draft, the {team.city} {team.name} select…"</div>}
            <div style={{ fontSize: MOBILE ? 22 : 26, fontWeight: 900, color: "#fff", lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 4, fontSize: 13, color: "#fffc" }}>
              <Bdg pos={posTag(p)} /><span>{p.college || ""}</span>{entry.grade && <span style={{ background: "#0008", borderRadius: 4, padding: "1px 6px", fontWeight: 800 }}>Grade {entry.grade}</span>}<ValueTag overall={entry.overall} csr={entry.csr} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// The on-the-clock stage. needs: positions the club is short at; fits: best available for them.
export function OnTheClock({ pick, team, mine, paused, timer, nextMine, needs = [], fits = [], onSim, onSimPick, onCalls, callsOpen, onForPick, forPickOpen, onPause }) {
  const clock = `${Math.floor(timer / 60)}:${String(timer % 60).padStart(2, "0")}`;
  // Pause sits right by the clock, big enough to find in a hurry.
  const pauseBtn = (big) => onPause && <button onClick={onPause} aria-label={paused ? "Resume the draft" : "Pause the draft"} style={{ background: paused ? C.gn : "#f97316", color: "#fff", border: "2px solid #ffffff55", borderRadius: 10, padding: big ? "10px 18px" : "6px 10px", fontSize: big ? 17 : 14, fontWeight: 900, cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 4px 12px #0007", flexShrink: 0 }}>{paused ? "▶ Resume" : "⏸ Pause"}</button>;
  // Phones: a compact clock bar pinned under the header, the buttons in one swipeable row.
  if (MOBILE) return (
    <div style={{ position: "sticky", top: "calc(56px + env(safe-area-inset-top))", zIndex: 20, borderRadius: 12, overflow: "hidden", marginBottom: 10, border: mine ? `2px solid ${C.gn}` : `1px solid ${C.bd}`, boxShadow: "0 8px 20px #0009" }}>
      <div style={{ background: `linear-gradient(120deg,${team.clr} 0%,#0b1120 85%)`, padding: "8px 10px", display: "flex", alignItems: "center", gap: 10 }}>
        <TeamLogo t={team} sz={34} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.2, color: "#fffb" }}>{paused ? "PAUSED" : mine ? "YOU'RE ON THE CLOCK" : "ON THE CLOCK"} · R{pick.rd} #{pick.overall}</div>
          <div style={{ fontSize: 17, fontWeight: 900, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{team.city} {team.name}</div>
          {!mine && nextMine && <div style={{ fontSize: 12, color: "#fffc" }}>Your pick: #{nextMine.overall} ({nextMine.overall - pick.overall} away)</div>}
        </div>
        <div style={{ fontSize: 26, fontWeight: 900, color: timer <= 10 ? C.rd : mine ? C.gd : "#fff", fontVariantNumeric: "tabular-nums" }}>{clock}</div>
        {pauseBtn(false)}
      </div>
      {!mine && (onSimPick || nextMine) && (
        // (Sim to my pick is the big button at the bottom, so it isn't repeated here)
        <div style={{ background: "#0b1120", padding: "6px 8px", display: "flex", gap: 8 }}>
          {/* one calm style for all three (the open one lights up), so the colors don't fight the board */}
          {onSimPick && <Btn onClick={onSimPick} bg="#ffffff12" c="#e2e8f0" style={{ flex: 1, fontSize: 14, minHeight: 44, padding: "6px 4px", fontWeight: 800, borderRadius: 10 }}>Sim pick</Btn>}
          {nextMine && <Btn onClick={onForPick} bg={forPickOpen ? "#ffffff2e" : "#ffffff12"} c={forPickOpen ? "#fff" : "#e2e8f0"} style={{ flex: 1, fontSize: 14, minHeight: 44, padding: "6px 4px", fontWeight: 800, borderRadius: 10 }}>Get this pick</Btn>}
          {nextMine && <Btn onClick={onCalls} bg={callsOpen ? "#ffffff2e" : "#ffffff12"} c={callsOpen ? "#fff" : "#e2e8f0"} style={{ flex: 1, fontSize: 14, minHeight: 44, padding: "6px 4px", fontWeight: 800, borderRadius: 10 }}>Trade up</Btn>}
        </div>
      )}
    </div>
  );
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
          {!mine && fits.length > 0 && <div style={{ fontSize: 12, color: "#fffc", marginTop: 4 }}>Mock pick: {fits.map((p) => `${p.name} (${posTag(p)})`).join(" · ")}</div>}
          {!mine && nextMine && <div style={{ fontSize: 13, color: "#fffc", marginTop: 2 }}>Your next pick: #{nextMine.overall} ({nextMine.overall - pick.overall} away)</div>}
          {mine && <div style={{ fontSize: 14, color: "#fffc", marginTop: 2 }}>{paused ? "Draft paused" : "Make your pick from the board below"}</div>}
        </div>
        {mine ? (
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>{pauseBtn(true)}<div style={{ textAlign: "right" }}><div style={{ fontSize: 40, fontWeight: 900, color: timer <= 10 ? C.rd : C.gd, fontVariantNumeric: "tabular-nums" }}>{Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}</div><div style={{ fontSize: 12, color: "#fffa" }}>TIME LEFT</div></div></div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>{pauseBtn(true)}
            <div style={{ textAlign: "right", lineHeight: 1 }}><span style={{ fontSize: 28, fontWeight: 900, color: timer <= 10 ? C.rd : "#fff", fontVariantNumeric: "tabular-nums" }}>{Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}</span><div style={{ fontSize: 11, color: "#fffa", marginTop: 2 }}>ON THE CLOCK</div></div>
          </div>
        )}
      </div>
      {!mine && (onSimPick || nextMine) && (
        <div style={{ background: "#0b1120", padding: "8px 14px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", borderTop: "1px solid #ffffff14" }}>
          {onSimPick && <Btn onClick={onSimPick} bg="#0e7490" style={{ fontSize: 14, padding: "7px 14px", fontWeight: 900 }}>⏭ Sim this pick</Btn>}
          {nextMine && <Btn onClick={onSim} bg={C.gn} style={{ fontSize: 14, padding: "7px 14px", fontWeight: 900 }}>⏩ Sim to my pick</Btn>}
          {nextMine && <Btn onClick={onForPick} bg={forPickOpen ? "#854d0e" : "#422006"} c="#fde68a" style={{ fontSize: 14, padding: "7px 14px", fontWeight: 800 }}>🔁 {forPickOpen ? "Never mind" : "Trade for this pick"}</Btn>}
          {nextMine && <Btn onClick={onCalls} bg={callsOpen ? "#4c1d95" : "#1e1b4b"} c="#c4b5fd" style={{ fontSize: 14, padding: "7px 14px", fontWeight: 800 }}>📞 {callsOpen ? "Hide calls" : "Trade up"}</Btn>}
        </div>
      )}
    </div>
  );
}

// Clubs ahead of you willing to move down.
// Phones: draft-day trade panels open as a bottom sheet over the board.
function PhoneSheet({ onClose, children }) {
  if (!MOBILE) return children;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1100, background: "#000a", display: "flex", alignItems: "flex-end" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", width: "100%", maxHeight: "85vh", overflowY: "auto", background: C.bg, borderRadius: "18px 18px 0 0", padding: "8px 10px calc(14px + env(safe-area-inset-bottom))", animation: "sheetUp .22s ease-out" }}>
        <SheetGrip onClose={onClose} />
        <CloseX onClick={onClose} style={{ top: 8, right: 8 }} />
        {children}
      </div>
    </div>
  );
}

// The on-the-clock club's answer to "what would it take for this pick?"
const FORPICK_NO = {
  keep: (t) => `The ${t} like their spot and aren't moving off this pick.`,
  cost: (t) => `You don't have the picks to cover what the ${t} want for this spot.`,
  none: () => "You need a later pick this year to build a deal around.",
};
export function ForPickPanel({ quote, team, yr, onAccept, onClose }) {
  const o = quote.offer;
  return (<PhoneSheet onClose={onClose}>
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
    </div></PhoneSheet>
  );
}

export function TradeUpPanel({ offers, yr, onAccept, onPass, onClose }) {
  return (<PhoneSheet onClose={onClose}>
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
    </div></PhoneSheet>
  );
}

// The phone rings while you're on the clock: a club behind you wants your pick. The best offer comes
// in as a call (logo, who they're after, what they'll give) with a few seconds to answer before
// they hang up and try someone else. The full list of offers stays below the clock.
export function IncomingCall({ offer, team, curPick, yr, onAccept, onMore, onDecline, secs = 20 }) {
  const drop = useRef(onDecline);
  drop.current = onDecline;
  useEffect(() => { const t = setTimeout(() => drop.current(), secs * 1000); return () => clearTimeout(t); }, [offer.id, secs]);
  // on the page itself (inside the board, its layers covered it), bottom right over the recent
  // picks, so it never hides the board you're picking from
  return createPortal(
    <div style={{ position: "fixed", right: MOBILE ? 8 : 18, left: MOBILE ? 8 : "auto", top: MOBILE ? 64 : "auto", bottom: MOBILE ? "auto" : 18, zIndex: 2400, fontFamily: C.f, color: C.tx, width: MOBILE ? "auto" : 380, borderRadius: 16, overflow: "hidden", background: "linear-gradient(160deg,#1e1b4b,#0b1120 70%)", border: "1px solid #a78bfa88", boxShadow: "0 20px 60px #000d, 0 0 0 1px #000", animation: "dd-in .3s ease-out" }}>
      <style>{"@keyframes dd-in{from{opacity:0;transform:translateY(-14px) scale(.97)}to{opacity:1;transform:none}} @keyframes callRing{0%{box-shadow:0 0 0 0 #a78bfa99}70%{box-shadow:0 0 0 16px #a78bfa00}100%{box-shadow:0 0 0 0 #a78bfa00}} @keyframes callBar{from{width:100%}to{width:0%}} @keyframes callShake{0%,100%{transform:rotate(0)}10%,30%{transform:rotate(-12deg)}20%,40%{transform:rotate(12deg)}50%{transform:rotate(0)}}"}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px 10px" }}>
        <div style={{ borderRadius: "50%", padding: 6, background: "#0b1120", animation: "callRing 1.4s infinite" }}><TeamLogo t={team} sz={46} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2, color: "#c4b5fd" }}><span style={{ display: "inline-block", animation: "callShake 1.2s infinite" }}>📞</span> {offer.faller ? <span style={{ color: "#fca5a5" }}>URGENT CALL · HE'S SLIDING</span> : "INCOMING CALL"}</div>
          <div style={{ fontSize: 17, fontWeight: 900, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{team.city} {team.name}</div>
          <div style={{ fontSize: 12.5, color: "#cbd5e1" }}>{offer.faller ? `"${offer.target.name} (${offer.target.pos}) was a top-${Math.max(5, Math.ceil(curPick.overall - offer.fell))} player on every board and he's still there. We'll overpay to jump you at #${curPick.overall}."` : `"We'd like to move up to #${curPick.overall}${offer.target ? ` for ${offer.target.name}` : ""}."`}</div>
        </div>
      </div>
      <div style={{ padding: "0 16px 12px" }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.3, color: C.mt, marginBottom: 4 }}>THEY OFFER</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{[offer.theirPick, ...offer.extras].map((a, i) => <span key={i} style={{ fontSize: 13, fontWeight: 800, padding: "3px 9px", borderRadius: 6, background: i ? "#1e293b" : "#14532d", color: i ? "#e2e8f0" : "#86efac" }}>{pickLabel(a, yr)}</span>)}</div>
        <div style={{ fontSize: 12, color: offer.pct >= 0 ? C.gn : C.gd, marginTop: 6 }}>Trade chart: {offer.pct >= 0 ? `+${offer.pct}% in your favor` : `${offer.pct}% (they're asking a discount)`}</div>
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          <Btn onClick={onAccept} bg={C.gn} style={{ flex: 1, fontSize: 14, padding: "8px 0", fontWeight: 900 }}>Accept</Btn>
          <Btn onClick={onMore} bg="#1e3a5f" c="#7dd3fc" style={{ flex: 1, fontSize: 14, padding: "8px 0" }}>Ask for more</Btn>
          <Btn onClick={onDecline} bg="#7f1d1d" c="#fecaca" style={{ fontSize: 14, padding: "8px 12px" }}>Hang up</Btn>
        </div>
      </div>
      <div style={{ height: 4, background: "#ffffff14" }}><div key={offer.id} style={{ height: "100%", background: "#a78bfa", animation: `callBar ${secs}s linear forwards` }} /></div>
    </div>,
    document.body
  );
}


// ---------- Phones: the draft room ----------
// One calm card for who's on the clock (sticky while you work the board), one line for what just
// happened, and everything else (trades, the draft log) a tap away in a sheet.
const soft = { background: "#ffffff0f", borderRadius: 18 };
const pillBtn = (on) => ({ flex: 1, minHeight: 46, borderRadius: 14, border: 0, background: on ? "#ffffff2b" : "#ffffff12", color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 });

export function PhoneClock({ pick, team, mine, paused, onPause, timer, nextMine, wage, needs = [] }) {
  const clock = `${Math.floor(timer / 60)}:${String(timer % 60).padStart(2, "0")}`;
  const sub = mine ? `Rookie wage $${wage}M/yr${needs.length ? ` · Need ${needs.slice(0, 3).join(", ")}` : ""}` : nextMine ? `Your pick #${nextMine.overall} · ${nextMine.overall - pick.overall} away` : "Your picks are done";
  return (
    <div className="keep-dark" style={{ position: "sticky", top: "calc(56px + env(safe-area-inset-top))", zIndex: 20, borderRadius: 20, overflow: "hidden", margin: "0 0 10px", background: `radial-gradient(120% 140% at 0% 0%, ${team.clr}, #0b1120 72%)`, boxShadow: mine ? `0 0 0 2px ${C.gn}, 0 10px 24px #000a` : "0 10px 24px #000a" }}>
      <span aria-hidden="true" style={{ position: "absolute", right: -18, top: -22, opacity: 0.08, pointerEvents: "none", transform: "rotate(-8deg)", filter: "grayscale(1) brightness(4)" }}><TeamLogo t={team} sz={120} /></span>
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12, padding: "12px 12px 12px 14px" }}>
        <TeamLogo t={team} sz={42} glow />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.4, color: mine ? "#86efac" : "#ffffffb3" }}>{paused ? "PAUSED" : mine ? "YOU'RE ON THE CLOCK" : "ON THE CLOCK"} · RD {pick.rd} · #{pick.overall}</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.2 }}>{mine ? "Your pick" : `${team.city} ${team.name}`}</div>
          <div style={{ fontSize: 13, color: "#ffffffcc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>
        </div>
        <div style={{ fontSize: 24, fontWeight: 900, color: paused ? "#94a3b8" : timer <= 10 ? C.rd : "#fff", fontVariantNumeric: "tabular-nums" }}>{clock}</div>
        {onPause && <button onClick={onPause} aria-label={paused ? "Resume the draft" : "Pause the draft"} style={{ width: 44, height: 44, borderRadius: 22, border: 0, flexShrink: 0, background: paused ? C.gn : "#ffffff22", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon k={paused ? "resume" : "pause"} size={20} w={2.6} /></button>}
      </div>
    </div>
  );
}

// The last pick in, one line; tap for the whole log and who's up next.
export function PhoneLastPick({ last, ui, onOpen }) {
  const p = last?.player;
  return (
    <button onClick={onOpen} style={{ ...soft, width: "100%", display: "flex", alignItems: "center", gap: 10, minHeight: 52, padding: "0 14px", border: 0, color: "#fff", cursor: "pointer", textAlign: "left", marginBottom: 10 }}>
      <Icon k="list" size={20} color="#94a3b8" />
      {p ? <span style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 7, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden" }}>
        <span style={{ color: "#94a3b8", fontVariantNumeric: "tabular-nums" }}>#{last.overall}</span><b style={{ color: last.owner === ui ? C.gn : "#93c5fd" }}>{last.ab}</b><span style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span><Bdg pos={posTag(p)} /><ValueTag overall={last.overall} csr={last.csr} small />
      </span> : <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: "#cbd5e1" }}>Draft order</span>}
      <span style={{ fontSize: 20, color: "#64748b" }}>›</span>
    </button>
  );
}

// The log: who's up next and every pick so far.
export function PhoneDraftLog({ log, queue, ui, onPlayer, onClose }) {
  const [v, setV] = React.useState("next");
  const line = (key, l, r, me, onClick) => <div key={key} onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 48, borderTop: "1px solid #ffffff10", cursor: onClick ? "pointer" : "default", color: me ? C.gn : "#e2e8f0" }}>{l}<span style={{ flex: 1 }} />{r}</div>;
  return (
    <Sheet title="Draft room" onClose={onClose}>
      <Segments items={[["next", "Up next"], ["log", `Picks made${log.length ? ` ${log.length}` : ""}`]]} value={v} onChange={setV} />
      <div style={{ ...soft, padding: "0 14px" }}>
        {v === "next" && queue.map((q, i) => line(q.overall, <><span style={{ width: 40, color: "#94a3b8", fontVariantNumeric: "tabular-nums" }}>#{q.overall}</span>{q.team && <TeamLogo t={q.team} sz={26} />}<b style={{ fontSize: 15 }}>{q.mine ? "You" : `${q.team?.city || ""} ${q.team?.name || q.ab}`}</b></>, i === 0 ? <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1, color: C.gd }}>ON THE CLOCK</span> : <span style={{ fontSize: 13, color: "#94a3b8" }}>Rd {q.rd}</span>, q.mine))}
        {v === "log" && log.slice().reverse().map((d) => line(d.overall, <><span style={{ width: 40, color: "#94a3b8", fontVariantNumeric: "tabular-nums" }}>#{d.overall}</span><b style={{ width: 40 }}>{d.ab}</b><span style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 150 }}>{d.player?.name}</span></>, <span style={{ display: "flex", gap: 6, alignItems: "center" }}><ValueTag overall={d.overall} csr={d.csr} small />{d.player && <Bdg pos={posTag(d.player)} />}</span>, d.owner === ui, d.player ? () => onPlayer(d.player) : null))}
        {v === "log" && !log.length && <div style={{ padding: "16px 0", color: "#94a3b8", fontSize: 15 }}>No picks yet.</div>}
      </div>
      <div style={{ height: 10 }} />
    </Sheet>
  );
}

const PickChips = ({ picks, yr, tone }) => <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{picks.map((a, i) => <span key={i} style={{ fontSize: 13, fontWeight: 800, padding: "4px 10px", borderRadius: 999, background: i ? "#ffffff14" : tone === "get" ? "#14532d" : "#7f1d1d", color: i ? "#e2e8f0" : tone === "get" ? "#86efac" : "#fca5a5" }}>{pickLabel(a, yr)}</span>)}</div>;
const Label = ({ children }) => <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.3, color: "#94a3b8", margin: "14px 2px 8px" }}>{children}</div>;
const greenBtn = { flex: 1, minHeight: 46, borderRadius: 14, border: 0, background: C.gn, color: "#fff", fontSize: 15, fontWeight: 900, cursor: "pointer" };
const quietBtn = { minHeight: 46, borderRadius: 14, border: 0, background: "#ffffff14", color: "#e2e8f0", fontSize: 15, fontWeight: 800, cursor: "pointer", padding: "0 16px" };

// Moving up, in one sheet: the club on the clock's price for this pick, then everyone ahead of you
// willing to move down. The draft pauses while it's open.
export function PhoneTradeUp({ quote, team, offers, yr, onAccept, onPass, onClose }) {
  const o = quote?.offer;
  return (
    <Sheet title="Trade up" onClose={onClose}>
      <div style={{ fontSize: 14, color: "#94a3b8", margin: "0 2px 4px" }}>The draft is paused while you work the phones.</div>
      <Label>THIS PICK · {team.city.toUpperCase()} {team.name.toUpperCase()}</Label>
      <div style={{ ...soft, padding: 14 }}>
        {!o ? <div style={{ fontSize: 15, color: "#cbd5e1" }}>{FORPICK_NO[quote?.no || "none"](team.name)}</div> : <>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>#{o.theirPick.overall} now, up {o.up} spots, for</div>
          <PickChips picks={[o.myPick, ...o.extras]} yr={yr} />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}><button onClick={() => onAccept(o)} style={greenBtn}>Make the trade</button></div>
        </>}
      </div>
      {offers.length > 0 && <Label>CLUBS AHEAD OF YOU WILLING TO MOVE DOWN</Label>}
      {offers.map((x) => (
        <div key={x.id} style={{ ...soft, padding: 14, marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}><b style={{ fontSize: 16 }}>{x.from}</b><span style={{ marginLeft: "auto", fontSize: 14, color: "#86efac", fontWeight: 800 }}>#{x.theirPick.overall}</span></div>
          <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 6 }}>Up {x.up} spots. You give</div>
          <PickChips picks={[x.myPick, ...x.extras]} yr={yr} />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}><button onClick={() => onAccept(x)} style={greenBtn}>Make the trade</button><button onClick={() => onPass(x)} style={quietBtn}>Pass</button></div>
        </div>
      ))}
      {!offers.length && <div style={{ fontSize: 14, color: "#94a3b8", margin: "14px 2px" }}>Nobody else ahead of you will move down right now.</div>}
      <div style={{ height: 10 }} />
    </Sheet>
  );
}

// On the clock: clubs behind you who want your pick. One row on the page, the offers in a sheet.
export function PhoneTradeDown({ offers, teams, curPick, yr, onAccept, onMore, onDrop, onClose }) {
  return (
    <Sheet title={`Offers for #${curPick.overall}`} onClose={onClose}>
      {offers.map((o) => { const t = teams[o.team]; return (
        <div key={o.id} style={{ ...soft, padding: 14, marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}><TeamLogo t={t} sz={34} /><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 16, fontWeight: 800 }}>{t.city} {t.name}</div><div style={{ fontSize: 13, color: o.faller ? "#fca5a5" : "#94a3b8" }}>{o.target ? `After ${o.target.name} (${o.target.pos})` : `Moving up ${o.theirPick.overall - curPick.overall} spots`}{o.faller ? " · he's sliding" : ""}</div></div><span style={{ fontSize: 13, fontWeight: 800, color: o.pct >= 0 ? C.gn : C.gd }}>{o.pct >= 0 ? "+" : ""}{o.pct}%</span></div>
          <div style={{ fontSize: 13, color: "#94a3b8", margin: "10px 0 6px" }}>You get</div>
          <PickChips picks={[o.theirPick, ...o.extras]} yr={yr} tone="get" />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}><button onClick={() => onAccept(o)} style={greenBtn}>Accept</button><button onClick={() => onMore(o)} style={{ ...quietBtn, flex: 1 }}>Ask for more</button><button onClick={() => onDrop(o)} aria-label="Turn it down" style={quietBtn}>✕</button></div>
        </div>
      ); })}
      {!offers.length && <div style={{ fontSize: 15, color: "#94a3b8", padding: "8px 2px" }}>No offers right now.</div>}
      <div style={{ height: 10 }} />
    </Sheet>
  );
}

// The phone ringing, on a phone: a card docked above the bottom bar, out of the board's way.
export function PhoneCall({ offer, team, curPick, yr, onAccept, onMore, onDecline, secs = 20 }) {
  const drop = useRef(onDecline);
  drop.current = onDecline;
  useEffect(() => { const t = setTimeout(() => drop.current(), secs * 1000); return () => clearTimeout(t); }, [offer.id, secs]);
  return createPortal(
    <div className="keep-dark" style={{ position: "fixed", left: 10, right: 10, bottom: "calc(150px + env(safe-area-inset-bottom))", zIndex: 430, fontFamily: C.f, color: "#fff", borderRadius: 20, overflow: "hidden", background: "linear-gradient(160deg,#1e1b4b,#0b1120 75%)", boxShadow: "0 18px 48px #000d, 0 0 0 1px #a78bfa55", animation: "dd-in .3s ease-out" }}>
      <style>{"@keyframes dd-in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}} @keyframes callBar{from{width:100%}to{width:0%}}"}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 14px 0" }}>
        <TeamLogo t={team} sz={40} glow />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.6, color: offer.faller ? "#fca5a5" : "#c4b5fd" }}>{offer.faller ? "URGENT CALL · HE'S SLIDING" : "INCOMING CALL"}</div>
          <div style={{ fontSize: 16, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{team.city} {team.name}</div>
          <div style={{ fontSize: 13, color: "#cbd5e1", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Want #{curPick.overall}{offer.target ? ` for ${offer.target.name}` : ""}</div>
        </div>
      </div>
      <div style={{ padding: "10px 14px 14px" }}>
        <PickChips picks={[offer.theirPick, ...offer.extras]} yr={yr} tone="get" />
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}><button onClick={onAccept} style={greenBtn}>Accept</button><button onClick={onMore} style={{ ...quietBtn, flex: 1 }}>Ask for more</button><button onClick={onDecline} style={quietBtn}>Hang up</button></div>
      </div>
      <div style={{ height: 3, background: "#ffffff14" }}><div key={offer.id} style={{ height: "100%", background: "#a78bfa", animation: `callBar ${secs}s linear forwards` }} /></div>
    </div>,
    document.body
  );
}

export const PhoneDraftButtons = ({ items }) => <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>{items.filter(Boolean).map(([l, ic, on, fn]) => <button key={l} onClick={fn} style={pillBtn(on)}><Icon k={ic} size={18} />{l}</button>)}</div>;
