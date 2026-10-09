// The depth chart drawn on a field: every starter where he lines up, offense (11 personnel),
// a 4-3 defense, and the kicker. Tap a spot to choose who starts there.
import React, { useState } from "react";
import { C, oC, pC, Btn, Face } from "./ui.jsx";
import { snapOrdered } from "./snaps.js";

// Starters per position: the same counts the game sim plays with.
export const STARTERS = { QB: 1, RB: 1, WR: 3, TE: 1, LT: 1, LG: 1, C: 1, RG: 1, RT: 1, DL: 4, LB: 3, CB: 2, S: 2, K: 1 };

// Default pecking order: the club's real (ESPN) depth chart rank "dk" for this season, then rating.
// That only seeds the chart: once you order a position or set snap shares, yours win.
export const byDepth = (a, b) => (a.dk ?? 99) - (b.dk ?? 99) || b.ovr - a.ovr;

// Your order for a position (anyone you haven't placed goes behind, by default order). Pass your
// snap shares and the players getting the most snaps move to the front: snap share decides who starts.
export function depthOrderFor(roster, depthOrder, pos, snaps) {
  const players = roster.filter((p) => p.pos === pos);
  const order = ((depthOrder || {})[pos] || []).map((id) => players.find((p) => p.id === id)).filter(Boolean);
  const base = [...order, ...players.filter((p) => !order.includes(p)).sort(byDepth)];
  return snaps ? snapOrdered(pos, base, snaps) : base;
}

// Where each player sits: "QB1", "WR3", or "QB #2" for backups.
export function depthSlots(roster, depthOrder, snaps) {
  const out = {};
  for (const pos of Object.keys(STARTERS)) {
    depthOrderFor(roster, depthOrder, pos, snaps).forEach((p, i) => {
      const starter = i < STARTERS[pos];
      out[p.id] = { starter, label: starter ? (STARTERS[pos] > 1 ? `${pos}${i + 1}` : `${pos}1`) : `${pos} #${i + 1}` };
    });
  }
  return out;
}

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
  special: { label: "Special teams", los: 46, spots: [["K", 0, 50, 70]] },
};

function Field({ los, children }) {
  const lines = [];
  for (let i = 0; i <= 10; i++) lines.push(<div key={i} style={{ position: "absolute", left: 0, right: 0, top: `${i * 10}%`, borderTop: `1px solid rgba(255,255,255,${i % 2 ? 0.08 : 0.16})` }} />);
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ position: "relative", minWidth: 640, aspectRatio: "16 / 9", borderRadius: 10, overflow: "hidden", border: "2px solid #14532d", background: "repeating-linear-gradient(180deg,#166534 0 10%,#15803d 10% 20%)" }}>
        {lines}
        {[25, 75].map((x) => <div key={x} style={{ position: "absolute", top: 0, bottom: 0, left: `${x}%`, borderLeft: "2px dashed rgba(255,255,255,0.12)" }} />)}
        <div title="Line of scrimmage" style={{ position: "absolute", left: 0, right: 0, top: `${los + 4.5}%`, borderTop: "2px solid #60a5fa" }} />
        {children}
      </div>
    </div>
  );
}

