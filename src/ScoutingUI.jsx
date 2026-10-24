// Scouting and draft screens: the Big Board (always in consensus order), your own list, the
// Combine, your scouting staff, and the prospect profile. Game state comes in as `g`.
import Select from "./Select.jsx";
import { US_NATION, US_BORDERS, SCHOOL_XY } from "./usMap.js";
import { posTag } from "./dline.js";
import { slotsFor } from "./draftProjection.js";
import { topNeeds, fillsNeed, teamNeeds, needGroup, NEED_STARTERS } from "./needs.js";
import { MOBILE } from "./mobile.js";
import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { mockDraft } from "./mockDraft.js";
import { C, oC, PA_LABELS, Bdg, Btn, PN, Face, TeamLogo, CloseX, Segments, Sheet, Row, Hero, Section, Chips } from "./ui.jsx";
import { Jersey, rookieNum } from "./Jersey.jsx";
import RoleTag from "./RoleTag.jsx";
import Spotlight, { Dim } from "./Spotlight.jsx";
import { ROLE_FILTERS, roleFilterMatch } from "./roleNeeds.js";
import {
  prospectRead, scoutProspect, interviewProspect, privateWorkout, PRIVATE_WORKOUTS, scoutsShortlist, coverage, csRank, riskLabel, gradeTone,
  SCOUT_ROLES, SCOUT_GROUPS, SCOUT_GROUP_SHORT, regionReport, onSpec, potGrade, scoutGroup as scoutGroupOfPos, SCOUT_TRAITS, DEV_TRAITS, COMBINE_TESTS, COMBINE_INVITES, SCOUT_PTS_START, SCOUT_PTS_WEEKLY, SCOUT_PTS_COMBINE,
  staffWindowOpen, SCOUT_SLOTS, slotKind, hireScout, releaseScout, swapScoutRoles, listIds, toggleList, moveOnList, pickTake, classGrade, gradeRank, isSmallSchool, devOf, combineRank, rankColor,
  myBoard, regionOf, regionName, areasOf, assignArea, AREA_KEYS, suggestAreas, REGIONS, setRegionScout, areaCap, uncovered, SCOUT_CHECKPOINTS, areaSeason, lockAreas,
} from "./scouting.js";

const POS = ["QB", "RB", "WR", "TE", "LT", "LG", "C", "RG", "RT", "DL", "LB", "CB", "S", "K", "P"];
const TONE = { a: "#22c55e", b: "#60a5fa", c: "#f59e0b", d: "#ef4444", "": "#94a3b8" };
const htS = (i) => `${Math.floor(i / 12)}'${i % 12}"`;
const panel = { background: C.cd, border: `1px solid ${C.bd}`, borderRadius: 8, padding: "12px 14px", marginBottom: 10 };
const head = { fontSize: 14, fontWeight: 800, color: "#7dd3fc", letterSpacing: 1, marginBottom: 8, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" };
const muted = { fontSize: 13, color: C.mt, lineHeight: 1.5 };
const chipBtn = (on) => ({ background: on ? C.bl + "33" : "transparent", color: on ? "#fff" : C.mt, border: `1px solid ${on ? C.bl : C.bd}`, padding: "5px 10px", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" });
const Right = ({ children }) => <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 400, letterSpacing: 0, color: C.mt, fontSize: 13 }}>{children}</span>;

// ---------- Small pieces ----------

// One of your reads: "??" (no idea), "B+" (a scout's general idea), "~72" (a report) or "72" (exact).
export function Read({ label, txt, title }) {
  const kind = txt === "??" ? "unk" : txt.startsWith("~") ? "est" : /^[A-D]/.test(txt) ? "gen" : "exact";
  const color = kind === "unk" ? "#475569" : kind === "gen" ? TONE[gradeTone(txt)] : kind === "exact" ? oC(+txt) : "#cbd5e1";
  return (
    <span title={title} style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", minWidth: 36, padding: "1px 5px", borderRadius: 4, background: C.bg, lineHeight: 1.15, border: `1px ${kind === "gen" ? "dashed" : "solid"} ${kind === "exact" ? "#166534" : C.bd}` }}>
      <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: 0.8, color: C.mt }}>{label}</span>
      <b style={{ fontSize: 13, color }}>{txt}</b>
    </span>
  );
}

export function GradeChip({ g, small, title }) {
  if (!g) return null;
  const c = TONE[gradeTone(g)];
  return <span title={title} style={{ display: "inline-block", minWidth: small ? 22 : 28, textAlign: "center", padding: small ? "0 4px" : "1px 6px", borderRadius: 4, fontWeight: 800, fontSize: small ? 10 : 12, background: c + "22", color: c }}>{g}</span>;
}

const DEV_STYLE = { generational: ["#f472b6", "#9d174d"], superstar: ["#f5c542", "#8a6d1d"], star: ["#60a5fa", "#1e3a5f"], normal: ["#94a3b8", C.bd], late: ["#c4b5fd", "#6d5bd0"] };
export function DevChip({ dev, hint = "Development trait unknown. A full workup from a major scout always reveals it; a sharp scout often sees it sooner." }) {
  if (!dev || !DEV_STYLE[dev] || !DEV_TRAITS[dev]) return <span title={hint} style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 999, border: `1px dashed ${C.bd}`, color: "#475569", whiteSpace: "nowrap" }}>Dev ?</span>;
  const [c, b] = DEV_STYLE[dev];
  return <span title={DEV_TRAITS[dev].desc} style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 999, border: `1px solid ${b}`, color: c, background: c + "14", whiteSpace: "nowrap" }}>{DEV_TRAITS[dev].name}</span>;
}

// The development trait, big: on the player card, the prospect's read and draft night, where it
// matters most. The rarer the trait, the louder the badge. size: "md" or "lg".
const DEV_ICON = { generational: "💎", superstar: "⚡", star: "⭐", late: "🌱", normal: "" };
export function DevBadge({ dev, size = "md", hint = "Development trait unknown. A full workup from a major scout always reveals it; a sharp scout often sees it sooner." }) {
  const lg = size === "lg", fs = lg ? 15 : 13, pad = lg ? "6px 14px" : "4px 11px";
  if (!dev || !DEV_STYLE[dev] || !DEV_TRAITS[dev]) return <span title={hint} style={{ display: "inline-flex", alignItems: "center", fontSize: fs, fontWeight: 900, letterSpacing: 1, padding: pad, borderRadius: 8, border: `1px dashed ${C.bd}`, color: "#64748b", whiteSpace: "nowrap" }}>DEV ?</span>;
  const [c, b] = DEV_STYLE[dev], hot = dev === "generational" || dev === "superstar";
  return (
    <span title={DEV_TRAITS[dev].desc} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: fs, fontWeight: 900, letterSpacing: 1.2, textTransform: "uppercase", padding: pad, borderRadius: 8, whiteSpace: "nowrap",
      color: hot ? "#1c1206" : c, border: `1.5px solid ${hot ? c : b}`, background: hot ? `linear-gradient(135deg, ${c}, ${c}bb)` : c + "1f", boxShadow: hot ? `0 0 18px ${c}66` : dev === "star" ? `0 0 10px ${c}33` : "none" }}>
      {DEV_ICON[dev] && <span style={{ fontSize: fs + 1 }}>{DEV_ICON[dev]}</span>}{DEV_TRAITS[dev].name}{dev === "normal" ? " dev" : ""}
    </span>
  );
}

export function CovTag({ read }) {
  const role = read.cov;
  const c = role === "major" ? "#f5c542" : role === "minor" ? "#60a5fa" : "#64748b";
  const crew = read.scout ? [read.scout, ...(read.others || [])] : [];
  const title = crew.length > 1 ? `${crew.length} scouts on it: ${crew.map((x) => x.name).join(", ")} all work the ${regionName(read.region)}` : read.scout ? `${SCOUT_ROLES[role].name}: ${read.scout.name} (${regionName(read.region)}, evaluation ${read.scout.eval}${read.scout.group ? `, specialty ${SCOUT_GROUP_SHORT[read.scout.group]}` : ""})` : `None of your scouts works the ${regionName(read.region)}, so your front office's generalists file the reports.`;
  return <span title={title} style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", padding: "2px 6px", borderRadius: 3, border: `1px solid ${c}66`, color: c, whiteSpace: "nowrap" }}>{role === "office" ? "No scout" : crew.length > 1 ? `${crew.length} scouts` : SCOUT_ROLES[role].short}</span>;
}

function Arrow({ p }) {
  const c = p.cons;
  const cur = c?.final ?? c?.now;
  if (!cur || cur === c.mid) return null;
  const up = cur < c.mid;
  return <span title={`Preseason #${c.mid} → ${c.final ? "final" : "now"} #${cur}`} style={{ display: "block", fontSize: 9, fontWeight: 700, color: up ? C.gn : C.rd }}>{up ? "▲" : "▼"}{Math.abs(c.mid - cur)}</span>;
}

// A line across the board where one of your picks falls.
function PickMark({ pk }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "4px 0", color: C.gd, fontSize: 12, fontWeight: 900, letterSpacing: 1.2 }}>
      <span style={{ flex: "0 0 12px", height: 2, background: C.gd }} />
      <span style={{ whiteSpace: "nowrap" }}>{pk.i === 0 ? "▼ YOUR FIRST PICK" : "▼ YOUR PICK"} · #{pk.n}</span>
      <span style={{ flex: 1, height: 2, background: `linear-gradient(90deg, ${C.gd}, transparent)` }} />
    </div>
  );
}

// On your scouts' board: where the consensus has him, and whether your scouts like him more or less.
function MyDelta({ mine, cons }) {
  const d = cons - mine;
  const c = d >= 10 ? C.gn : d <= -10 ? C.rd : "#64748b";
  return <span title={`Consensus #${cons}; your scouts #${mine}`} style={{ display: "block", fontSize: 9, fontWeight: 700, color: c }}>{Math.abs(d) >= 10 ? (d > 0 ? "▲" : "▼") : ""}cons {cons}</span>;
}

// ---------- Actions ----------

function useActions(g) {
  const swap = (np) => g.setDc((d) => ({ ...d, [np.draftYear]: (d[np.draftYear] || []).map((x) => (x.id === np.id ? np : x)) }));
  return {
    scout: (p) => {
      const r = scoutProspect(g.scouting, g.sp, p, g.teams, p.draftYear, g.yr);
      g.sm(r.msg);
      if (!r.ok) return;
      g.setScouting(r.sc);
      swap(r.p);
    },
    interview: (p) => {
      const r = interviewProspect(g.scouting, g.sp, p);
      g.sm(r.msg);
      if (!r.ok) return;
      g.setScouting(r.sc);
      swap(r.p);
    },
    workout: (p) => {
      const r = privateWorkout(g.scouting, g.sp, p, g.teams);
      g.sm(r.msg);
      if (!r.ok) return;
      g.setScouting(r.sc);
      swap(r.p);
    },
    toggle: (p) => g.setScouting((s) => toggleList(s, p.draftYear, p.id)),
    move: (p, dir) => g.setScouting((s) => moveOnList(s, p.draftYear, p.id, dir)),
  };
}

const canScoutClass = (g, cy) => cy === g.yr && g.sp !== "freeagency";
// Has this class been through the Combine yet? (runCombine grades every prospect in it.)
const tested = (p) => p.combPct !== undefined;

export function ScoutButton({ g, p, read, small }) {
  const a = useActions(g);
  // phones: points are scarce, so the first tap arms the button and the second spends
  const [arm, setArm] = useState(false);
  useEffect(() => { if (!arm) return; const t = setTimeout(() => setArm(false), 3000); return () => clearTimeout(t); }, [arm]);
  if (!canScoutClass(g, p.draftYear)) return null;
  const pts = g.scouting?.pts || 0;
  const cost = read.cost;
  const tip = !cost ? "Fully scouted" : read.lvl === 0 ? `File a scouting report (${cost} point)` : read.cov === "major" ? `Full workup (${cost} points): exact ratings and his development trait` : `Full workup (${cost} points): a sharper read`;
  const label = !cost ? "✓" : small ? `${read.lvl === 0 ? "Scout" : "Workup"} ${cost}` : `${read.lvl === 0 ? "Scout" : "Workup"} (${cost})`;
  return (
    <span title={tip}>
      <Btn onClick={(e) => { e?.stopPropagation?.(); if (MOBILE && !arm) { setArm(true); return; } setArm(false); a.scout(p); }} disabled={!cost || pts < cost} bg={arm ? "#78350f55" : cost ? `${C.bl}22` : "transparent"} c={arm ? "#fde68a" : cost ? C.bl : C.mt} style={small ? { padding: "4px 9px", fontSize: 13, minHeight: MOBILE ? 40 : 36, minWidth: MOBILE ? 72 : undefined, whiteSpace: "nowrap", borderRadius: MOBILE ? 10 : undefined } : { padding: "6px 12px", fontSize: 14, whiteSpace: "nowrap" }}>{arm ? "Confirm" : label}</Btn>
    </span>
  );
}

// ---------- Big Board ----------

// A rating as you know it, in plain big type: "?" (no idea), "B+" (a scout's general idea),
// "~72" (a report's estimate) or "72" (exact).
function Val({ txt, title }) {
  const unk = txt === "??", gen = /^[A-D]/.test(txt), est = txt.startsWith("~");
  const color = unk ? "#475569" : gen ? TONE[gradeTone(txt)] : est ? "#cbd5e1" : oC(+txt);
  return <b title={title} style={{ fontSize: 18, color, fontVariantNumeric: "tabular-nums" }}>{unk ? "?" : txt}</b>;
}

const STATUS = (read) => (read.lvl >= 2 ? ["Full workup", C.gn] : read.lvl === 1 ? ["Report", "#60a5fa"] : ["—", "#475569"]);

function ProspectRow({ g, p, onDraft, canDraft, myRank, gone }) {
  const a = useActions(g);
  const read = prospectRead(g.scouting, p);
  const listed = listIds(g.scouting, p.draftYear).includes(p.id);
  const [st, stc] = STATUS(read);
  const td = { padding: "10px 6px", borderBottom: `1px solid ${C.bd}66`, verticalAlign: "middle" };
  return (
    <tr onClick={() => g.setSel(p)} style={{ cursor: "pointer", opacity: gone ? 0.5 : 1 }} title={gone ? "Likely gone before your first pick: the board has him well above it" : undefined} onMouseOver={(e) => (e.currentTarget.style.background = "#1e293b55")} onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}>
      <td style={{ ...td, textAlign: "center", fontWeight: 800, fontSize: 16, color: myRank ? "#fcd34d" : "#94a3b8", width: 36 }}>{myRank || csRank(p)}{myRank ? <MyDelta mine={myRank} cons={csRank(p)} /> : <Arrow p={p} />}</td>
      <td style={{ ...td, width: 26 }}>
        <button onClick={(e) => { e.stopPropagation(); a.toggle(p); }} title={listed ? "Remove from your list" : "Add to your list"} aria-label={listed ? "Remove from your list" : "Add to your list"} style={{ background: "transparent", border: 0, cursor: "pointer", color: listed ? "#f5c542" : "#475569", fontSize: 20, padding: 0, lineHeight: 1 }}>{listed ? "★" : "☆"}</button>
      </td>
      <td style={{ ...td, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9" }}>{p.name} <span className="sc-show"><Bdg pos={posTag(p)} /><RoleTag p={p} /></span>{["generational", "superstar", "star"].includes(read.dev) && <span title={DEV_TRAITS[read.dev].desc} style={{ marginLeft: 6, fontSize: 11, fontWeight: 900, letterSpacing: 0.6, padding: "1px 7px", borderRadius: 999, color: DEV_STYLE[read.dev][0], border: `1px solid ${DEV_STYLE[read.dev][1]}`, background: DEV_STYLE[read.dev][0] + "1a", whiteSpace: "nowrap" }}>{DEV_ICON[read.dev]} {DEV_TRAITS[read.dev].name.toUpperCase()}</span>}{read.flag && <span title={read.flagWhy || "Your scouts red-flagged him: high bust risk."} style={{ fontSize: 11, fontWeight: 800, color: "#fee2e2", background: "#991b1b", borderRadius: 999, padding: "1px 7px", marginLeft: 6 }}>🚩 red flag</span>}{read.sleeper ? <span title={`${read.who} have seen through the board: he's a sleeper, much better than where he's ranked.`} style={{ fontSize: 11, fontWeight: 800, color: "#fdf2f8", background: "#be185d", borderRadius: 999, padding: "1px 7px", marginLeft: 6 }}>💎 sleeper</span> : read.hunch && <span title={`${read.who} has a hunch there's more to him than the board says. A report will tell.`} style={{ fontSize: 11, fontWeight: 800, color: "#f9a8d4", background: "#831843", borderRadius: 999, padding: "1px 7px", marginLeft: 6 }}>👀 hunch</span>}{read.devEarly && ["generational", "superstar"].includes(read.dev) && <span title={`${read.who} already see a ${read.dev} development trait.`} style={{ fontSize: 11, fontWeight: 800, color: read.dev === "generational" ? "#f472b6" : "#f5c542", border: `1px solid currentColor`, borderRadius: 999, padding: "1px 7px", marginLeft: 6 }}>{read.dev === "generational" ? "Generational" : "Superstar"}</span>}</div>
        <div className="sc-sub" style={{ fontSize: 13, color: C.mt, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 260 }}>{p.bio?.college} ({regionName(regionOf(p))}) · {p.age} yrs · {htS(p.ht_)} {p.wt}</div>
      </td>
      <td className="sc-hide" style={{ ...td, textAlign: "center" }}><Bdg pos={posTag(p)} /><RoleTag p={p} /></td>
      <td style={{ ...td, textAlign: "center" }}><Val txt={read.ovr} /></td>
      <td style={{ ...td, textAlign: "center" }}><Val txt={read.pot} title={read.tier ? `Projects as: ${read.tier}` : undefined} /></td>
      <td className="sc-hide" style={{ ...td, textAlign: "center", fontSize: 13, color: stc, whiteSpace: "nowrap" }}>{st}</td>
      <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
        <ScoutButton g={g} p={p} read={read} />
        {/* Draft only shows when it's your pick: a column of grayed buttons the rest of the time is just noise */}
        {onDraft && canDraft && <Btn onClick={() => onDraft(p)} bg={C.gn} style={{ padding: "6px 14px", fontSize: 14, marginLeft: 6, borderRadius: 8 }}>Draft</Btn>}
      </td>
    </tr>
  );
}

// Phones: the same prospect as a card, with the Draft button big when you're on the clock.
// Phones: one compact row per prospect. The single button is Draft while you're on the clock,
// otherwise Scout / Workup; tap the row for his full profile.
function ProspectCard({ g, p, onDraft, canDraft, myRank, gone }) {
  const a = useActions(g);
  const read = prospectRead(g.scouting, p);
  const listed = listIds(g.scouting, p.draftYear).includes(p.id);
  const [st, stc] = STATUS(read);
  const drafting = onDraft && canDraft;
  // a pick can't be taken back, so on a phone the first tap arms the button and the second drafts
  const [arm, setArm] = useState(false);
  useEffect(() => { if (!arm) return; const t = setTimeout(() => setArm(false), 3000); return () => clearTimeout(t); }, [arm]);
  return (
    <div onClick={() => g.setSel(p)} style={{ display: "flex", alignItems: "center", gap: 6, background: C.bg, border: `1px solid ${drafting ? `${C.gn}66` : C.bd}`, borderRadius: 8, padding: "4px 8px 4px 4px", cursor: "pointer" }}>
      <span style={{ width: 26, textAlign: "center", fontWeight: 900, fontSize: 14, color: myRank ? "#fcd34d" : "#94a3b8" }}>{myRank || csRank(p)}</span>
      <button onClick={(e) => { e.stopPropagation(); a.toggle(p); }} aria-label={listed ? "Remove from your list" : "Add to your list"} style={{ width: 30, minHeight: 36, background: "transparent", border: 0, fontSize: 18, color: listed ? C.gd : "#64748b", cursor: "pointer", padding: 0 }}>{listed ? "★" : "☆"}</button>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 800, fontSize: 15 }}><Bdg pos={posTag(p)} /><span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span><RoleTag p={p} />{read.flag && <span title={read.flagWhy || "Red flag"} style={{ fontSize: 12 }}>🚩</span>}</span>
        <span style={{ display: "block", fontSize: 12, color: C.mt, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.bio?.college}{read.lvl > 0 ? <> · <span style={{ color: stc }}>{st}</span></> : ""}</span>
      </span>
      <span style={{ textAlign: "center", minWidth: 28, lineHeight: 1.1 }}><Val txt={read.ovr} /><span style={{ display: "block", fontSize: 9, color: C.mt }}>OVR</span></span>
      <span style={{ textAlign: "center", minWidth: 28, lineHeight: 1.1 }}><Val txt={read.pot} /><span style={{ display: "block", fontSize: 9, color: C.mt }}>POT</span></span>
      <span onClick={(e) => e.stopPropagation()} style={{ minWidth: 66, display: "flex", justifyContent: "flex-end" }}>
        {drafting ? <Btn onClick={() => (arm ? onDraft(p) : setArm(true))} bg={arm ? C.gd : C.gn} c={arm ? "#111" : undefined} style={{ minHeight: 40, padding: "4px 12px", fontSize: 14, fontWeight: 900 }}>{arm ? "Confirm" : "Draft"}</Btn> : <ScoutButton g={g} p={p} read={read} small />}
      </span>
    </div>
  );
}

