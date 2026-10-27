// Draft day, Package A: your scouts' five for your pick (draftScouts.js), one calm row each.
// Current overall beside his ceiling, where the board has him, whether he'll last to your next
// pick, how many of your scouts are behind him and why. Beside it: what the scouts weighed.
import React from "react";
import { Face, oC, card, cardTitle, actBtn } from "./ui.jsx";
import { MOBILE } from "./mobile.js";
import { csRank, potGrade, DEV_TRAITS } from "./scouting.js";
import { ovrText } from "./draftScouts.js";
import { posTag } from "./dline.js";

const TONE = { g: "#86efac", y: "#fde68a", dim: "#94a3b8" };
const KIND = { workup: "WORKUP", report: "REPORT", estimate: "ESTIMATE" };
const DEV_C = { generational: "#f472b6", superstar: "#f5c542", star: "#60a5fa", late: "#c4b5fd" };
const pct = (v) => `${Math.round(v * 100)}%`;
const laterTone = (v) => (v >= 0.65 ? "#94a3b8" : v <= 0.2 ? "#fca5a5" : "#fde68a");

function Col({ top, sub, color, w = 92 }) {
  return (
    <span style={{ width: w, textAlign: "center", flexShrink: 0 }}>
      <b style={{ display: "block", fontSize: 21, fontWeight: 900, lineHeight: 1.1, color: color || "#fff", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{top}</b>
      <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.9, color: "#64748b", whiteSpace: "nowrap" }}>{sub}</span>
    </span>
  );
}
const Votes = ({ x, n }) => (
  <span title={x.votes.map((s) => s.name).join(", ") || "No votes"} style={{ width: 70, textAlign: "center", flexShrink: 0 }}>
    <span style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 3 }}>{Array.from({ length: n }, (_, i) => <i key={i} style={{ width: 9, height: 9, borderRadius: 5, background: i < x.votes.length ? "#86efac" : "#ffffff1a" }} />)}</span>
    <span style={{ fontSize: 12, color: "#64748b" }}>{x.votes.length} of {n}</span>
  </span>
);

