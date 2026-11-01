// The desktop depth chart: the whole screen is the field. Every starter is a card where he lines
// up (his spot, name, rating there, and a bar for how much he plays). Click a card and a menu opens
// beside it: who starts there, how much he plays, and his situations. The bench (and who's out)
// runs along the bottom of the field. The logic (who can play where, what a change does) lives in
// DepthChart.jsx, which hands it over as `api`; phones keep DepthChart's own layout.
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { oC, quietPill } from "./ui.jsx";
import { DL_SLOTS, slotKind, naturalDL } from "./dline.js";
import { ROLE_SLOTS, ROLE_NAME, ROLE_WANTS, roleKind, naturalRole } from "./roles.js";
import { SPEC_ROLES, isSpec } from "./specialists.js";
import { linkedSet, laneSplit } from "./snapEdit.js";

// Where each spot sits (x, y: the center of its card, in % of the field). Offense: the line, then
// the backs and off-the-line receivers, then the deep backs. Defense faces it from the top.
const LINE = [["LT", 0, 22, 17], ["LG", 0, 34, 17], ["C", 0, 46, 17], ["RG", 0, 58, 17], ["RT", 0, 70, 17]];
const QB = ["QB", 0, 46, 40], RB = ["RB", 0, 46, 62];
const FORMS = {
  11: [["WR", 0, 6.5, 17], ["TE", 0, 82, 17], ["WR", 2, 20, 40], ["WR", 1, 93.5, 40], QB, RB],
  12: [["WR", 0, 6.5, 17], ["TE", 0, 82, 17], ["TE", 1, 20, 40], ["WR", 1, 93.5, 40], QB, RB],
  21: [["WR", 0, 6.5, 17], ["TE", 0, 82, 17], ["WR", 1, 93.5, 40], QB, ["FB", 0, 46, 61], ["RB", 0, 46, 81]],
  10: [["WR", 0, 6.5, 17], ["WR", 3, 20, 40], ["WR", 2, 80, 40], ["WR", 1, 93.5, 17], QB, RB],
  13: [["WR", 0, 6.5, 17], ["TE", 0, 82, 17], ["TE", 1, 20, 40], ["TE", 2, 93.5, 40], QB, RB],
};
const FORM_TIP = { 11: "1 back, 1 tight end, 3 receivers", 12: "1 back, 2 tight ends, 2 receivers", 21: "2 backs (a fullback), 1 tight end, 2 receivers", 10: "1 back, 4 receivers", 13: "1 back, 3 tight ends, 1 receiver" };
const DEF_CORE = [["CB", 0, 6.5, 62], ["DL", 0, 28, 74], ["DL", 1, 40, 74], ["DL", 2, 52, 74], ["DL", 3, 64, 74], ["CB", 1, 93.5, 62], ["S", 0, 40, 15], ["S", 1, 64, 22]];
const DEF_FORMS = {
  base: [["LB", 0, 70, 46], ["LB", 1, 46, 46], ["LB", 2, 22, 46]],
  nickel: [["LB", 1, 52, 46], ["LB", 2, 34, 46], ["CB", 2, 80, 46]],
  dime: [["LB", 1, 46, 46], ["CB", 2, 80, 46], ["CB", 3, 20, 46]],
};
const PKG_TIP = { base: "3 linebackers: against heavy sets", nickel: "2 linebackers and a nickel back: against 3 receivers", dime: "1 linebacker and 2 extra defensive backs: passing downs" };
const SPOTS = {
  special: [["K", 0, 38, 62], ["P", 0, 62, 62], ["KR", 0, 34, 20], ["PR", 0, 66, 20]],
  specialists: [["SUBLB", 0, 50, 16], ["RLE", 0, 26, 40], ["RDT", 0, 50, 40], ["RRE", 0, 74, 40], ["PWHB", 0, 36, 66], ["RB3D", 0, 64, 66]],
};
const SIDES = [["offense", "Offense"], ["defense", "Defense"], ["special", "Special teams"], ["specialists", "Specialists"]];
// the line of scrimmage, just under the offensive line / in front of the defensive line
const LOS = { offense: 24, defense: 82, special: 44, specialists: 52 };