const sel = { background: C.bg, color: C.tx, border: `1px solid ${C.bd}`, borderRadius: 6, padding: "7px 10px", fontSize: 14, minHeight: MOBILE ? 44 : undefined };

// Phones: a prospect as a clean row (rank, face, name, position, role and what your scouts see,
// his potential big). A tap opens his profile, where you scout him; on the clock, Draft sits on the row.
function PhoneProspect({ g, p, onDraft, canDraft, myRank, gone, first }) {
  const read = prospectRead(g.scouting, p);
  const listed = listIds(g.scouting, p.draftYear).includes(p.id);
  const drafting = onDraft && canDraft;
  const [arm, setArm] = useState(false);
  useEffect(() => { if (!arm) return; const t = setTimeout(() => setArm(false), 3000); return () => clearTimeout(t); }, [arm]);
  const special = ["generational", "superstar", "star"].includes(read.dev);
  return (
    <div onClick={() => g.setSel(p)} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 66, padding: "8px 0", borderTop: first ? 0 : "1px solid #ffffff10", cursor: "pointer", opacity: gone ? 0.5 : 1 }}>
      <span style={{ width: 28, textAlign: "center", fontWeight: 900, fontSize: 15, color: myRank ? "#fcd34d" : "#94a3b8", flexShrink: 0 }}>{myRank || csRank(p)}</span>
      <Face s={p.face} sz={40} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontWeight: 800, fontSize: 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#f1f5f9" }}>{listed && <span style={{ color: C.gd, marginRight: 4 }}>★</span>}{p.name}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap", fontSize: 12, color: "#94a3b8" }}><Bdg pos={posTag(p)} /><RoleTag p={p} />{special && <span style={{ fontSize: 11, fontWeight: 900, color: DEV_STYLE[read.dev][0] }}>{DEV_TRAITS[read.dev].name}</span>}{read.sleeper && <span style={{ fontSize: 11, fontWeight: 900, color: "#f9a8d4" }}>Sleeper</span>}{read.flag && <span style={{ fontSize: 11, fontWeight: 900, color: "#fca5a5" }}>Red flag</span>}<span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.bio?.college}</span></span>
      </span>
      {/* what your scouts have on him (overall and ceiling) stays on the row, on the clock too */}
      <span style={{ display: "flex", gap: 10, flexShrink: 0, textAlign: "center", lineHeight: 1.1 }}>
        <span><Val txt={read.ovr} /><span style={{ display: "block", fontSize: 10, fontWeight: 800, color: C.mt, marginTop: 2 }}>OVR</span></span>
        <span><Val txt={read.pot} /><span style={{ display: "block", fontSize: 10, fontWeight: 800, color: C.mt, marginTop: 2 }}>POT</span></span>
      </span>
      {drafting && <span onClick={(e) => e.stopPropagation()}><button onClick={() => (arm ? onDraft(p) : setArm(true))} style={{ minHeight: 44, padding: "0 14px", borderRadius: 12, border: 0, background: arm ? C.gd : "#22c55e26", color: arm ? "#111" : "#4ade80", fontSize: 15, fontWeight: 900, cursor: "pointer" }}>{arm ? "Confirm" : "Draft"}</button></span>}
    </div>
  );
}
const SHOWS = [["all", "Everyone"], ["covered", "Regions my scouts cover"], ["scouted", "Scouted"], ["unscouted", "Not scouted yet"], ["list", "On my list"], ["flagged", "Sleepers & hunches"], ["redflags", "Red flags"], ["special", "Special dev traits"]];

