// Personnel: your offense's identity (how often it plays 11, 12, 21, 13 and 10 personnel) and
// your defense's lean (base or nickel), each option shown with what it does for your roster:
// the passing and running ratings it adds up to, who it puts on the field, and how much your
// SAM and nickel back play. Sits in the game plan strip under the depth chart.
import React from "react";
import { C, oC } from "./ui.jsx";
import { OFF_SETS, DEF_SETS, PERS, SITUATIONS, pkgShare, defTilt } from "./personnel.js";
import { unitRatings, offUnits, defUnits, pickFB, teBlock } from "./gamesim.js";
import { roleOvr } from "./roles.js";
import { depthOrderFor } from "./depth.js";
import { teamPersonnel } from "./playsim.js";

const card = { background: C.cd, border: `1px solid ${C.bd}`, borderRadius: 12, padding: "12px 14px" };
const head = { fontSize: 12, fontWeight: 900, letterSpacing: 1.4, color: C.gd, marginBottom: 6 };
const PCLR = { 10: "#38bdf8", 11: "#60a5fa", 12: "#a78bfa", 13: "#f472b6", 21: "#f59e0b" };
const last = (n) => String(n || "").split(" ").slice(-1)[0];
const r0 = (v) => (Math.round(v * 10) / 10).toFixed(1); // identities differ by fractions of a point