export function ScoutsPicks({ room, g, onDraft, canDraft }) {
  if (!room) return null;
  const { five, next, scouts } = room;
  const open = (p) => g.setSel?.(p);
  const why = (x) => <><b style={{ color: TONE[x.why.lead[0][1]], fontWeight: 800 }}>{x.why.lead[0][0]}.</b> {x.why.rest ? `${x.why.rest[0].toUpperCase()}${x.why.rest.slice(1)}.` : ""}{x.why.wait ? <span style={{ color: "#94a3b8" }}> Can wait.</span> : null}</>;
  const dev = (x) => (x.r.dev && DEV_C[x.r.dev] ? <span style={{ color: DEV_C[x.r.dev] }}>{DEV_TRAITS[x.r.dev]?.name}</span> : null);
  if (MOBILE) return (
    <div style={{ background: "#ffffff0f", borderRadius: 18, padding: "0 14px" }}>
      {five.map((x, i) => (
        <div key={x.p.id} style={{ padding: "12px 0", borderTop: i ? "1px solid #ffffff10" : 0 }}>
          <div onClick={() => open(x.p)} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
            <Face s={x.p.face} sz={42} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 16, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.p.name}</span>
              <span style={{ display: "block", fontSize: 13, color: "#94a3b8" }}>{posTag(x.p)} · {x.p.bio?.college} · #{csRank(x.p)}</span>
            </span>
            <span style={{ textAlign: "right" }}><b style={{ display: "block", fontSize: 18, color: x.cur.kind === "estimate" ? "#e2e8f0" : oC(x.cur.v) }}>{ovrText(x.cur)}</b><span style={{ fontSize: 11, fontWeight: 900, color: "#64748b" }}>CURRENT</span></span>
            <span style={{ textAlign: "right", width: 40 }}><b style={{ display: "block", fontSize: 18 }}>{potGrade(x.ceil)}</b><span style={{ fontSize: 11, fontWeight: 900, color: "#64748b" }}>CEIL.</span></span>
          </div>
          <div style={{ fontSize: 14, color: "#cbd5e1", lineHeight: 1.45, margin: "8px 0" }}>{why(x)}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#94a3b8" }}>
            <span>{x.votes.length} of {scouts.length} scouts</span>
            {next && <span style={{ color: laterTone(x.later) }}>There at #{next.overall}: {pct(x.later)}</span>}
            {canDraft && <button onClick={() => onDraft(x.p)} style={{ ...actBtn("#22c55e", true), marginLeft: "auto", minHeight: 40 }}>Draft</button>}
          </div>
        </div>
      ))}
    </div>
  );
  return (
    <div style={{ ...card, padding: "10px 12px 8px" }}>
      <div style={{ display: "flex", gap: 14, padding: "4px 10px 6px 64px", fontSize: 11, fontWeight: 900, letterSpacing: 0.9, color: "#64748b" }}>
        <span style={{ flex: 1 }}>YOUR SCOUTS' FIVE</span>
        <span style={{ width: 92, textAlign: "center" }}>CURRENT OVR</span><span style={{ width: 70, textAlign: "center" }}>CEILING</span><span style={{ width: 70, textAlign: "center" }}>BOARD</span>
        {next && <span style={{ width: 82, textAlign: "center" }}>AT #{next.overall}</span>}<span style={{ width: 70, textAlign: "center" }}>SCOUTS</span><span style={{ width: 76 }} />
      </div>
      {five.map((x, i) => (
        <div key={x.p.id} className="calm-row" onClick={() => open(x.p)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 10px", cursor: "pointer", background: i === 0 ? "#ffffff08" : undefined }}>
          <span style={{ width: 18, textAlign: "right", fontSize: 16, fontWeight: 900, color: "#64748b" }}>{i + 1}</span>
          <Face s={x.p.face} sz={40} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 17, fontWeight: 800, color: "#f8fafc" }}>{x.p.name} <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>{posTag(x.p)} · {x.p.bio?.college}</span></span>
            <span style={{ display: "block", fontSize: 13.5, color: "#cbd5e1", marginTop: 3, lineHeight: 1.4 }}>{why(x)}</span>
          </span>
          <Col top={ovrText(x.cur)} sub={KIND[x.cur.kind]} color={x.cur.kind === "estimate" ? "#e2e8f0" : oC(x.cur.v)} />
          <Col w={70} top={potGrade(x.ceil)} sub={dev(x) || (x.r.potV != null ? "YOUR READ" : "CONSENSUS")} />
          <Col w={70} top={`#${csRank(x.p)}`} sub="RANK" />
          {next && <Col w={82} top={pct(x.later)} sub={x.later >= 0.65 ? "CAN WAIT" : x.later <= 0.2 ? "TAKE NOW" : "COIN FLIP"} color={laterTone(x.later)} />}
          <Votes x={x} n={Math.max(1, scouts.length)} />
          <span style={{ width: 76, textAlign: "right" }} onClick={(e) => e.stopPropagation()}>{canDraft ? <button onClick={() => onDraft(x.p)} style={{ ...actBtn("#22c55e", true), padding: "8px 18px" }}>Draft</button> : null}</span>
        </div>
      ))}
      {!five.length && <div style={{ fontSize: 15, color: "#94a3b8", padding: 12 }}>Nobody left your scouts would take here.</div>}
    </div>
  );
}

// What went into the five: the club's needs, who's getting old, the money and the window.
export function ScoutsWeighed({ room }) {
  if (!room) return null;
  const { ctx, next } = room;
  const old = ctx.aging[0];
  const line = (k, v, c) => <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 14, padding: "7px 0", borderTop: "1px solid #ffffff0a" }}><span style={{ color: "#94a3b8" }}>{k}</span><b style={{ color: c || "#fff", textAlign: "right" }}>{v}</b></div>;
  const win = { win: "Win now", middle: "In the middle", rebuild: "Rebuilding" }[ctx.window];
  return (
    <div style={{ ...card, marginBottom: 12 }}>
      <div style={{ ...cardTitle, marginBottom: 6 }}>What the scouts weighed</div>
      {line("Biggest needs", ctx.needs.join(" · ") || "None")}
      {line("Getting old", old ? `${old.p.name}, ${old.p.age}` : "Nobody yet")}
      {ctx.capRoom != null && line("Cap room", `$${ctx.capRoom.toFixed(1)}M`, ctx.capRoom < 25 ? "#fca5a5" : "#86efac")}
      {line("Window", `${win} (${ctx.record})`)}
      <div style={{ fontSize: 13.5, color: "#94a3b8", lineHeight: 1.45, marginTop: 8 }}>
        {ctx.ready >= 0.4 ? "Today's rating counts for a lot here: they want players who help this season." : ctx.ready <= 0.2 ? "They're looking past this season: ceiling first." : "A balance of who helps now and who gets better."}
        {next ? ` "At #${next.overall}" is how often he's still there for your next pick when the other clubs pick the way they see him.` : ""}
      </div>
    </div>
  );
}