export function Board({ g, classYr, fixedYr = false, onDraft, canDraft, title = "Big Board", page = 40 }) {
  const years = Object.keys(g.dc).map(Number).sort((x, y) => x - y);
  const [yrSel, setYrSel] = useState(null);
  const cy = fixedYr ? classYr : years.includes(yrSel) ? yrSel : classYr;
  const [pos, setPos] = useState("ALL");
  const [q, setQ] = useState("");
  const [show, setShow] = useState("all");
  const [n, setN] = useState(page);
  const [mine, setMine] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showOpen, setShowOpen] = useState(false);
  const all = useMemo(() => g.dc[cy] || [], [g.dc, cy]);
  const ranks = useMemo(() => (mine ? myBoard(g.scouting, all) : null), [mine, g.scouting, all]);
  const ids = listIds(g.scouting, cy);
  const list = all
    .filter((p) => pos === "ALL" || p.pos === pos || (pos.startsWith("R:") && roleFilterMatch(p, pos)))
    .filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()) || (p.bio?.college || "").toLowerCase().includes(q.toLowerCase()))
    .filter((p) => {
      if (show === "all") return true;
      if (["flagged", "redflags", "special"].includes(show)) {
        const r = prospectRead(g.scouting, p);
        return show === "flagged" ? r.sleeper || r.hunch : show === "redflags" ? r.flag : ["generational", "superstar", "star"].includes(r.dev);
      }
      return show === "scouted" ? p.scout?.lvl > 0 : show === "unscouted" ? !p.scout?.lvl : show === "list" ? ids.includes(p.id) : coverage(g.scouting, p).role !== "office";
    })
    .sort((a, b) => (ranks ? ranks.get(a.id) - ranks.get(b.id) : csRank(a) - csRank(b)));
  const final = all.some((p) => p.cons?.final);
  // your picks as lines across the board: everyone above your first pick's reach is likely gone
  const slots = cy === g.yr ? mySlots(g) : [];
  const rankOf = (p) => (ranks ? ranks.get(p.id) : csRank(p));
  const reach = slots.length ? pickWindow(slots[0])[0] : 0;
  const marked = [];
  { let k = 0; const left = [...slots]; for (const p of list.slice(0, n)) { while (left.length && rankOf(p) >= left[0]) { marked.push({ pk: { n: left[0], i: k++ }, key: `pk${left[0]}` }); left.shift(); } marked.push({ p, gone: !p.drafted && rankOf(p) < reach }); } }
  const climbers = ranks ? all.filter((p) => csRank(p) - ranks.get(p.id) >= 25).length : 0;
  const th = { padding: "6px", fontSize: 12, fontWeight: 800, letterSpacing: 1, color: C.mt, borderBottom: `1px solid ${C.bd}`, textAlign: "center" };
  if (MOBILE) {
    let k = 0;
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "0 2px 10px" }}>
          {[[false, "Consensus"], [true, "Your scouts"]].map(([k, l]) => <button key={l} onClick={() => setMine(k)} style={{ background: "transparent", border: 0, padding: "4px 0", color: mine === k ? "#fff" : "#64748b", fontSize: 16, fontWeight: 900, cursor: "pointer", borderBottom: `2px solid ${mine === k ? C.gn : "transparent"}` }}>{l}</button>)}
          <button onClick={() => setShowOpen(true)} style={{ marginLeft: "auto", background: "transparent", border: 0, padding: 0, color: show !== "all" || q ? "#7dd3fc" : "#94a3b8", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{q ? `"${q}"` : (SHOWS.find(([x]) => x === show) || SHOWS[0])[1]} ▾</button>
        </div>
        <Chips items={[["ALL", "All"], ...POS.map((x) => [x, x])]} value={pos} onChange={(x) => { setPos(x); setN(page); }} />
        <div style={{ height: 10 }} />
        <div style={{ background: "#ffffff0f", borderRadius: 18, padding: "0 14px" }}>
          {marked.map((x) => x.pk
            ? <div key={x.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0", color: C.gd, fontSize: 12, fontWeight: 900, letterSpacing: 1.2 }}><span style={{ flex: 1, height: 2, background: `${C.gd}66` }} />YOUR PICK · #{x.pk.n}<span style={{ flex: 1, height: 2, background: `${C.gd}66` }} /></div>
            : <PhoneProspect key={x.p.id} g={g} p={x.p} onDraft={onDraft} canDraft={canDraft} myRank={ranks?.get(x.p.id)} gone={x.gone} first={k++ === 0} />)}
          {!list.length && <div style={{ padding: "18px 0", color: C.mt, fontSize: 15 }}>No prospects match.</div>}
        </div>
        {list.length > n && <button onClick={() => setN(n + page)} style={{ width: "100%", minHeight: 48, marginTop: 10, borderRadius: 14, border: 0, background: "#ffffff0f", color: "#cbd5e1", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>Show more</button>}
        {showOpen && <Sheet title="Show" onClose={() => setShowOpen(false)}><input value={q} onChange={(e) => { setQ(e.target.value); setN(page); }} placeholder="Search name or college" aria-label="Search prospects" style={{ ...sel, width: "100%", boxSizing: "border-box", marginBottom: 8, borderRadius: 12 }} />{SHOWS.map(([x, l], i) => <Row key={x} first={i === 0} label={l} value={show === x ? "✓" : ""} tone={C.gn} onClick={() => { setShow(x); setN(page); setShowOpen(false); }} />)}<div style={{ height: 8 }} /></Sheet>}
      </div>
    );
  }
  return (
    <div style={panel}>
      <style>{"@media (max-width: 640px) { .sc-hide { display: none } .sc-t td, .sc-t th { padding-left: 3px !important; padding-right: 3px !important } .sc-sub { max-width: 120px !important } .sc-t button { padding: 5px 8px !important; font-size: 13px !important } } @media (min-width: 641px) { .sc-show { display: none } }"}</style>
      <div style={head}>
        {title}
        <Right>
          {[[false, "Consensus"], [true, "Your scouts"]].map(([k, l]) => <button key={l} onClick={() => setMine(k)} style={{ ...chipBtn(mine === k), fontSize: 13, padding: "4px 12px" }}>{l}</button>)}
        </Right>
      </div>
      {!MOBILE && <div style={{ ...muted, marginBottom: 8 }}>{mine ? `Your scouts' board: everyone ranked on your own scouts' reads (and the development traits they've seen); where they don't know a player, they go with the consensus. ▲ means your scouts like him a lot more than the consensus does, ▼ a lot less.${climbers ? ` They have ${climbers} prospect${climbers > 1 ? "s" : ""} 25+ spots higher than the consensus.` : ""}` : `Consensus ${final ? "final" : "preseason"} rankings: what the league's analysts think. AI teams mostly draft off this board.`}</div>}
      <div style={{ display: "flex", gap: MOBILE ? 6 : 8, marginBottom: MOBILE ? 8 : 10, flexWrap: MOBILE && !searching ? "nowrap" : "wrap" }}>
        {!fixedYr && years.length > 1 && (
          <Select value={cy} onChange={(e) => { setYrSel(+e.target.value); setN(page); }} aria-label="Draft class" style={MOBILE ? { ...sel, flex: "1 1 0", minWidth: 0 } : sel}>
            {years.map((y) => <option key={y} value={y}>{y + 1}{MOBILE ? "" : " draft"}</option>)}
          </Select>
        )}
        <Select value={pos} onChange={(e) => { setPos(e.target.value); setN(page); }} aria-label="Position" style={MOBILE ? { ...sel, flex: "1 1 0", minWidth: 0 } : sel}>
          {["ALL", ...POS].map((x) => <option key={x} value={x}>{x === "ALL" ? (MOBILE ? "All pos." : "All positions") : x}</option>)}
          {ROLE_FILTERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
        <Select value={show} onChange={(e) => { setShow(e.target.value); setN(page); }} aria-label="Show" style={MOBILE ? { ...sel, flex: "1 1 0", minWidth: 0 } : sel}>
          <option value="all">{MOBILE ? "All" : "Everyone"}</option>
          <option value="covered">Regions my scouts cover</option>
          <option value="scouted">Scouted</option>
          <option value="unscouted">Not scouted yet</option>
          <option value="list">On my list</option>
          <option value="flagged">💎 Sleepers & hunches</option>
          <option value="redflags">🚩 Red flags (bust risks)</option>
          <option value="special">⭐ Special dev traits spotted</option>
        </Select>
        {MOBILE && !searching && <button onClick={() => setSearching(true)} aria-label="Search prospects" style={{ ...sel, width: 44, padding: 0, cursor: "pointer" }}>🔍</button>}
        {(!MOBILE || searching) && <input value={q} autoFocus={MOBILE} onChange={(e) => { setQ(e.target.value); setN(page); }} placeholder="Search name or college" aria-label="Search prospects" style={{ ...sel, flex: "1 1 160px" }} />}
      </div>
      {cy !== g.yr && <div style={{ ...muted, marginBottom: 8 }}>An early look at a future class: your scouts can only file reports on the {g.yr} class.</div>}
      {MOBILE ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{marked.map((x) => x.pk ? <PickMark key={x.key} pk={x.pk} /> : <div key={x.p.id} style={{ opacity: x.gone ? 0.5 : 1 }}><ProspectCard g={g} p={x.p} onDraft={onDraft} canDraft={canDraft} myRank={ranks?.get(x.p.id)} gone={x.gone} /></div>)}</div>
      ) : (
      <div style={{ overflowX: "auto" }}>
        <table className="sc-t" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={th}>#</th><th style={th}></th><th style={{ ...th, textAlign: "left" }}>PLAYER</th><th className="sc-hide" style={th}>POS</th><th style={th}>OVR</th><th style={th}>POT</th><th className="sc-hide" style={th}>SCOUTED</th><th style={th}></th></tr></thead>
          <tbody>{marked.map((x) => x.pk ? <tr key={x.key}><td colSpan={8} style={{ padding: 0 }}><PickMark pk={x.pk} /></td></tr> : <ProspectRow key={x.p.id} g={g} p={x.p} onDraft={onDraft} canDraft={canDraft} myRank={ranks?.get(x.p.id)} gone={x.gone} />)}</tbody>
        </table>
      </div>
      )}
      {!list.length && <div style={{ ...muted, padding: 8 }}>No prospects match.</div>}
      {list.length > n && <div style={{ marginTop: 10, textAlign: "center" }}><Btn onClick={() => setN(n + page)} bg={C.bd} c="#cbd5e1" style={{ fontSize: 14, padding: "6px 14px" }}>Show more ({list.length - n} left)</Btn></div>}
    </div>
  );
}

export function Legend() {
  return <div style={{ ...muted, marginBottom: 10 }}><b style={{ color: "#cbd5e1" }}>Reading the board:</b> <b style={{ color: "#64748b" }}>?</b> not scouted yet · <b style={{ color: TONE.a }}>B+</b> your scout's rough idea · <b style={{ color: "#cbd5e1" }}>~84</b> estimate from a report · <b style={{ color: C.gn }}>84</b> exact. Tap a player for his full profile.</div>;
}

// ---------- Your list ----------

export function YourList({ g, classYr, onDraft, canDraft, compact = false }) {
  const a = useActions(g);
  const ids = listIds(g.scouting, classYr);
  const avail = new Map((g.dc[classYr] || []).map((p) => [p.id, p]));
  const taken = new Map((g.draftLog || []).filter((d) => d.player?.draftYear === classYr).map((d) => [d.player.id, d]));
  const rows = ids.map((id) => ({ id, p: avail.get(id), d: taken.get(id) })).filter((x) => x.p || x.d);
  const shown = compact ? rows.filter((x) => x.p).slice(0, 6) : rows;
  if (MOBILE) return (
    <div>
      <div style={{ fontSize: 14, color: "#94a3b8", margin: "0 2px 10px" }}>{rows.length ? `${rows.filter((x) => x.p).length} still available. Your own ranking: if the draft clock runs out, you take the top name.` : null}</div>
      <div style={{ background: "#ffffff0f", borderRadius: 18, padding: "0 14px" }}>
        {!rows.length && <div style={{ padding: "18px 0", fontSize: 15, color: "#cbd5e1", lineHeight: 1.45 }}>Nobody on it yet. Open a prospect on the Board and tap <b>My list</b> to build your own ranking. If the draft clock runs out, you take the top name.</div>}
        {shown.map(({ id, p, d }, i) => { const pl = p || d.player, read = p ? prospectRead(g.scouting, p) : null, k = ids.indexOf(id); return (
          <div key={id} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 64, padding: "6px 0", borderTop: i ? "1px solid #ffffff10" : 0, opacity: p ? 1 : 0.5 }}>
            <b style={{ width: 24, textAlign: "center", fontSize: 17, color: "#fcd34d" }}>{k + 1}</b>
            <span onClick={() => p && g.setSel(p)} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10, cursor: p ? "pointer" : "default" }}>
              <Face s={pl.face} sz={36} />
              <span style={{ minWidth: 0 }}><span style={{ display: "block", fontSize: 16, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pl.name}</span><span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#94a3b8", marginTop: 3 }}><Bdg pos={posTag(pl)} />{d ? `Gone #${d.overall} ${g.teams[d.owner]?.ab}` : `#${csRank(pl)} on the board`}</span></span>
            </span>
            {read && <span style={{ textAlign: "center", lineHeight: 1.1 }}><Val txt={read.pot} /><span style={{ display: "block", fontSize: 10, fontWeight: 800, color: C.mt, marginTop: 2 }}>POT</span></span>}
            {onDraft && p ? <button onClick={() => onDraft(p)} disabled={!canDraft} style={{ minHeight: 44, padding: "0 14px", borderRadius: 12, border: 0, background: "#22c55e26", color: "#4ade80", fontSize: 15, fontWeight: 900, opacity: canDraft ? 1 : 0.5 }}>Draft</button> : !compact && p && <span style={{ display: "flex", flexDirection: "column" }}>
              <button aria-label="Move up" disabled={k === 0} onClick={() => a.move(pl, -1)} style={{ width: 40, height: 26, border: 0, background: "transparent", color: k === 0 ? "#334155" : "#cbd5e1", fontSize: 16, cursor: "pointer" }}>▲</button>
              <button aria-label="Move down" disabled={k === ids.length - 1} onClick={() => a.move(pl, 1)} style={{ width: 40, height: 26, border: 0, background: "transparent", color: k === ids.length - 1 ? "#334155" : "#cbd5e1", fontSize: 16, cursor: "pointer" }}>▼</button>
            </span>}
          </div>
        ); })}
      </div>
    </div>
  );
  return (
    <div style={{ ...panel, background: "#0d1a0d", border: "1px solid #166534" }}>
      <div style={{ ...head, color: C.gn }}>⭐ YOUR LIST<Right>{rows.filter((x) => x.p).length} available</Right></div>
      {!rows.length && <div style={muted}>Star prospects on the Big Board (☆) to build your own ranking. It stays in the order you set, and if the draft clock runs out you take the top name on it.</div>}
      {shown.map(({ id, p, d }) => {
        const i = ids.indexOf(id);
        const pl = p || d.player;
        const read = p ? prospectRead(g.scouting, p) : null;
        return (
          <div key={id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 4px", borderBottom: `1px solid ${C.bd}44`, fontSize: 16, flexWrap: "wrap", opacity: p ? 1 : 0.5 }}>
            <b style={{ minWidth: 28, color: "#fef3c7", fontSize: 18 }}>{i + 1}.</b>
            <Bdg pos={posTag(pl)} />
            {p ? <PN p={p} setSel={g.setSel} /> : <span>{pl.name}</span>}
            <span style={{ color: C.mt, fontSize: 13 }}>consensus #{csRank(pl)}</span>
            {read && <span style={{ display: "inline-flex", gap: 14, marginLeft: "auto", alignItems: "baseline" }}><span style={{ fontSize: 12, color: C.mt }}>OVR <Val txt={read.ovr} /></span><span style={{ fontSize: 12, color: C.mt }}>POT <Val txt={read.pot} /></span></span>}
            <span style={{ display: "inline-flex", gap: 3, alignItems: "center", marginLeft: read ? 0 : "auto" }}>
              {d ? <span style={{ color: C.mt, fontSize: 11 }}>#{d.overall} {g.teams[d.owner]?.ab}</span> : (
                <>
                  {!compact && <button aria-label="Move up" disabled={i === 0} onClick={() => a.move(pl, -1)} style={{ background: "transparent", color: C.mt, border: "none", cursor: "pointer", fontSize: 20 }}>↑</button>}
                  {!compact && <button aria-label="Move down" disabled={i === ids.length - 1} onClick={() => a.move(pl, 1)} style={{ background: "transparent", color: C.mt, border: "none", cursor: "pointer", fontSize: 20 }}>↓</button>}
                  {onDraft && <Btn onClick={() => onDraft(p)} disabled={!canDraft} bg={C.gn} style={{ padding: "5px 12px", fontSize: 14 }}>Draft</Btn>}
                </>
              )}
              {!compact && <Btn onClick={() => a.toggle(pl)} bg="#7f1d1d22" c="#fca5a5" style={{ fontSize: 14, padding: "4px 9px" }}>✕</Btn>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Scouting staff ----------

// What each conference has in the class your scouts are working (next year's once the draft's done).
const useRegionReport = (g) => {
  const cls = g.dc?.[areaSeason(g.sp, g.yr)] || g.dc?.[g.yr];
  return useMemo(() => regionReport(cls), [cls]);
};

// The regions one scouting job works, as dropdowns while the staff window's open.
function AreaPicker({ g, slot }) {
  const s = g.scouting || {};
  const rep = useRegionReport(g);
  const mine = areasOf(s)[slot];
  const open = staffWindowOpen(g.sp);
  const set = (i, r) => { const x = assignArea(s, g.sp, slot, i, r, g.yr); g.sm(x.msg); if (x.ok) g.setScouting(x.sc); };
  if (!open) return <div style={{ fontSize: 13, color: "#cbd5e1" }}>🗺️ {mine.map(regionName).join(" · ")}</div>;
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
      <span style={{ fontSize: 13 }}>🗺️</span>
      {mine.map((r, i) => (
        <Select key={i} value={r} onChange={(e) => set(i, e.target.value)} aria-label={`${SCOUT_ROLES[slot].name} region ${i + 1}`} style={{ background: C.bg, color: C.tx, border: `1px solid ${C.bd}`, borderRadius: 6, padding: "4px 6px", fontSize: 13, flex: "1 1 120px", minWidth: 0 }}>
          {AREA_KEYS.map((k) => <option key={k} value={k}>{regionName(k)}{rep[k]?.strong ? ` · ▲${SCOUT_GROUP_SHORT[rep[k].strong.g]}` : ""}{rep[k]?.weak ? ` ▼${SCOUT_GROUP_SHORT[rep[k].weak.g]}` : ""}</option>)}
        </Select>
      ))}
    </div>
  );
}

// Your staff and the scouts for hire, as two tables (EA-style): tier stars, specialty, regions.
export function ScoutsView({ g }) {
  const s = g.scouting || {};
  const open = staffWindowOpen(g.sp);
  const act = (r) => { g.sm(r.msg); if (r.ok) g.setScouting(r.sc); };
  const [want, setWant] = useState(null);
  const [role, setRole] = useState("major");
  const pool = [...(s.pool || [])].filter((x) => !want || x.group === want).sort((a, b) => b.eval - a.eval);
  const staffGroups = SCOUT_SLOTS.map((k) => s[k]?.group).filter(Boolean);
  const gap = uncovered(s);
  const th = { padding: "6px 8px", fontSize: 11, fontWeight: 900, letterSpacing: 1, color: C.mt, textAlign: "left", borderBottom: `1px solid ${C.bd}`, whiteSpace: "nowrap" };
  const td = { padding: "7px 8px", borderBottom: `1px solid ${C.bd}66`, fontSize: 14, verticalAlign: "middle" };
  const Trait = ({ x }) => (x.trait ? <span title={SCOUT_TRAITS[x.trait].desc} style={{ fontSize: 12, background: "#4c1d95", color: "#ddd6fe", borderRadius: 4, padding: "1px 6px", fontWeight: 700, whiteSpace: "nowrap" }}>{SCOUT_TRAITS[x.trait].name}</span> : <span style={{ color: "#475569" }}>—</span>);
  return (
    <div>
      <div style={panel}>
        <div style={head}>MY SCOUTS<Right>{open ? "Staff and regions can change now" : "On the road: changes in free agency or the preseason"}</Right></div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead><tr><th style={th}>ROLE</th><th style={th}>NAME</th><th style={th}>TIER</th><th style={th}>SPECIALTY</th><th style={th}>TRAIT</th>{open && <th style={th}></th>}</tr></thead>
            <tbody>{SCOUT_SLOTS.map((r) => { const x = s[r]; return (
              <tr key={r}>
                <td style={{ ...td, fontSize: 12, fontWeight: 900, color: slotKind(r) === "major" ? "#f5c542" : "#60a5fa", whiteSpace: "nowrap" }}>{SCOUT_ROLES[r].short.toUpperCase()}</td>
                {x ? <>
                  <td style={td}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><Face s={x.face} sz={24} /><b style={{ whiteSpace: "nowrap" }}>{x.name}</b></div></td>
                  <td style={td}><Stars ev={x.eval} /> <span style={{ fontSize: 12, color: C.mt }}>{x.eval}</span></td>
                  <td style={{ ...td, color: "#67e8f9", fontWeight: 800 }}>{SCOUT_GROUP_SHORT[x.group] || "—"}</td>
                  <td style={td}><Trait x={x} /></td>
                  {open && <td style={td}><Btn onClick={() => act(releaseScout(s, g.sp, r))} bg="#7f1d1d" c="#fca5a5" style={{ fontSize: 12, padding: "3px 8px" }}>Let go</Btn></td>}
                </> : <td colSpan={open ? 5 : 4} style={{ ...td, color: C.mt }}>Vacant{open ? ": hire one below" : ""}</td>}
              </tr>); })}</tbody>
          </table>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
          {open && SCOUT_SLOTS.some((k) => s[k]) && <Btn onClick={() => act(swapScoutRoles(s, g.sp))} bg={C.bd} c="#cbd5e1" style={{ fontSize: 12 }}>⇄ Swap major and minor roles</Btn>}
          <span style={{ ...muted, marginLeft: "auto" }}>A scout reads the position he knows sharpest and others a lot worse. Send scouts to regions on the Regions tab.</span>
        </div>
      </div>
      <div style={panel}>
        <div style={head}>SCOUTS AVAILABLE{open && <Right>Hire as <Select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Hire into" style={{ background: C.bg, color: C.tx, border: `1px solid ${C.bd}`, borderRadius: 6, padding: "3px 6px", fontSize: 13, minWidth: 150 }}>{SCOUT_SLOTS.map((r) => <option key={r} value={r}>{SCOUT_ROLES[r].name}{s[r] ? ` (replaces ${s[r].name.split(" ").slice(-1)[0]})` : ""}</option>)}</Select></Right>}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {[null, "QB", "RB", "REC", "OL", "DL", "LB", "DB"].map((k) => <button key={k || "all"} onClick={() => setWant(k)} title={k ? `Scouts who specialize in ${SCOUT_GROUPS[k].toLowerCase()}` : "Everyone"} style={chipBtn(want === k)}>{k ? SCOUT_GROUP_SHORT[k] : "All"}{k && staffGroups.includes(k) ? " ✓" : ""}</button>)}
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
            <thead><tr><th style={th}>NAME</th><th style={th}>TIER</th><th style={th}>SPECIALTY</th><th style={th}>AGE</th><th style={th}>BACKGROUND</th><th style={th}>TRAIT</th>{open && <th style={th}></th>}</tr></thead>
            <tbody>{pool.map((x) => (
              <tr key={x.id}>
                <td style={td}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><Face s={x.face} sz={24} /><b style={{ whiteSpace: "nowrap" }}>{x.name}</b></div></td>
                <td style={td}><Stars ev={x.eval} /> <span style={{ fontSize: 12, color: C.mt }}>{x.eval}</span></td>
                <td style={{ ...td, color: "#67e8f9", fontWeight: 800 }}>{SCOUT_GROUP_SHORT[x.group] || "—"}</td>
                <td style={td}>{x.age}</td>
                <td style={{ ...td, fontSize: 12, color: C.mt }}>{x.bg}</td>
                <td style={td}><Trait x={x} /></td>
                {open && <td style={td}><Btn onClick={() => act(hireScout(s, g.sp, x.id, role))} bg={`${C.gn}22`} c={C.gn} style={{ fontSize: 12, padding: "3px 10px", whiteSpace: "nowrap" }}>Hire</Btn></td>}
              </tr>))}</tbody>
          </table>
          {!pool.length && <div style={{ ...muted, padding: 8 }}>Nobody's looking for work{want ? " at that position" : ""} right now.</div>}
        </div>
      </div>
    </div>
  );
}

// ---------- The Combine ----------

export function BuzzFeed({ g, buzz, limit }) {
  const tag = { up: ["RISING", C.gn], down: ["FALLING", C.rd], best: ["TOP TEST", "#60a5fa"], news: ["NEWS", "#f59e0b"] };
  const open = (pid) => { const p = (g.dc[g.yr] || []).find((x) => x.id === pid); if (p) g.setSel(p); };
  return (
    <div style={panel}>
      <div style={{ ...head, color: "#c4b5fd" }}>📡 DRAFT BUZZ</div>
      {(buzz || []).slice(0, limit || 99).map((x, i) => (
        <div key={i} onClick={() => open(x.pid)} style={{ padding: "6px 0", borderTop: `1px solid ${C.bd}66`, cursor: "pointer", fontSize: 14, lineHeight: 1.35 }}>
          <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: (tag[x.kind] || tag.news)[1], marginRight: 6 }}>{(tag[x.kind] || tag.news)[0]}</span>
          <span style={{ color: "#e2e8f0" }}>{x.text}</span>
        </div>
      ))}
      {!buzz?.length && <div style={muted}>No buzz yet.</div>}
    </div>
  );
}

const OL = ["LT", "LG", "C", "RG", "RT"];
const POS_GROUPS = [["All", null], ["QB", ["QB"]], ["RB", ["RB"]], ["WR", ["WR"]], ["TE", ["TE"]], ["OL", OL], ["EDGE", "EDGE"], ["DT", "DT"], ["LB", ["LB"]], ["CB", ["CB"]], ["S", ["S"]], ["K/P", ["K", "P"]]];
const inGroup = (p, grp) => !grp || (typeof grp === "string" ? posTag(p) === grp : grp.includes(p.pos));
const GRADE_ORDER = { "A+": 13, A: 12, "A-": 11, "B+": 10, B: 9, "B-": 8, "C+": 7, C: 6, "C-": 5, "D+": 4, D: 3, "D-": 2, F: 1 };

// Your remaining picks this year as overall numbers (the game keeps them projected from the
// standings until the draft starts: draftProjection.js).
export const mySlots = (g) => slotsFor(g.draftPicks, g.ui, g.yr, (g.draftLog || []).map((d) => d.id));

// The Combine shortlist from your scouts: who to interview and work out, picked for where you
// draft and what you need. compact: the top few, for Scouting HQ.
export function ScoutShortlist({ g, isNeed, compact }) {
  const a = useActions(g);
  const sc = g.scouting || {};
  const slots = mySlots(g);
  const list = scoutsShortlist(sc, g.dc[g.yr] || [], slots, { isNeed, max: compact ? 5 : 8 });
  const who = sc.major?.name ? `${sc.major.name} and your scouts` : "Your scouts";
  if (!slots.length) return <div style={{ fontSize: 14, color: "#94a3b8", padding: "6px 0" }}>You have no picks in this draft, so your scouts aren't lining up visits. Trade for a pick and they'll build a list.</div>;
  return (
    <div>
      {!compact && <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 6, lineHeight: 1.45 }}>{who} built this list around your picks ({slots.slice(0, 3).map((s) => `#${s}`).join(", ")}): players who should be there, at the positions you need, that they grade well, and anyone they want to know more about before you spend a premium pick on him (a rough read, a red flag, a poor Combine). The top names will be gone long before you pick: they're only worth a visit if you plan to trade up.</div>}
      {list.map(({ p, why, interview, workout }) => (
        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: `1px solid ${C.bd}66`, flexWrap: "wrap" }}>
          <Bdg pos={posTag(p)} />
          <div style={{ flex: 1, minWidth: 190, cursor: "pointer" }} onClick={() => g.setSel(p)}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{p.name} <span style={{ fontSize: 13, color: C.mt, fontWeight: 600 }}>{p.college || p.bio?.college || ""}</span></div>
            <div style={{ fontSize: 13, color: "#94a3b8" }}>{(compact ? why.slice(0, 2) : why).join(" · ")}</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {workout && <Btn onClick={() => a.workout(p)} disabled={!(sc.workoutsLeft > 0)} bg="#0c4a6e" c="#7dd3fc" style={{ fontSize: 13, padding: "6px 10px" }} title="Free full workup">🏋️ Workout</Btn>}
            {interview && <Btn onClick={() => a.interview(p)} disabled={!(sc.interviewsLeft > 0)} bg="#7c3aed33" c="#c4b5fd" style={{ fontSize: 13, padding: "6px 10px" }}>🎤 Interview</Btn>}
          </div>
        </div>
      ))}
      {!list.length && <div style={{ fontSize: 14, color: "#94a3b8", padding: "6px 0" }}>Everyone your scouts flagged around your picks has been interviewed and worked out.</div>}
    </div>
  );
}

export function CombineView({ g, buzz }) {
  const a = useActions(g);
  const live = g.sp === "combine";
  const sc = g.scouting || {};
  const all = (g.dc[g.yr] || []).filter((p) => tested(p) && p.combine);
  const me = g.teams[g.ui];
  const needs = topNeeds(me?.roster || [], 3);
  const isNeed = (p) => fillsNeed(needs, p);
  const [grp, setGrp] = useState("All");
  const [mine, setMine] = useState(false);
  const [sort, setSort] = useState("rank");
  const [n, setN] = useState(25);
  const [q, setQ] = useState("");
  const [sortOpen, setSortOpen] = useState(false);
  const g0 = POS_GROUPS.find(([k]) => k === grp)?.[1];
  const val = (p) => sort === "rank" ? -csRank(p) : sort === "grade" ? GRADE_ORDER[p.combGrade] || 0 : (() => { const t = COMBINE_TESTS.find((x) => x.k === sort); return t ? (t.lowGood ? -p.combine[t.k] : +p.combine[t.k]) : 0; })();
  const qq = q.trim().toLowerCase();
  const rows = all.filter((p) => inGroup(p, g0) && (!mine || isNeed(p)) && (!qq || `${p.name} ${p.bio?.college || p.college || ""}`.toLowerCase().includes(qq))).sort((x, y) => val(y) - val(x));
  // stock up: tested great relative to where the board has him; stock down: the reverse
  const up = all.filter((p) => (GRADE_ORDER[p.combGrade] || 0) >= 11 && csRank(p) > 40).sort((x, y) => (GRADE_ORDER[y.combGrade] - GRADE_ORDER[x.combGrade]) || csRank(x) - csRank(y)).slice(0, 4);
  // early names (preseason top 64) who tested poorly; the biggest slides first
  const down = all.filter((p) => ((GRADE_ORDER[p.combGrade] || 0) <= 4 || p.combDip) && p.combine && (p.cons?.mid ?? csRank(p)) <= 64).sort((x, y) => (csRank(y) - (y.cons?.mid ?? 0)) - (csRank(x) - (x.cons?.mid ?? 0))).slice(0, 4);
  const th = { padding: "7px 6px", textAlign: "right", color: C.mt, fontWeight: 800, whiteSpace: "nowrap", fontSize: 12, cursor: "pointer", userSelect: "none" };
  const td = { padding: "7px 6px", textAlign: "right", whiteSpace: "nowrap", fontSize: 14 };
  const pill = (on) => ({ ...chipBtn(on), fontSize: 13, padding: "5px 11px" });
  const Mover = ({ p, tone }) => (
    <div onClick={() => g.setSel(p)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: `1px solid ${C.bd}66`, cursor: "pointer" }}>
      <Bdg pos={posTag(p)} /><span style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
      <span style={{ fontSize: 12, color: C.mt, whiteSpace: "nowrap" }}>{p.cons?.mid && p.cons.mid !== csRank(p) ? `#${p.cons.mid} → #${csRank(p)}` : `#${csRank(p)}`}</span><GradeChip g={p.combGrade} small />
    </div>
  );
  // phones: what's left to spend, who rose and fell, then the results as clean rows sorted by one
  // test at a time (tap a player for every number, his ranks, the interview and the workout)
  if (MOBILE) {
    const t = COMBINE_TESTS.find((x) => x.k === sort);
    const soft = { background: "#ffffff0f", borderRadius: 18, padding: "0 14px" };
    const label = { fontSize: 12, fontWeight: 900, letterSpacing: 1.4, color: "#94a3b8", margin: "22px 2px 8px" };
    const row = (p, i, right) => (
      <div key={p.id} onClick={() => g.setSel(p)} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 62, padding: "6px 0", borderTop: i ? "1px solid #ffffff10" : 0, cursor: "pointer" }}>
        <Face s={p.face} sz={38} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 16, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#94a3b8", marginTop: 3 }}><Bdg pos={posTag(p)} />{isNeed(p) && <b style={{ color: C.gd }}>Need</b>}<span>#{csRank(p)} on the board</span></span>
        </span>
        {right}
      </div>
    );
    return (
      <div>
        {live && <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 4 }}>{[["INTERVIEWS", sc.interviewsLeft || 0, "#c4b5fd"], ["WORKOUTS", sc.workoutsLeft || 0, "#7dd3fc"], ["POINTS", sc.pts || 0, C.gd]].map(([k, v, c]) => <div key={k} style={{ background: "#ffffff0f", borderRadius: 16, padding: "12px 0", textAlign: "center" }}><div style={{ fontSize: 26, fontWeight: 900, color: v ? c : "#64748b", lineHeight: 1 }}>{v}</div><div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1.2, color: "#94a3b8", marginTop: 4 }}>{k} LEFT</div></div>)}</div>}
        {up.length > 0 && <><div style={{ ...label, color: "#4ade80" }}>STOCK UP</div><div style={soft}>{up.map((p, i) => row(p, i, <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 13, color: "#94a3b8" }}>{p.cons?.mid && p.cons.mid !== csRank(p) ? `#${p.cons.mid} → #${csRank(p)}` : ""}</span><GradeChip g={p.combGrade} /></span>))}</div></>}
        {down.length > 0 && <><div style={{ ...label, color: "#f87171" }}>STOCK DOWN</div><div style={soft}>{down.map((p, i) => row(p, i, <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 13, color: "#94a3b8" }}>{p.cons?.mid && p.cons.mid !== csRank(p) ? `#${p.cons.mid} → #${csRank(p)}` : ""}</span><GradeChip g={p.combGrade} /></span>))}</div></>}
        <div style={{ display: "flex", alignItems: "baseline", margin: "26px 2px 10px" }}><span style={{ fontSize: 20, fontWeight: 900 }}>Results</span><button onClick={() => setSortOpen(true)} style={{ marginLeft: "auto", background: "transparent", border: 0, color: "#7dd3fc", fontSize: 15, fontWeight: 700, cursor: "pointer", padding: "6px 0" }}>{sort === "rank" ? "Board order" : sort === "grade" ? "Combine grade" : t?.name} ▾</button></div>
        <Chips items={[...POS_GROUPS.map(([k]) => [k, k]), ["__mine", "My needs"]]} value={mine ? "__mine" : grp} onChange={(k) => { if (k === "__mine") setMine((v) => !v); else { setMine(false); setGrp(k); } setN(25); }} />
        <div style={{ ...soft, marginTop: 12 }}>
          {rows.slice(0, n).map((p, i) => row(p, i, t ? <span style={{ textAlign: "right", lineHeight: 1.1 }}><b style={{ fontSize: 18, color: p.combPcts?.[t.k] >= 0.9 ? C.gn : "#fff" }}>{(+p.combine[t.k]).toFixed(t.dp)}{t.unit === "s" ? "s" : t.unit === "in" ? '"' : ""}</b><span style={{ display: "block", fontSize: 10, fontWeight: 800, color: C.mt, marginTop: 2 }}>{t.short.toUpperCase()}</span></span> : <GradeChip g={p.combGrade} />))}
          {!rows.length && <div style={{ padding: "16px 0", color: "#94a3b8", fontSize: 15 }}>Nobody tested at that position.</div>}
        </div>
        {rows.length > n && <button onClick={() => setN(n + 25)} style={{ width: "100%", minHeight: 48, marginTop: 10, borderRadius: 14, border: 0, background: "#ffffff0f", color: "#cbd5e1", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>Show more</button>}
        <div style={{ fontSize: 13, color: C.mt, margin: "10px 2px 0" }}>Grades compare his testing with the other invitees at his position. Tap a player for every number and where it ranks.</div>
        {sortOpen && <Sheet title="Sort results by" onClose={() => setSortOpen(false)}>{[["rank", "Board order"], ["grade", "Combine grade"], ...COMBINE_TESTS.map((x) => [x.k, x.name])].map(([k, l], i) => <Row key={k} first={i === 0} label={l} value={sort === k ? "✓" : ""} tone={C.gn} onClick={() => { setSort(k); setN(25); setSortOpen(false); }} />)}<div style={{ height: 8 }} /></Sheet>}
      </div>
    );
  }
  return (
    <div>
      {live && (
        <div style={{ ...panel, display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", border: "1px solid #7c3aed" }}>
          <b style={{ color: "#c4b5fd", letterSpacing: 1, fontSize: 13 }}>COMBINE WEEK</b>
          <span style={{ fontSize: 15 }}>🎤 <b>{sc.interviewsLeft || 0}</b> interviews</span>
          <span style={{ fontSize: 15 }}>🏋️ <b>{sc.workoutsLeft || 0}</b> free workouts</span>
          <span style={{ fontSize: 15 }}>🔎 <b>{sc.pts || 0}</b> scouting points</span>
          <span style={{ ...muted, marginLeft: "auto" }}>Use them before the draft. Your scouts' picks are on Scouting HQ.</span>
        </div>
      )}
      {(up.length > 0 || down.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 10, marginBottom: 10 }}>
          <div style={{ ...panel, marginBottom: 0 }}><div style={{ ...head, color: C.gn }}>📈 STOCK UP</div>{up.map((p) => <Mover key={p.id} p={p} />)}{!up.length && <div style={muted}>Nobody from the back of the board blew up the Combine.</div>}</div>
          <div style={{ ...panel, marginBottom: 0 }}><div style={{ ...head, color: C.rd }}>📉 STOCK DOWN</div>{down.map((p) => <Mover key={p.id} p={p} />)}{!down.length && <div style={muted}>No early names tested poorly.</div>}</div>
        </div>
      )}
      <div style={panel}>
        <div style={head}>COMBINE RESULTS<Right><input value={q} onChange={(e) => { setQ(e.target.value); setN(25); }} placeholder="Search name or college" aria-label="Search prospects" style={{ background: C.bg, color: C.tx, border: `1px solid ${C.bd}`, borderRadius: 6, padding: "4px 8px", fontSize: 13, width: 200 }} />{rows.length} of {COMBINE_INVITES}</Right></div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {POS_GROUPS.map(([k]) => <button key={k} onClick={() => { setGrp(k); setN(25); }} style={pill(grp === k)}>{k}</button>)}
          <button onClick={() => { setMine((v) => !v); setN(25); }} style={{ ...pill(mine), marginLeft: 6 }}>⭐ My needs ({needs.join(", ")})</button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.bd}` }}>
                <th onClick={() => setSort("rank")} style={{ ...th, textAlign: "left", color: sort === "rank" ? "#fde68a" : C.mt }}>#</th><th style={{ ...th, textAlign: "left", cursor: "default" }}>Player</th><th style={{ ...th, cursor: "default" }}>Size</th>
                {COMBINE_TESTS.map((t) => <th key={t.k} onClick={() => setSort(t.k)} style={{ ...th, color: sort === t.k ? "#fde68a" : C.mt }} title={`Sort by ${t.name}${t.unit ? ` (${t.unit})` : ""}${t.lowGood ? ", lower is better" : ""}`}>{t.short}{sort === t.k ? " ▼" : ""}</th>)}
                <th onClick={() => setSort("grade")} style={{ ...th, color: sort === "grade" ? "#fde68a" : C.mt }}>Grade{sort === "grade" ? " ▼" : ""}</th><th style={{ ...th, cursor: "default" }}>{live ? "Workout / Interview" : "Interview"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, n).map((p) => {
                const read = prospectRead(sc, p);
                return (
                  <tr key={p.id} style={{ borderBottom: `1px solid ${C.bd}44`, background: isNeed(p) ? "#eab30808" : "transparent" }}>
                    <td style={{ ...td, textAlign: "left", color: "#94a3b8" }}>{csRank(p)}</td>
                    <td style={{ ...td, textAlign: "left" }}><PN p={p} setSel={g.setSel} /> <Bdg pos={posTag(p)} /></td>
                    <td style={{ ...td, color: C.mt, fontSize: 13 }}>{htS(p.ht_)} {p.wt}</td>
                    {COMBINE_TESTS.map((t) => <td key={t.k} style={{ ...td, color: p.combPcts?.[t.k] >= 0.9 ? C.gn : "#cbd5e1", fontWeight: p.combPcts?.[t.k] >= 0.9 || sort === t.k ? 800 : 400 }}>{(+p.combine[t.k]).toFixed(t.dp)}</td>)}
                    <td style={td}><GradeChip g={p.combGrade} small /></td>
                    <td style={{ ...td, display: "flex", gap: 4, justifyContent: "flex-end" }}>
                      {live && read.lvl < 2 && <Btn onClick={() => a.workout(p)} disabled={!(sc.workoutsLeft > 0)} bg="#0c4a6e" c="#7dd3fc" style={{ fontSize: 12, padding: "4px 8px" }} title="Free full workup">🏋️ Workout</Btn>}
                      {p.scout?.intv ? <span title={[...(p.scout.intv.good || []), ...(p.scout.intv.bad || [])].join(" ") || p.scout.intv.note} style={{ fontSize: 12 }}>{p.scout.intv.verdict ? "Interview" : "Ethic"} <GradeChip g={p.scout.intv.overall || p.scout.intv.grade} small /></span>
                        : live ? <Btn onClick={() => a.interview(p)} disabled={!(sc.interviewsLeft > 0)} bg="#7c3aed33" c="#c4b5fd" style={{ fontSize: 12, padding: "4px 8px" }}>🎤 Interview</Btn>
                        : <span style={{ color: "#475569" }}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length > n && <div style={{ marginTop: 8 }}><Btn onClick={() => setN(n + 25)} bg={C.bd} c="#cbd5e1" style={{ fontSize: 13, padding: "5px 12px" }}>Show 25 more ({rows.length - n} left)</Btn></div>}
        <div style={{ ...muted, marginTop: 6, fontSize: 12 }}>Click a column to sort by it. Grades compare each prospect's testing with the other invitees at his position; green results are in the top 10%. The 40, 3-cone and shuttle are timed, so lower is better. Gold rows are at your need positions.</div>
      </div>
    </div>
  );
}

// ---------- Draft day ----------

// The analysts' grades for every team's class, once the draft is over.
export function DraftGrades({ g }) {
  const by = {};
  for (const d of g.draftLog || []) if (d.grade) (by[d.owner] ||= []).push(d.grade);
  const rows = Object.entries(by).map(([tid, gs]) => ({ t: g.teams[tid], gr: classGrade(gs) })).filter((x) => x.t && x.gr).sort((a, b) => gradeRank(b.gr) - gradeRank(a.gr));
  if (!rows.length) return null;
  if (MOBILE) return <PhoneRecap g={g} rows={rows} />;
  return (
    <div style={panel}>
      <div style={head}>DRAFT GRADES</div>
      <div style={{ ...muted, marginBottom: 6 }}>Instant grades compare where each player went with where the consensus board had him. Analysts don't know what your scouts know.</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(84px,1fr))", gap: 4 }}>
        {rows.map(({ t, gr }) => (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 6px", borderRadius: 4, background: C.bg, boxShadow: t.id === g.ui ? `0 0 0 1px ${C.gn}` : "none" }}>
            <b style={{ fontSize: 12 }}>{t.ab}</b><span style={{ marginLeft: "auto" }}><GradeChip g={gr} small /></span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Phones, once the draft's done: your class up top (each pick, what he is and the analysts' grade),
// the whole league's grades a tap away.
function PhoneRecap({ g, rows }) {
  const [open, setOpen] = useState(false);
  const mine = (g.draftLog || []).filter((d) => d.owner === g.ui && d.player);
  const me = rows.find((x) => x.t.id === g.ui);
  const rank = me ? rows.indexOf(me) + 1 : null;
  const t = g.teams[g.ui];
  return (
    <div style={{ marginBottom: 18 }}>
      <Hero compact clr={t?.clr} logo={t} eyebrow={`Your ${mine[0]?.player?.draftYr ?? g.yr} draft class`} title={me ? `Grade ${me.gr}` : `${mine.length} picks`} sub={rank ? `${mine.length} pick${mine.length === 1 ? "" : "s"} · #${rank} of ${rows.length} in the league` : null} />
      <div style={{ background: "#ffffff0f", borderRadius: 18, padding: "0 14px", marginTop: 4 }}>
        {mine.map((d, i) => (
          <div key={d.player.id} onClick={() => g.setSel(d.player)} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 64, borderTop: i ? "1px solid #ffffff10" : 0, cursor: "pointer" }}>
            <Face s={d.player.face} sz={40} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 16, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.player.name}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#94a3b8", marginTop: 3 }}><Bdg pos={posTag(d.player)} />Rd {d.rd} · #{d.overall}</span>
            </span>
            <span style={{ textAlign: "center", lineHeight: 1.1 }}><b style={{ fontSize: 18, color: oC(d.player.ovr) }}>{d.player.ovr}</b><span style={{ display: "block", fontSize: 10, fontWeight: 800, color: C.mt, marginTop: 2 }}>OVR</span></span>
            {d.grade && <GradeChip g={d.grade} />}
          </div>
        ))}
        {!mine.length && <div style={{ padding: "16px 0", color: "#94a3b8", fontSize: 15 }}>You didn't make a pick this year.</div>}
      </div>
      <div style={{ background: "#ffffff0f", borderRadius: 18, padding: "0 14px", marginTop: 10 }}><Row first label="League draft grades" value={rows[0] ? `Best: ${rows[0].t.ab} ${rows[0].gr}` : ""} onClick={() => setOpen(true)} /></div>
      {open && <Sheet title="Draft grades" onClose={() => setOpen(false)}>
        <div style={{ fontSize: 14, color: "#94a3b8", margin: "0 2px 10px" }}>Where each player went against where the consensus board had him. Analysts don't know what your scouts know.</div>
        <div style={{ background: "#ffffff0f", borderRadius: 18, padding: "0 14px" }}>
          {rows.map(({ t: tm, gr }, i) => <div key={tm.id} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 48, borderTop: i ? "1px solid #ffffff10" : 0, color: tm.id === g.ui ? C.gn : "#e2e8f0" }}><span style={{ width: 24, color: "#94a3b8", fontVariantNumeric: "tabular-nums" }}>{i + 1}</span><TeamLogo t={tm} sz={26} /><b style={{ flex: 1, fontSize: 15 }}>{tm.city} {tm.name}</b><GradeChip g={gr} /></div>)}
        </div>
        <div style={{ height: 10 }} />
      </Sheet>}
    </div>
  );
}

