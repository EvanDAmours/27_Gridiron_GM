// This week's game plan: how your coaches would attack this opponent and defend him, graded for
// the matchup. Your coaches go with the best fit unless you pick something else for this game;
// a pick lasts one game (see gamePlan.js).
import React from "react";
import { C } from "./ui.jsx";
import { OFF_PLANS, DEF_PLANS, planOptions, bestPlan, defKey, planGrade } from "./gamePlan.js";
import { edgeWord } from "./scoutReport.js";
import { OFF_SETS, DEF_SETS } from "./personnel.js";

const GRADE_C = { A: "#22c55e", B: "#84cc16", C: "#eab308", D: "#f97316", F: "#ef4444" };

// units: { mine, theirs } (league.js matchupUnits). plan: your saved plan; planKey: this game's
// key (a pick for another week doesn't count). onPick(side, key): set one side for this game;
// onAuto(): back to your coaches' pick.
// The scouting report (scoutReport.js): how he lines up, what works against him, the matchups to
// go after. onPersonnel(field, key) sets your identity ("personnel") or defensive lean ("defPkg").
function Scout({ r, opp, onPersonnel }) {
  const lbl = (list, k) => list.find((x) => x.key === k)?.label || "Auto";
  const pk = r.opp.pk, P = (x) => Math.round(x * 100);
  const mixTxt = Object.entries(r.opp.mix).filter(([, w]) => w >= 0.05).sort((a, b) => b[1] - a[1]).map(([k, w]) => `${k}: ${P(w)}%`).join(" · ");
  const pickBtn = (field, key, label) => <button onClick={() => onPersonnel(field, key)} style={{ marginLeft: 6, background: `${C.gn}22`, border: `1px solid ${C.gn}88`, color: "#86efac", borderRadius: 6, padding: "1px 8px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>Use {label}</button>;
  return (
    <div style={{ marginTop: 10, background: C.bg, border: `1px solid ${C.bd}`, borderRadius: 10, padding: "9px 11px" }}>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.2, color: C.gd, marginBottom: 4 }}>🔎 SCOUTING REPORT · {opp.ab || opp.name}</div>
      <div style={{ fontSize: 12.5, color: "#cbd5e1", lineHeight: 1.45 }}>Offense: <b>{r.opp.set}</b> ({mixTxt}). Defense: base {P(pk.base)}% · nickel {P(pk.nickel)}% · dime {P(pk.dime)}%.</div>
      {r.notes.map((n, i) => <div key={i} style={{ fontSize: 12.5, lineHeight: 1.45, marginTop: 3, color: n.tone === "watch" ? "#fcd34d" : "#86efac" }}>{n.tone === "watch" ? "⚠️" : "🎯"} {n.text}</div>)}
      <div style={{ fontSize: 12.5, marginTop: 6, color: "#e2e8f0", lineHeight: 1.6 }}>
        <div>Best offense vs them: <b>{r.bestOff.icon} {r.bestOff.label}</b>{r.bestOff.key === r.curOff ? <span style={{ color: C.gn }}> (yours)</span> : <span style={{ color: C.mt }}>, {edgeWord(r.offGap)} over your {lbl(OFF_SETS, r.curOff)}</span>}{onPersonnel && r.bestOff.key !== r.curOff && r.offGap >= 0.03 && pickBtn("personnel", r.bestOff.key, r.bestOff.label)}</div>
        <div>Best defensive lean: <b>{r.bestDef.icon} {r.bestDef.label}</b>{r.curDef === r.bestDef.key ? <span style={{ color: C.gn }}> (yours)</span> : r.curDef ? <span style={{ color: C.mt }}>, {edgeWord(r.defGap)} over your {lbl(DEF_SETS, r.curDef)}</span> : <span style={{ color: C.mt }}> (yours is on auto)</span>}{onPersonnel && r.curDef !== r.bestDef.key && (r.defGap >= 0.03 || !r.curDef) && pickBtn("defPkg", r.bestDef.key, r.bestDef.label)}</div>
        <div style={{ fontSize: 11.5, color: C.mt }}>Your identity and lean stay set until you change them (Depth Chart, Personnel).</div>
      </div>
    </div>
  );
}

