// The season's honors, shown the moment the Super Bowl ends: the champion, the Super Bowl MVP and
// the regular-season awards (MVP, OPOY, DPOY and both Rookies of the Year). Continue goes to a
// second page: the All-Pro team, and which of your players were honored and what they gain.
import React, { useState } from "react";
import { HONOR_LABEL, honorBoost, honorsById, bestLabel } from "./honors.js";
import { C, TeamLogo, Btn, Bdg, CloseX, sheetWrap, sheetBox, SheetGrip } from "./ui.jsx";
import { MOBILE } from "./mobile.js";
import { sbName, sbNumber } from "./data/superbowls.js";
import { posTag } from "./dline.js";
import Spotlight from "./Spotlight.jsx";
import { jerseyNum } from "./playerArt.js";
import mvpArt from "./assets/mvp.webp";
import opoyArt from "./assets/opoy.webp";
import dpoyArt from "./assets/dpoy.webp";
import oroyArt from "./assets/oroy.webp";
import droyArt from "./assets/droy.webp";
import lombardiArt from "./assets/lombardi.webp";

// The Super Bowl MVP: the best line on the winning side of the box score.
// "three touchdowns", "a touchdown", "12 tackles": numbers the way a newspaper writes them
const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const count = (n, one, many = `${one}s`) => (n === 1 ? `a ${one}` : `${n < 10 ? WORDS[n] : n} ${many}`);
// The MVP's night as a phrase: "completing 24 of 33 passes for 291 yards and three touchdowns".
export function mvpProse(l) {
  const bits = [];
  if (l.att) bits.push(`completing ${l.comp || 0} of ${l.att} passes for ${l.passYds || 0} yards${l.passTD ? ` and ${count(l.passTD, "touchdown")}` : ""}`);
  if (l.rushYds && (!l.att || l.rushYds >= 40)) bits.push(`running for ${l.rushYds} yards${l.rushTD ? ` and ${count(l.rushTD, "touchdown")}` : ""}`);
  if (l.recYds) bits.push(`catching ${count(l.rec || 0, "pass", "passes")} for ${l.recYds} yards${l.recTD ? ` and ${count(l.recTD, "touchdown")}` : ""}`);
  if (l.sacks) bits.push(`sacking the quarterback ${l.sacks === 1 ? "once" : l.sacks === 2 ? "twice" : `${l.sacks} times`}`);
  if (l.ints) bits.push(`intercepting ${count(l.ints, "pass", "passes")}`);
  if (!bits.length && l.tkl) bits.push(`making ${l.tkl} tackles`);
  const b = bits.slice(0, 2);
  return b.length > 1 ? `${b[0]} and ${b[1]}` : b[0] || "";
}
export function superBowlMvp(box, ti) {
  const score = (l) => (l.passYds || 0) / 25 + (l.passTD || 0) * 4 - (l.passInt || 0) * 3 + (l.rushYds || 0) / 10 + (l.recYds || 0) / 10 + ((l.rushTD || 0) + (l.recTD || 0)) * 6 + (l.sacks || 0) * 5 + (l.ints || 0) * 6 + (l.tkl || 0) * 0.5;
  const best = Object.entries(box || {}).map(([pid, l]) => ({ pid, l })).sort((a, b) => score(b.l) - score(a.l))[0];
  if (!best) return null;
  const l = best.l, bits = [];
  if (l.att) bits.push(`${l.comp || 0}/${l.att}, ${l.passYds || 0} yds, ${l.passTD || 0} TD`);
  if (l.rushYds) bits.push(`${l.rushYds} rush yds${l.rushTD ? `, ${l.rushTD} TD` : ""}`);
  if (l.recYds) bits.push(`${l.rec || 0} rec, ${l.recYds} yds${l.recTD ? `, ${l.recTD} TD` : ""}`);
  if (l.sacks) bits.push(`${l.sacks} sacks`);
  if (l.ints) bits.push(`${l.ints} INT`);
  if (!bits.length && l.tkl) bits.push(`${l.tkl} tackles`);
  return { pid: best.pid, name: l.name, pos: l.pos, ti, stat: bits.slice(0, 2).join(" · "), prose: mvpProse(l) };
}

