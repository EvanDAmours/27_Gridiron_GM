// Training camp (preseason): a compact status bar, then one tool at a time in a tabbed panel.
import Select from "./Select.jsx";
import React, { useState } from "react";
import { C, oC, Bdg, Btn, Face } from "./ui.jsx";
import { yearlyAsk } from "./negotiation.js";
import { posTag } from "./dline.js";

const panel = { background: C.cd, border: `1px solid ${C.bd}`, borderRadius: 10, padding: "12px 14px", minWidth: 0 };
const hint = { fontSize: 13, color: C.mt, marginBottom: 10 };
const row = { display: "flex", alignItems: "center", gap: 10, padding: "6px 8px", background: C.bg, border: `1px solid ${C.bd}`, borderRadius: 8, fontSize: 14, minWidth: 0 };
const money = (n) => `$${(+n || 0).toFixed(1)}M`;
const ATTRS = [["ovr", "Overall"], ["spd", "Speed"], ["str", "Strength"], ["agi", "Agility"], ["acc", "Acceleration"]];
// The player picker: grouped by position (offense, then defense, then specialists), best first.
const PICK_ORDER = ["QB", "RB", "WR", "TE", "LT", "LG", "C", "RG", "RT", "EDGE", "DL", "DT", "LB", "CB", "S", "K", "P"];
const POS_NAME = { QB: "Quarterbacks", RB: "Running backs", WR: "Wide receivers", TE: "Tight ends", LT: "Left tackles", LG: "Left guards", C: "Centers", RG: "Right guards", RT: "Right tackles", EDGE: "Edge rushers", DL: "Defensive line", DT: "Defensive tackles", LB: "Linebackers", CB: "Cornerbacks", S: "Safeties", K: "Kickers", P: "Punters" };
const groupByPos = (ps) => {
  const m = new Map();
  for (const p of ps) { if (!m.has(p.pos)) m.set(p.pos, []); m.get(p.pos).push(p); }
  const rank = (pos) => { const i = PICK_ORDER.indexOf(pos); return i < 0 ? 99 : i; };
  return [...m.entries()].sort((a, b) => rank(a[0]) - rank(b[0])).map(([pos, list]) => [pos, list.sort((a, b) => (b.ovr || 0) - (a.ovr || 0))]);
};
const POS = ["QB", "RB", "WR", "TE", "LT", "LG", "C", "RG", "RT", "DL", "LB", "CB", "S", "K", "P"];
const chip = (on) => ({ padding: "6px 12px", borderRadius: 8, fontSize: 13.5, fontWeight: 800, cursor: "pointer", background: on ? `${C.bl}33` : C.bg, color: on ? "#fff" : "#cbd5e1", border: `1px solid ${on ? C.bl : C.bd}`, whiteSpace: "nowrap" });

