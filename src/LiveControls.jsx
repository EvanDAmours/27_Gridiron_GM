// The live game's controls on a computer screen: the game settings as segmented switches
// (every choice visible, the one that's on lit up, so "Off" never looks like a disabled button),
// and the actions (pause, skip ahead, finish) as one matched set of buttons.
import React from "react";
import { C } from "./ui.jsx";

// label: the setting's name; options: [[value, text, title?]]; tone: the lit option's color
export function Seg({ label, options, value, onChange, tone = "#60a5fa", title }) {
  return (
    <div title={title} style={{ display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
      {label && <span style={{ fontSize: 9.5, fontWeight: 900, letterSpacing: 1.2, color: C.mt, textTransform: "uppercase", whiteSpace: "nowrap" }}>{label}</span>}
      <span style={{ display: "inline-flex", background: "#0b1220", border: `1px solid ${C.bd}`, borderRadius: 8, padding: 2, gap: 2 }}>
        {options.map(([v, text, tip]) => {
          const on = v === value;
          return (
            <button key={String(v)} type="button" title={tip} onClick={() => !on && onChange(v)} aria-pressed={on}
              style={{ border: 0, borderRadius: 5, padding: "5px 12px", fontSize: 12.5, fontWeight: 800, cursor: on ? "default" : "pointer", whiteSpace: "nowrap", background: on ? `${tone}2e` : "transparent", color: on ? tone : "#94a3b8", boxShadow: on ? `inset 0 0 0 1px ${tone}66` : "none" }}>
              {text}
            </button>
          );
        })}
      </span>
    </div>
  );
}

// kind: "go" (resume: green), "stop" (pause: orange) or plain
export function Act({ children, onClick, kind, title, wide, big }) {
  const bg = kind === "go" ? "#16a34a" : kind === "stop" ? "#ea580c" : C.cd;
  return (
    <button type="button" onClick={onClick} title={title}
      style={{ height: big ? 48 : 36, minWidth: wide ? (big ? 190 : 108) : 0, padding: big ? "0 20px" : "0 14px", borderRadius: big ? 12 : 9, boxShadow: kind && big ? "0 6px 18px #0007" : "none", border: `1px solid ${kind ? "transparent" : C.bd}`, background: bg, color: "#fff", fontSize: big ? (wide ? 17 : 15) : 13, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
      {children}
    </button>
  );
}

// The game settings, each with a line saying what the current choice does.
const WHY = {
  call: { false: "Your coaches call every play.", true: "You call each play when you have the ball, and pick the receiver on passes." },
  live: { Key: "Third and fourth downs, goal to go, a close finish and big plays play out on the field.", All: "Every run and pass plays out on the field.", Off: "Results only: the field just resets between plays." },
};
function Setting({ icon, title, why, children }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12.5, fontWeight: 900, color: "#e2e8f0", whiteSpace: "nowrap" }}>{icon} {title}</span>
        {children}
      </div>
      <div style={{ fontSize: 11.5, color: "#94a3b8", lineHeight: 1.35, marginTop: 4, minHeight: 31 }}>{why}</div>
    </div>
  );
}
export function LiveSettings({ callMode, onCall, livePlays, onLivePlays, speed, speeds, onSpeed }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "10px 16px", padding: "2px 2px 8px" }}>
      <Setting icon="🎮" title="Play calling" why={WHY.call[callMode]}>
        <Seg value={callMode} onChange={onCall} tone="#4ade80" options={[[false, "Coaches"], [true, "Me"]]} />
      </Setting>
      <Setting icon="🎬" title="Live plays" why={WHY.live[livePlays]}>
        <Seg value={livePlays} onChange={onLivePlays} tone="#facc15" options={[["Key", "Key"], ["All", "Every"], ["Off", "Off"]]} />
      </Setting>
      <Setting icon="⏱" title="Speed" why="How long the game waits between plays.">
        <Seg value={speed} onChange={onSpeed} options={speeds.map((k) => [k, k])} />
      </Setting>
    </div>
  );
}