// The sheet's main button stays in view at the bottom while the list scrolls.
const stickyFoot = { position: "sticky", bottom: MOBILE ? "calc(-16px - env(safe-area-inset-bottom))" : -14, margin: MOBILE ? "4px -14px calc(-16px - env(safe-area-inset-bottom))" : "4px -14px -14px", padding: MOBILE ? "10px 14px calc(16px + env(safe-area-inset-bottom))" : "10px 14px 14px", background: "linear-gradient(180deg, #0b122000, #0b1220 30%)", zIndex: 2 };

const ROWS = [["mvp", "Most Valuable Player"], ["opoy", "Offensive Player of the Year"], ["dpoy", "Defensive Player of the Year"], ["oroy", "Offensive Rookie of the Year"], ["droy", "Defensive Rookie of the Year"], ["cpoy", "Comeback Player of the Year"], ["coy", "Coach of the Year"]];

function Row({ label, w, teams, ui, big }) {
  const t = w ? teams[w.ti] : null;
  const mine = w && w.ti === ui;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: MOBILE ? 10 : 12, padding: MOBILE ? "7px 10px" : big ? "12px 14px" : "10px 12px", borderRadius: 10, background: mine ? `${C.gn}1c` : "#ffffff08", border: `1px solid ${mine ? C.gn : "#ffffff14"}` }}>
      {t ? <TeamLogo t={t} sz={MOBILE ? (big ? 32 : 26) : big ? 40 : 32} /> : <span style={{ width: MOBILE ? 26 : 32 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: MOBILE ? 10.5 : 12, fontWeight: 900, letterSpacing: 1, color: "#fcd34d" }}>{label.toUpperCase()}</div>
        {w ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: MOBILE ? (big ? 17 : 15.5) : big ? 19 : 17, fontWeight: 800, minWidth: 0 }}>{w.pos && <Bdg pos={posTag(w)} />}<span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{w.name}</span>{mine && <span style={{ fontSize: 11, fontWeight: 900, color: C.gn }}>YOUR TEAM</span>}</div>
            <div style={{ fontSize: MOBILE ? 12 : 13, color: "#cbd5e1", lineHeight: 1.35 }}>{t ? (MOBILE ? t.ab : `${t.city} ${t.name}`) : ""}{w.stat ? ` · ${w.stat}` : ""}</div>
          </>
        ) : <div style={{ fontSize: 15, color: C.mt }}>Not awarded</div>}
      </div>
    </div>
  );
}

// One honoree in the All-Pro list: slot, name, club.
const Pick = ({ e, ui }) => (
  <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: MOBILE ? 14 : 15, lineHeight: MOBILE ? 1.45 : 1.5, minWidth: 0, color: e.ti === ui ? "#86efac" : "#e2e8f0" }}>
    <span style={{ width: 40, flexShrink: 0, fontSize: 12, fontWeight: 900, color: "#fcd34d" }}>{e.slot}</span>
    <span style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.name}</span>
    <span style={{ fontSize: 13, color: "#94a3b8", flexShrink: 0 }}>{e.team}</span>
  </div>
);

// the biggest awards get the stage smoke (not the rookie awards)
const BIG = new Set(["sbmvp", "mvp", "opoy", "dpoy"]);
// the Super Bowl MVP stands beside the Lombardi
const TROPHY = { sbmvp: lombardiArt, mvp: mvpArt, opoy: opoyArt, dpoy: dpoyArt, oroy: oroyArt, droy: droyArt };
const findPlayer = (t, w) => (t && w?.pid != null ? [...(t.roster || []), ...(t.ir || []), ...(t.ps || [])].find((x) => x.id === w.pid) : null);

// Your player won it: his own page, standing in the spotlight with the trophy, before the league's list.
function YourWinner({ yr, k, label, w, teams, onNext, last }) {
  const t = teams[w.ti], p = findPlayer(t, w) || { name: w.name, pos: w.pos };
  return (
    <Spotlight p={p} team={t} kicker={k === "sbmvp" ? `🏆 ${sbName(sbNumber(yr))} MVP · World Champions` : `🏆 ${yr} ${label}`} title={w.name} bg={jerseyNum(p) != null ? `#${jerseyNum(p)}` : null} smoke={BIG.has(k)} confetti={["#fbbf24", "#fde68a", t.clr, t.ac, "#ffffff"]} label={`${label}: ${w.name}`}
      side={TROPHY[k] && <img src={TROPHY[k]} alt="" style={{ height: MOBILE ? 110 : "min(40vh, 360px)", maxWidth: "100%", objectFit: "contain", filter: "drop-shadow(0 16px 24px #000c)" }} />}
      cta={last ? "THE LEAGUE'S AWARDS →" : "NEXT AWARD →"} onNext={onNext}>
      <div>{posTag(p)} · {t.city} {t.name}</div>
      {(w.prose || w.stat) && <div style={{ color: "#fcd34d", marginTop: 2 }}>{w.prose ? `${w.name.split(" ").slice(-1)[0]} was the difference, ${w.prose}.` : w.stat}</div>}
    </Spotlight>
  );
}

