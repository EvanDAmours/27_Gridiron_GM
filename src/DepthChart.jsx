// The depth chart drawn on a field: every starter where he lines up, offense (11 personnel),
// a 4-3 defense, and the kicker. Tap a spot to choose who starts there.
import React, { useState } from "react";
import { C, oC, pC, Btn, Face } from "./ui.jsx";
import { DL_SLOTS, slotKind, dlOvrAt, naturalDL } from "./dline.js";

export { STARTERS, byDepth, depthOrderFor, depthSlots } from "./depth.js";
import { STARTERS as STARTERS0, depthOrderFor } from "./depth.js";
import { retRating } from "./special.js";
import { positionSnaps, snapBudget } from "./snaps.js";

// Kick and punt returners: any receiver, back or defensive back, rated as a returner.
const RET = { KR: "kick returner", PR: "punt returner" };
const STARTERS = { ...STARTERS0, KR: 1, PR: 1 };
const shown = (p, pos) => (RET[pos] ? retRating(p) : p.ovr);

// Spots on the field (x, y in % of the field). Offense drives up the screen; the defense faces it.
const SETS = {
  offense: {
    label: "Offense",
    los: 46,
    spots: [
      ["WR", 0, 5, 46], ["LT", 0, 33, 46], ["LG", 0, 41.5, 46], ["C", 0, 50, 46], ["RG", 0, 58.5, 46], ["RT", 0, 67, 46],
      ["TE", 0, 76, 47], ["WR", 2, 85, 55], ["WR", 1, 95, 46], ["QB", 0, 50, 64], ["RB", 0, 50, 82],
    ],
  },
  defense: {
    label: "Defense",
    los: 62,
    spots: [
      ["CB", 0, 6, 57], ["DL", 0, 37, 57], ["DL", 1, 45.5, 57], ["DL", 2, 54.5, 57], ["DL", 3, 63, 57], ["CB", 1, 94, 57],
      ["LB", 0, 30, 38], ["LB", 1, 50, 36], ["LB", 2, 70, 38], ["S", 0, 33, 14], ["S", 1, 67, 14],
    ],
  },
  special: { label: "Special teams", los: 46, spots: [["K", 0, 40, 70], ["P", 0, 60, 70], ["KR", 0, 35, 10], ["PR", 0, 65, 10]] },
};

// "Michael Schmidt Jr" -> "Schmidt": the name that fits under a spot
// "John Michael Schmitz Jr" -> "Schmitz", but "Amon-Ra St. Brown" -> "St. Brown"
const lastName = (n) => { const w = String(n || "").split(" ").filter((x) => !/^(jr\.?|sr\.?|ii|iii|iv|v)$/i.test(x)); if (w.length < 2) return w[0] || ""; const k = w.length - 2; return k >= 1 && /^(st\.?|de|del|la|le|van|von|da|di)$/i.test(w[k]) ? w.slice(k).join(" ") : w[w.length - 1]; };
const narrow = () => typeof window !== "undefined" && window.innerWidth < 700;
function Field({ los, children }) {
  const lines = [];
  for (let i = 0; i <= 10; i++) lines.push(<div key={i} style={{ position: "absolute", left: 0, right: 0, top: `${i * 10}%`, borderTop: `1px solid rgba(255,255,255,${i % 2 ? 0.08 : 0.16})` }} />);
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ position: "relative", width: "100%", maxWidth: 620, margin: "0 auto", minWidth: narrow() ? 340 : 0, aspectRatio: narrow() ? "4 / 3.3" : "16 / 9", borderRadius: 10, overflow: "hidden", border: "2px solid #14532d", background: "repeating-linear-gradient(180deg,#166534 0 10%,#15803d 10% 20%)" }}>
        {lines}
        {[25, 75].map((x) => <div key={x} style={{ position: "absolute", top: 0, bottom: 0, left: `${x}%`, borderLeft: "2px dashed rgba(255,255,255,0.12)" }} />)}
        <div title="Line of scrimmage" style={{ position: "absolute", left: 0, right: 0, top: `${los + 4.5}%`, borderTop: "2px solid #60a5fa" }} />
        {children}
      </div>
    </div>
  );
}