const H = { fontSize: 12, fontWeight: 800, letterSpacing: ".07em", color: "#94a3b8", textTransform: "uppercase" };
const weeks = (n) => `${n} wk${n === 1 ? "" : "s"}`;
const outText = (p) => (p.injured ? `Out · ${weeks(p.injWk || 1)}` : p.hurt?.wks > 0 ? "Questionable" : "");
// what a player is by nature, under his name in the menu
const natural = (p) => (p.pos === "DL" ? (naturalDL(p) === "DT" ? "natural tackle" : "natural edge") : ROLE_SLOTS[p.pos] && p.posAttrs ? `natural ${({ OUT: "outside corner", NB: "nickel", SLOT: "slot", X: "X", Z: "Z", SAM: "SAM", MIKE: "MIKE", WILL: "WILL", FS: "free safety", SS: "strong safety" })[naturalRole(p)] || naturalRole(p)}` : "");

function Card({ label, p, rating, share, on, warn, ghost, onClick, x, y }) {
  return (
    <button type="button" onClick={onClick} title={warn || (p ? `${label}: ${p.name}` : `${label}: empty`)}
      style={{ position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)", width: label.length >= 4 ? "clamp(150px, 12.6%, 190px)" : "clamp(118px, 11.3%, 176px)", zIndex: on ? 6 : 1, textAlign: "left", cursor: "pointer", color: "#f3f5f8",
        background: on ? "#3b82f6" : ghost ? "#0f1a14" : "#141b29", border: `2px ${ghost ? "dashed" : "solid"} ${on ? "#93c5fd" : warn ? "#f87171" : ghost ? "#ffffff22" : "#ffffff2b"}`, borderRadius: 14, padding: "7px 9px 8px", boxShadow: "0 6px 18px #0008", opacity: ghost ? 0.6 : 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 900, padding: "3px 6px", borderRadius: 6, background: on ? "#ffffff33" : "#ffffff17", letterSpacing: ".03em", flexShrink: 0 }}>{label}</span>
        <b style={{ fontSize: 14.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0, flex: 1 }}>{p ? p.short : "Empty"}</b>
        {p && <b style={{ fontSize: 15, color: on ? "#fff" : oC(rating), flexShrink: 0 }}>{rating}</b>}
      </div>
      {ghost ? <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ghost}</div>
        : <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 7, height: 15 }}>
          {share != null ? <>
            <div style={{ flex: 1, height: 5, borderRadius: 9, background: "#ffffff1f", overflow: "hidden" }}><div style={{ width: `${share}%`, height: "100%", background: on ? "#fff" : "#22c55e" }} /></div>
            <span style={{ fontSize: 12, fontWeight: 800, color: on ? "#fff" : "#cbd5e1", minWidth: 32, textAlign: "right" }}>{share}%</span>
          </> : <span style={{ fontSize: 12, color: on ? "#e0ecff" : "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p ? p.sub : ""}</span>}
        </div>}
      {warn && <span style={{ position: "absolute", top: -9, right: -9, background: "#f87171", color: "#0b0f17", borderRadius: 99, fontSize: 11, fontWeight: 900, padding: "1px 7px" }}>!</span>}
    </button>
  );
}

const stepBtn = { width: 38, height: 38, border: 0, background: "#ffffff0d", color: "#fff", fontSize: 20, fontWeight: 900, cursor: "pointer" };
function Stepper({ value, onSet }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", borderRadius: 10, background: "#0b0f17", border: "1px solid #ffffff22", overflow: "hidden", flexShrink: 0 }}>
      <button type="button" aria-label="5 fewer snaps" onClick={() => onSet(value - 5)} style={stepBtn}>−</button>
      <b style={{ width: 60, textAlign: "center", fontSize: 16 }}>{value}%</b>
      <button type="button" aria-label="5 more snaps" onClick={() => onSet(value + 5)} style={stepBtn}>+</button>
    </span>
  );
}