function Spot({ p, pos, idx, x, y, on, onClick }) {
  const label = STARTERS[pos] > 1 ? `${pos}${idx + 1}` : pos;
  return (
    <button onClick={onClick} title={p ? `${label}: ${p.name} (${p.ovr})` : `${label}: empty`} style={{ position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "transparent", border: 0, cursor: "pointer", padding: 0, width: 74 }}>
      <span style={{ width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: p ? "#0b1220" : "#0b122099", border: `3px solid ${on ? "#facc15" : p?.injured ? C.rd : pC(pos)}`, boxShadow: on ? "0 0 0 3px #facc1566" : "0 2px 6px #0008", color: p ? oC(p.ovr) : C.mt, fontWeight: 900, fontSize: 15 }}>{p ? p.ovr : "—"}</span>
      <span style={{ fontSize: 9, fontWeight: 800, color: "#fff", background: pC(pos), borderRadius: 3, padding: "0 4px", lineHeight: "14px" }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", textShadow: "0 1px 2px #000", maxWidth: 74, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p ? p.name.split(" ").slice(1).join(" ") || p.name : "Empty"}</span>
    </button>
  );
}

// Tackles and guards play either side: LT and RT share one pool, LG and RG another.
export const PARTNER = { LT: "RT", RT: "LT", LG: "RG", RG: "LG" };

// Corners and safeties can change position: a corner listed under a safety spot moves to safety
// (his rating is re-figured for the new spot) and starts there.
const DB_PARTNER = { CB: "S", S: "CB" };

export default function DepthChart({ roster, depthOrder, setDepthOrder, setSel, onAutoFill, setPositions, snaps, setSnaps, onMoveDB, previewDB }) {
  const [side, setSide] = useState("offense");
  const [pick, setPick] = useState(null); // [pos, idx]
  const set = SETS[side];
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
    onMoveDB(player.id);
    const ids = order(pos).map((p) => p.id);
    ids.splice(Math.min(idx, ids.length), 0, player.id);
    setDepthOrder((d) => ({ ...d, [pos]: ids, [DB_PARTNER[pos]]: (d[DB_PARTNER[pos]] || []).filter((id) => id !== player.id) }));
    clearSnaps(pos, DB_PARTNER[pos]);
  };
  const rowLabel = (pos, i) => (i < STARTERS[pos] ? (STARTERS[pos] > 1 ? `${pos}${i + 1}` : `${pos}1`) : `${pos} #${i + 1}`);
  // Everyone who could line up here: for tackles and guards, both sides of the line.
  const chosen = pick && [...order(pick[0]).map((p, i) => ({ p, at: pick[0], i })), ...(PARTNER[pick[0]] && setPositions ? order(PARTNER[pick[0]]).map((p, i) => ({ p, at: PARTNER[pick[0]], i })) : []),
    ...(DB_PARTNER[pick[0]] && onMoveDB ? order(DB_PARTNER[pick[0]]).map((p, i) => ({ p, at: DB_PARTNER[pick[0]], i, move: true })) : [])];
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
        {Object.entries(SETS).map(([k, s]) => (
          <button key={k} onClick={() => { setSide(k); setPick(null); }} style={{ background: side === k ? C.bl : "transparent", color: side === k ? "#fff" : "#94a3b8", border: `1px solid ${side === k ? C.bl : C.bd}`, borderRadius: 6, padding: "6px 14px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{s.label}</button>
        ))}
        <span style={{ marginLeft: "auto" }}><Btn onClick={onAutoFill} bg={`${C.gn}22`} c={C.gn} style={{ fontSize: 13 }}>Auto-fill by OVR</Btn></span>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: "3 1 560px", minWidth: 0 }}>
          <Field los={set.los}>
            {set.spots.map(([pos, idx, x, y]) => (
              <Spot key={`${pos}${idx}`} p={order(pos)[idx]} pos={pos} idx={idx} x={x} y={y} on={pick && pick[0] === pos && pick[1] === idx} onClick={() => setPick([pos, idx])} />
            ))}
          </Field>
          <div style={{ fontSize: 12, color: C.mt, marginTop: 6 }}>Tap a spot to choose who starts there. Red rings are injured starters.</div>
        </div>
        <div style={{ flex: "1 1 260px", minWidth: 0, background: C.cd, border: `1px solid ${C.bd}`, borderRadius: 8, padding: 10 }}>
          {!pick ? (
            <div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.5 }}>Pick a spot on the field to see everyone at that position and change the starter.</div>
          ) : (
            <>
              <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 6 }}>{STARTERS[pick[0]] > 1 ? `${pick[0]}${pick[1] + 1}` : pick[0]} <span style={{ fontSize: 12, color: C.mt, fontWeight: 600 }}>· {STARTERS[pick[0]]} starter{STARTERS[pick[0]] > 1 ? "s" : ""}</span></div>
              {!chosen.length && <div style={{ color: C.mt, fontSize: 13 }}>Nobody on the roster plays {pick[0]}.</div>}
              {PARTNER[pick[0]] && setPositions && <div style={{ fontSize: 12, color: C.mt, marginBottom: 4 }}>Tackles and guards play either side. Starting a {PARTNER[pick[0]]} here swaps the two.</div>}
              {DB_PARTNER[pick[0]] && onMoveDB && <div style={{ fontSize: 12, color: C.mt, marginBottom: 4 }}>Corners and safeties can switch. Moving a {DB_PARTNER[pick[0]]} here changes his position, and his rating is re-figured for {pick[0]} (shown in the Move button).</div>}
              {chosen.map(({ p, at, i, move }) => {
                const here = at === pick[0] && i === pick[1];
                const starter = i < STARTERS[at];
                return (
                  <div key={`${at}${p.id}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 4px", borderBottom: `1px solid ${C.bd}`, background: here ? "#facc1514" : "transparent" }}>
                    <span style={{ width: 44, fontSize: 12, fontWeight: 800, color: starter ? C.gn : C.mt }}>{at === pick[0] && !starter ? `#${i + 1}` : rowLabel(at, i)}</span>
                    <Face s={p.face} sz={26} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} onClick={() => setSel(p)}>{p.name}</div>
                      <div style={{ fontSize: 11, color: C.mt }}>Age {p.age}{p.injured ? <span style={{ color: C.rd, fontWeight: 700 }}> · injured</span> : ""}</div>
                    </div>
                    <b style={{ fontSize: 16, color: oC(p.ovr), minWidth: 26, textAlign: "right" }}>{p.ovr}</b>
                    {move ? <Btn onClick={() => moveIn(pick[0], pick[1], p)} bg="#7c3aed" c="#ede9fe" style={{ fontSize: 11, padding: "3px 6px", width: 56 }} title={`Move him to ${pick[0]}: ${previewDB ? previewDB(p).ovr : "?"} OVR there`}>Move {previewDB ? previewDB(p).ovr : ""}</Btn>
                      : here ? <span style={{ fontSize: 11, color: "#facc15", fontWeight: 700, width: 56, textAlign: "center" }}>Here</span>
                      : <Btn onClick={() => (at === pick[0] ? place(pick[0], pick[1], p) : switchSide(pick[0], p))} bg={C.bl} style={{ fontSize: 11, padding: "3px 8px", width: 56 }}>Start</Btn>}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
