// This week's game plan: how your coaches would attack this opponent and defend him, graded for
// the matchup. Your coaches go with the best fit unless you pick something else for this game;
// a pick lasts one game (see gamePlan.js).
import React from "react";
import { C } from "./ui.jsx";
import { OFF_PLANS, DEF_PLANS, planOptions, bestPlan, defKey, planGrade } from "./gamePlan.js";

const GRADE_C = { A: "#22c55e", B: "#84cc16", C: "#eab308", D: "#f97316", F: "#ef4444" };

// units: { mine, theirs } (league.js matchupUnits). plan: your saved plan; planKey: this game's
// key (a pick for another week doesn't count). onPick(side, key): set one side for this game;
// onAuto(): back to your coaches' pick.
export default function GamePlanCard({ opp, units, plan, planKey, onPick, onAuto, onTwoPoint, mobile, last }) {
  if (!units || !opp) return null;
  const opts = planOptions(units.mine, units.theirs);
  const best = bestPlan(units.mine, units.theirs);
  const set = plan && !plan.auto && plan.wk === planKey;
  const cur = { off: set ? plan.off : best.off, def: set ? defKey(plan.def) : best.def };
  const Row = ({ side, list }) => {
    const o = opts[side], pickd = o[cur[side]];
    return (
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.2, color: C.mt, marginBottom: 4 }}>{side === "off" ? "OFFENSE" : "DEFENSE"}</div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${list.length}, 1fr)`, gap: 6 }}>
          {list.map(({ key, label, icon }) => {
            const g = planGrade(o[key].v), on = cur[side] === key, rec = best[side] === key;
            return (
              <button key={key} onClick={() => onPick(side, key)} aria-pressed={on} title={o[key].why} style={{ background: on ? `${C.gn}22` : C.bg, border: `1px solid ${on ? C.gn : C.bd}`, borderRadius: 10, padding: mobile ? "8px 4px" : "8px 6px", cursor: "pointer", color: C.tx, textAlign: "center", minHeight: 52 }}>
                <div style={{ fontSize: mobile ? 12 : 13, fontWeight: 800, lineHeight: 1.2 }}>{icon} {label}</div>
                <div style={{ fontSize: 12, marginTop: 3 }}><b style={{ color: GRADE_C[g] }}>{g}</b>{rec && <span style={{ color: C.gd, fontWeight: 800 }}> · best</span>}</div>
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, lineHeight: 1.4 }}>{pickd.why}</div>
      </div>
    );
  };
  return (
    <div style={{ background: C.cd, border: `1px solid ${C.bd}`, borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.4, color: C.gd }}>🎯 GAME PLAN vs {opp.ab || opp.name}</span>
        <span style={{ fontSize: 12, color: set ? "#fde68a" : C.mt }}>{set ? "your call for this game" : "your coaches' pick (best fit)"}</span>
        {set && <button onClick={onAuto} style={{ marginLeft: "auto", background: "none", border: "none", color: "#93c5fd", textDecoration: "underline", cursor: "pointer", fontSize: 12, padding: 0 }}>Use the coaches' pick</button>}
      </div>
      <Row side="off" list={OFF_PLANS} />
      <Row side="def" list={DEF_PLANS} />
      {last?.snaps > 0 && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 8, lineHeight: 1.45 }}>Last game vs {last.opp}: your defense blitzed on <b style={{ color: "#e2e8f0" }}>{Math.round((last.blitz / last.snaps) * 100)}%</b> of snaps, loaded the box on <b style={{ color: "#e2e8f0" }}>{Math.round((last.box / last.snaps) * 100)}%</b> and dropped into coverage on <b style={{ color: "#e2e8f0" }}>{Math.round((last.cover / last.snaps) * 100)}%</b>. Your plan, your coordinator's scheme and his specialty all move these.</div>}
      {onTwoPoint && <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 12, color: C.mt, cursor: "pointer" }}><input type="checkbox" checked={!!plan?.twoPoint} onChange={onTwoPoint} /> Go for two after touchdowns</label>}
    </div>
  );
}