function Spot({ p: p0, pos, idx, x, y, on, onClick }) {
  const sm = narrow();
  const label = pos === "DL" ? DL_SLOTS[idx] : STARTERS[pos] > 1 ? `${pos}${idx + 1}` : pos;
  // A lineman shows his rating at this spot (edge or tackle).
  const p = p0 && pos === "DL" ? { ...p0, ovr: dlOvrAt(p0, slotKind(idx)) } : p0 && RET[pos] ? { ...p0, ovr: retRating(p0) } : p0;
  return (
    <button onClick={onClick} title={p ? `${label}: ${p.name} (${p.ovr})` : `${label}: empty`} style={{ position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "transparent", border: 0, cursor: "pointer", padding: 0, width: sm ? 52 : 70 }}>
      <span style={{ width: sm ? 30 : 36, height: sm ? 30 : 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: p ? "#0b1220" : "#0b122099", border: `3px solid ${on ? "#facc15" : p?.injured ? C.rd : pC(pos)}`, boxShadow: on ? "0 0 0 3px #facc1566" : "0 2px 6px #0008", color: p ? oC(p.ovr) : C.mt, fontWeight: 900, fontSize: sm ? 12 : 14 }}>{p ? p.ovr : "—"}</span>
      <span style={{ fontSize: 9, fontWeight: 800, color: "#fff", background: pC(pos), borderRadius: 3, padding: "0 4px", lineHeight: "14px" }}>{label}</span>
      {!(sm && ["LT", "LG", "C", "RG", "RT", "DL"].includes(pos)) && <span style={{ fontSize: sm ? 9 : ["LT", "LG", "C", "RG", "RT"].includes(pos) ? 10 : 11, fontWeight: 700, color: "#fff", textShadow: "0 1px 2px #000", maxWidth: sm ? 52 : ["LT", "LG", "C", "RG", "RT"].includes(pos) ? 46 : 70, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p ? lastName(p.name) : "Empty"}</span>}
    </button>
  );
}

// Tackles and guards play either side: LT and RT share one pool, LG and RG another.
export const PARTNER = { LT: "RT", RT: "LT", LG: "RG", RG: "LG" };

// Corners and safeties can change position: a corner listed under a safety spot moves to safety
// (his rating is re-figured for the new spot) and starts there.
// Players from these positions can be moved into a spot (re-rated for it): corners and safeties,
// and tackles, guards and centers along the line (left/right swaps go through PARTNER instead).
const CROSS = { CB: ["S"], S: ["CB"], LT: ["LG", "RG", "C"], RT: ["LG", "RG", "C"], LG: ["LT", "RT", "C"], RG: ["LT", "RT", "C"], C: ["LG", "RG", "LT", "RT"] };

export default function DepthChart({ roster, depthOrder, setDepthOrder, setSel, onAutoFill, setPositions, snaps, setSnaps, onMovePos, previewPos, gamePlan }) {
  const [side, setSide] = useState("offense");
  const [pick, setPick] = useState(null); // [pos, idx]
  const set = SETS[side] || SETS.offense;
  // snap shares at a position, the way game day will hand them out
  const shares = (pos) => positionSnaps(pos, order(pos).filter((p) => !p.injured), snaps || {});
  const setShare = (pos, p, v) => { if (!setSnaps) return; const others = order(pos).filter((x) => x.id !== p.id && !x.injured && snaps?.[x.id] != null).reduce((t, x) => t + snaps[x.id], 0); setSnaps((sn) => ({ ...sn, [p.id]: Math.max(0, Math.min(v, 100, snapBudget(pos) - others)) })); };
  const resetShares = (pos) => clearSnaps(pos);
  const sidePositions = [...new Set(set.spots.map(([pos]) => pos))];
  const order = (pos) => depthOrderFor(roster, depthOrder, pos, snaps);
  // Choosing a starter here is your call: it clears snap shares you set at that position, so
  // the new order takes over.
  const clearSnaps = (...ps) => setSnaps && setSnaps((s) => { const n = { ...s }; for (const pos of ps) for (const p of roster) if (p.pos === pos) delete n[p.id]; return n; });
  const place = (pos, idx, player) => {
    const ids = order(pos).map((p) => p.id);
    const from = ids.indexOf(player.id);
    [ids[idx], ids[from]] = [ids[from], ids[idx]];
    setDepthOrder((d) => ({ ...d, [pos]: ids }));
    clearSnaps(pos);
  };
  // Start a lineman from the other side here: he flips over, and the starter he
  // replaces takes his old spot on the other side.
  const switchSide = (pos, player) => {
    const other = PARTNER[pos];
    const cur = order(pos)[0];
    const here = order(pos).map((p) => p.id).filter((id) => id !== cur?.id);
    const there = order(other).map((p) => (p.id === player.id ? cur?.id : p.id)).filter(Boolean);
    setPositions({ [player.id]: pos, ...(cur ? { [cur.id]: other } : {}) });
    setDepthOrder((d) => ({ ...d, [pos]: [player.id, ...here], [other]: there }));
    clearSnaps(pos, other);
  };
  // Move a corner to safety (or back) and start him at this spot.
  const moveIn = (pos, idx, player) => {
    const from = player.pos;
    onMovePos(player.id, pos);
    const ids = order(pos).map((p) => p.id);
    ids.splice(Math.min(idx, ids.length), 0, player.id);
    setDepthOrder((d) => ({ ...d, [pos]: ids, [from]: (d[from] || []).filter((id) => id !== player.id) }));
    clearSnaps(pos, from);
  };
  const rowLabel = (pos, i) => (pos === "DL" && i < 4 ? DL_SLOTS[i] : i < STARTERS[pos] ? (STARTERS[pos] > 1 ? `${pos}${i + 1}` : `${pos}1`) : `${pos} #${i + 1}`);
  // Everyone who could line up here: for tackles and guards, both sides of the line.
  const chosen = pick && [...order(pick[0]).map((p, i) => ({ p, at: pick[0], i })), ...(PARTNER[pick[0]] && setPositions ? order(PARTNER[pick[0]]).map((p, i) => ({ p, at: PARTNER[pick[0]], i })) : []),
    ...(CROSS[pick[0]] && onMovePos ? CROSS[pick[0]].flatMap((x) => order(x).map((p, i) => ({ p, at: x, i, move: true }))) : [])];
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
        {[...Object.entries(SETS).map(([k, s]) => [k, s.label]), ...(gamePlan ? [["gameplan", "📋 Schemes & Playbook"]] : [])].map(([k, l]) => (
          <button key={k} onClick={() => { setSide(k); setPick(null); }} style={{ background: side === k ? C.bl : "transparent", color: side === k ? "#fff" : "#94a3b8", border: `1px solid ${side === k ? C.bl : C.bd}`, borderRadius: 6, padding: "6px 14px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{l}</button>
        ))}
        {side !== "gameplan" && <span style={{ marginLeft: "auto" }}><Btn onClick={onAutoFill} bg={`${C.gn}22`} c={C.gn} style={{ fontSize: 13 }}>Auto-fill by OVR</Btn></span>}
      </div>
      {side === "gameplan" ? gamePlan : <>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: "3 1 480px", minWidth: 0, maxWidth: 640 }}>
          <Field los={set.los}>
            {set.spots.map(([pos, idx, x, y]) => (
              <Spot key={`${pos}${idx}`} p={order(pos)[idx]} pos={pos} idx={idx} x={x} y={y} on={pick && pick[0] === pos && pick[1] === idx} onClick={() => setPick([pos, idx])} />
            ))}
          </Field>
          <div style={{ fontSize: 12, color: C.mt, marginTop: 6, textAlign: "center" }}>Tap a spot to change the starter and set snap shares. Red rings are injured starters.</div>
        </div>
        <div style={{ flex: "1 1 300px", minWidth: 0, background: C.cd, border: `1px solid ${C.bd}`, borderRadius: 8, padding: 10 }}>
          {!pick ? (
            <>
              <div style={{ fontSize: 15, fontWeight: 900, marginBottom: 2 }}>{set.label} at a glance</div>
              <div style={{ fontSize: 12, color: C.mt, marginBottom: 8 }}>Who plays and how much. Tap a position (or a spot on the field) to change it.</div>
              {sidePositions.map((pos) => {
                const o = order(pos), sh = RET[pos] ? {} : shares(pos), n = STARTERS[pos] || 1;
                const rot = o.filter((p, i) => i >= n && (sh[p.id] || 0) > 0);
                return (
                  <button key={pos} onClick={() => setPick([pos, 0])} style={{ display: "flex", width: "100%", textAlign: "left", alignItems: "flex-start", gap: 8, padding: "7px 4px", background: "transparent", border: 0, borderBottom: `1px solid ${C.bd}`, color: C.tx, cursor: "pointer" }}>
                    <span style={{ minWidth: 30, fontSize: 11, fontWeight: 900, color: "#fff", background: pC(pos === "KR" || pos === "PR" ? "WR" : pos), borderRadius: 4, textAlign: "center", padding: "1px 0" }}>{pos}</span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.45 }}>
                      {o.slice(0, n).map((p) => <span key={p.id} style={{ display: "inline-block", marginRight: 8, color: p.injured ? C.rd : "#e2e8f0", fontWeight: 700 }}>{lastName(p.name)} <span style={{ color: oC(shown(p, pos)) }}>{shown(p, pos)}</span>{!RET[pos] && <span style={{ color: C.mt, fontWeight: 600 }}> {sh[p.id] ?? 0}%</span>}</span>)}
                      {rot.length > 0 && <span style={{ display: "block", fontSize: 12, color: C.mt }}>Rotation: {rot.map((p) => `${lastName(p.name)} ${sh[p.id]}%`).join(" · ")}</span>}
                    </span>
                  </button>
                );
              })}
            </>
          ) : (
            <>
              <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 6 }}>{pick[0] === "DL" ? DL_SLOTS[pick[1]] : STARTERS[pick[0]] > 1 ? `${pick[0]}${pick[1] + 1}` : pick[0]} <span style={{ fontSize: 12, color: C.mt, fontWeight: 600 }}>· {pick[0] === "DL" ? (slotKind(pick[1]) === "EDGE" ? "edge rusher" : "defensive tackle") : RET[pick[0]] ? RET[pick[0]] : `${STARTERS[pick[0]]} starter${STARTERS[pick[0]] > 1 ? "s" : ""}`}</span></div>
              {!chosen.length && <div style={{ color: C.mt, fontSize: 13 }}>Nobody on the roster plays {pick[0]}.</div>}
              <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 6px", flexWrap: "wrap" }}>
                <button onClick={() => setPick(null)} style={{ background: "transparent", border: 0, color: "#7dd3fc", fontSize: 13, cursor: "pointer", padding: 0 }}>← All positions</button>
                {!RET[pick[0]] && setSnaps && order(pick[0]).some((p) => snaps?.[p.id] != null) && <button onClick={() => resetShares(pick[0])} style={{ background: "transparent", border: `1px solid ${C.bd}`, color: "#cbd5e1", borderRadius: 6, padding: "2px 8px", fontSize: 12, cursor: "pointer" }}>Reset snaps to auto</button>}
                <details style={{ marginLeft: "auto", fontSize: 12, color: C.mt }}><summary style={{ cursor: "pointer", color: "#94a3b8" }}>How this works</summary><div style={{ marginTop: 4, maxWidth: 420 }}>
              {PARTNER[pick[0]] && setPositions && <div style={{ marginBottom: 4 }}>Tackles and guards play either side. Starting a {PARTNER[pick[0]]} here swaps the two.</div>}
              {RET[pick[0]] && <div style={{ marginBottom: 4 }}>Any receiver, back or defensive back can return. The number is his return rating (speed, acceleration, agility and a knack for it). A great returner flips field position and breaks a long one now and then, and it doesn't have to be a starter: a fast backup is a weapon here.</div>}
              {pick[0] === "DL" && <div style={{ marginBottom: 4 }}>Any lineman can play {slotKind(pick[1]) === "EDGE" ? "edge" : "tackle"} here. The number is his rating at this spot; edge rushers lose some inside and run stuffers lose some outside (his natural rating after the slash).</div>}
              {CROSS[pick[0]] && onMovePos && <div style={{ marginBottom: 4 }}>{["CB", "S"].includes(pick[0]) ? "Corners and safeties can switch." : "Linemen can move along the line."} Moving a player here changes his position; the Move button shows his rating at {pick[0]}. Moving him back restores his old rating.</div>}
                  {!RET[pick[0]] && setSnaps && <div>Snap shares fill by depth on their own; drag a slider to set one yourself (it turns yellow).</div>}
                </div></details>
              </div>
              {chosen.map(({ p, at, i, move }) => {
                const here = at === pick[0] && i === pick[1];
                const starter = i < STARTERS[at];
                return (
                  <React.Fragment key={`${at}${p.id}`}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "4px 4px", borderBottom: `1px solid ${C.bd}`, background: here ? "#facc1514" : "transparent", flexWrap: "wrap" }}>
                    <span style={{ width: 40, fontSize: 12, fontWeight: 800, color: starter ? C.gn : C.mt }}>{at === pick[0] && !starter ? `#${i + 1}` : rowLabel(at, i)}</span>
                    <Face s={p.face} sz={22} />
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} onClick={() => setSel(p)}>{p.name}</div>
                      <div style={{ fontSize: 11, color: C.mt }}>{RET[pick[0]] && <b style={{ marginRight: 4 }}>{p.pos} {p.ovr}</b>}{p.pos === "DL" && <b style={{ color: naturalDL(p) === "DT" ? "#fb923c" : "#f472b6", marginRight: 4 }}>{naturalDL(p)}</b>}Age {p.age}{p.injured ? <span style={{ color: C.rd, fontWeight: 700 }}> · injured</span> : ""}</div>
                    </div>
                    {(() => { const v = p.pos === "DL" && pick[0] === "DL" ? dlOvrAt(p, slotKind(pick[1])) : shown(p, pick[0]); return <b title={RET[pick[0]] ? `Return rating (${p.pos} ${p.ovr} OVR)` : v !== p.ovr ? `${p.ovr} at his natural spot` : undefined} style={{ fontSize: 16, color: oC(v), minWidth: 26, textAlign: "right" }}>{v}{v !== p.ovr && !RET[pick[0]] && <span style={{ fontSize: 10, color: C.mt, fontWeight: 600 }}> /{p.ovr}</span>}</b>; })()}
                    {at === pick[0] && !RET[pick[0]] && setSnaps && !p.injured && (() => { const v = shares(pick[0])[p.id] ?? 0; const set_ = snaps?.[p.id] != null; return (
                      <span title={set_ ? "Snap share you set" : "Snap share (automatic, by depth)"} style={{ display: "inline-flex", alignItems: "center", gap: 4, width: 128 }}>
                        <input type="range" min={0} max={100} step={5} value={v} onChange={(e) => setShare(pick[0], p, +e.target.value)} aria-label={`${p.name} snap share`} style={{ width: 84, accentColor: v >= 70 ? C.gn : v >= 30 ? "#f59e0b" : "#64748b" }} />
                        <span style={{ fontSize: 12, fontWeight: 800, minWidth: 34, textAlign: "right", color: set_ ? "#fde68a" : "#cbd5e1" }}>{v}%</span>
                      </span>); })()}
                    {move ? <Btn onClick={() => moveIn(pick[0], pick[1], p)} bg="#7c3aed" c="#ede9fe" style={{ fontSize: 11, padding: "3px 6px", width: 56 }} title={`Move him to ${pick[0]}: ${previewPos ? previewPos(p, pick[0]) : "?"} OVR there`}>Move {previewPos ? previewPos(p, pick[0]) : ""}</Btn>
                      : here ? <span style={{ fontSize: 11, color: "#facc15", fontWeight: 700, width: 56, textAlign: "center" }}>Here</span>
                      : <Btn onClick={() => (at === pick[0] ? place(pick[0], pick[1], p) : switchSide(pick[0], p))} bg={C.bl} style={{ fontSize: 11, padding: "3px 8px", width: 56 }}>Start</Btn>}
                  </div>
                  </React.Fragment>
                );
              })}
            </>
          )}
        </div>
      </div>
      </>}
    </div>
  );
}