// team: your club; depthOrder / snaps: your depth chart and snap settings;
// onSet(field, key): field "personnel" or "defPkg".
export default function Personnel({ team, depthOrder, snaps, onSet, compact }) {
  const { order, info } = React.useMemo(() => {
    const healthy = (team.roster || []).filter((p) => !p.injured && !p.holdout && !p.suspended), memo = {};
    const order = (pos) => (memo[pos] ||= depthOrderFor(healthy, depthOrder || {}, pos, snaps));
    return { order, info: teamPersonnel(team, order) };
  }, [team, depthOrder, snaps]);
  const offKey = team.personnel || "auto", defKey = team.defPkg || "auto";
  const rateOff = (mix) => unitRatings(order, { mix, tilt: info.tilt });
  const wr = order("WR"), te = order("TE"), rb = order("RB"), fb = pickFB(rb.slice(1));
  // who each grouping adds beyond the core (X, Z, TE1, the back)
  const extra = [
    ["Slot WR (11, 10)", wr[2], wr[2] && roleOvr(wr[2], "SLOT")],
    ["WR4 (10)", wr[3], wr[3]?.ovr],
    ["TE2 (12, 13)", te[1], te[1] && Math.round((te[1].ovr + (te[1].posAttrs?.receiving ?? te[1].ovr)) / 2), te[1] && Math.round(teBlock(te[1]))],
    ["Fullback (21)", fb, fb?.ovr],
  ];
  const sam = order("LB")[0], nb = order("CB")[2];
  const samR = sam ? roleOvr(sam, "SAM") : null, nbR = nb ? roleOvr(nb, "NB") : null;
  const persRow = (p) => { const u = offUnits(order, p); return { pass: u.pass, run: u.run }; };
  const best = OFF_SETS.find((s) => s.key === info.auto);
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit,minmax(${compact ? 280 : 340}px,1fr))`, gap: 10 }}>
      <div style={card}>
        <div style={{ ...head, display: "flex" }}>OFFENSIVE PERSONNEL <span style={{ marginLeft: "auto", color: C.mt, letterSpacing: 0, fontWeight: 700 }}>Best fit: {best?.label}</span></div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8, lineHeight: 1.45 }}>How often you play each grouping. Heavier sets run better and pull defenses into base (a linebacker on your slot man); lighter sets spread them out. Pass / Run: what your roster rates in that identity.</div>
        <div style={{ display: "grid", gap: 6 }}>
          {OFF_SETS.map((s) => {
            const mix = s.mix || OFF_SETS.find((x) => x.key === info.auto)?.mix;
            const u = rateOff(mix), on = offKey === s.key;
            return (
              <button key={s.key} onClick={() => onSet("personnel", s.key)} title={s.desc} style={{ textAlign: "left", background: on ? `${C.bl}22` : C.bg, border: `1px solid ${on ? C.bl : C.bd}`, borderRadius: 8, padding: "7px 10px", color: C.tx, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 800 }}>{on ? "✓ " : ""}{s.icon} {s.label}</span>
                  {s.key === info.auto && s.key !== "auto" && <span style={{ fontSize: 10, fontWeight: 900, color: C.gn, border: `1px solid ${C.gn}66`, borderRadius: 4, padding: "0 4px" }}>BEST FIT</span>}
                  <span style={{ marginLeft: "auto", fontSize: 12, color: C.mt }}>Pass <b style={{ color: oC(u.pass) }}>{r0(u.pass)}</b> · Run <b style={{ color: oC(u.run) }}>{r0(u.run)}</b></span>
                </div>
                <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", marginTop: 5, background: "#ffffff10" }}>
                  {PERS.filter((p) => mix[p]).map((p) => <div key={p} title={`${p} personnel ${Math.round(mix[p] * 100)}%`} style={{ width: `${mix[p] * 100}%`, background: PCLR[p] }} />)}
                </div>
                <div style={{ fontSize: 11, color: C.mt, marginTop: 3 }}>{PERS.filter((p) => mix[p]).sort((a, b) => mix[b] - mix[a]).map((p) => `${p}: ${Math.round(mix[p] * 100)}%`).join(" · ")}{s.key === "auto" ? ` (now ${best?.label})` : ""}</div>
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.2, color: C.mt, margin: "10px 0 4px" }}>WHO EACH GROUPING PUTS ON THE FIELD</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 10px", fontSize: 12 }}>
          {extra.map(([l, p, v, blk]) => <div key={l} style={{ display: "flex", gap: 6, minWidth: 0 }}><span style={{ color: C.mt, whiteSpace: "nowrap" }}>{l}</span><span style={{ marginLeft: "auto", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p ? <>{last(p.name)} <b style={{ color: oC(v) }}>{v}</b>{blk != null && <span style={{ color: C.mt }}> · block {blk}</span>}</> : <span style={{ color: C.rd }}>nobody</span>}</span></div>)}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 11, color: C.mt, marginTop: 8 }}>
          {PERS.map((p) => { const u = persRow(p); return <span key={p}><b style={{ color: PCLR[p] }}>{p}</b> pass {r0(u.pass)} / run {r0(u.run)}</span>; })}
        </div>
      </div>
      <div style={card}>
        <div style={head}>DEFENSIVE PACKAGES</div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8, lineHeight: 1.45 }}>Base keeps your SAM on the field (strong against the run, but a linebacker covers the slot); nickel trades him for a third corner (better in coverage, lighter up front). Dime adds a fourth corner on passing downs.</div>
        <div style={{ display: "flex", gap: 12, fontSize: 13, marginBottom: 8, flexWrap: "wrap" }}>
          <span>SAM {sam ? <>{last(sam.name)} <b style={{ color: oC(samR) }}>{samR}</b></> : <span style={{ color: C.rd }}>none</span>}</span>
          <span>Nickel {nb ? <>{last(nb.name)} <b style={{ color: oC(nbR) }}>{nbR}</b></> : <span style={{ color: C.rd }}>none</span>}</span>
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          {DEF_SETS.map((s) => {
            const tilt = defTilt({ ...team, defPkg: s.key }, samR ?? 60, nbR ?? 60), sh = pkgShare(tilt), on = defKey === s.key;
            const pd = Object.entries(sh).reduce((t, [k, w]) => t + w * defUnits(order, k).passD, 0), rd = Object.entries(sh).reduce((t, [k, w]) => t + w * defUnits(order, k).runD, 0);
            return (
              <button key={s.key} onClick={() => onSet("defPkg", s.key)} title={s.desc} style={{ textAlign: "left", background: on ? `${C.bl}22` : C.bg, border: `1px solid ${on ? C.bl : C.bd}`, borderRadius: 8, padding: "7px 10px", color: C.tx, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 800 }}>{on ? "✓ " : ""}{s.icon} {s.label}</span>
                  <span style={{ marginLeft: "auto", fontSize: 12, color: C.mt }}>Cover <b style={{ color: oC(pd) }}>{r0(pd)}</b> · Run D <b style={{ color: oC(rd) }}>{r0(rd)}</b></span>
                </div>
                <div style={{ fontSize: 11, color: C.mt, marginTop: 3 }}>Base {Math.round(sh.base * 100)}% · Nickel {Math.round(sh.nickel * 100)}% · Dime {Math.round(sh.dime * 100)}%: SAM plays ~{Math.round(sh.base * 100)}% of snaps, the nickel ~{Math.round((sh.nickel + sh.dime) * 100)}%</div>
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ ...card, gridColumn: "1 / -1" }}>
        <div style={{ ...head, display: "flex" }}>SITUATIONS <span style={{ marginLeft: "auto", color: C.mt, letterSpacing: 0, fontWeight: 700 }}>Overrides your identity on these snaps</span></div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit,minmax(${compact ? 260 : 300}px,1fr))`, gap: "6px 14px" }}>
          {SITUATIONS.map((x) => {
            const cur = team.sit?.[x.key] || "auto";
            return (
              <div key={x.key} style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                <span style={{ fontSize: 12, color: x.side === "off" ? C.tx : "#fca5a5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.label}</span>
                <span style={{ marginLeft: "auto", display: "flex", gap: 3 }}>
                  {x.opts.map((o) => {
                    const on = cur === o;
                    return <button key={o} onClick={() => onSet("sit", { ...(team.sit || {}), [x.key]: o })} style={{ fontSize: 11, fontWeight: 800, padding: "3px 7px", borderRadius: 6, cursor: "pointer", background: on ? `${PCLR[o] || C.bl}33` : C.bg, color: on ? (PCLR[o] || C.tx) : C.mt, border: `1px solid ${on ? PCLR[o] || C.bl : C.bd}` }}>{o === "auto" ? "Auto" : /^\d/.test(o) ? o : o[0].toUpperCase() + o.slice(1)}</button>;
                  })}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