export default function DepthDesk({ api }) {
  const { roster, side, setSide, pick, setPick, form, setForm, pkg, setPkg, order, order0, depthList, fieldOrder, shares, pickedId, pickRole, chosen, place, switchSide, moveIn, splitOut, backToTE, situations, specOn, specNow, snaps, setSnaps, shape, setSel, onAutoFill, viewToggle, gamePlan, personnel, team, depthOrder, setDepthOrder, resetShares, previewPos, single, shown, lastName, spotName, spotOvr, defLean } = api;
  const fieldRef = useRef(null), popRef = useRef(null);
  const [fh, setFh] = useState(560); // the field fills the screen below the bar
  const [box, setBox] = useState({ w: 1200, h: 560 });
  const [popAt, setPopAt] = useState(null);
  const [plan, setPlan] = useState(false);
  useLayoutEffect(() => {
    const fit = () => { const el = fieldRef.current; if (!el) return; let sp = el.parentElement; while (sp && sp !== document.body && !/(auto|scroll)/.test(getComputedStyle(sp).overflowY)) sp = sp.parentElement; if (!sp || sp === document.body) sp = document.documentElement;
      // fit inside the screen's scroll area (the display size setting zooms the page, so measure in its units)
      const r = el.getBoundingClientRect(), sr = sp.getBoundingClientRect(), k = sp.offsetHeight ? sr.height / sp.offsetHeight || 1 : 1;
      const view = sp === document.documentElement ? window.innerHeight / k : sp.clientHeight, top = (r.top - (sp === document.documentElement ? 0 : sr.top)) / k + sp.scrollTop;
      const h = Math.max(470, Math.round(view - top - 14)); setFh((o) => (o === h ? o : h)); setBox((o) => (o.w === el.offsetWidth && o.h === h ? o : { w: el.offsetWidth, h })); };
    fit(); const raf = requestAnimationFrame(fit), t = setTimeout(fit, 400);
    window.addEventListener("resize", fit);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); window.removeEventListener("resize", fit); };
  }, []);
  useEffect(() => { const k = (e) => { if (e.key === "Escape") { setPick(null); setPlan(false); } }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [setPick]);

  const spots = side === "offense" ? [...FORMS[form], ...LINE] : side === "defense" ? [...DEF_CORE, ...DEF_FORMS[pkg]] : SPOTS[side];
  const sidePositions = [...new Set(spots.map(([pos]) => (pos === "FB" ? "RB" : pos)))];
  const cards = spots.map(([pos, idx, x, y]) => {
    const full = order(pos), p = isSpec(pos) ? specOn(pos) : full.filter((q) => !q.injured)[idx];
    const at = !p || isSpec(pos) ? idx : Math.max(0, full.indexOf(p));
    const share = p && !single(pos) && pos !== "FB" ? shares(pos)[p.id] ?? 0 : null;
    // he's in because the man ahead of him is hurt
    const missing = !isSpec(pos) && pos !== "FB" && full[idx]?.injured ? full[idx] : null;
    const label = pos === "FB" ? "FB" : spotName(pos, idx);
    const sub = isSpec(pos) ? (specNow?.[pos] ? `In for ${lastName(specNow[pos][1].name)}` : "The starter stays on") : "";
    return { pos, idx, x, y, at, label, share, p: p && { ...p, short: lastName(p.name), sub }, rating: p ? spotOvr(p, pos, idx) : null, warn: missing && p ? `Starting for the injured ${lastName(missing.name)}` : null };
  });
  // in nickel the SAM steps off the field: show him, dashed, where he'd be
  const ghosts = side === "defense" && pkg === "nickel" ? (() => { const s = order("LB").filter((q) => !q.injured)[0]; return s ? [{ pos: "LB", idx: 0, x: 15, y: 46, label: "SAM", p: { ...s, short: lastName(s.name) }, rating: spotOvr(s, "LB", 0), ghost: "Off the field in nickel" }] : []; })() : [];
  const openSpot = (c) => { setPlan(false); setPick(c.pos === "FB" ? ["RB", Math.max(1, order0("RB").indexOf(order("FB")[0]))] : [c.pos, c.at]); };
  const sel = pick && cards.find((c) => (c.pos === "FB" ? pick[0] === "RB" && c.p && order0("RB")[pick[1]]?.id === c.p.id : c.pos === pick[0] && c.at === pick[1])) || (pick && ghosts.find((g) => g.pos === pick[0] && pick[1] === order("LB").indexOf(order("LB").filter((q) => !q.injured)[0]))) || null;

  // place the menu beside the card it belongs to: below or above if it fits, else to the side
  useLayoutEffect(() => {
    const el = popRef.current;
    if (!pick || !el) { setPopAt(null); return; }
    const W = fieldRef.current.offsetWidth, FH = fieldRef.current.offsetHeight, Hh = FH - 8, pw = el.offsetWidth, ph = el.offsetHeight;
    const c = sel || { x: 50, y: 40 };
    const cx = (c.x / 100) * W, cy = (c.y / 100) * FH, cw = (c.label || "").length >= 4 ? Math.min(190, Math.max(150, 0.126 * W)) : Math.min(176, Math.max(118, 0.113 * W)), chh = 64;
    const clampX = (v) => Math.max(10, Math.min(W - pw - 10, v)), clampY = (v) => Math.max(10, Math.min(Hh - ph, v));
    let at;
    if (cy + chh / 2 + 14 + ph <= Hh) at = { left: clampX(cx - pw / 2), top: cy + chh / 2 + 14, arrow: "top" };
    else if (cy - chh / 2 - 14 - ph >= 8) at = { left: clampX(cx - pw / 2), top: cy - chh / 2 - 14 - ph, arrow: "bottom" };
    else if (W - (cx + cw / 2) > cx - cw / 2) at = { left: cx + cw / 2 + 14, top: clampY(cy - ph / 2), arrow: "left" };
    else at = { left: cx - cw / 2 - 14 - pw, top: clampY(cy - ph / 2), arrow: "right" };
    at.ax = at.arrow === "top" || at.arrow === "bottom" ? Math.max(18, Math.min(pw - 18, cx - at.left)) : Math.max(18, Math.min(ph - 18, cy - at.top));
    setPopAt((o) => (o && o.left === at.left && o.top === at.top && o.arrow === at.arrow && o.ax === at.ax ? o : at));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sel is rebuilt every render; its spot is what matters
  }, [pick, box.w, box.h, sel?.x, sel?.y, snaps, side, form, pkg, pickedId]);

  // the bench along the bottom: who rotates in, then who's out, then the rest by rating
  const onField = new Set([...cards, ...ghosts].map((c) => c.p?.id).filter(Boolean));
  const bench = (() => {
    const pool = roster.filter((p) => !onField.has(p.id) && sidePositions.includes(p.pos));
    const sh = (p) => (single(p.pos) ? 0 : shares(p.pos)[p.id] || 0);
    return pool.map((p) => ({ p, s: sh(p) })).sort((a, b) => (b.s > 0) - (a.s > 0) || b.s - a.s || (!!b.p.injured - !!a.p.injured) || b.p.ovr - a.p.ovr);
  })();
  const benchOpen = (p) => { const i = order(p.pos).findIndex((q) => q.id === p.id); setPick([p.pos, Math.max(0, Math.min(i, (fieldOrder(p.pos).length || 1) - 1))]); };

  // ---- the menu for the spot you opened
  const pos = pick?.[0];
  const isOne = pos && single(pos);
  const here = pick && chosen.filter((c) => !c.move && !c.wide && !c.back);
  const extra = pick && chosen.filter((c) => c.move || c.wide || c.back);
  const role = pos && ROLE_SLOTS[pos]?.[pickRole];
  const roleText = !pos ? "" : pos === "DL" ? (slotKind(pickRole) === "EDGE" ? "edge rusher" : "defensive tackle") : role ? ROLE_NAME[role] : SPEC_ROLES[pos] ? SPEC_ROLES[pos].label.toLowerCase() : { KR: "kick returner", PR: "punt returner", K: "kicker", P: "punter", QB: "quarterback", RB: "running back", TE: "tight end", LT: "left tackle", LG: "left guard", C: "center", RG: "right guard", RT: "right tackle" }[pos] || "";
  const picked = pick && roster.find((p) => p.id === pickedId);
  const healthyHere = pick ? order(pos).filter((p) => !p.injured) : [];
  const myShare = pick && picked && !picked.injured && !isOne && setSnaps ? shares(pos)[picked.id] ?? 0 : null;
  const setMine = (v) => setSnaps(linkedSet(pos, order(pos), snaps || {}, shape, picked.id, v));
  // who else plays his spot (the snaps he doesn't), from the split bars' lanes
  const restNote = (() => {
    if (myShare == null) return "";
    const lanes = laneSplit(pos, order(pos), snaps || {}, shape), ln = lanes.find((l) => l.segs.some((s) => s.id === picked.id));
    if (!ln) return "";
    const nm = Object.fromEntries(healthyHere.map((p) => [p.id, lastName(p.name)]));
    const bits = ln.segs.filter((s) => s.id !== picked.id && s.v > 0).map((s) => `${nm[s.id]} ${s.v}%`);
    const other = { WR: "two-TE sets", TE: "other sets", LB: "nickel and dime", CB: "base defense", S: "other packages", DL: "other fronts" }[pos];
    if (ln.other > 0 && other) bits.push(`${other} ${ln.other}%`);
    return bits.length ? `The rest: ${bits.join(", ")}` : "Every snap at this spot";
  })();
  const changed = pick && !isOne && order(pos).some((p) => snaps?.[p.id] != null);
  const sits = pick ? situations(pos) : [];
  const ratingAt = (p) => ((p.pos === pos || (pos === "WR" && p.pos === "TE")) && (pos === "DL" || ROLE_SLOTS[pos]) ? spotOvr(p, pos, pickRole) : shown(p, pos));

  const pop = pick && (
    <div ref={popRef} role="dialog" aria-label={`${spotName(pos, pickRole)} menu`} style={{ position: "absolute", zIndex: 8, width: sits.length ? 470 : 400, maxHeight: box.h - 20, overflowY: "auto", left: popAt?.left ?? 0, top: popAt?.top ?? 0, visibility: popAt ? "visible" : "hidden", background: "#1b2436", border: "1px solid #3b82f6", borderRadius: 16, boxShadow: "0 24px 60px #000c", padding: "14px 16px 16px", color: "#f3f5f8" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <b style={{ fontSize: 17 }}>{spotName(pos, pickRole)}</b>
        <span style={{ fontSize: 13, color: "#a3adbd", flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{roleText}</span>
        <button type="button" onClick={() => setPick(null)} aria-label="Close" style={{ background: "transparent", border: 0, color: "#a3adbd", fontSize: 22, lineHeight: 1, cursor: "pointer", padding: "0 2px" }}>×</button>
      </div>
      {(role || SPEC_ROLES[pos]) && <div style={{ fontSize: 12.5, color: "#a3adbd", marginTop: 4, lineHeight: 1.4 }}>{SPEC_ROLES[pos] ? `${SPEC_ROLES[pos].when}. ${SPEC_ROLES[pos].wants}` : `Wants: ${ROLE_WANTS[roleKind(role)]}`}</div>}
      <div style={{ ...H, margin: "12px 0 4px" }}>{SPEC_ROLES[pos] ? "Who does it" : `Who starts at ${spotName(pos, pickRole)}`}</div>
      {!here.length && <div style={{ color: "#a3adbd", fontSize: 13 }}>Nobody on the roster plays {SPEC_ROLES[pos]?.pos || pos}.</div>}
      <div style={{ maxHeight: 236, overflowY: "auto", margin: "0 -4px" }}>
        {here.map(({ p, at, i }) => {
          const cur = at === pos && p.id === pickedId, out = outText(p), v = ratingAt(p), other = at !== pos;
          const tag = !cur && !p.injured && !isOne && at === pos && fieldOrder(at).slice(0, api.STARTERS[at] || 1).some((q) => q.id === p.id) ? spotName(at, fieldOrder(at).findIndex((q) => q.id === p.id)) : null;
          const sub = [other ? `plays ${at}, they swap sides` : tag ? `starts at ${tag}, they swap` : natural(p), isOne && !SPEC_ROLES[pos]?.pos ? `${p.pos} ${p.ovr}` : ""].filter(Boolean).join(" · ");
          return (
            <div key={`${at}${p.id}`} role="button" tabIndex={0} onClick={() => !cur && !p.injured && (other ? switchSide(pos, p) : place(pos, pick[1], p))}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 8px", borderRadius: 10, background: cur ? "#3b82f62b" : "transparent", opacity: p.injured ? 0.5 : 1, cursor: cur || p.injured ? "default" : "pointer" }}>
              <span style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${cur ? "#3b82f6" : "#ffffff44"}`, display: "grid", placeItems: "center", flexShrink: 0 }}>{cur && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6" }} />}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b onClick={(e) => { e.stopPropagation(); setSel(p); }} title="Open his card" style={{ fontSize: 14.5, cursor: "pointer", whiteSpace: "nowrap" }}>{p.name}</b>
                {sub && <div style={{ fontSize: 12, color: "#a3adbd", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>}
              </div>
              {out && <span style={{ fontSize: 12.5, fontWeight: 800, color: p.injured ? "#f87171" : "#eab308", whiteSpace: "nowrap" }}>{out}</span>}
              {!isOne && !p.injured && at === pos && <span style={{ fontSize: 12, color: "#a3adbd", minWidth: 34, textAlign: "right" }}>{shares(pos)[p.id] ?? 0}%</span>}
              <b style={{ fontSize: 15, color: oC(v), minWidth: 24, textAlign: "right" }}>{v}</b>
            </div>
          );
        })}
      </div>
      {SPEC_ROLES[pos] && (depthOrder || {})[pos]?.length > 0 && <button type="button" onClick={() => setDepthOrder((d) => { const n = { ...d }; delete n[pos]; return n; })} style={{ background: "transparent", border: 0, color: "#7dd3fc", fontSize: 13, cursor: "pointer", padding: "6px 0 0" }}>Leave it to the staff</button>}
      {myShare != null && <>
        <div style={{ ...H, margin: "14px 0 8px", display: "flex" }}><span style={{ flex: 1 }}>How much he plays</span>{changed && <button type="button" onClick={() => resetShares(pos)} style={{ background: "transparent", border: 0, color: "#7dd3fc", fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0, textTransform: "none", letterSpacing: 0 }}>Reset to auto</button>}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}><Stepper value={myShare} onSet={setMine} /><span style={{ fontSize: 13, color: "#a3adbd", lineHeight: 1.35 }}>{restNote}</span></div>
      </>}
      {sits.length > 0 && <>
        <div style={{ ...H, margin: "14px 0 4px", display: "flex" }}><span style={{ flex: 1 }}>Situations</span><button type="button" onClick={() => { setSide("specialists"); setPick(null); }} style={{ background: "transparent", border: 0, color: "#7dd3fc", fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0, textTransform: "none", letterSpacing: 0 }}>Change under Specialists</button></div>
        {sits.map(([k, v]) => <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "5px 0", fontSize: 13.5 }}><span style={{ color: "#a3adbd" }}>{k}</span><b style={{ textAlign: "right" }}>{v}</b></div>)}
      </>}
      {extra.length > 0 && <>
        <div style={{ ...H, margin: "14px 0 4px" }}>{pos === "WR" ? "Tight ends who can split out" : pos === "TE" ? "Playing receiver now" : "From another position"}</div>
        {extra.slice(0, 4).map(({ p, at, move, wide }) => (
          <div key={`x${p.id}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
            <b style={{ flex: 1, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name} <span style={{ color: "#a3adbd", fontWeight: 600, fontSize: 12 }}>{at} {p.ovr}</span></b>
            <button type="button" onClick={() => (wide ? splitOut(pick[1], p) : move ? moveIn(pos, pick[1], p) : backToTE(pick[1], p))} style={{ background: "#ffffff12", border: 0, color: "#e2e8f0", borderRadius: 8, padding: "5px 10px", fontSize: 12.5, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>{wide ? `Split out · ${spotOvr(p, "WR", pick[1])}` : move ? `Move here · ${previewPos ? previewPos(p, pos) : ""}` : "Back to TE"}</button>
          </div>
        ))}
      </>}
      {popAt && <span style={{ position: "absolute", width: 14, height: 14, background: "#1b2436", transform: "rotate(45deg)", ...(popAt.arrow === "top" ? { top: -8, left: popAt.ax - 7, borderLeft: "1px solid #3b82f6", borderTop: "1px solid #3b82f6" } : popAt.arrow === "bottom" ? { bottom: -8, left: popAt.ax - 7, borderRight: "1px solid #3b82f6", borderBottom: "1px solid #3b82f6" } : popAt.arrow === "left" ? { left: -8, top: popAt.ax - 7, borderLeft: "1px solid #3b82f6", borderBottom: "1px solid #3b82f6" } : { right: -8, top: popAt.ax - 7, borderRight: "1px solid #3b82f6", borderTop: "1px solid #3b82f6" }) }} />}
    </div>
  );

  const pill = (on) => ({ ...quietPill(on), fontSize: 14, padding: "7px 13px" });
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <div role="tablist" style={{ display: "inline-flex", gap: 2 }}>{SIDES.map(([k, l]) => <button key={k} role="tab" aria-selected={side === k} onClick={() => { setSide(k); setPick(null); }} style={{ border: 0, borderRadius: 12, padding: "8px 14px", fontSize: 15, fontWeight: 800, cursor: "pointer", background: side === k ? "#fff" : "transparent", color: side === k ? "#0b0f17" : "#94a3b8" }}>{l}</button>)}</div>
        {side === "offense" && <span style={{ display: "inline-flex", alignItems: "center", gap: 8, marginLeft: 8 }}><span style={{ fontSize: 13.5, color: "#94a3b8" }}>Formation</span><span style={{ display: "inline-flex", background: "#ffffff0d", borderRadius: 12, padding: 3 }}>{Object.keys(FORMS).map((k) => <button key={k} title={FORM_TIP[k]} onClick={() => { setForm(k); setPick(null); }} style={pill(form === k)}>{k}</button>)}</span>{personnel && <span style={{ fontSize: 13, color: "#94a3b8" }}>Your identity: <b style={{ color: "#e2e8f0" }}>{personnel}</b></span>}</span>}
        {side === "defense" && <span style={{ display: "inline-flex", alignItems: "center", gap: 8, marginLeft: 8 }}><span style={{ fontSize: 13.5, color: "#94a3b8" }}>Package</span><span style={{ display: "inline-flex", background: "#ffffff0d", borderRadius: 12, padding: 3 }}>{Object.keys(DEF_FORMS).map((k) => <button key={k} title={PKG_TIP[k]} onClick={() => { setPkg(k); setPick(null); }} style={{ ...pill(pkg === k), textTransform: "capitalize" }}>{k}</button>)}</span>{defLean && <span style={{ fontSize: 13, color: "#94a3b8" }}>Your lean: <b style={{ color: "#e2e8f0" }}>{defLean}</b></span>}</span>}
        <span style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "#94a3b8" }}>Click a player to change him</span>
          {gamePlan && <button type="button" onClick={() => { setPick(null); setPlan((v) => !v); }} style={{ minHeight: 38, borderRadius: 10, border: 0, padding: "0 14px", background: plan ? "#3b82f6" : "#ffffff12", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>Game plan</button>}
          {viewToggle}
          <button type="button" onClick={onAutoFill} style={{ minHeight: 38, borderRadius: 10, border: 0, padding: "0 14px", background: "#ffffff12", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>Auto-fill</button>
        </span>
      </div>
      <div ref={fieldRef} data-depth-field style={{ position: "relative", height: fh, borderRadius: 18, overflow: "hidden", border: "1px solid #ffffff12", background: "linear-gradient(180deg,#14402a,#0f3020)" }}>
        <div title="Line of scrimmage" style={{ position: "absolute", left: 0, right: 0, top: `${LOS[side]}%`, borderTop: "2px solid #ffffff3a" }} />
        {cards.map((c) => <Card key={`${c.pos}${c.idx}`} {...c} on={!!sel && sel === c} onClick={() => openSpot(c)} />)}
        {ghosts.map((g) => <Card key="ghost" {...g} on={!!sel && sel === g} onClick={() => setPick(["LB", Math.max(0, order("LB").indexOf(order("LB").filter((q) => !q.injured)[0]))])} />)}
        {cards.filter((c) => c.warn).map((c) => <div key={`w${c.pos}${c.idx}`} style={{ position: "absolute", left: `${c.x}%`, top: `calc(${c.y}% + 40px)`, transform: "translateX(-50%)", background: "#f87171", color: "#0b0f17", fontSize: 12, fontWeight: 800, borderRadius: 8, padding: "2px 8px", whiteSpace: "nowrap", zIndex: 2 }}>{c.warn}</div>)}
        {bench.length > 0 && <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 54, padding: "0 16px", background: "#0b0f17cc", borderTop: "1px solid #ffffff14", display: "flex", alignItems: "center", gap: 10, zIndex: 2 }}>
          <span style={{ ...H, flexShrink: 0 }}>Bench</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, height: 34, overflow: "hidden", flex: 1, minWidth: 0 }}>
            {bench.map(({ p, s }) => { const out = p.injured; return (
              <button key={p.id} type="button" onClick={() => benchOpen(p)} title={`${p.name}: ${p.pos} ${p.ovr}${out ? ` · out ${weeks(p.injWk || 1)}` : s ? ` · ${s}% of the snaps` : ""}`} style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 34, background: out ? "#2a1518" : "#141b29", border: `1px solid ${out ? "#f8717155" : "#ffffff1f"}`, borderRadius: 10, padding: "0 10px", whiteSpace: "nowrap", cursor: "pointer", color: "#f3f5f8" }}>
                <b style={{ fontSize: 13.5 }}>{p.name}</b><b style={{ fontSize: 13.5, color: oC(p.ovr) }}>{p.ovr}</b>
                <span style={{ fontSize: 12, color: out ? "#f87171" : "#a3adbd", fontWeight: out ? 800 : 500 }}>{p.pos}{out ? ` · out ${weeks(p.injWk || 1)}` : p.hurt?.wks > 0 ? " · Q" : s ? ` · ${s}%` : ""}</span>
              </button>); })}
          </div>
        </div>}
        {(pick || plan) && <div onClick={() => { setPick(null); setPlan(false); }} style={{ position: "absolute", inset: 0, background: "#05080da6", zIndex: 4 }} />}
        {pop}
        {plan && gamePlan && <div style={{ position: "absolute", zIndex: 8, top: 12, right: 12, width: 460, maxHeight: box.h - 24, overflowY: "auto", background: "#111827", border: "1px solid #ffffff1f", borderRadius: 16, boxShadow: "0 24px 60px #000c", padding: 8 }}>
          <button type="button" onClick={() => setPlan(false)} aria-label="Close" style={{ position: "absolute", top: 18, right: 22, zIndex: 1, background: "transparent", border: 0, color: "#a3adbd", fontSize: 22, lineHeight: 1, cursor: "pointer" }}>×</button>
          {gamePlan}
        </div>}
      </div>
    </div>
  );
}