// Page two: your honorees first (with what they gain), then the first and second teams.
function HonorsPage({ yr, h, teams, ui, onBack, onClose, cta }) {
  const best = honorsById(h);
  const roster = teams[ui]?.roster || [];
  const mine = roster.filter((p) => best[p.id]).map((p) => ({ p, k: best[p.id] })).sort((a, b) => ["ap1", "ap2", "pb"].indexOf(a.k) - ["ap1", "ap2", "pb"].indexOf(b.k));
  const Team = ({ title, list }) => (
    <div style={{ padding: "12px 14px", borderRadius: 10, background: "#ffffff08", border: "1px solid #ffffff14" }}>
      <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.5, color: "#fcd34d", marginBottom: 6 }}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: "2px 16px" }}>{list.map((e) => <Pick key={e.pid} e={e} ui={ui} />)}</div>
    </div>
  );
  return (
    <>
      <div style={{ padding: MOBILE ? "14px 56px 12px 16px" : "18px 20px 14px", textAlign: "center", background: "linear-gradient(135deg,#713f12cc,#0b1220)" }}>
        <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: 2, color: "#fde68a" }}>{yr} ALL-PRO TEAM</div>
        <div style={{ fontSize: MOBILE ? 13 : 15, color: "#e2e8f0", marginTop: 4 }}>The league's best at every spot. Honorees gain OVR this off-season.</div>
      </div>
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ padding: "12px 14px", borderRadius: 10, background: `${C.gn}14`, border: `1px solid ${C.gn}66` }}>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.5, color: "#86efac", marginBottom: 6 }}>YOUR HONOREES</div>
          {!mine.length && <div style={{ fontSize: 15, color: "#cbd5e1" }}>None of your players made the All-Pro teams or the Pro Bowl this year.</div>}
          {mine.map(({ p, k }) => {
            const g = honorBoost(k, p.ovr || 0);
            return (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, padding: "3px 0" }}>
                <Bdg pos={posTag(p)} />
                <span style={{ minWidth: 0, flex: 1, lineHeight: 1.3 }}><b style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</b><span style={{ color: "#cbd5e1", fontSize: 13 }}>{HONOR_LABEL[k]}{(h.best || []).some((e) => e.pid === p.id) ? ` · 👑 ${bestLabel(h.best.find((e) => e.pid === p.id).slot)}` : ""}</span></span>
                <span style={{ marginLeft: "auto", fontWeight: 900, color: g ? C.gn : C.mt, fontSize: 14, whiteSpace: "nowrap" }}>{g ? `+${g} OVR` : "already elite"}</span>
              </div>
            );
          })}
        </div>
        {h.best?.length > 0 && (
          <div style={{ padding: "12px 14px", borderRadius: 10, background: "#ffffff08", border: "1px solid #fcd34d55" }}>
            <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.5, color: "#fcd34d", marginBottom: 6 }}>👑 THE BEST AT EACH POSITION</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))", gap: "2px 16px" }}>
              {h.best.map((e) => (
                <div key={e.slot} style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: MOBILE ? 14 : 15, lineHeight: 1.5, minWidth: 0, color: e.ti === ui ? "#86efac" : "#e2e8f0" }}>
                  <span style={{ fontSize: 12, color: "#fcd34d", fontWeight: 800, minWidth: MOBILE ? 118 : 128 }}>{bestLabel(e.slot)}</span>
                  <b style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</b><span style={{ color: C.mt, fontSize: 13 }}>{e.team}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <Team title="FIRST-TEAM ALL-PRO" list={h.ap1} />
        {h.ap2?.length > 0 && <Team title="SECOND-TEAM ALL-PRO" list={h.ap2} />}
        <div style={{ ...stickyFoot, display: "flex", gap: 8 }}>
          <Btn onClick={onBack} bg={C.bd} c="#e2e8f0" style={{ fontSize: 15, padding: "10px 16px", fontWeight: 800 }}>← Awards</Btn>
          <Btn onClick={onClose} bg={C.gn} style={{ flex: 1, fontSize: 16, padding: "10px 0", fontWeight: 900 }}>{cta}</Btn>
        </div>
      </div>
    </>
  );
}

