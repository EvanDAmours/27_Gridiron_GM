// The Development tab: one place to plan and follow your players' growth. Overview (what's worth
// knowing, and who's growing, peaking or declining next summer), the Season plan (focus players,
// camp priority, your young players' roles) and Young players (where each one fits on the depth
// chart, and whether that's helping him grow).
import React, { useMemo, useState } from "react";
import { C, Sheet } from "./ui.jsx";
import { MOBILE } from "./mobile.js";
import { posTag } from "./dline.js";
import DevFocusCard from "./DevFocus.jsx";
import { CAMP, projShare, projGrowth, roleOf, trendOf, perSeason } from "./development.js";

const ROLE = { starter: "starter", rotation: "rotation", backup: "backup" };
const sign = (g) => (g > 0 ? `+${g}` : `${g}`);
const tone = (g) => (g >= 0.8 ? "#4ade80" : g <= -0.8 ? "#f87171" : "#cbd5e1");

function Tabs({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: MOBILE ? 18 : 26 }}>
      {[["overview", "Overview"], ["plan", "Season plan"], ["young", "Young players"]].map(([k, l]) => (
        <button key={k} onClick={() => onChange(k)} style={{ border: 0, borderRadius: 99, padding: "8px 16px", fontSize: 15, fontWeight: 800, cursor: "pointer", background: value === k ? "#ffffff1a" : "transparent", color: value === k ? "#fff" : "#94a3b8" }}>{l}</button>
      ))}
    </div>
  );
}
const H1 = ({ children, sub }) => (
  <div style={{ marginBottom: MOBILE ? 18 : 28 }}>
    <div style={{ fontSize: MOBILE ? 30 : 44, fontWeight: 900, letterSpacing: -1, lineHeight: 1.05 }}>{children}</div>
    {sub && <div style={{ fontSize: MOBILE ? 15 : 18, color: "#94a3b8", marginTop: 8 }}>{sub}</div>}
  </div>
);
const Card = ({ children, style }) => <div style={{ background: C.cd, borderRadius: 18, padding: "4px 22px", border: "1px solid #ffffff0d", ...style }}>{children}</div>;
function Row({ title, sub, right, rightColor, onClick, last }) {
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 0", borderBottom: last ? 0 : "1px solid #ffffff10", cursor: onClick ? "pointer" : "default" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>{title}</div>
        {sub && <div style={{ fontSize: 14, color: "#94a3b8", marginTop: 3 }}>{sub}</div>}
      </div>
      {right != null && <div style={{ fontSize: typeof right === "number" || /^[+-]?\d/.test(right) ? 26 : 15, fontWeight: 900, color: rightColor || "#fff", fontVariantNumeric: "tabular-nums" }}>{right}</div>}
      {onClick && <span style={{ color: "#64748b", fontSize: 18 }}>›</span>}
    </div>
  );
}
const Label = ({ children, right }) => <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 15, fontWeight: 700, color: "#94a3b8", margin: "0 4px 10px" }}><span>{children}</span>{right}</div>;