// ---------- The scouting tab ----------

// Scouting points left, big enough to read at a glance.
// Pass the scouting state as sc to show the area scouts' points beside it.
export function ScoutPtsBadge({ pts = 0, sc, slim }) {
  const on = pts > 0;
  // slim: one small pill for draft day, where the clock and the board need the room
  if (slim) return (
    <span title="Scouting points left" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, background: on ? `${C.gd}22` : C.cd, border: `1px solid ${on ? C.gd : C.bd}`, fontSize: 13, fontWeight: 800, color: on ? "#fde68a" : C.mt, whiteSpace: "nowrap" }}>
      🔎 {pts} pts
    </span>
  );
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "6px 14px", borderRadius: 12, background: "#ffffff0a" }}>
      <span title="Spend them on scouting reports and workups" style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 30, fontWeight: 900, lineHeight: 1, color: on ? C.gd : C.mt, fontVariantNumeric: "tabular-nums" }}>{pts}</span>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.8, lineHeight: 1.25, color: "#94a3b8" }}>SCOUTING<br />POINT{pts === 1 ? "" : "S"} LEFT</span>
      </span>
    </div>
  );
}

// Your picks in this year's draft, round by round. Picks you've used gray out and show who you took.
export function PickTracker({ g, slim }) {
  const picks = (g.draftPicks || []).filter((pk) => pk.owner === g.ui && (pk.yr == null || pk.yr === g.yr)).sort((a, b) => a.overall - b.overall);
  const made = new Map((g.draftLog || []).map((d) => [d.id, d]));
  const left = picks.filter((pk) => !made.has(pk.id)).length;
  // Before the draft order is set, where each pick projects from the standings (worst record
  // first, the Super Bowl champion last).
  const ts = g.teams || [];
  const label = (pk) => (pk.overall ? `#${pk.overall}${g.sp !== "draft" && pk.orig != null && pk.orig !== g.ui ? ` ${ts[pk.orig]?.ab}` : ""}` : "—");
  // one small chip per pick, in a row that wraps; rounds without a pick show faded
  const chips = [1, 2, 3, 4, 5, 6, 7].flatMap((rd) => {
    const mine = picks.filter((pk) => pk.rd === rd);
    return mine.length ? mine.map((pk) => ({ rd, pk, d: made.get(pk.id) })) : [{ rd }];
  });
  return (
    <div style={slim ? {} : { ...panel, marginBottom: 12, padding: "10px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: slim ? 13 : 15, fontWeight: 900, marginRight: 2 }}>Your picks</span>
        <span style={{ fontSize: 13, color: left ? C.gn : C.mt, fontWeight: 800, marginRight: 6 }}>{left} of {picks.length} left</span>
        {chips.map(({ rd, pk, d }, k) => (
          <span key={pk?.id ?? `r${rd}`} title={!pk ? `No round ${rd} pick` : d ? `Round ${rd}: ${d.player?.name || d.name || "used"}` : g.sp === "draft" ? `Round ${rd}, pick ${pk.overall}` : `Round ${rd}, projected from the standings`} style={{ display: "inline-flex", alignItems: "baseline", gap: 5, borderRadius: 999, padding: "3px 10px", fontSize: 13, whiteSpace: "nowrap", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", background: pk && !d ? `${C.bl}1f` : "#0b1220", border: `1px solid ${pk && !d ? C.bl + "99" : C.bd}`, opacity: pk ? 1 : 0.5, color: pk && !d ? "#e2e8f0" : C.mt }}>
            <b style={{ fontSize: 11, letterSpacing: 0.5, color: pk && !d ? "#bfdbfe" : C.mt }}>R{rd}</b>
            {!pk ? "—" : <span style={{ fontWeight: d ? 500 : 800, textDecoration: d ? "line-through" : "none" }}>{label(pk)}</span>}
            {d && <span style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis" }}>✓ {d.player?.name || d.name || "Used"}{d.player?.pos ? ` ${d.player.pos}` : ""}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

const ATHLETIC = { spd: "Speed", acc: "Acceleration", agi: "Agility", str: "Strength", jmp: "Jumping", end: "Endurance" };
// A player's three best ratings: position skills and athletic traits together.
export function topRatings(p, n = 3) {
  const all = [...Object.entries(p.posAttrs || {}).map(([k, v]) => [PA_LABELS[k] || k, v]), ...Object.entries(ATHLETIC).filter(([k]) => typeof p[k] === "number").map(([k, l]) => [l, p[k]])];
  return all.sort((a, b) => b[1] - a[1]).slice(0, n);
}

// The moment you make a pick: he stands in the spotlight in your uniform with his rookie number, with
// his development trait, his three best ratings and the analysts' grade.
const PHYS = [["Speed", "spd"], ["Accel", "acc"], ["Agility", "agi"], ["Strength", "str"], ["Jumping", "jmp"], ["Stamina", "end"]];
// One rating as a short bar, for the reveal's grid.
const Mini = ([l, v]) => (
  <div key={l} style={{ display: "grid", gridTemplateColumns: MOBILE ? "1fr 46px 24px" : "84px 70px 26px", alignItems: "center", gap: 8, fontSize: MOBILE ? 12.5 : 14 }}>
    <span style={{ color: "#cbd5e1", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l}</span>
    <span style={{ height: 5, borderRadius: 3, background: "#ffffff1a" }}><span style={{ display: "block", width: `${v}%`, height: "100%", borderRadius: 3, background: oC(v) }} /></span>
    <b style={{ textAlign: "right", color: "#fff" }}>{v}</b>
  </div>
);

// onCard: open his full player card.
export function DraftReveal({ pick, team, onClose, onCard }) {
  const p = pick.p;
  const dev = devOf(p);
  const num = rookieNum(p);
  const skills = Object.entries(p.posAttrs || {}).map(([k, v]) => [PA_LABELS[k] || k, v]).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const phys = PHYS.filter(([, k]) => typeof p[k] === "number").map(([l, k]) => [l, p[k]]);
  const comb = p.combine && COMBINE_TESTS.filter((t) => p.combine[t.k] != null).slice(0, 4);
  const head = { fontSize: 11, fontWeight: 900, letterSpacing: 1.6, color: "#94a3b8", marginBottom: 4 };
  return (
    <Spotlight p={p} team={team} num={num} kicker={`🏈 ${p.draftYr ?? ""} NFL Draft · Round ${pick.rd} · Pick ${pick.overall}`} title={p.name} bg={`#${pick.overall}`} cta="CONTINUE THE DRAFT →" onNext={onClose} label="Your draft pick"
      more={onCard ? { label: "Full card", onClick: onCard } : null} confetti={pick.rd === 1 ? [team.clr, team.ac, "#ffffff", "#fde68a"] : null}>
      <div>{posTag(p)}{p.bio?.college || p.college ? ` · ${p.bio?.college || p.college}` : ""}{p.age ? ` · age ${p.age}` : ""}</div>
      <div style={{ marginTop: 8 }}><DevBadge dev={dev} size="lg" /></div>
      <div style={{ display: "flex", gap: 18, marginTop: 8, fontSize: MOBILE ? 15 : 18 }}>
        <span style={{ color: "#94a3b8" }}>OVR <b style={{ color: oC(p.ovr) }}>{p.ovr}</b></span>
        <span style={{ color: "#94a3b8" }}>POT <b style={{ color: C.bl }}>{p.pot}</b></span>
        {pick.grade && <span style={{ color: "#94a3b8" }}>Grade <b style={{ color: C.gd }}>{pick.grade}</b></span>}
      </div>
      {/* his ratings: what his body does, what his position needs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: MOBILE ? 12 : 22, marginTop: 12, maxWidth: 560 }}>
        <div><div style={head}>PHYSICAL</div><div style={{ display: "grid", gap: 3 }}>{phys.map(Mini)}</div></div>
        <div><div style={head}>{posTag(p)} SKILLS</div><div style={{ display: "grid", gap: 3 }}>{skills.map(Mini)}</div></div>
      </div>
      {comb?.length > 0 && <div style={{ display: "flex", gap: MOBILE ? 12 : 20, marginTop: 10, fontSize: MOBILE ? 12.5 : 14, color: "#94a3b8" }}>
        <span style={{ ...head, marginBottom: 0, alignSelf: "center" }}>COMBINE</span>
        {comb.map((t) => <span key={t.k}>{t.short} <b style={{ color: "#fff" }}>{(+p.combine[t.k]).toFixed(t.dp)}{t.unit === "s" ? "s" : t.unit === "in" ? '"' : ""}</b></span>)}
      </div>}
      {pick.take && <div style={{ fontSize: MOBILE ? 13.5 : 15, color: "#94a3b8", marginTop: 10, fontStyle: "italic" }}>{pick.take}</div>}
    </Spotlight>
  );
}

// Who's on the clock and who picks next, so you can see a trade partner coming.
export function DraftQueue({ picks, idx, teams, ui, n = 12 }) {
  const next = picks.slice(idx, idx + n);
  if (!next.length) return null;
  const mine = picks.slice(idx).find((pk) => pk.owner === ui);
  return (
    <div style={{ ...panel, padding: "12px 12px 8px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 900, letterSpacing: 1, color: "#e2e8f0" }}>UP NEXT</span>
        {mine && <span style={{ marginLeft: "auto", fontSize: 13, color: mine === next[0] ? C.gn : C.mt, fontWeight: 700 }}>{mine === next[0] ? "You're on the clock" : `Your pick in ${picks.indexOf(mine) - idx}`}</span>}
      </div>
      {next.map((pk, i) => {
        const t = teams[pk.owner], me = pk.owner === ui;
        return (
          <div key={pk.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 6px", borderRadius: 8, marginBottom: 2, background: i === 0 ? `${t.clr}55` : me ? `${C.gn}1f` : "transparent", border: `1px solid ${i === 0 ? "#ffffff40" : me ? C.gn : "transparent"}` }}>
            <span style={{ width: 54, fontSize: 12, fontWeight: 800, color: i === 0 ? "#fff" : C.mt, fontVariantNumeric: "tabular-nums" }}>R{pk.rd} #{pk.overall}</span>
            <TeamLogo t={t} sz={24} />
            <span style={{ flex: 1, fontSize: 14, fontWeight: me || i === 0 ? 800 : 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.city} {t.name}{me ? " (you)" : ""}</span>
            {i === 0 && <span style={{ fontSize: 11, fontWeight: 900, color: "#facc15", letterSpacing: 1 }}>ON THE CLOCK</span>}
            {pk.orig != null && pk.orig !== pk.owner && <span title={`From ${teams[pk.orig]?.name}`} style={{ fontSize: 11, color: C.mt }}>via {teams[pk.orig]?.ab}</span>}
          </div>
        );
      })}
    </div>
  );
}

// The order the next draft would go in today: the live draft from the pick on the clock, or this
// year's picks as the game projects them from the standings (draftProjection.js).
export function projectedOrder(g, rounds = 2) {
  if (g.sp === "draft" && g.curPick) return (g.draftPicks || []).slice(g.draftIdx || 0).filter((pk) => pk.rd <= rounds);
  return (g.draftPicks || []).filter((pk) => (pk.yr == null || pk.yr === g.yr) && pk.rd <= rounds && !pk.comp).sort((a, b) => a.overall - b.overall);
}

// The experts' mock draft for this class, with your picks and your list highlighted, and a
// heads-up when someone you want is projected to go before you're up.
export function MockDraft({ g }) {
  const [rounds, setRounds] = useState(1);
  const order = projectedOrder(g, 2);
  const cls = (g.dc?.[g.yr] || []);
  // redone when the order, the class or the clubs' rosters change (standings shift the order all season)
  const orderKey = order.map((pk) => `${pk.id}:${pk.owner}`).join(",");
  const mock = useMemo(() => mockDraft({ order, cls, teams: g.teams, seed: `${g.yr}:${order[0]?.overall || 0}` }), [orderKey, cls, g.teams, g.yr]); // eslint-disable-line react-hooks/exhaustive-deps -- order is rebuilt each render; orderKey stands for it
  const listed = new Set(listIds(g.scouting, g.yr));
  const myNext = order.find((pk) => pk.owner === g.ui);
  const before = myNext ? mock.filter((m) => listed.has(m.player.id) && m.pick.overall < myNext.overall) : [];
  const td = { padding: "9px 6px", borderBottom: `1px solid ${C.bd}66`, verticalAlign: "middle" };
  // phones: one row a pick (the club, then who the experts have them taking), your picks lit up
  if (MOBILE) return (
    <div>
      <Segments items={[[1, "Round 1"], [2, "Rounds 1-2"]]} value={rounds} onChange={setRounds} />
      {myNext && <div style={{ background: before.length ? `${C.gd}1a` : "#ffffff0f", borderRadius: 18, padding: "12px 14px", fontSize: 15, lineHeight: 1.45, marginBottom: 12 }}>
        Your next pick is <b>#{myNext.overall}</b>. {before.length ? <>Likely gone by then: {before.map((m, i) => <span key={m.player.id}>{i ? ", " : ""}<b style={{ color: C.gd }}>{m.player.name}</b> (#{m.pick.overall})</span>)}.</> : listed.size ? <span style={{ color: C.gn }}>Everyone on your list should still be there.</span> : <span style={{ color: "#94a3b8" }}>Star prospects to see where they're projected.</span>}
      </div>}
      <div style={{ background: "#ffffff0f", borderRadius: 18, padding: "0 14px" }}>
        {mock.filter((m) => m.pick.rd <= rounds).map(({ pick, player }, i) => { const t = g.teams[pick.owner], mine = pick.owner === g.ui, star = listed.has(player.id); return (
          <div key={pick.id || pick.overall} onClick={() => g.setSel(player)} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 66, padding: "8px 0", borderTop: i ? "1px solid #ffffff10" : 0, cursor: "pointer", background: mine ? `${C.gn}14` : "transparent", margin: mine ? "0 -14px" : 0, paddingLeft: mine ? 14 : 0, paddingRight: mine ? 14 : 0 }}>
            <span style={{ width: 34, textAlign: "center", flexShrink: 0 }}><b style={{ display: "block", fontSize: 15, color: mine ? C.gn : "#e2e8f0", fontVariantNumeric: "tabular-nums" }}>{pick.overall}</b><span style={{ fontSize: 10, fontWeight: 800, color: C.mt }}>RD {pick.rd}</span></span>
            <TeamLogo t={t} sz={30} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 16, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{star && <span style={{ color: C.gd }}>★ </span>}{player.name}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#94a3b8", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden" }}><Bdg pos={posTag(player)} /><span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{mine ? "You" : t.name} · {player.bio?.college}</span></span>
            </span>
            <span style={{ textAlign: "right", lineHeight: 1.1, flexShrink: 0 }}><b style={{ fontSize: 15, color: "#cbd5e1" }}>#{csRank(player)}</b><span style={{ display: "block", fontSize: 10, fontWeight: 800, color: C.mt, marginTop: 2 }}>BOARD</span></span>
          </div>
        ); })}
        {!mock.length && <div style={{ color: C.mt, padding: "16px 0" }}>No draft class yet.</div>}
      </div>
    </div>
  );
  return (
    <div>
      <div style={{ ...panel, display: "flex", gap: "6px 16px", flexWrap: "wrap", alignItems: "center", fontSize: 15 }}>
        <span><b>Experts' mock draft</b> <span style={{ color: C.mt }}>· consensus board plus each club's needs{g.sp === "draft" && g.curPick ? ", updated live" : ", in today's draft order"}</span></span>
        <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>{[1, 2].map((r) => <button key={r} onClick={() => setRounds(r)} style={{ ...chipBtn(rounds === r), fontSize: 14, padding: "6px 12px" }}>{r === 1 ? "Round 1" : "Rounds 1-2"}</button>)}</span>
      </div>
      {myNext && (
        <div style={{ ...panel, borderColor: before.length ? C.gd : C.bd, fontSize: 15 }}>
          Your next pick: <b>#{myNext.overall}</b>.{" "}
          {before.length ? <>Projected to be gone before then: {before.map((m, i) => <span key={m.player.id}>{i ? ", " : ""}<b style={{ color: C.gd }}>{m.player.name}</b> (#{m.pick.overall} to the {g.teams[m.pick.owner].name})</span>)}. Trade up if you want him.</> : listed.size ? <span style={{ color: C.gn }}>Everyone on your list is projected to still be there.</span> : <span style={{ color: C.mt }}>Star prospects to add them to your list and see where they're projected.</span>}
        </div>
      )}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ color: C.mt, fontSize: 13, textAlign: "left" }}><th style={{ padding: 6 }}>Pick</th><th style={{ padding: 6 }}>Team</th><th style={{ padding: 6 }}>Projected pick</th><th className="sc-hide" style={{ padding: 6 }}>Also linked</th></tr></thead>
          <tbody>
            {mock.filter((m) => m.pick.rd <= rounds).map(({ pick, player, alts }) => {
              const t = g.teams[pick.owner], mine = pick.owner === g.ui, star = listed.has(player.id);
              return (
                <tr key={pick.id || pick.overall} style={{ background: mine ? `${C.gn}14` : "transparent" }}>
                  <td style={{ ...td, width: 64, fontWeight: 800, color: mine ? C.gn : "#94a3b8", fontVariantNumeric: "tabular-nums" }}>R{pick.rd} #{pick.overall}</td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><TeamLogo t={t} sz={26} /><span style={{ fontWeight: mine ? 800 : 600 }}>{t.name}{mine ? " (you)" : ""}</span>{pick.orig != null && pick.orig !== pick.owner && <span style={{ fontSize: 12, color: C.mt }}>via {g.teams[pick.orig]?.ab}</span>}</span></td>
                  <td style={{ ...td, cursor: "pointer" }} onClick={() => g.setSel(player)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Bdg pos={posTag(player)} /><span style={{ fontSize: 16, fontWeight: 700 }}>{star ? "★ " : ""}{player.name}</span></div>
                    <div style={{ fontSize: 13, color: C.mt }}>{player.bio?.college} · consensus #{csRank(player)}</div>
                  </td>
                  <td className="sc-hide" style={{ ...td, fontSize: 13, color: "#94a3b8" }}>{alts.map((a) => `${a.name} (${a.pos})`).join(", ")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!mock.length && <div style={{ color: C.mt, padding: 12 }}>No draft class yet.</div>}
    </div>
  );
}

// Regions: the map (click a scout to see his ground), a card per region with a dropdown for who
// covers it, and your scouts with how many regions each has been given.
// Regions: who covers which part of the country. The map colors every school by the scout who
// works it (gray: nobody), so one look shows your whole staff's ground; each region is one row
// with what it's deep at, who covers it and whether he's a specialist match there. Phones pick a
// scout in a sheet; computers use a dropdown on the row. Tap a region on the map to jump to it.
// one color per region, so neighbors never blur together (a scout's two regions used to share his)
const REGION_CLR = { SEC: "#38bdf8", B1G: "#fbbf24", ACC: "#a78bfa", B12: "#ef4444", G5: "#4ade80", PAC: "#f472b6" };
// Phones: your scouting staff and where they're working, on one screen. Each scout is a row (his
// color on the map, what he knows, where he is); tap for his card, where you can let him go. The
// map and the regions follow, and hiring is a sheet of clean rows.
function PhoneScouts({ g }) {
  const s = g.scouting || {};
  const open = staffWindowOpen(g.sp);
  const ar = areasOf(s);
  const staff = SCOUT_SLOTS.filter((sl) => s[sl]);
  const act = (r) => { g.sm(r.msg); if (r.ok) g.setScouting(r.sc); return r.ok; };
  const [card, setCard] = useState(null); // a slot on your staff
  const [hiring, setHiring] = useState(false);
  const [cand, setCand] = useState(null); // a scout you might hire
  const [slot, setSlot] = useState("major");
  const [want, setWant] = useState(null);
  const [arm, setArm] = useState(null);
  useEffect(() => { if (!arm) return; const t = setTimeout(() => setArm(null), 3000); return () => clearTimeout(t); }, [arm]);
  const soft = { background: "#ffffff0f", borderRadius: 18, padding: "0 14px" };
  const label = { fontSize: 12, fontWeight: 900, letterSpacing: 1.4, color: "#94a3b8", margin: "0 2px 8px" };
  const tier = (x) => <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Stars ev={x.eval} /><span style={{ fontSize: 12, color: C.mt }}>{x.eval}</span></span>;
  const pool = [...(s.pool || [])].filter((x) => !want || x.group === want).sort((a, b) => b.eval - a.eval);
  const big = (on, txt, fn, tone = C.gn) => <button onClick={fn} style={{ flex: 1, minHeight: 50, borderRadius: 14, border: 0, background: on ? C.gd : tone, color: on ? "#111" : "#fff", fontSize: 16, fontWeight: 900, cursor: "pointer" }}>{txt}</button>;
  const facts = (x) => <div style={soft}>{[["Tier", tier(x)], ["Knows", SCOUT_GROUPS[x.group] || "—"], x.trait && ["Trait", SCOUT_TRAITS[x.trait].name], ["Age", x.age], x.bg && ["Background", x.bg]].filter(Boolean).map(([k, v], i) => <div key={k} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 48, borderTop: i ? "1px solid #ffffff10" : 0, fontSize: 15 }}><span style={{ color: "#94a3b8" }}>{k}</span><b style={{ marginLeft: "auto", textAlign: "right" }}>{v}</b></div>)}</div>;
  const x = card && s[card];
  const c = cand && (s.pool || []).find((p) => p.id === cand);
  return (
    <div>
      <div style={label}>YOUR SCOUTS</div>
      <div style={soft}>
        {SCOUT_SLOTS.map((sl, i) => { const sc = s[sl]; return (
          <button key={sl} onClick={() => (sc ? setCard(sl) : open && (setSlot(sl), setHiring(true)))} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", minHeight: 70, padding: "8px 0", background: "transparent", border: 0, borderTop: i ? "1px solid #ffffff10" : 0, color: "#fff", textAlign: "left", cursor: sc || open ? "pointer" : "default" }}>
            {sc ? <Face s={sc.face} sz={42} /> : <span style={{ width: 42, height: 42, borderRadius: 21, border: "2px dashed #475569", flexShrink: 0 }} />}
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 16, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sc ? sc.name : open ? "Hire a scout" : "Vacant"}</span>
              <span style={{ display: "block", fontSize: 13, color: "#94a3b8", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}><b style={{ color: slotKind(sl) === "major" ? "#f5c542" : "#60a5fa" }}>{slotKind(sl) === "major" ? "Major" : "Minor"}</b>{sc ? <> · knows <b style={{ color: "#67e8f9" }}>{SCOUT_GROUP_SHORT[sc.group] || "—"}</b> · {ar[sl].length ? ar[sl].map((r, i) => <React.Fragment key={r}>{i ? ", " : ""}<span style={{ color: REGION_CLR[r], fontWeight: 700 }}>{REGIONS_SHORT[r]}</span></React.Fragment>) : "no region"}</> : ` · covers ${areaCap(sl)} region${areaCap(sl) > 1 ? "s" : ""}`}</span>
            </span>
            {sc && <Stars ev={sc.eval} />}
            <span style={{ fontSize: 20, color: "#64748b" }}>›</span>
          </button>
        ); })}
      </div>
      {open && <div style={{ ...soft, marginTop: 10 }}><Row first label="Scouts for hire" value={`${(s.pool || []).length} available`} onClick={() => setHiring(true)} /></div>}
      <div style={{ fontSize: 13, color: C.mt, margin: "8px 2px 0" }}>{open ? "Staff and regions can change now." : "Your scouts are on the road: changes open in free agency and the preseason."}</div>
      <div style={{ ...label, marginTop: 24 }}>WHERE THEY'RE WORKING</div>
      <RegionsView g={g} />
      {x && <Sheet title={x.name} onClose={() => setCard(null)}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "0 2px 14px" }}><Face s={x.face} sz={64} /><div><div style={{ fontSize: 14, fontWeight: 900, color: slotKind(card) === "major" ? "#f5c542" : "#60a5fa" }}>{SCOUT_ROLES[card].name}</div><div style={{ fontSize: 14, color: "#94a3b8", marginTop: 2 }}>{ar[card].length ? `Working ${ar[card].map((r) => REGIONS_SHORT[r]).join(" and ")}` : "No region yet"}</div></div></div>
        {facts(x)}
        {x.trait && <div style={{ fontSize: 14, color: "#94a3b8", margin: "10px 2px 0" }}>{SCOUT_TRAITS[x.trait].desc}</div>}
        <div style={{ fontSize: 14, color: "#94a3b8", margin: "10px 2px 0" }}>He reads {SCOUT_GROUPS[x.group]?.toLowerCase() || "his position"} sharpest and other positions a lot worse.</div>
        {open && <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          {staff.length > 1 && <button onClick={() => { act(swapScoutRoles(s, g.sp)); setCard(null); }} style={{ flex: 1, minHeight: 50, borderRadius: 14, border: 0, background: "#ffffff14", color: "#e2e8f0", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>Swap major and minor</button>}
          {big(arm === "rel", arm === "rel" ? "Tap again to let go" : "Let him go", () => { if (arm !== "rel") return setArm("rel"); act(releaseScout(s, g.sp, card)); setArm(null); setCard(null); }, "#7f1d1d")}
        </div>}
        <div style={{ height: 10 }} />
      </Sheet>}
      {hiring && !c && <Sheet title="Scouts for hire" onClose={() => setHiring(false)}>
        <div style={label}>HIRE INTO</div>
        <Segments items={SCOUT_SLOTS.map((sl) => [sl, `${slotKind(sl) === "major" ? "Major" : "Minor"}${SCOUT_SLOTS.filter((k) => slotKind(k) === slotKind(sl)).indexOf(sl) ? " 2" : ""}`])} value={slot} onChange={setSlot} />
        <div style={{ fontSize: 13, color: "#94a3b8", margin: "-4px 2px 12px" }}>{s[slot] ? `Replaces ${s[slot].name}.` : "An open job."} {slotKind(slot) === "major" ? "Majors cover two regions." : "Minors cover one."}</div>
        <Chips items={[[null, "All"], ...["QB", "RB", "REC", "OL", "DL", "LB", "DB"].map((k) => [k, SCOUT_GROUP_SHORT[k]])]} value={want} onChange={setWant} />
        <div style={{ ...soft, marginTop: 12 }}>
          {pool.map((p, i) => <button key={p.id} onClick={() => setCand(p.id)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", minHeight: 62, background: "transparent", border: 0, borderTop: i ? "1px solid #ffffff10" : 0, color: "#fff", textAlign: "left", cursor: "pointer", padding: 0 }}>
            <Face s={p.face} sz={38} />
            <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 16, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span><span style={{ display: "block", fontSize: 13, color: "#94a3b8", marginTop: 2 }}>Knows <b style={{ color: "#67e8f9" }}>{SCOUT_GROUP_SHORT[p.group] || "—"}</b> · age {p.age}{p.trait ? ` · ${SCOUT_TRAITS[p.trait].name}` : ""}</span></span>
            <Stars ev={p.eval} />
          </button>)}
          {!pool.length && <div style={{ padding: "16px 0", color: "#94a3b8", fontSize: 15 }}>Nobody's looking for work{want ? " at that position" : ""} right now.</div>}
        </div>
        <div style={{ height: 10 }} />
      </Sheet>}
      {c && <Sheet title={c.name} onClose={() => setCand(null)}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "0 2px 14px" }}><Face s={c.face} sz={64} /><div style={{ fontSize: 14, color: "#94a3b8" }}>Would join as your {SCOUT_ROLES[slot].name.toLowerCase()}{s[slot] ? `, replacing ${s[slot].name}` : ""}.</div></div>
        {facts(c)}
        {c.trait && <div style={{ fontSize: 14, color: "#94a3b8", margin: "10px 2px 0" }}>{SCOUT_TRAITS[c.trait].desc}</div>}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>{big(arm === "hire", arm === "hire" ? "Tap again to hire" : `Hire as ${slotKind(slot) === "major" ? "major" : "minor"}`, () => { if (arm !== "hire") return setArm("hire"); if (act(hireScout(s, g.sp, c.id, slot))) { setCand(null); setHiring(false); } setArm(null); })}</div>
        <div style={{ height: 10 }} />
      </Sheet>}
    </div>
  );
}

export function RegionsView({ g }) {
  const s = g.scouting || {};
  const cls = g.dc[areaSeason(g.sp, g.yr)] || g.dc[g.yr] || [];
  const ar = areasOf(s);
  const rep = useRegionReport(g);
  const open = staffWindowOpen(g.sp);
  const staff = SCOUT_SLOTS.filter((sl) => s[sl]);
  const best = suggestAreas(s, rep);
  const same = staff.every((sl) => best[sl].length === ar[sl].length && best[sl].every((r) => ar[sl].includes(r)));
  const deep = (r) => rep[r]?.strong?.g;
  const fits = (sl, r) => !!s[sl]?.group && s[sl].group === deep(r);
  const [pick, setPick] = useState(null); // the region being assigned (phones) / picked on the map
  const auto = () => { g.setScouting({ ...s, areas: best, areasManual: true, areasYr: areaSeason(g.sp, g.yr) }); g.sm("Scouts sent to their best-fit regions."); };
  const assign = (r, sl) => { const x = setRegionScout(s, g.sp, r, sl || null, g.yr); g.sm(x.msg); if (x.ok) g.setScouting(x.sc); };
  // "O. Casserly": two scouts can share a last name
  const nm = (sl) => { const w = s[sl].name.split(" "); return w.length > 1 ? `${w[0][0]}. ${w.slice(-1)[0]}` : w[0]; };
  const who = (r) => staff.find((sl) => ar[sl].includes(r));
  const covered = AREA_KEYS.filter(who).length, matches = AREA_KEYS.filter((r) => who(r) && fits(who(r), r)).length;
  const soft = { background: "#ffffff0f", borderRadius: 18, padding: "0 14px" };
  const tap = (r) => { setPick(r); if (!MOBILE) document.getElementById(`rg-${r}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }); };
  const map = (
    <div style={{ background: "#ffffff0f", borderRadius: 18, padding: "10px 10px 12px" }}>
      <StaffMap colorOf={(r) => (who(r) ? REGION_CLR[r] : null)} labelOf={(r) => (who(r) ? nm(who(r)) : "No scout")} onRegion={open ? tap : undefined} hot={!MOBILE ? pick : null} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", justifyContent: "center", marginTop: 6 }}>
        {staff.map((sl) => { const n = ar[sl].length, cap = areaCap(sl); return <span key={sl} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 700 }}>{ar[sl].map((r) => <span key={r} title={regionName(r)} style={{ width: 10, height: 10, borderRadius: 5, background: REGION_CLR[r] }} />)}{nm(sl)} <span style={{ color: "#67e8f9", fontWeight: 800 }}>{SCOUT_GROUP_SHORT[s[sl].group] || ""}</span><span style={{ color: n >= cap ? C.mt : C.gd, fontWeight: 800 }}>{n}/{cap}</span></span>; })}
        {!staff.length && <span style={{ fontSize: 14, color: C.mt }}>No scouts on staff. Hire some on the Scouts screen.</span>}
      </div>
    </div>
  );
  const status = (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 900 }}>{covered}/{AREA_KEYS.length} regions covered</div>
        <div style={{ fontSize: 13, color: matches ? "#4ade80" : C.mt }}>{matches} specialist match{matches === 1 ? "" : "es"}{open ? "" : " · locked until free agency"}</div>
      </div>
      {open && <button onClick={auto} disabled={same} style={{ minHeight: 46, padding: "0 18px", borderRadius: 12, border: 0, background: same ? "#ffffff12" : C.gn, color: same ? "#94a3b8" : "#fff", fontSize: 15, fontWeight: 900, cursor: same ? "default" : "pointer", whiteSpace: "nowrap" }}>{same ? "Best fit set" : "Auto-assign"}</button>}
    </div>
  );
  const rows = (
    <div style={soft}>
      {AREA_KEYS.map((r, i) => {
        const on = who(r), match = on && fits(on, r);
        const top = cls.filter((p) => regionOf(p) === r && !p.drafted).sort((x, y) => csRank(x) - csRank(y)).slice(0, 2);
        return (
          <div key={r} id={`rg-${r}`} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 66, padding: "8px 0", borderTop: i ? "1px solid #ffffff10" : 0, background: !MOBILE && pick === r ? "#ffffff0a" : "transparent" }}>
            <span style={{ width: 12, height: 12, borderRadius: 6, flexShrink: 0, background: on ? REGION_CLR[r] : "transparent", border: on ? 0 : "2px dashed #64748b" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{REGIONS_SHORT[r]} <span style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8" }}>· deep at {deep(r) ? SCOUT_GROUP_SHORT[deep(r)] : "nothing"}</span></div>
              <div style={{ fontSize: 13, marginTop: 2, color: !on ? "#fcd34d" : match ? "#4ade80" : "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{!on ? "Nobody's scouting here" : match ? "Specialist match" : "Covered"}{!MOBILE && top.length ? <span style={{ color: C.mt }}> · top: {top.map((p) => `#${csRank(p)} ${p.name.split(" ").slice(-1)[0]}`).join(", ")}</span> : null}</div>
            </div>
            {!open ? <b style={{ fontSize: 15 }}>{on ? nm(on) : "—"}</b>
              : MOBILE ? <button onClick={() => setPick(r)} aria-label={`Scout for ${regionName(r)}`} style={{ minWidth: 118, minHeight: 44, padding: "0 12px", borderRadius: 12, border: `1px solid ${match ? "#16a34a" : "#ffffff1f"}`, background: "#ffffff0a", color: on ? "#fff" : "#fcd34d", fontSize: 15, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}><span style={{ whiteSpace: "nowrap" }}>{on ? nm(on) : "Assign"}</span><span style={{ color: "#64748b" }}>›</span></button>
              : <Select value={on || ""} onChange={(e) => assign(r, e.target.value)} aria-label={`Scout for ${regionName(r)}`} style={{ width: 190, background: C.bg, color: C.tx, border: `1px solid ${match ? "#16a34a" : C.bd}`, borderRadius: 10, padding: "8px 10px", fontSize: 14 }}>
                <option value="">Nobody</option>
                {staff.map((sl) => <option key={sl} value={sl}>{nm(sl)} ({SCOUT_GROUP_SHORT[s[sl].group] || "—"}){s[sl].group === deep(r) ? " ✓" : ""} · {ar[sl].length}/{areaCap(sl)}</option>)}
              </Select>}
          </div>
        );
      })}
    </div>
  );
  const sheet = MOBILE && pick && (
    <Sheet title={`${REGIONS_SHORT[pick]} · deep at ${deep(pick) ? SCOUT_GROUP_SHORT[deep(pick)] : "nothing"}`} onClose={() => setPick(null)}>
      {[...staff, ""].map((sl, i) => { const on = who(pick) === sl || (!sl && !who(pick)); const full = sl && ar[sl].length >= areaCap(sl) && !ar[sl].includes(pick); return (
        <button key={sl || "none"} onClick={() => { assign(pick, sl); setPick(null); }} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", minHeight: 58, background: "transparent", border: 0, borderTop: i ? "1px solid #ffffff14" : 0, padding: 0, color: "#fff", cursor: "pointer", textAlign: "left" }}>
          {sl ? <Face s={s[sl].face} sz={30} /> : <span style={{ width: 30, height: 30, borderRadius: 15, border: "2px dashed #64748b", flexShrink: 0 }} />}
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 16, fontWeight: 800 }}>{sl ? s[sl].name : "Nobody"}</span>
            {sl && <span style={{ display: "block", fontSize: 13, color: "#94a3b8" }}>Knows {SCOUT_GROUP_SHORT[s[sl].group] || "—"} · {ar[sl].length}/{areaCap(sl)} regions{full ? " (moves one over)" : ""}</span>}
          </span>
          {sl && fits(sl, pick) && <span style={{ fontSize: 13, fontWeight: 900, color: "#4ade80" }}>Match</span>}
          {on && <span style={{ fontSize: 18, color: C.gn }}>✓</span>}
        </button>
      ); })}
      <div style={{ height: 8 }} />
    </Sheet>
  );
  if (MOBILE) return <div style={{ display: "grid", gap: 12 }}>{map}{status}{rows}{sheet}</div>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.1fr) minmax(0,1fr)", gap: 16, alignItems: "start" }}>
      <div style={{ display: "grid", gap: 12 }}>{map}<div style={{ fontSize: 13, color: C.mt, padding: "0 4px" }}>Each region is deep at one position this year. A scout who knows that position (a specialist match) finds more sleepers and development traits there. Majors cover two regions, minors one.</div></div>
      <div style={{ display: "grid", gap: 12 }}>{status}{rows}</div>
    </div>
  );
}

// The country with every school as a dot, colored by the scout who covers its region (gray and
// faint: nobody). Each region carries its name and its scout's. hot: a region to ring.
const LABEL_XY = { PAC: [150, 300], G5: [330, 190], B12: [420, 420], B1G: [585, 165], ACC: [805, 300], SEC: [640, 505] };
function StaffMap({ colorOf, labelOf, onRegion, hot }) {
  const dots = AREA_KEYS.flatMap((r) => REGIONS[r].schools.map((sch) => ({ r, sch, xy: SCHOOL_XY[sch] }))).filter((d) => d.xy);
  // each label sits in open ground near its region (Group of Five schools are everywhere, so a middle
  // point would land on top of the ACC)
  const mid = (r) => LABEL_XY[r] || [480, 300];
  return (
    <svg viewBox="0 0 960 600" width="100%" style={{ display: "block" }}>
      <path d={US_NATION} fill="#1e293b" stroke="#475569" strokeWidth={1.5} />
      <path d={US_BORDERS} fill="none" stroke="#334155" strokeWidth={0.8} />
      {dots.map((d) => { const c = colorOf(d.r); return <circle key={d.sch} cx={d.xy[0]} cy={d.xy[1]} r={hot === d.r ? 9 : 7} fill={REGION_CLR[d.r]} opacity={c ? 0.95 : 0.3} stroke={hot === d.r ? "#fff" : "none"} strokeWidth={2} onClick={() => onRegion?.(d.r)} style={{ cursor: onRegion ? "pointer" : "default" }}><title>{d.sch} ({regionName(d.r)})</title></circle>; })}
      {AREA_KEYS.map((r) => { const [x, y] = mid(r), c = colorOf(r); return (
        <g key={r} onClick={() => onRegion?.(r)} style={{ cursor: onRegion ? "pointer" : "default" }}>
          <text x={x} y={y - 18} textAnchor="middle" fontSize={24} fontWeight={900} fill={REGION_CLR[r]} stroke="#0b1220" strokeWidth={6} paintOrder="stroke">{REGIONS_SHORT[r]}</text>
          <text x={x} y={y + 8} textAnchor="middle" fontSize={19} fontWeight={800} fill={c ? "#e2e8f0" : "#fcd34d"} stroke="#0b1220" strokeWidth={5} paintOrder="stroke">{labelOf(r)}</text>
        </g>
      ); })}
    </svg>
  );
}

const REGIONS_SHORT = { SEC: "SEC", B1G: "Big Ten", ACC: "ACC", B12: "Big 12", G5: "Group of Five", PAC: "Pac-12 & MW" };

// Where the talent is this year: each conference's strength and weakness, and who you have there.
function TalentMap({ g, go, card, h }) {
  const s = g.scouting || {};
  const rep = useRegionReport(g);
  const ar = areasOf(s);
  return (
    <div style={card}>
      <div style={h}>WHERE THE TALENT IS{g.sp === "freeagency" ? " · NEXT CLASS" : ""}<span style={{ marginLeft: "auto" }}><Btn onClick={() => go("regions")} bg={C.bd} c="#e2e8f0" style={{ fontSize: 12, padding: "3px 10px" }}>Regions →</Btn></span></div>
      {AREA_KEYS.map((k) => { const r = rep[k]; const on = SCOUT_SLOTS.filter((sl) => s[sl] && ar[sl].includes(k)); return (
        <div key={k} onClick={() => go("regions")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderTop: `1px solid ${C.bd}66`, fontSize: 13, cursor: "pointer" }}>
          <b style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{regionName(k)}</b>
          <span style={{ width: 62, color: "#4ade80", fontWeight: 800 }}>{r?.strong ? `▲ ${SCOUT_GROUP_SHORT[r.strong.g]}` : ""}</span>
          <span style={{ width: 62, color: "#f87171", fontWeight: 800 }}>{r?.weak ? `▼ ${SCOUT_GROUP_SHORT[r.weak.g]}` : <span style={{ color: C.mt, fontWeight: 600 }}>small</span>}</span>
          <span style={{ width: 90, textAlign: "right", color: on.length ? "#67e8f9" : "#fcd34d", fontWeight: 700 }}>{on.length ? on.map((sl) => SCOUT_GROUP_SHORT[s[sl].group] || "—").join(" · ") : "no scout"}</span>
        </div>); })}
    </div>
  );
}

// ---------- Scouting HQ ----------
// The front page of scouting: what you have to spend, who's on your staff, and the handful of
// things worth doing right now, each one a button.
// Where a pick can expect to find players: a little above it (players slide) to well below it.
export const pickWindow = (pick) => [Math.max(1, Math.round(pick - Math.max(4, pick * 0.25))), Math.round(pick + Math.max(10, pick * 0.45))];

// Your picks if the season ended today, each with the slice of the board worth scouting for it.
export function PickCabinet({ g, compact }) {
  const me = g.teams[g.ui];
  const picks = (g.draftPicks || []).filter((pk) => pk.owner === g.ui && (pk.yr == null || pk.yr === g.yr) && !(g.draftLog || []).some((d) => d.id === pk.id)).sort((a, b) => a.overall - b.overall);
  const live = g.sp === "draft";
  const rec = me ? `${me.w || 0}-${me.l || 0}${me.t ? `-${me.t}` : ""}` : "";
  return (
    <div style={{ background: `linear-gradient(135deg, ${me?.clr || "#1e3a8a"}55, ${C.cd} 55%)`, border: `1px solid ${C.bd}`, borderRadius: 12, padding: compact ? "10px 12px" : "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.6, color: "#e2e8f0" }}>{live ? "YOUR PICKS" : g.sp === "regular" || g.sp === "playoffs" ? "IF THE SEASON ENDED TODAY" : "YOUR PICKS IN THIS DRAFT"}</span>
        {rec && !live && <span style={{ fontSize: 13, color: C.mt }}>{me.name} {rec}{g.sp === "preseason" ? " (last season's order)" : ""}</span>}
      </div>
      {picks.length ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {picks.map((pk, i) => { const [lo, hi] = pickWindow(pk.overall); return (
          <div key={pk.id} style={{ background: i === 0 ? "#0b1220" : "#0b1220aa", border: `1px solid ${i === 0 ? C.gd : C.bd}`, borderRadius: 10, padding: compact ? "6px 10px" : "8px 12px", minWidth: compact ? 84 : 104 }}>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1, color: C.mt }}>ROUND {pk.rd}{pk.orig != null && pk.orig !== g.ui ? ` · ${g.teams[pk.orig]?.ab}` : ""}</div>
            <div style={{ fontSize: compact ? 22 : i === 0 ? 34 : 26, fontWeight: 900, lineHeight: 1.05, color: i === 0 ? C.gd : "#fff", fontVariantNumeric: "tabular-nums" }}>#{pk.overall}</div>
            {!compact && <div style={{ fontSize: 12, color: "#94a3b8" }}>scout #{lo}–{hi}</div>}
          </div>); })}
      </div> : <div style={{ fontSize: 14, color: C.mt }}>You have no picks in this draft.</div>}
    </div>
  );
}

export function ScoutingHQ({ g, go }) {
  const s = g.scouting || {};
  const cls = g.dc[g.yr] || [];
  const me = g.teams[g.ui];
  const gap = uncovered(s);
  // your thinnest spots: the positions where your best player is weakest
  const needs = topNeeds(me?.roster || [], 3);
  const isNeed = (p) => fillsNeed(needs, p);
  const slots = mySlots(g);
  // the slices of the board your picks can reach
  const wins = slots.slice(0, 3).map(pickWindow);
  const inRange = (p) => !wins.length || wins.some(([lo, hi]) => csRank(p) >= lo && csRank(p) <= hi);
  const pool = cls.filter((p) => inRange(p) && !p.drafted).map((p) => ({ p, read: prospectRead(s, p) })).filter((x) => x.read.cost);
  const targets = [...pool.filter((x) => isNeed(x.p)), ...pool.filter((x) => !isNeed(x.p))].sort((a, b) => (isNeed(b.p) - isNeed(a.p)) || csRank(a.p) - csRank(b.p)).slice(0, 8);
  const card = { background: C.cd, border: `1px solid ${C.bd}`, borderRadius: 12, padding: "12px 14px" };
  const h = { fontSize: 12, fontWeight: 900, letterSpacing: 1.4, color: C.gd, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 };
  if (MOBILE) {
    const picks = (g.draftPicks || []).filter((pk) => pk.owner === g.ui && (pk.yr == null || pk.yr === g.yr) && !(g.draftLog || []).some((d) => d.id === pk.id)).sort((a, b) => a.overall - b.overall);
    return (
      <div>
        {staffWindowOpen(g.sp) && s.areasYr !== areaSeason(g.sp, g.yr) && (
          <button onClick={() => go("regions")} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", marginTop: 4, textAlign: "left", background: `${C.bl}22`, border: 0, borderRadius: 14, padding: "10px 14px", color: "#fff", cursor: "pointer" }}>
            <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 16, fontWeight: 800 }}>Send your scouts out</span><span style={{ display: "block", fontSize: 13, color: "#94a3b8" }}>{gap.length ? `Nobody covers ${gap.map((r) => REGIONS_SHORT[r] || r).join(" or ")}` : "Pick their regions for the year"}</span></span>
            <span style={{ fontSize: 20, color: "#7dd3fc" }}>›</span>
          </button>
        )}
        <Section title="Scout these next" action="Board" onAction={() => go("board")}>
          <div style={{ background: "#ffffff0f", borderRadius: 18, padding: "0 14px" }}>
            {targets.slice(0, 5).map(({ p, read }, i) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 66, padding: "8px 0", borderTop: i ? "1px solid #ffffff10" : 0 }}>
                <Face s={p.face} sz={40} />
                <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => g.setSel(p)}>
                  <div style={{ fontWeight: 800, fontSize: 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, fontSize: 12, color: C.mt }}><Bdg pos={posTag(p)} /><RoleTag p={p} />#{csRank(p)}{isNeed(p) ? <b style={{ color: C.gn }}>need</b> : null}</div>
                </div>
                <ScoutButton g={g} p={p} read={read} small />
              </div>
            ))}
            {!targets.length && <div style={{ fontSize: 15, color: "#94a3b8", padding: "16px 0" }}>Everyone in range of your picks is scouted.</div>}
          </div>
        </Section>
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <PickCabinet g={g} />
      {staffWindowOpen(g.sp) && s.areasYr !== areaSeason(g.sp, g.yr) && (
        <div style={{ ...card, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", borderColor: "#38bdf888" }}>
          <span style={{ fontSize: 22 }}>🗺️</span>
          <div style={{ flex: 1, minWidth: 200 }}><div style={{ fontWeight: 800, fontSize: 15 }}>Send your scouts to their regions</div><div style={{ fontSize: 13, color: "#94a3b8" }}>{gap.length ? `Nobody works the ${gap.map(regionName).join(" or the ")}. ` : ""}Two regions for each major scout, one for each minor. They stay put once the season starts.</div></div>
          <Btn onClick={() => go("regions")} bg={C.bl} style={{ fontSize: 14, padding: "8px 14px" }}>Assign regions</Btn>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: MOBILE ? "1fr" : "minmax(0,1.35fr) minmax(0,1fr)", gap: 12, alignItems: "start" }}>
        <div style={card}>
          <div style={h}>SCOUT THESE NEXT<span style={{ marginLeft: "auto", color: C.mt, letterSpacing: 0, fontWeight: 700 }}>in range of your picks · needs: {needs.join(", ")}</span></div>
          {g.sp === "combine" && <div style={{ paddingBottom: 8, borderBottom: `1px solid ${C.bd}` }}><div style={{ fontSize: 13, fontWeight: 800, color: "#c4b5fd", marginBottom: 4 }}>COMBINE VISITS: interview or work out these before the draft</div><ScoutShortlist g={g} isNeed={isNeed} compact /></div>}
          {targets.map(({ p, read }) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${C.bd}66` }}>
              <span style={{ width: 34, textAlign: "right", fontSize: 13, fontWeight: 800, color: C.mt, fontVariantNumeric: "tabular-nums" }}>#{csRank(p)}</span>
              <Bdg pos={posTag(p)} />
              <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => g.setSel(p)}>
                <div style={{ fontWeight: 800, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}{isNeed(p) && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 900, color: C.gn }}>NEED</span>}</div>
                <div style={{ fontSize: 12, color: C.mt }}>{p.bio?.college || p.college} · {read.lvl === 0 ? (read.grade ? `your read ${read.grade}` : "no read") : "reported"}</div>
              </div>
              <ScoutButton g={g} p={p} read={read} small />
            </div>
          ))}
          {!targets.length && <div style={{ fontSize: 14, color: "#94a3b8", padding: "6px 0" }}>Everyone in range of your picks is scouted.</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}><Btn onClick={() => go("board")} bg={C.bd} c="#e2e8f0" style={{ fontSize: 13 }}>Big Board →</Btn><Btn onClick={() => go("list")} bg={C.bd} c="#e2e8f0" style={{ fontSize: 13 }}>Your list →</Btn></div>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          <TalentMap g={g} go={go} card={card} h={h} compact />
          <div style={card}>
            <div style={h}>YOUR SCOUTS<span style={{ marginLeft: "auto" }}><Btn onClick={() => go("scouts")} bg={C.bd} c="#e2e8f0" style={{ fontSize: 12, padding: "3px 10px" }}>Manage →</Btn></span></div>
            {SCOUT_SLOTS.map((r) => { const sc = s[r]; return (
              <div key={r} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderTop: `1px solid ${C.bd}66`, fontSize: 13 }}>
                <span style={{ width: 60, whiteSpace: "nowrap", fontSize: 11, fontWeight: 900, color: slotKind(r) === "major" ? "#f5c542" : "#60a5fa" }}>{SCOUT_ROLES[r].short.toUpperCase()}</span>
                {sc ? <><b style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sc.name}</b><Stars ev={sc.eval} /><span style={{ width: 46, color: "#67e8f9", fontWeight: 800 }}>{SCOUT_GROUP_SHORT[sc.group] || "—"}</span><span style={{ width: 74, color: C.mt }}>{areasOf(s)[r].join("/")}</span></> : <span style={{ color: C.mt }}>Vacant</span>}
              </div>); })}
          </div>
        </div>
      </div>
    </div>
  );
}

// A scout's tier at a glance: one to five stars from his evaluation.
export const scoutStars = (ev) => (ev >= 88 ? 5 : ev >= 80 ? 4 : ev >= 72 ? 3 : ev >= 64 ? 2 : 1);
export function Stars({ ev }) {
  const n = scoutStars(ev);
  return <span title={`Evaluation ${ev}`} style={{ color: C.gd, letterSpacing: 1, fontSize: 12, whiteSpace: "nowrap" }}>{"★".repeat(n)}<span style={{ color: "#334155" }}>{"★".repeat(5 - n)}</span></span>;
}

export function ScoutingPage({ g }) {
  const hasCombine = (g.dc[g.yr] || []).some((p) => tested(p) && p.combine);
  const [view, setView] = useState(g.sp === "combine" ? "combine" : "hq");
  // combine week opens on the combine results (interviews, workouts) whenever you arrive
  useEffect(() => { if (g.sp === "combine") setView("combine"); }, [g.sp]);
  // the to-do list can open a view directly ("Send your scouts to their regions")
  useEffect(() => { const f = (e) => setView(e.detail); window.addEventListener("gm:scouting", f); return () => window.removeEventListener("gm:scouting", f); }, []);
  const views = [["hq", "🏠 Scouting HQ"], ["board", "Big Board"], ["list", `Your list (${listIds(g.scouting, g.yr).length})`], ["mock", "Mock Draft"], hasCombine && ["combine", "Combine"], ["regions", "Regions"], ["scouts", "Scouts"]].filter(Boolean);
  const v = views.some(([k]) => k === view) ? view : "hq";
  const myPicks = (g.draftPicks || []).filter((pk) => pk.owner === g.ui && (pk.yr == null || pk.yr === g.yr) && !(g.draftLog || []).some((d) => d.id === pk.id)).sort((a, b) => a.overall - b.overall);
  const [more, setMore] = useState(false);
  // phones: three views up front (the combine leads in combine week), the rest in a sheet
  // scouts and regions are one screen on a phone, and always up front
  const main = g.sp === "combine" && hasCombine ? ["combine", "board", "staff"] : ["hq", "board", "staff"];
  const short = { hq: "HQ", board: "Board", staff: "Scouts", combine: "Combine" };
  const rest = views.filter(([k]) => !main.includes(k) && k !== "regions" && k !== "scouts");
  if (MOBILE) {
  const pv = ["regions", "scouts"].includes(view) ? "staff" : view === "staff" || views.some(([k]) => k === view) ? view : "hq";
  const go = (k) => setView(["regions", "scouts"].includes(k) ? "staff" : k);
  return (
    <div>
      <Hero compact clr={g.teams[g.ui]?.clr} logo={g.teams[g.ui]} eyebrow={g.sp === "combine" ? "The Combine" : "Scouting"} title={`${g.yr + 1} Draft`}
        sub={[myPicks.length ? `Picks ${myPicks.slice(0, 4).map((pk) => `#${pk.overall}`).join(" · ")}${myPicks.length > 4 ? ` +${myPicks.length - 4}` : ""}` : "No picks", g.sp === "combine" ? `${g.scouting?.interviewsLeft || 0} interviews` : null].filter(Boolean).join(" · ")}
        right={<div style={{ textAlign: "right" }}><div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1, color: (g.scouting?.pts || 0) > 0 ? C.gd : "#fff" }}>{g.scouting?.pts || 0}</div><div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.2, color: "#ffffffb3", marginTop: 4 }}>POINTS</div></div>} />
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}><Segments items={main.map((k) => [k, short[k]])} value={pv} onChange={go} /></div>
        <button onClick={() => setMore(true)} aria-label="More scouting views" style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 10, border: 0, background: main.includes(pv) ? "#ffffff0f" : `${C.bl}33`, color: "#e2e8f0", fontSize: 20, fontWeight: 900, cursor: "pointer" }}>⋯</button>
      </div>
      {!main.includes(pv) && <div style={{ fontSize: 18, fontWeight: 900, margin: "2px 2px 10px" }}>{(views.find(([k]) => k === pv) || [])[1]?.replace(/^\S*\p{Extended_Pictographic}\S*\s*/u, "")}</div>}
      {pv === "board" && <Board g={g} classYr={g.yr} />}
      {pv === "hq" && <ScoutingHQ g={g} go={go} />}
      {pv === "list" && <YourList g={g} classYr={g.yr} />}
      {pv === "combine" && <CombineView g={g} buzz={g.buzz} />}
      {pv === "mock" && <MockDraft g={g} />}
      {pv === "staff" && <PhoneScouts g={g} />}
      {more && <Sheet title="Scouting" onClose={() => setMore(false)}>{rest.map(([k, l], i) => <Row key={k} first={i === 0} label={l.replace(/^\S*\p{Extended_Pictographic}\S*\s*/u, "")} value={pv === k ? "✓" : ""} tone={C.gn} onClick={() => { setView(k); setMore(false); }} />)}<div style={{ height: 8 }} /></Sheet>}
    </div>
  );
  }
  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
        <span style={{ fontSize: 22, fontWeight: 900 }}>{g.sp === "combine" ? `${g.yr + 1} NFL Combine` : `${g.yr + 1} Draft Class`}</span>
        <span style={{ marginLeft: "auto" }}><ScoutPtsBadge pts={g.scouting?.pts || 0} sc={g.scouting || {}} /></span>
        
        {g.sp === "combine" && <span style={{ fontSize: 14, padding: "4px 10px", borderRadius: 10, background: "#7c3aed33", color: "#c4b5fd", fontWeight: 700 }}>Interviews: {g.scouting?.interviewsLeft || 0}</span>}
      </div>
      <div className="pill-row" style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {views.map(([k, label]) => <button key={k} onClick={() => setView(k)} style={{ ...chipBtn(v === k), fontSize: 15, padding: "8px 16px" }}>{label}</button>)}
      </div>
      {v === "board" && (
        <>
          <div style={{ ...panel, display: "flex", gap: "8px 24px", flexWrap: "wrap", alignItems: "center", fontSize: 14 }}>
            <span><span style={{ color: C.mt }}>Your scouts: </span>{SCOUT_SLOTS.map((r) => g.scouting?.[r] ? <b key={r} style={{ marginRight: 10 }}>{SCOUT_GROUP_SHORT[g.scouting[r].group] || "?"} in {areasOf(g.scouting)[r].join("/")} <span style={{ color: C.mt, fontWeight: 400 }}>({SCOUT_ROLES[r].short.toLowerCase()})</span></b> : null)}{!SCOUT_SLOTS.some((r) => g.scouting?.[r]) && <span style={{ color: C.mt }}>none</span>}<Btn onClick={() => setView("scouts")} bg={C.bd} c="#cbd5e1" style={{ fontSize: 12, padding: "3px 10px" }}>Manage</Btn></span>
            <span><span style={{ color: C.mt }}>Your picks: </span><b>{myPicks.length ? myPicks.map((pk) => `R${pk.rd}${g.sp === "draft" ? ` #${pk.overall}` : ""}`).join(", ") : "none"}</b></span>
          </div>
          <Legend />
          <Board g={g} classYr={g.yr} />
        </>
      )}
      {v === "hq" && <ScoutingHQ g={g} go={setView} />}
      {v === "list" && <YourList g={g} classYr={g.yr} />}
      {v === "combine" && <CombineView g={g} buzz={g.buzz} />}
      {v === "mock" && <MockDraft g={g} />}
      {v === "regions" && <RegionsView g={g} />}
      {v === "scouts" && <ScoutsView g={g} />}
    </div>
  );
}

// ---------- Prospect profile ----------

function explain(read, p) {
  const reg = regionName(regionOf(p));
  const pm = (sd) => `usually within ±${Math.max(1, Math.round(sd))}`;
  if (read.lvl >= 2) return read.exact ? "Full workup: these are his exact ratings." : `Full workup: estimates are ${pm(read.sd)}. Only a major scout gets to exact numbers.`;
  if (read.lvl === 1) {
    const next = read.cov === "major" ? "A full workup (2 points) gives exact ratings and his development trait." : read.cov === "minor" ? "A full workup (2 points) sharpens the estimates." : "A follow-up (2 points) sharpens the estimates a little.";
    return `Scouting report: estimates are ${pm(read.sd)}. ${next}`;
  }
  if (read.cov !== "office" && read.devEarly) return `${read.who} already have a strong read on him: a ${read.pot} ceiling and a ${read.dev} development trait. A report (1 point) gives close estimates.`;
  const off = read.scout && ![read.scout, ...(read.others || [])].some((x) => onSpec(x, p)) ? ` None of your scouts here specializes in ${SCOUT_GROUP_SHORT[scoutGroupOfPos(p.pos)]}, so these reads are rougher than they'd be from a specialist.` : "";
  if (off && read.cov !== "office") return `${read.cov === "major" ? "Your major scout" : "Your minor scout"}'s general idea of him is a ${read.pot} ceiling.${off} A report (1 point) still sharpens it.`;
  if (read.cov === "major") return `Your major scout's general idea of him is a ${read.pot} ceiling. A report (1 point) gives close estimates; a full workup (2 more) gives exact ratings and his development trait.`;
  if (read.cov === "minor") return `Your minor scout's general idea of him is a ${read.pot} ceiling. A report (1 point) gives estimates and a workup (2 more) sharpens them (a good minor scout reads his development trait there too).`;
  return `None of your scouts works the ${reg}. Your front office can still file a rough report (1 point) and a follow-up (2 more), but never exact numbers or a development trait.`;
}

const COL_KEYS = ["gp", "comp", "att", "passYds", "passTD", "passInt", "rushAtt", "rushYds", "rushTD", "rec", "recYds", "recTD", "tkl", "sacks", "tfl", "ints", "pd", "fgM", "fgA"];

// a position group's starters as a letter, the way EA grades your depth
const ovrGrade = (v) => (v >= 90 ? "A+" : v >= 86 ? "A" : v >= 83 ? "A-" : v >= 80 ? "B+" : v >= 77 ? "B" : v >= 74 ? "B-" : v >= 71 ? "C+" : v >= 68 ? "C" : v >= 64 ? "C-" : "D");
const OFF_NEEDS = ["QB", "RB", "WR", "TE", "LT", "LG", "C", "RG", "RT"], DEF_NEEDS = ["EDGE", "DT", "LB", "CB", "S"];
// Your roster at a glance (EA's Top Team Needs): each position's starters graded, how many you have,
// and how many start.
function TeamNeedsPanel({ g, p }) {
  const me = g.teams?.[g.ui];
  const roster = me?.roster || [];
  const { list } = teamNeeds(roster);
  const need = Object.fromEntries(list.map((x) => [x.pos, x]));
  const by = {};
  for (const x of roster) { const k = needGroup(x); (by[k] ||= []).push(x); }
  const mine = needGroup(p);
  const row = (k) => {
    const all = [...(by[k] || [])].sort((a, b) => (b.ovr || 0) - (a.ovr || 0)), n = NEED_STARTERS[k] || 1;
    const st = all.slice(0, n), avg = st.length ? st.reduce((t, x) => t + (x.ovr || 0), 0) / n : 50;
    const gr = ovrGrade(avg), hot = (need[k]?.score || 0) >= 0.35;
    return (
      <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 4px", borderRadius: 4, fontSize: 14, background: k === mine ? "#facc1522" : "transparent" }}>
        <b style={{ width: 44 }}>{k}</b>
        <span style={{ width: 4, height: 14, borderRadius: 2, background: hot ? C.rd : C.gn }} />
        <span style={{ width: 28, fontWeight: 900 }}>{gr}</span>
        <span style={{ color: "#cbd5e1" }}>{all.length} on roster</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: C.mt }}>{n} start</span>
      </div>
    );
  };
  const strong = [...list].sort((a, b) => a.score - b.score)[0], weak = list[0];
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.4, color: C.mt, marginBottom: 4 }}>YOUR TEAM NEEDS</div>
      <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1.2, color: "#64748b", margin: "4px 0 2px" }}>OFFENSE</div>
      {OFF_NEEDS.map(row)}
      <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1.2, color: "#64748b", margin: "6px 0 2px" }}>DEFENSE</div>
      {DEF_NEEDS.map(row)}
      <div style={{ marginTop: 8, fontSize: 13, fontWeight: 900, lineHeight: 1.5 }}>
        <div>STRONGEST: <span style={{ color: "#4ade80" }}>{strong?.pos}</span></div>
        <div>BIGGEST NEED: <span style={{ color: "#f87171" }}>{weak?.pos}</span></div>
      </div>
    </div>
  );
}