export default function SeasonAwards({ show, teams, ui, onClose, cta = "Continue" }) {
  const { yr, champ, opp, score, sbmvp, awards = {} } = show;
  // your own winners (players, not the coach) get their spotlight first, one at a time
  const mine = [["sbmvp", "Super Bowl MVP", sbmvp], ...ROWS.filter(([k]) => k !== "coy").map(([k, l]) => [k, l, awards[k]])].filter(([, , w]) => w && w.ti === ui && w.pid != null);
  const [spot, setSpot] = useState(0);
  const [page, setPage] = useState(1);
  // awards night: the envelopes open one at a time (a click shows them all)
  const [all, setAll] = useState(false);
  const step = (i) => ({ animation: `awIn .55s ease-out ${all ? 0 : 0.5 + i * 0.75}s both` });
  const ct = teams[champ], ot = opp != null ? teams[opp] : null;
  if (spot < mine.length) { const [k, l, w] = mine[spot]; return <YourWinner key={k} yr={yr} k={k} label={l} w={w} teams={teams} onNext={() => setSpot(spot + 1)} last={spot === mine.length - 1} />; }
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(2,6,15,.88)", zIndex: 2300, display: "flex", alignItems: "center", justifyContent: "center", padding: 14, ...sheetWrap(MOBILE) }}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Season awards" key={page} style={{ position: "relative", width: "100%", maxWidth: MOBILE ? 560 : page === 1 ? 860 : 620, maxHeight: "92vh", overflowY: "auto", borderRadius: 16, background: "#0b1220", border: "2px solid #d4a017", boxShadow: "0 0 70px #d4a01744", ...sheetBox(MOBILE) }}>
        <CloseX onClick={onClose} />
        {page === 2 ? <HonorsPage yr={yr} h={awards.honors} teams={teams} ui={ui} onBack={() => setPage(1)} onClose={onClose} cta={cta} /> : <>
        <div style={{ padding: MOBILE ? "14px 56px 12px 16px" : "18px 20px 14px", textAlign: "center", background: `linear-gradient(135deg, ${ct?.clr || "#1e3a5f"}dd, #0b1220)` }}>
          <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: 2, color: "#fde68a" }}>{yr} SEASON AWARDS</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 8 }}>
            {ct && <TeamLogo t={ct} sz={MOBILE ? 44 : 64} />}
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#ffffffb0" }}>{sbName(sbNumber(yr))} champions</div>
              <div style={{ fontSize: MOBILE ? 20 : 26, fontWeight: 900, lineHeight: 1.1 }}>{ct ? `${ct.city} ${ct.name}` : "—"}</div>
              {ot && score && <div style={{ fontSize: 14, color: "#e2e8f0" }}>Beat the {ot.name} {score}</div>}
            </div>
          </div>
        </div>
        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          <style>{"@keyframes awIn{from{opacity:0;transform:translateY(14px) scale(.97);filter:blur(3px)}to{opacity:1;transform:none;filter:none}}"}</style>
          {/* two columns on a computer (eight awards fit without scrolling), the Super Bowl MVP across both */}
          <div onClick={() => setAll(true)} style={{ display: "grid", gridTemplateColumns: MOBILE ? "1fr" : "1fr 1fr", gap: 8, cursor: all ? "default" : "pointer" }} title={all ? undefined : "Show every award"}>
            <div style={{ ...step(0), gridColumn: "1 / -1" }}><Row label="Super Bowl MVP" w={sbmvp} teams={teams} ui={ui} big /></div>
            {ROWS.filter(([k]) => awards[k] || !["cpoy", "coy"].includes(k)).map(([k, l], i) => <div key={k} style={step(i + 1)}><Row label={l} w={awards[k]} teams={teams} ui={ui} /></div>)}
          </div>
          <div style={stickyFoot}><Btn onClick={awards.honors ? () => setPage(2) : onClose} bg={C.gn} style={{ width: "100%", fontSize: 16, padding: "11px 0", fontWeight: 900, letterSpacing: 1 }}>{awards.honors ? "CONTINUE →" : cta}</Btn></div>
        </div>
        </>}
      </div>
    </div>
  );
}