export default function TrainingCamp({ team, yr, sp, scPts, games, risk, onRisk, onSimGame, onReport, onDevCamp, onTrain, onAutoTrain, battlesDone, onBattle, onBattleAll, otcFocus, onOtc, onExtend, setSel }) {
  const roster = team.roster;
  const [pick, setPick] = useState("");
  const [attr, setAttr] = useState("ovr");
  const [tab, setTab] = useState("battles");
  const rookies = roster.filter((p) => p.age <= 23 && (p.draftYr === yr || p.draftYr === yr - 1)).sort((a, b) => b.ovr - a.ovr).slice(0, 6);
  const campUsed = team.devCampYr === yr;
  const trainable = roster.filter((p) => !p.trainedThisCamp);
  const trained = roster.filter((p) => p.trainedThisCamp);
  const expiring = roster.filter((p) => p.contract === 1 || p.ext || p.resigned?.yr === yr).sort((a, b) => b.ovr - a.ovr);
  const extDone = expiring.filter((p) => p.ext || p.resigned?.yr === yr).length;
  const battles = POS.map((pos) => [pos, roster.filter((p) => p.pos === pos).sort((a, b) => b.ovr - a.ovr).slice(0, 2)]).filter(([, t]) => t.length >= 2);
  const openB = battles.filter(([pos]) => !battlesDone.includes(pos)).map(([pos]) => pos);
  const pre = sp === "preseason";
  const TABS = [
    ["battles", "Position battles", `${battles.length - openB.length}/${battles.length}`],
    ["train", "Training focus", `${trained.length} trained`],
    ["rookie", "Rookie camp", campUsed ? "✓ used" : "open"],
    ["ext", "Extensions", `${extDone}/${expiring.length}`],
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px 16px", flexWrap: "wrap" }}>
        <span style={{ fontSize: 22, fontWeight: 900 }}>Training Camp</span>
        <span style={{ fontSize: 14, color: C.mt }}>Season points <b style={{ fontSize: 18, color: C.bl }}>{scPts} SP</b></span>
        {!pre && <span style={{ fontSize: 14, color: C.gd }}>Camp is closed until next preseason.</span>}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div style={{ ...panel, flex: "1.3 1 440px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 900 }}>Preseason games {games.length}/4</span>
            <span style={{ fontSize: 12.5, color: C.mt }}>Starters playing risks injuries.</span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {games.map((g, i) => <span key={i} style={{ fontSize: 13, fontWeight: 800, padding: "4px 8px", borderRadius: 6, background: g.us > g.them ? "#14532d55" : "#7f1d1d55", color: g.us > g.them ? C.gn : "#fca5a5" }}>{g.us > g.them ? "W" : "L"} {g.us}–{g.them} {g.opp}</span>)}
            <Btn onClick={onSimGame} disabled={!pre || games.length >= 4} bg={C.gn} style={{ fontSize: 13.5, padding: "6px 12px" }}>▶ Play game</Btn>
            <Btn onClick={onRisk} bg={risk ? "#7f1d1d" : C.bd} c={risk ? "#fca5a5" : "#cbd5e1"} style={{ fontSize: 13.5, padding: "6px 12px" }}>Starters: {risk ? "Yes" : "No"}</Btn>
            {games.length > 0 && <Btn onClick={onReport} bg={C.bd} c="#7dd3fc" style={{ fontSize: 13.5, padding: "6px 12px" }}>Practice report</Btn>}
          </div>
        </div>
        <div style={{ ...panel, flex: "1 1 360px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 900 }}>Camp focus</span>
            <span style={{ fontSize: 12.5, color: C.mt }}>Top 5 in the group gain +1 OVR at season's end.</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[["passing", "Passing"], ["rushing", "Run game & line"], ["defense", "Defense"]].map(([k, l]) => (
              <button key={k} disabled={!pre} onClick={() => onOtc(otcFocus === k ? null : k)} style={{ ...chip(otcFocus === k), flex: 1, cursor: pre ? "pointer" : "default" }}>{otcFocus === k ? "✓ " : ""}{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={panel}>
        <div role="tablist" style={{ display: "flex", gap: 4, borderBottom: `1px solid ${C.bd}`, marginBottom: 10, overflowX: "auto" }}>
          {TABS.map(([k, l, s]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} style={{ background: "none", border: "none", borderBottom: `2px solid ${tab === k ? C.bl : "transparent"}`, color: tab === k ? "#fff" : "#94a3b8", padding: "6px 12px 8px", fontSize: 14.5, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>
              {l} <span style={{ fontSize: 12, fontWeight: 700, color: tab === k ? C.bl : C.mt, marginLeft: 4 }}>{s}</span>
            </button>
          ))}
        </div>

        {tab === "battles" && <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <span style={{ ...hint, marginBottom: 0, flex: 1 }}>1 SP each. The top two at a spot compete; the winner (usually the better player) gains +1 OVR.</span>
            {onBattleAll && openB.length > 0 && (() => { const n = Math.min(openB.length, scPts); return <Btn onClick={() => onBattleAll(openB)} disabled={!pre || n < 1} bg={C.bd} c="#7dd3fc" style={{ fontSize: 13.5, padding: "6px 12px" }}>⚔️ Run {n < openB.length ? `${n} of ${openB.length}` : `all ${openB.length}`} · {n} SP</Btn>; })()}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 6 }}>
            {battles.map(([pos, top2]) => {
              const done = battlesDone.includes(pos);
              return (
                <button key={pos} disabled={!pre || done || scPts < 1} onClick={() => onBattle(pos)} style={{ display: "flex", alignItems: "center", gap: 8, textAlign: "left", padding: "6px 8px", borderRadius: 8, cursor: !pre || done ? "default" : "pointer", background: C.bg, border: `1px solid ${done ? C.gn + "66" : C.bd}`, color: "#e2e8f0", opacity: done ? 0.7 : 1, minWidth: 0 }}>
                  <Bdg pos={pos} />
                  <span style={{ fontSize: 13, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{top2[0].name.split(" ").slice(-1)[0]} <span style={{ color: C.mt }}>vs</span> {top2[1].name.split(" ").slice(-1)[0]}</span>
                  {done && <span style={{ color: C.gn, fontWeight: 800, fontSize: 13 }}>✓</span>}
                </button>
              );
            })}
          </div>
        </>}

        {tab === "train" && <>
          <div style={hint}>2 SP each. Give one player extra reps: +1 to one attribute. Once per player each camp.</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Select value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Player to train" style={{ flex: "1 1 240px", maxWidth: 340, background: C.bg, color: C.tx, border: `1px solid ${C.bd}`, borderRadius: 6, padding: "7px 10px", fontSize: 14 }}>
              <option value="">Choose a player…</option>
              {groupByPos(trainable).map(([pos, ps]) => (
                <optgroup key={pos} label={POS_NAME[pos] || pos}>
                  {ps.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.ovr}{p.age <= 23 ? " · young" : ""}</option>)}
                </optgroup>
              ))}
            </Select>
            {ATTRS.map(([k, l]) => <button key={k} onClick={() => setAttr(k)} style={chip(attr === k)}>{l}</button>)}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <Btn onClick={() => { const p = roster.find((x) => x.id === pick); if (p) { onTrain(p, attr); setPick(""); } }} disabled={!pre || !pick || scPts < 2} bg={C.gn} style={{ fontSize: 13.5, padding: "6px 12px" }}>Train (+1 {ATTRS.find(([k]) => k === attr)[1]})</Btn>
            {onAutoTrain && (() => { const n = Math.min(5, trainable.length, Math.floor(scPts / 2)); return <Btn onClick={() => onAutoTrain(5)} disabled={!pre || n < 1} bg={C.bd} c="#7dd3fc" style={{ fontSize: 13.5, padding: "6px 12px" }} title="Picks players at random: young players under their ceiling work on overall, the rest on a physical tool">🎲 Auto-pick {n > 0 ? `${n} player${n > 1 ? "s" : ""} · ${n * 2} SP` : ""}</Btn>; })()}
          </div>
          {trained.length > 0 && <div style={{ fontSize: 13, color: C.mt, marginTop: 8 }}>Trained: {trained.map((p) => p.name).join(", ")}</div>}
        </>}

        {tab === "rookie" && <>
          <div style={hint}>3 SP, once per preseason: one rookie gains up to +3 OVR, never past his potential.{campUsed && <b style={{ color: C.gn }}> ✓ Used{team.devCampPid ? ` on ${roster.find((p) => p.id === team.devCampPid)?.name || "a rookie"}` : ""}.</b>}</div>
          {!rookies.length && <div style={{ fontSize: 14, color: C.mt }}>No rookies or second-year players on the roster.</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(360px,1fr))", gap: 6 }}>
            {rookies.map((p) => (
              <div key={p.id} style={row}>
                <Face s={p.face} sz={24} /><span onClick={() => setSel(p)} style={{ flex: 1, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span><Bdg pos={posTag(p)} />
                <span style={{ fontWeight: 900, color: oC(p.ovr), minWidth: 24, textAlign: "center" }}>{p.ovr}</span>
                <span style={{ fontSize: 12, color: C.mt, minWidth: 48 }}>POT {p.pot || p.ovr}</span>
                <Btn onClick={() => onDevCamp(p)} disabled={!pre || campUsed || scPts < 3 || p.ovr >= (p.pot || p.ovr)} bg={C.bl} style={{ fontSize: 13, padding: "4px 10px" }}>{p.ovr >= (p.pot || p.ovr) ? "At ceiling" : "Boost"}</Btn>
              </div>
            ))}
          </div>
        </>}

        {tab === "ext" && <>
          <div style={hint}>Same negotiation as the Front Office. The new deal starts next season, so it has to fit under next year's cap.</div>
          {!expiring.length && <div style={{ fontSize: 14, color: C.mt }}>Nobody is in a contract year.</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(380px,1fr))", gap: 6, maxHeight: 420, overflowY: "auto" }}>
            {expiring.map((p) => (
              <div key={p.id} style={row}>
                <span onClick={() => setSel(p)} style={{ flex: 1, minWidth: 0, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name} <span style={{ fontSize: 12, color: C.mt, fontWeight: 400 }}>{p.age}</span></span><Bdg pos={posTag(p)} />
                <span style={{ fontWeight: 900, color: oC(p.ovr), minWidth: 24, textAlign: "center" }}>{p.ovr}</span>
                {p.ext ? <span style={{ fontSize: 13, color: C.gn, fontWeight: 700, whiteSpace: "nowrap" }}>✓ {p.ext.yrs}y · {money(p.ext.apy ?? p.ext.sal)}</span>
                  : p.resigned?.yr === yr ? <span style={{ fontSize: 13, color: C.gn, fontWeight: 700, whiteSpace: "nowrap" }}>✓ {p.resigned.yrs}y · {money(p.resigned.sal)}</span>
                  : <><span style={{ fontSize: 12.5, color: C.mt, whiteSpace: "nowrap" }}>asks {money(yearlyAsk(p, 2, "extend"))}</span><Btn onClick={() => onExtend(p)} bg={C.gn} style={{ fontSize: 13, padding: "4px 10px" }}>Negotiate</Btn></>}
              </div>
            ))}
          </div>
        </>}
      </div>
    </div>
  );
}