const Tile = ({ big, label, tone }) => (
  <div style={{ background: "#1e293b", border: `1px solid ${C.bd}`, borderRadius: 8, padding: "8px 6px", textAlign: "center", minWidth: 0 }}>
    <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.05, color: tone || (big === "?" ? "#94a3b8" : "#fff") }}>{big}</div>
    <div style={{ fontSize: 12, color: "#cbd5e1", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
  </div>
);
const scoutedPct = (read) => (read.lvl >= 2 ? 100 : read.lvl === 1 ? 60 : read.general ? (read.cov === "major" ? 30 : 20) : 0);

export function ProspectProfile({ g, p }) {
  const a = useActions(g);
  const read = prospectRead(g.scouting, p);
  const s = p.scout || {};
  const [tab, setTab] = useState("report");
  const live = g.sp === "draft" && !!g.curPick;
  const onClock = live && g.curPick.owner === g.ui && p.draftYear === g.yr;
  const listed = listIds(g.scouting, p.draftYear).includes(p.id);
  const box = { background: C.bg, borderRadius: 8, padding: "10px 12px", marginBottom: 10 };
  const lab = { fontSize: 12, fontWeight: 900, letterSpacing: 1.4, marginBottom: 6, color: C.mt };
  const col = p.colStats || {};
  const skills = s.skills || {};
  const keys = Object.keys(p.posAttrs || {});
  // his four key tools: the best ones your scouts have graded (or the first four, unseen)
  const key4 = (Object.keys(skills).length ? Object.keys(skills).sort((x, y) => skills[y].v - skills[x].v) : keys).slice(0, 4);
  const change = (p.cons?.mid ?? 0) - csRank(p);
  const Stat = ({ k, v, c }) => <div style={{ minWidth: 0 }}><div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1, color: C.mt }}>{k}</div><div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.1, color: c || "#fff" }}>{v}</div></div>;
  const tabs = [["report", "Scouting report"], ["phys", "Physicals"], ["skills", "Skills"]];
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: MOBILE ? "repeat(3, minmax(0,1fr))" : "0.7fr 1.8fr 0.8fr 0.8fr 1fr", gap: 10, padding: "8px 0 12px", borderBottom: `1px solid ${C.bd}`, marginBottom: 10 }}>
        <Stat k="BOARD" v={`#${csRank(p)}`} />
        <Stat k="PROJECTION" v={read.tier || "?"} c={read.tier ? "#fde68a" : "#94a3b8"} />
        <Stat k="TALENT" v={read.grade || "?"} c={read.grade ? TONE[gradeTone(read.grade)] : "#94a3b8"} />
        <Stat k="SCOUTED" v={`${scoutedPct(read)}%`} c={scoutedPct(read) >= 100 ? C.gn : "#fff"} />
        <Stat k="RANK CHANGE" v={change > 0 ? `▲${change}` : change < 0 ? `▼${-change}` : "0"} c={change > 0 ? C.gn : change < 0 ? C.rd : "#fff"} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: MOBILE ? "1fr" : "minmax(0,1fr) 250px", gap: 16, alignItems: "start" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
            {tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} style={{ ...chipBtn(tab === k), fontSize: 14, padding: "6px 14px", textTransform: "uppercase", letterSpacing: 0.6 }}>{l}</button>)}
          </div>
          {tab === "report" && <>
            <div style={{ display: "grid", gridTemplateColumns: MOBILE ? "1fr" : "minmax(0,1.2fr) minmax(0,1fr)", gap: 12 }}>
              <div>
                <div style={lab}>PLAYER NOTES</div>
                <div style={{ fontSize: 14, lineHeight: 1.55 }}>
                  {s.notes?.flag && <div style={{ color: "#fca5a5", fontWeight: 800 }}>{s.notes.flag}</div>}
                  {s.notes?.gem && <div style={{ color: "#f9a8d4", fontWeight: 700 }}>{s.notes.gem}</div>}
                  {!s.notes && read.flag && <div style={{ color: "#fca5a5", fontWeight: 800 }}>🚩 {read.flagWhy}</div>}
                  {!s.notes && read.sleeper && <div style={{ color: "#f9a8d4", fontWeight: 700 }}>💎 Your scouts think he's a sleeper.</div>}
                  {s.notes?.strengths?.map((x) => <div key={x}>• {x}</div>)}
                  {s.notes?.weaknesses?.map((x) => <div key={x} style={{ color: "#fdba74" }}>• {x}</div>)}
                  {!s.notes && <div style={{ color: C.mt }}>{explain(read, p)}</div>}
                  {s.comp && <div style={{ marginTop: 6 }}>NFL comparable: <b style={{ color: "#fbbf24", cursor: g.findPlayer?.(s.comp.pid) ? "pointer" : "default" }} onClick={() => { const c = g.findPlayer?.(s.comp.pid); if (c) g.setSel(c); }}>{s.comp.name}</b> <span style={{ color: C.mt }}>({s.comp.ab})</span></div>}
                </div>
              </div>
              <div>
                <div style={lab}>PLAYER PROFILE</div>
                <div style={{ display: "grid", gridTemplateColumns: "84px 1fr", rowGap: 3, fontSize: 14 }}>
                  {[["DEV TRAIT", <DevBadge key="d" dev={read.dev} size="sm" />], ["HEIGHT", htS(p.ht_)], ["WEIGHT", `${p.wt} lbs`], ["AGE", p.age], ["COLLEGE", `${p.bio?.college || "?"}${isSmallSchool(p) ? " (small school)" : ""}`], ["REGION", regionName(regionOf(p))], ["SCOUT", <CovTag key="c" read={read} />]].map(([k, v]) => <React.Fragment key={k}><span style={{ fontSize: 11, fontWeight: 900, color: "#7dd3fc", alignSelf: "center" }}>{k}</span><b style={{ minWidth: 0 }}>{v}</b></React.Fragment>)}
                </div>
              </div>
            </div>
            <div style={{ ...lab, marginTop: 12 }}>KEY RATINGS</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 6 }}>
              {key4.map((k) => <Tile key={k} big={skills[k] ? skills[k].g : "?"} label={PA_LABELS[k] || k} tone={skills[k] ? TONE[gradeTone(skills[k].g)] : undefined} />)}
            </div>
            {read.lvl > 0 && <div style={{ ...muted, marginTop: 8 }}>{explain(read, p)}</div>}
            {(p.bio?.backstory || p.bio?.fact) && <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 10, lineHeight: 1.45 }}>{p.bio.backstory}{p.bio.fact ? <i> {p.bio.fact}</i> : null}</div>}
          </>}
          {tab === "phys" && <>
            {tested(p) && (p.combine || p.proDay) ? <><div style={box}>
          {[["NFL COMBINE", p.combine], [p.combine ? "PRO DAY" : "PRO DAY (not invited to the Combine)", p.proDay]].filter(([, r]) => r).map(([h, r], si) => <React.Fragment key={h}>
          <div style={{ ...lab, color: C.gd, display: "flex", alignItems: "center", gap: 6, marginTop: si ? 10 : 0 }}>{h}{si === 0 && p.combGrade && <GradeChip g={p.combGrade} small />}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 4 }}>
            {COMBINE_TESTS.map((t) => {
              const v = r[t.k];
              const pct = r === (p.combine || p.proDay) ? p.combPcts?.[t.k] : null;
              if (v == null) return null;
              return (
                <div key={t.k} style={{ background: C.cd, borderRadius: 3, padding: "3px 4px", textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: C.mt }}>{t.short.toUpperCase()}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: pct >= 0.9 ? C.gn : "#cbd5e1" }}>{(+v).toFixed(t.dp)}{t.unit === "s" ? "s" : t.unit === "in" ? '"' : ""}</div>
                  {(() => { const rk = combineRank(g.dc?.[p.draftYear], p, t, r); return rk ? <div title={`Where he ranks among the ${rk.n} ${p.pos}s in the class who tested`} style={{ fontSize: 11, fontWeight: 800, color: rankColor(rk) }}>({rk.rank} of {rk.n})</div> : null; })()}
                  {pct != null && <div style={{ height: 3, background: C.bg, borderRadius: 2, marginTop: 2 }}><div style={{ width: `${Math.round(pct * 100)}%`, height: "100%", background: oC(40 + pct * 50), borderRadius: 2 }} /></div>}
                </div>
              );
            })}
          </div></React.Fragment>)}
          {p.combine && p.proDay && <div style={{ ...muted, fontSize: 10, marginTop: 3 }}>Bars show where he ranked among Combine invitees at his position.</div>}
          {s.intv ? (
            <div style={{ marginTop: 8, background: "#7c3aed14", border: "1px solid #7c3aed44", borderRadius: 8, padding: "8px 10px", fontSize: 13 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                <b style={{ color: "#c4b5fd", letterSpacing: 1, fontSize: 12 }}>YOUR INTERVIEW</b>
                {s.intv.verdict && <b style={{ color: { Impressive: C.gn, Solid: "#7dd3fc", Mixed: C.gd, Concerning: C.rd }[s.intv.verdict] }}>{s.intv.verdict}</b>}
                {s.intv.overall && <GradeChip g={s.intv.overall} small />}
              </div>
              {s.intv.traits ? <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>{s.intv.traits.map((t) => <span key={t.label} style={{ color: "#cbd5e1" }}>{t.label} <GradeChip g={t.grade} small /></span>)}</div>
                : <div>Work ethic <GradeChip g={s.intv.grade} small /> <i style={{ color: "#94a3b8" }}>"{s.intv.note}"</i></div>}
              {(s.intv.good || []).map((x, i) => <div key={`g${i}`} style={{ color: "#86efac" }}>+ {x}</div>)}
              {(s.intv.bad || []).map((x, i) => <div key={`b${i}`} style={{ color: "#fca5a5" }}>− {x}</div>)}
              {s.intv.flag && <div style={{ color: "#fca5a5", fontWeight: 800, marginTop: 4 }}>{s.intv.flag}</div>}
            </div>
          ) : g.sp === "combine" && p.combine && p.draftYear === g.yr && (
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 6 }}>
              <Btn onClick={() => a.interview(p)} disabled={!(g.scouting?.interviewsLeft > 0)} bg="#7c3aed33" c="#c4b5fd" style={{ fontSize: 11, padding: "2px 8px" }}>Interview him</Btn>
              <span style={muted}>{g.scouting?.interviewsLeft || 0} left. Grades his work ethic, football IQ, leadership and coachability, and flags anything that worries you. Work ethic tends to go with how fast he develops.</span>
            </div>
          )}
        </div></> : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[["🏈 NFL COMBINE", "Data available after the NFL Scouting Combine"], ["🏟️ PRO DAYS", "Data available after college pro days"]].map(([t, d]) => <div key={t} style={{ ...box, textAlign: "center", padding: "26px 12px" }}><div style={{ fontSize: 20, fontWeight: 900 }}>{t}</div><div style={{ fontSize: 13, color: C.mt, marginTop: 6 }}>{d}</div></div>)}
              </div>
            )}
            {Object.keys(col).length > 0 && (
              <div style={box}>
                <div style={lab}>COLLEGE CAREER</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(64px,1fr))", gap: 4 }}>
                  {COL_KEYS.filter((k) => col[k] > 0).map((k) => (
                    <div key={k} style={{ background: C.cd, borderRadius: 3, padding: "2px", textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: C.mt }}>{g.sL ? g.sL(k) : k}</div><div style={{ fontSize: 16, fontWeight: 700, color: "#fdba74" }}>{Number.isInteger(col[k]) ? col[k] : col[k].toFixed(1)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>}
          {tab === "skills" && <>
            <div style={lab}>CORE ATTRIBUTES{read.lvl > 0 && s.who ? <span style={{ fontWeight: 600, letterSpacing: 0, marginLeft: 8 }}>graded by {s.who}</span> : null}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(112px,1fr))", gap: 6 }}>
              {keys.map((k) => <Tile key={k} big={skills[k] ? skills[k].g : "?"} label={PA_LABELS[k] || k} tone={skills[k] ? TONE[gradeTone(skills[k].g)] : undefined} />)}
            </div>
            <div style={{ ...muted, marginTop: 8 }}>{read.lvl > 0 ? "Tools graded at his projected NFL level." : "A scouting report (1 point) grades every tool."}</div>
          </>}
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ ...box, marginBottom: 0, border: `1px solid ${C.bd}` }}>
            <ScoutButton g={g} p={p} read={read} />
            <div style={{ fontSize: 13, fontWeight: 800, color: (g.scouting?.pts || 0) > 0 ? C.gd : C.mt, marginTop: 6 }}>{g.scouting?.pts || 0} scouting point{g.scouting?.pts === 1 ? "" : "s"} left</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              <Btn onClick={() => a.toggle(p)} bg={listed ? "#b4530944" : C.bd} c={listed ? "#fef3c7" : "#cbd5e1"} style={{ fontSize: 13, padding: "5px 10px" }}>{listed ? "★ On your list" : "☆ Add to your list"}</Btn>
              {live && p.draftYear === g.yr && <span title={onClock ? "" : "Wait until you're on the clock"}><Btn onClick={() => { g.makePick(p); g.setSel(null); }} disabled={!onClock} bg={C.gn} style={{ fontSize: 13, padding: "5px 10px" }}>Draft him</Btn></span>}
            </div>
          </div>
          {g.teams?.[g.ui] && <TeamNeedsPanel g={g} p={p} />}
        </div>
      </div>
    </div>
  );
}