export default function GamePlanCard({ opp, units, plan, planKey, onPick, onAuto, onTwoPoint, mobile, last, report, onPersonnel, defaultOpen = false, onHub }) {
  const [open, setOpen] = React.useState(defaultOpen);
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
        {(() => { const lbl = (list, k) => list.find((x) => x.key === k); const o = lbl(OFF_PLANS, cur.off), d = lbl(DEF_PLANS, cur.def); return !open && <span style={{ fontSize: 13, fontWeight: 800 }}>{o?.icon} {o?.label} <b style={{ color: GRADE_C[planGrade(opts.off[cur.off].v)] }}>{planGrade(opts.off[cur.off].v)}</b> · {d?.icon} {d?.label} <b style={{ color: GRADE_C[planGrade(opts.def[cur.def].v)] }}>{planGrade(opts.def[cur.def].v)}</b></span>; })()}
        {onHub && <button onClick={onHub} title="Everything for this game on one screen" style={{ marginLeft: "auto", background: `${C.gd}22`, border: `1px solid ${C.gd}88`, color: "#fde68a", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 800, padding: "3px 9px" }}>📋 Week prep</button>}
        <button onClick={() => setOpen(!open)} style={{ marginLeft: onHub ? 0 : "auto", background: "transparent", border: `1px solid ${C.bd}`, color: "#93c5fd", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 800, padding: "3px 10px" }}>{open ? "Done ▴" : "Change ▾"}</button>
        {set && open && <button onClick={onAuto} style={{ marginLeft: "auto", background: "none", border: "none", color: "#93c5fd", textDecoration: "underline", cursor: "pointer", fontSize: 12, padding: 0 }}>Use the coaches' pick</button>}
      </div>
      {!open && report?.notes?.[0] && <div style={{ fontSize: 12.5, marginTop: 6, color: report.notes[0].tone === "watch" ? "#fcd34d" : "#86efac", lineHeight: 1.4 }}>🔎 {report.notes[0].text}</div>}
      {open && report && <Scout r={report} opp={opp} onPersonnel={onPersonnel} />}
      {open && <Row side="off" list={OFF_PLANS} />}
      {open && <Row side="def" list={DEF_PLANS} />}
      {open && last?.snaps > 0 && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 8, lineHeight: 1.45 }}>Last game vs {last.opp}: your defense blitzed on <b style={{ color: "#e2e8f0" }}>{Math.round((last.blitz / last.snaps) * 100)}%</b> of snaps, loaded the box on <b style={{ color: "#e2e8f0" }}>{Math.round((last.box / last.snaps) * 100)}%</b> and dropped into coverage on <b style={{ color: "#e2e8f0" }}>{Math.round((last.cover / last.snaps) * 100)}%</b>. Your plan, your coordinator's scheme and his specialty all move these.{(() => { const pct = (o) => { const t = Object.values(o || {}).reduce((x, y) => x + y, 0); return t ? Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${Math.round((v / t) * 100)}%`).join(" · ") : ""; }; const pe = pct(last.pers), pk = pct(last.pkg); return pe || pk ? <span style={{ display: "block", marginTop: 3 }}>{pe && <>Your personnel: <b style={{ color: "#e2e8f0" }}>{pe}</b>. </>}{pk && <>Your defense: <b style={{ color: "#e2e8f0" }}>{pk}</b>.</>}</span> : null; })()}</div>}
      {open && onTwoPoint && <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 12, color: C.mt, cursor: "pointer" }}><input type="checkbox" checked={!!plan?.twoPoint} onChange={onTwoPoint} /> Go for two after touchdowns</label>}
    </div>
  );
}