// roster: your players; gp: games your club has played this season; focus/setFocus: the two
// focus players; camp/setCamp: the camp priority; planYr/setPlanYr: the year the plan was locked
export default function DevelopmentScreen({ roster, yr, sp, wk, gp = 0, focus, setFocus, camp = "balanced", setCamp, planYr, setPlanYr, setSel, onDepth }) {
  const [view, setView] = useState("overview");
  const [trend, setTrend] = useState("growing");
  const [focusOpen, setFocusOpen] = useState(false);
  const [campOpen, setCampOpen] = useState(false);
  const pre = sp !== "regular" && sp !== "playoffs";
  const weeksLeft = sp === "regular" ? Math.max(0, 18 - (wk || 1)) : pre ? 17 : 0;
  const isFocus = (p) => focus && (String(focus.off) === String(p.id) || String(focus.def) === String(p.id));
  const rows = useMemo(() => roster.filter((p) => p.pos !== "K" && p.pos !== "P").map((p) => {
    const share = projShare(p, roster, gp);
    return { p, share, role: roleOf(share), g: projGrowth(p, share, { camp, focused: isFocus(p), weeksLeft }) };
  }), [roster, gp, camp, focus, weeksLeft]); // eslint-disable-line react-hooks/exhaustive-deps
  const focusRows = rows.filter((r) => isFocus(r.p));
  const young = rows.filter((r) => r.p.age <= 24).sort((a, b) => b.g - a.g);
  const buried = young.filter((r) => r.role === "backup" && (r.p.truePot ?? r.p.pot ?? 0) - r.p.ovr >= 8).sort((a, b) => (b.p.pot || 0) - (a.p.pot || 0));
  const fading = rows.filter((r) => r.g <= -2).sort((a, b) => b.p.ovr - a.p.ovr);
  const name = (p) => p.name;

  const worth = [
    ...focusRows.map((r) => ({ k: `f${r.p.id}`, title: name(r.p), sub: `${r.p.age} · ${posTag(r.p)} · ${r.p.ovr} OVR. Your focus player: about ${sign(r.g)} by next summer.`, right: sign(r.g), color: tone(r.g), p: r.p })),
    ...buried.slice(0, 2).map((r) => ({ k: `b${r.p.id}`, title: name(r.p), sub: `${r.p.age} · ${posTag(r.p)} · ${r.p.ovr} OVR backup. Regular snaps would speed up his growth.`, right: sign(r.g), color: tone(r.g), p: r.p })),
    ...fading.slice(0, 2).map((r) => ({ k: `d${r.p.id}`, title: name(r.p), sub: `${r.p.age} · ${posTag(r.p)} · ${r.p.ovr} OVR. Expect a drop next summer.`, right: sign(r.g), color: tone(r.g), p: r.p })),
  ].slice(0, 5);
  const list = rows.filter((r) => trendOf(r.g) === trend).sort((a, b) => (trend === "declining" ? a.g - b.g : trend === "growing" ? b.g - a.g : b.p.ovr - a.p.ovr));
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? list : list.slice(0, 6);
  const locked = planYr === yr;

  const wrap = { maxWidth: view === "overview" ? 1240 : 900, margin: "0 auto", padding: MOBILE ? "6px 2px 30px" : "10px 12px 40px", color: C.tx };
  return (
    <div style={wrap}>
      <Tabs value={view} onChange={setView} />
      {view === "overview" && <>
        <H1 sub={pre ? "Set the plan, then watch them grow." : "How your players are coming along."}>{pre ? "Your season starts here." : `Week ${wk || 1}: the growth report.`}</H1>
        <div style={{ display: "grid", gridTemplateColumns: MOBILE ? "1fr" : "1fr 1fr", gap: MOBILE ? 22 : 36, alignItems: "start" }}>
          <div>
            <Label>Worth knowing {pre ? "this preseason" : "this week"}</Label>
            <Card>{worth.length ? worth.map((w, i) => <Row key={w.k} title={w.title} sub={w.sub} right={w.right} rightColor={w.color} onClick={() => setSel?.(w.p)} last={i === worth.length - 1} />)
              : <Row title="Nothing needs you" sub="Pick focus players in the Season plan to get the most out of your best young talent." last />}</Card>
          </div>
          <div>
            <Label right={<div style={{ display: "flex", background: "#ffffff0d", borderRadius: 99, padding: 3 }}>{[["growing", "Growing"], ["peak", "Peak"], ["declining", "Declining"]].map(([k, l]) => <button key={k} onClick={() => { setTrend(k); setShowAll(false); }} style={{ border: 0, borderRadius: 99, padding: "6px 14px", fontSize: 14, fontWeight: 800, cursor: "pointer", background: trend === k ? "#fff" : "transparent", color: trend === k ? "#0b1220" : "#cbd5e1" }}>{l}</button>)}</div>}>Next summer</Label>
            <Card>{shown.length ? shown.map((r, i) => <Row key={r.p.id} title={name(r.p)} sub={`${r.p.age} · ${posTag(r.p)} · ${r.p.ovr} OVR · ${ROLE[r.role]}`} right={trend === "peak" ? r.p.ovr : sign(Math.round(r.g))} rightColor={trend === "peak" ? "#fff" : tone(r.g)} onClick={() => setSel?.(r.p)} last={i === shown.length - 1} />)
              : <Row title="Nobody here" last />}</Card>
            {list.length > 6 && <button onClick={() => setShowAll((v) => !v)} style={{ background: "transparent", border: 0, color: "#cbd5e1", fontSize: 15, fontWeight: 700, padding: "12px 4px", cursor: "pointer" }}>{showAll ? "Show fewer" : `All ${list.length} ${trend === "peak" ? "at their peak" : trend} →`}</button>}
          </div>
        </div>
      </>}

      {view === "plan" && <>
        <div style={{ textAlign: "center" }}><H1 sub={locked ? "Locked in. You can still change it any time." : "Three choices. Set them before the season starts."}>Plan your season.</H1></div>
        {[
          { n: 1, label: "Focus players", title: focusRows.length ? focusRows.map((r) => `${name(r.p)} (${posTag(r.p)})`).join(" · ") : "Nobody yet", sub: focusRows.length ? focusRows.map((r) => `${r.p.name.split(" ").slice(-1)[0]} about +${perSeason(r.p)} from the extra coaching`).join(" · ") : "One on offense, one on defense: each gets extra coaching every week", act: "Change", on: () => setFocusOpen(true) },
          { n: 2, label: "Camp priority", title: CAMP[camp], sub: camp === "youth" ? `About +0.5 next summer for ${rows.filter((r) => r.p.age <= 25).length} players 25 and under` : camp === "vets" ? `Slows the decline of ${rows.filter((r) => r.p.age >= 29).length} players 29 and over` : "Even time for everyone", act: "Change", on: () => setCampOpen(true) },
          { n: 3, label: "Young players", title: `${young.filter((r) => r.role !== "backup").length} playing · ${buried.length} stuck behind someone`, sub: buried[0] ? `${name(buried[0].p)} has the most to gain from snaps` : "Every young player with upside is getting snaps", act: "Review", on: () => setView("young") },
        ].map((s) => (
          <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 18, background: C.cd, border: "1px solid #ffffff0d", borderRadius: 18, padding: MOBILE ? "16px 16px" : "22px 26px", marginBottom: 14 }}>
            <div style={{ width: 34, height: 34, borderRadius: 99, background: "#ffffff12", display: "grid", placeItems: "center", fontWeight: 800, flexShrink: 0 }}>{s.n}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, color: "#94a3b8", fontWeight: 700 }}>{s.label}</div>
              <div style={{ fontSize: MOBILE ? 19 : 23, fontWeight: 900, marginTop: 2 }}>{s.title}</div>
              <div style={{ fontSize: 14, color: "#94a3b8", marginTop: 4 }}>{s.sub}</div>
            </div>
            <button onClick={s.on} style={{ border: 0, borderRadius: 99, background: "#ffffff14", color: "#fff", padding: "10px 18px", fontSize: 15, fontWeight: 800, cursor: "pointer", flexShrink: 0 }}>{s.act}</button>
          </div>
        ))}
        <div style={{ textAlign: "center", marginTop: 26 }}>
          <button onClick={() => setPlanYr?.(yr)} disabled={locked} style={{ border: 0, borderRadius: 99, background: locked ? "#ffffff14" : "#16a34a", color: "#fff", padding: "16px 46px", fontSize: 18, fontWeight: 900, cursor: locked ? "default" : "pointer" }}>{locked ? "Plan locked in" : "Lock in the plan"}</button>
        </div>
      </>}

      {view === "young" && <>
        <H1 sub={`${young.length} players 24 and under. Snaps are what grow them.`}>Where your young players play.</H1>
        <Card>{young.map((r, i) => {
          const st = r.role === "starter" || r.g >= 2 ? ["Growing", "#4ade80"] : r.role === "rotation" || r.g >= 1 ? ["On track", "#e2e8f0"] : (r.p.truePot ?? r.p.pot ?? 0) - r.p.ovr >= 8 ? ["Needs snaps", "#facc15"] : ["Long shot", "#f87171"];
          return <Row key={r.p.id} title={name(r.p)} sub={`${r.p.age} · ${posTag(r.p)} · ${r.p.ovr} OVR · ${ROLE[r.role]}${isFocus(r.p) ? " · focus player" : ""}`} right={st[0]} rightColor={st[1]} onClick={() => setSel?.(r.p)} last={i === young.length - 1} />;
        })}</Card>
        {onDepth && buried.length > 0 && <div style={{ textAlign: "center", marginTop: 18 }}><button onClick={onDepth} style={{ border: 0, borderRadius: 99, background: "#ffffff14", color: "#fff", padding: "12px 26px", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>Give them snaps on the depth chart</button></div>}
      </>}

      {focusOpen && <Sheet title="Focus players" onClose={() => setFocusOpen(false)}><DevFocusCard roster={roster} focus={focus} setFocus={setFocus} setSel={setSel} /><div style={{ height: 10 }} /></Sheet>}
      {campOpen && <Sheet title="Camp priority" onClose={() => setCampOpen(false)}>
        {[["youth", "Youth", "Extra time with players 25 and under: about half a point more growth each"], ["balanced", "Balanced", "Even time for everyone"], ["vets", "Veterans", "Keep the 29-and-overs sharp: about half as much decline"]].map(([k, l, d]) => (
          <button key={k} onClick={() => { setCamp?.(k); setCampOpen(false); }} style={{ display: "block", width: "100%", textAlign: "left", background: camp === k ? "#ffffff14" : "transparent", border: "1px solid #ffffff12", borderRadius: 14, padding: "14px 16px", marginBottom: 8, color: "#fff", cursor: "pointer" }}>
            <div style={{ fontSize: 17, fontWeight: 800 }}>{l}</div><div style={{ fontSize: 14, color: "#94a3b8", marginTop: 3 }}>{d}</div>
          </button>
        ))}
      </Sheet>}
    </div>
  );
}

// The strip along the bottom of Home: the development plan, one tap away.
export function DevStrip({ yr, sp, planYr, focusNames, onOpen }) {
  const pre = sp !== "regular" && sp !== "playoffs";
  const line = pre && planYr !== yr ? "Plan your season" : focusNames.length ? `Focus: ${focusNames.join(" · ")}` : "Pick your focus players";
  return (
    <div onClick={onOpen} style={{ display: "flex", alignItems: "center", gap: 16, background: C.cd, border: "1px solid #ffffff0d", borderRadius: 16, padding: "14px 22px", marginTop: 16, cursor: "pointer" }}>
      <span style={{ fontSize: 15, color: "#94a3b8", fontWeight: 700 }}>Development</span>
      <span style={{ fontSize: 17, fontWeight: 800, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{line}</span>
      <span style={{ background: "#ffffff14", borderRadius: 99, padding: "8px 18px", fontSize: 15, fontWeight: 800 }}>Open</span>
    </div>
  );
}