// Phones: the prospect as a full screen of his own, in the Home screen's look. A hero with his ceiling
// big, three numbers, Report / Tools / Testing as a switch, clean lines for what your scouts know, and
// the actions (scout, your list, draft) pinned at the bottom by your thumb.
function PhoneProspectPage({ g, p, onClose }) {
  const a = useActions(g);
  const read = prospectRead(g.scouting, p);
  const s = p.scout || {};
  const [tab, setTab] = useState("report");
  const live = g.sp === "draft" && !!g.curPick;
  const onClock = live && g.curPick.owner === g.ui && p.draftYear === g.yr;
  const listed = listIds(g.scouting, p.draftYear).includes(p.id);
  const skills = s.skills || {}, keys = Object.keys(p.posAttrs || {});
  const graded = Object.keys(skills).length ? [...keys].sort((x, y) => (skills[y]?.v ?? -1) - (skills[x]?.v ?? -1)) : keys;
  const me = g.teams?.[g.ui];
  const needRow = me ? teamNeeds(me.roster || []).list.find((x) => x.pos === needGroup(p)) : null;
  const need = (needRow?.score || 0) >= 0.35;
  const soft = { background: "#ffffff0f", borderRadius: 18, padding: "4px 14px" };
  const kv = (k, v, c) => <div key={k} style={{ display: "flex", alignItems: "center", minHeight: 44, borderTop: "1px solid #ffffff10", fontSize: 16 }}><span style={{ color: "#94a3b8" }}>{k}</span><b style={{ marginLeft: "auto", color: c || "#fff", textAlign: "right" }}>{v}</b></div>;
  const tool = (k) => { const sk = skills[k]; return <div key={k} style={{ display: "flex", alignItems: "center", minHeight: 44, borderTop: "1px solid #ffffff10", fontSize: 16 }}><span style={{ color: "#cbd5e1" }}>{PA_LABELS[k] || k}</span><b style={{ marginLeft: "auto", fontSize: 18, color: sk ? TONE[gradeTone(sk.g)] : "#475569" }}>{sk ? sk.g : "?"}</b></div>; };
  const cost = read.cost, pts = g.scouting?.pts || 0;
  return createPortal(
    <div className="keep-dark" style={{ position: "fixed", inset: 0, zIndex: 1000, background: C.bg, overflowY: "auto", color: "#fff", fontFamily: C.f }}>
      <div style={{ padding: "calc(10px + env(safe-area-inset-top)) 16px 18px", background: `linear-gradient(180deg, transparent 40%, ${C.bg} 100%), radial-gradient(120% 100% at 0% 0%, #1e3a8acc, #1e3a8a22 70%)` }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}><CloseX onClick={onClose} style={{ position: "static" }} /></div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Face s={p.face} sz={72} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.1 }}>{p.name}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" }}><Bdg pos={posTag(p)} /><RoleTag p={p} /><span style={{ fontSize: 14, color: "#cbd5e1" }}>{p.bio?.college}</span></div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 18 }}>
          {[["BOARD", `#${csRank(p)}`, "#fff"], ["OVERALL", read.ovr === "??" ? "?" : read.ovr, read.ovr === "??" ? "#64748b" : /^[A-D]/.test(read.ovr) ? TONE[gradeTone(read.ovr)] || "#fff" : read.ovr.startsWith("~") ? "#e2e8f0" : oC(+read.ovr)], ["CEILING", read.pot === "??" ? "?" : read.pot, read.pot === "??" ? "#64748b" : TONE[gradeTone(read.pot)] || "#fff"], ["SCOUTED", `${scoutedPct(read)}%`, scoutedPct(read) >= 100 ? C.gn : "#fff"]].map(([k, v, c]) => (
            <div key={k} style={{ background: "#ffffff14", borderRadius: 14, padding: "10px 0", textAlign: "center", minWidth: 0 }}><div style={{ fontSize: 22, fontWeight: 900, color: c, lineHeight: 1.05 }}>{v}</div><div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1, color: "#ffffffb3", marginTop: 4 }}>{k}</div></div>
          ))}
        </div>
        {(read.tier || need || read.flag || read.sleeper) && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12, fontSize: 14, fontWeight: 800 }}>
          {read.tier && <span style={{ color: "#fde68a" }}>Projects as: {read.tier}</span>}
          {need && <span style={{ color: C.gn }}>Fills a need</span>}
          {read.flag && <span style={{ color: "#fca5a5" }}>Red flag</span>}
          {read.sleeper && <span style={{ color: "#f9a8d4" }}>Sleeper</span>}
        </div>}
      </div>
      <div style={{ padding: "0 14px 170px" }}>
        <Segments items={[["report", "Report"], ["tools", "Tools"], ["testing", "Testing"]]} value={tab} onChange={setTab} />
        {tab === "report" && <>
          <div style={{ ...soft, padding: "12px 14px", fontSize: 15, lineHeight: 1.5 }}>
            {s.notes?.flag && <div style={{ color: "#fca5a5", fontWeight: 800 }}>{s.notes.flag}</div>}
            {s.notes?.gem && <div style={{ color: "#f9a8d4", fontWeight: 700 }}>{s.notes.gem}</div>}
            {!s.notes && read.flag && <div style={{ color: "#fca5a5", fontWeight: 800 }}>{read.flagWhy}</div>}
            {s.notes?.strengths?.map((x) => <div key={x}>+ {x}</div>)}
            {s.notes?.weaknesses?.map((x) => <div key={x} style={{ color: "#fdba74" }}>− {x}</div>)}
            {!s.notes && <div style={{ color: "#cbd5e1" }}>{explain(read, p)}</div>}
            {s.comp && <div style={{ marginTop: 6 }}>Plays like <b style={{ color: "#fbbf24" }} onClick={() => { const c = g.findPlayer?.(s.comp.pid); if (c) g.setSel(c); }}>{s.comp.name}</b></div>}
          </div>
          <div style={{ ...soft, marginTop: 12 }}>
            {[["Development", <DevBadge key="d" dev={read.dev} size="sm" />], ["Height · weight", `${htS(p.ht_)} · ${p.wt} lbs`], ["Age", p.age], ["Region", regionName(regionOf(p))], ["Your scout", <CovTag key="c" read={read} />]].map(([k, v], i) => <div key={k} style={{ display: "flex", alignItems: "center", minHeight: 44, borderTop: i ? "1px solid #ffffff10" : 0, fontSize: 16 }}><span style={{ color: "#94a3b8" }}>{k}</span><span style={{ marginLeft: "auto", fontWeight: 800 }}>{v}</span></div>)}
          </div>
          {(p.bio?.backstory || p.bio?.fact) && <div style={{ fontSize: 14, color: "#94a3b8", margin: "12px 4px 0", lineHeight: 1.5 }}>{p.bio.backstory}{p.bio.fact ? <i> {p.bio.fact}</i> : null}</div>}
        </>}
        {tab === "tools" && <div style={soft}>{graded.map(tool)}{!keys.length && <div style={{ padding: "14px 0", color: C.mt }}>No tools graded.</div>}<div style={{ fontSize: 13, color: C.mt, padding: "10px 0" }}>{read.lvl > 0 ? "Graded at his projected NFL level." : "A scouting report grades every tool."}</div></div>}
        {tab === "testing" && (tested(p) && (p.combine || p.proDay)
          ? <>{[["NFL COMBINE", p.combine], ["PRO DAY", p.proDay]].filter(([, r]) => r).map(([h, r]) => <div key={h} style={{ marginBottom: 12 }}><div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.4, color: "#94a3b8", margin: "0 2px 8px" }}>{h}</div><div style={soft}>{COMBINE_TESTS.map((t) => { const v = r[t.k]; if (v == null) return null; const rk = combineRank(g.dc?.[p.draftYear], p, t, r); return kv(t.short, <>{(+v).toFixed(t.dp)}{t.unit === "s" ? "s" : t.unit === "in" ? '"' : ""}{rk && <span style={{ marginLeft: 8, fontSize: 14, fontWeight: 800, color: rankColor(rk) }}>({rk.rank} of {rk.n})</span>}</>); })}</div></div>)}{s.intv?.verdict && <div style={soft}>{kv("Interview", s.intv.verdict, { Impressive: C.gn, Solid: "#7dd3fc", Mixed: C.gd, Concerning: C.rd }[s.intv.verdict])}</div>}<div style={{ fontSize: 13, color: C.mt, padding: "10px 2px" }}>Ranked against every {p.pos} in the class who tested.</div></>
          : <div style={{ ...soft, padding: "18px 14px", fontSize: 15, color: "#94a3b8" }}>Testing numbers come in at the Combine and his pro day.</div>)}
        {tab === "testing" && g.sp === "combine" && p.combine && p.draftYear === g.yr && read.lvl < 2 && <button onClick={() => a.workout(p)} disabled={!(g.scouting?.workoutsLeft > 0)} style={{ width: "100%", minHeight: 50, marginTop: 12, borderRadius: 14, border: 0, background: "#0c4a6e", color: "#bae6fd", fontSize: 16, fontWeight: 900 }}>Free workout · {g.scouting?.workoutsLeft || 0} left</button>}
        {tab === "testing" && g.sp === "combine" && p.combine && p.draftYear === g.yr && !s.intv && <button onClick={() => a.interview(p)} disabled={!(g.scouting?.interviewsLeft > 0)} style={{ width: "100%", minHeight: 50, marginTop: 12, borderRadius: 14, border: 0, background: "#7c3aed33", color: "#ddd6fe", fontSize: 16, fontWeight: 900 }}>Interview him · {g.scouting?.interviewsLeft || 0} left</button>}
      </div>
      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 1001, background: "#0d1424", borderTop: "1px solid #ffffff14", padding: "10px 14px calc(12px + env(safe-area-inset-bottom))", display: "flex", gap: 10 }}>
        <button onClick={() => a.toggle(p)} aria-pressed={listed} style={{ width: 120, minHeight: 52, borderRadius: 14, border: 0, background: listed ? "#b4530944" : "#ffffff12", color: listed ? "#fde68a" : "#e2e8f0", fontSize: 15, fontWeight: 900 }}>{listed ? "★ Listed" : "☆ My list"}</button>
        {live && p.draftYear === g.yr
          ? <button onClick={() => { g.makePick(p); g.setSel(null); }} disabled={!onClock} style={{ flex: 1, minHeight: 52, borderRadius: 14, border: 0, background: onClock ? C.gn : "#ffffff12", color: onClock ? "#fff" : "#64748b", fontSize: 17, fontWeight: 900 }}>{onClock ? "Draft him" : "Not on the clock"}</button>
          : canScoutClass(g, p.draftYear) && <button onClick={() => a.scout(p)} disabled={!cost || pts < cost} style={{ flex: 1, minHeight: 52, borderRadius: 14, border: 0, background: cost && pts >= cost ? C.bl : "#ffffff12", color: cost && pts >= cost ? "#fff" : "#64748b", fontSize: 17, fontWeight: 900 }}>{!cost ? "Fully scouted" : pts < cost ? `Needs ${cost} point${cost > 1 ? "s" : ""}` : `${read.lvl === 0 ? "Scout him" : "Full workup"} · ${cost} point${cost > 1 ? "s" : ""}`}</button>}
      </div>
    </div>,
    document.body
  );
}

