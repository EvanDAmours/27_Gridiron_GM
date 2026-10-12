// Schemes and playbook: your coordinators' offensive and defensive schemes (with how well each
// one fits the roster you have), the three core plays you lean on, and coaching specializations.
// The same panel sits on the depth chart and on the coaching screen.
import React from "react";
import { C } from "./ui.jsx";

export const SCHEME_INFO = {
  "Air Raid": "Spread the field and throw it: about 28% runs. Built for a quarterback rated 71+.",
  "West Coast": "Short, timed passes and a balanced run game: about 42% runs. Fits a quarterback rated 66+.",
  Spread: "Space and tempo with a mobile quarterback: about 35% runs. Fits a QB with 71+ speed.",
  "Power Run": "Downhill football: about 60% runs. Built around a running back rated 71+.",
  "3-4": "Three down linemen and four linebackers. Built around a linebacker rated 71+.",
  "4-3": "Four down linemen and three linebackers. Built around a defensive lineman rated 71+.",
  "Cover 2": "Two deep safeties and zone underneath. Doesn't need a specific star.",
  "Zone Blitz": "Pressure from anywhere with zone behind it. Fits a linebacker rated 66+.",
};
const TYPE_C = { run: "#22c55e", pass: "#38bdf8", hybrid: "#a78bfa" };
const SPECS = [{ role: "oc", lbl: "Offensive coordinator", specs: ["Run Game", "Play-Action", "Spread"], clr: "#22c55e" }, { role: "dc", lbl: "Defensive coordinator", specs: ["Blitz Pkg", "Zone Cov", "Press", "Run Stop"], clr: "#ef4444" }, { role: "st", lbl: "Special teams", specs: ["Kick Return", "Coverage", "Block FG"], clr: "#f59e0b" }];

const card = { background: C.cd, border: `1px solid ${C.bd}`, borderRadius: 12, padding: "12px 14px" };
const head = { fontSize: 12, fontWeight: 900, letterSpacing: 1.4, color: C.gd, marginBottom: 8 };

// team: your team; fit(team, role): the fit bonus (0-2) for its current schemes; schemes: { oc: [...], dc: [...] }
export default function GamePlan({ team, sp, fit, schemes, onScheme, playbook, setPlaybook, plays, coachSpec = {}, onSpecialize, compact }) {
  const coach = team.coach || {};
  const trans = team._schemeTransWks || 0;
  const SchemeCard = ({ role, title }) => {
    const c = coach[role];
    const with_ = (s) => fit({ ...team, coach: { ...coach, [role]: { ...c, scheme: s } } }, role);
    return (
      <div style={card}>
        <div style={head}>{title}</div>
        {!c ? <div style={{ color: C.mt, fontSize: 14 }}>No coordinator. Hire one on the coaching screen to run a scheme.</div> : <>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 22, fontWeight: 900 }}>{c.scheme}</span>
            <span style={{ fontSize: 13, color: C.mt }}>run by {c.name}</span>
            <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 800, color: fit(team, role) > 0 ? C.gn : C.mt }}>{fit(team, role) > 0 ? `Fits your roster · +${fit(team, role)}` : "No roster fit bonus"}</span>
          </div>
          <div style={{ fontSize: 13, color: "#94a3b8", margin: "4px 0 10px", lineHeight: 1.45 }}>{SCHEME_INFO[c.scheme]}</div>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.mt, marginBottom: 6 }}>SWITCH SCHEMES · 2 SP · plays about 2 pts/game worse for 2 games while it's installed</div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill,minmax(${compact ? 140 : 170}px,1fr))`, gap: 6 }}>
            {schemes[role].filter((s) => s !== c.scheme).map((s) => {
              const f = with_(s), ok = sp >= 2;
              return (
                <button key={s} onClick={() => ok && onScheme(role, s)} disabled={!ok} title={SCHEME_INFO[s]} style={{ textAlign: "left", background: C.bg, border: `1px solid ${f > 0 ? "#22c55e66" : C.bd}`, borderRadius: 8, padding: "8px 10px", color: C.tx, cursor: ok ? "pointer" : "not-allowed", opacity: ok ? 1 : 0.55 }}>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{s}</div>
                  <div style={{ fontSize: 12, color: f > 0 ? C.gn : C.mt, fontWeight: 700 }}>{f > 0 ? `Would fit · +${f}` : "No fit bonus"}</div>
                </button>
              );
            })}
          </div>
        </>}
      </div>
    );
  };
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {trans > 0 && <div style={{ ...card, borderColor: "#f8717166", color: "#fca5a5", fontSize: 14, fontWeight: 700 }}>⚠️ A new scheme is still being installed: {trans} game{trans > 1 ? "s" : ""} to go.</div>}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit,minmax(${compact ? 280 : 360}px,1fr))`, gap: 10 }}>
        <SchemeCard role="oc" title="OFFENSIVE SCHEME" />
        <SchemeCard role="dc" title="DEFENSIVE SCHEME" />
      </div>
      <div style={card}>
        <div style={{ ...head, display: "flex" }}>CORE PLAYS <span style={{ marginLeft: "auto", color: C.mt, letterSpacing: 0 }}>{playbook.length}/3 picked</span></div>
        <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 10 }}>Pick three plays to build the game plan around. They get a boost when the situation calls for them.</div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill,minmax(${compact ? 150 : 190}px,1fr))`, gap: 6 }}>
          {plays.map((pl) => {
            const on = playbook.some((x) => x.id === pl.id), full = !on && playbook.length >= 3;
            return (
              <button key={pl.id} onClick={() => !full && setPlaybook((pb) => (on ? pb.filter((x) => x.id !== pl.id) : [...pb, pl]))} title={full ? "Three plays already picked: remove one first" : pl.desc} style={{ textAlign: "left", background: on ? `${TYPE_C[pl.type]}1f` : C.bg, border: `1px solid ${on ? TYPE_C[pl.type] : C.bd}`, borderRadius: 8, padding: "8px 10px", color: C.tx, cursor: full ? "not-allowed" : "pointer", opacity: full ? 0.5 : 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 800 }}>{on ? "✓ " : ""}{pl.name}</span>
                  <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 900, color: TYPE_C[pl.type], textTransform: "uppercase" }}>{pl.type}</span>
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{pl.desc}</div>
              </button>
            );
          })}
        </div>
      </div>
      {onSpecialize && (
        <div style={card}>
          <div style={head}>COACHING SPECIALIZATION · 5 SP each · +3 to that coach's rating</div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit,minmax(${compact ? 240 : 260}px,1fr))`, gap: 8 }}>
            {SPECS.map(({ role, lbl, specs, clr }) => {
              const c = coach[role]; if (!c) return null;
              const cur = coachSpec[role];
              return (
                <div key={role} style={{ background: C.bg, border: `1px solid ${clr}44`, borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: clr }}>{lbl}: {c.name}</div>
                  {cur && <div style={{ fontSize: 12, color: C.mt, marginTop: 2 }}>Specialized in {cur}</div>}
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
                    {specs.map((s) => { const ok = sp >= 5 && cur !== s; return <button key={s} onClick={() => ok && onSpecialize(role, s)} disabled={!ok} style={{ background: cur === s ? `${clr}33` : "transparent", color: cur === s ? clr : ok ? "#cbd5e1" : C.mt, border: `1px solid ${cur === s ? clr : C.bd}`, borderRadius: 6, padding: "5px 9px", fontSize: 13, fontWeight: 700, cursor: ok ? "pointer" : "default" }}>{s}</button>; })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