export function ProspectModal({ g, p, onClose }) {
  const [first, ...rest] = (p.name || "").split(" ");
  if (MOBILE) return <PhoneProspectPage g={g} p={p} onClose={onClose} />;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.88)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", background: `linear-gradient(160deg, #1b2440, ${C.cd} 45%)`, borderRadius: 14, padding: MOBILE ? 12 : "16px 20px", maxWidth: 1000, width: "100%", maxHeight: "92vh", overflowY: "auto", border: `1px solid ${C.bd}` }}>
        <CloseX onClick={onClose} />
        <div style={{ display: "flex", gap: 14, alignItems: "center", paddingRight: 40 }}>
          <Face s={p.face} sz={MOBILE ? 52 : 72} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: 1.5, color: "#cbd5e1" }}>{first?.toUpperCase()}</div>
            <div style={{ fontSize: MOBILE ? 28 : 40, fontWeight: 900, lineHeight: 1, letterSpacing: 0.5 }}>{rest.join(" ").toUpperCase()}</div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}><Bdg pos={posTag(p)} /><span style={{ fontSize: 13, color: C.mt }}>{p.draftYear + 1} draft · {p.bio?.college}</span></div>
          </div>
        </div>
        <ProspectProfile g={g} p={p} />
      </div>
    </div>
  );
}

// For screens outside scouting: what your scouts make of a prospect's ceiling, in one short string.
export const potText = (sc, p) => prospectRead(sc, p).pot;
