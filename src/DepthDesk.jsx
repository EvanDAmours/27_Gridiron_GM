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
import { SplitBars } from "./SnapBars.jsx";
import AutoFill from "./AutoFill.jsx";

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

// Specialists in plain words on the field (the engine's keys are PWHB, RB3D, RLE, RDT, RRE, SUBLB)
const SPEC_NAME = { PWHB: "Power back", RB3D: "3rd-down back", RLE: "Rush end L", RDT: "Rush tackle", RRE: "Rush end R", SUBLB: "Cover LB" };
const SPEC_WHEN = { PWHB: "Short yardage", RB3D: "3rd down", RLE: "Passing downs", RDT: "Passing downs", RRE: "Passing downs", SUBLB: "Nickel & dime" };
// one man plays every snap here: no snap controls (the list view still has them)
const NO_SNAPS = new Set(["QB", "K", "P", "LT", "LG", "C", "RG", "RT"]);
// what the formation buttons show, in words
const FORM_WORDS = { 11: "1 RB · 1 TE · 3 WR", 12: "1 RB · 2 TE · 2 WR", 21: "2 RB · 1 TE · 2 WR", 10: "1 RB · 4 WR", 13: "1 RB · 3 TE · 1 WR" };
const PKG_WORDS = { base: "4 DL · 3 LB · 4 DB", nickel: "4 DL · 2 LB · 5 DB", dime: "4 DL · 1 LB · 6 DB" };
const HELP = [
  ["Who starts", "Click any player to choose who starts at his spot. Each choice shows his rating at that spot, which can differ from his overall."],
  ["Snap %", "The bar on each card is how much he plays. A starter can play well under 100% when your formations take his spot off the field: the X receiver sits in two-tight-end sets, the SAM linebacker in nickel. His menu shows where the rest of his spot's snaps go."],
  ["Setting snaps", "Snap counts puts - and + on every card and bench player. Shares you set show in yellow; a lock keeps a player's share fixed while you change the others. Quarterbacks, linemen and kickers play every snap, so they have none."],
  ["Formation and package", "Those buttons only change what the field shows. What your team actually lines up in is your personnel, under Game plan."],
  ["Specialists", "Players who come on in one situation: a power back in short yardage, a 3rd-down back, rush ends and a rush tackle on passing downs, a cover linebacker in nickel and dime. The staff only uses one who is clearly better at it than the starter."],
  ["Auto-fill", "Starts the best players by rating at every position, each at the spot he fits. It asks first, and you can undo it for a few seconds."],
];
const H = { fontSize: 12, fontWeight: 800, letterSpacing: ".07em", color: "#94a3b8", textTransform: "uppercase" };
const weeks = (n) => `${n} wk${n === 1 ? "" : "s"}`;
const outText = (p) => (p.injured ? `Out · ${weeks(p.injWk || 1)}` : p.hurt?.wks > 0 ? "Questionable" : "");
// what a player is by nature, under his name in the menu
const natural = (p) => (p.pos === "RB" && p.mpos === "FB" ? "fullback" : p.pos === "DL" ? (naturalDL(p) === "DT" ? "natural tackle" : "natural edge") : ROLE_SLOTS[p.pos] && p.posAttrs ? `natural ${({ OUT: "outside corner", NB: "nickel", SLOT: "slot", X: "X", Z: "Z", SAM: "SAM", MIKE: "MIKE", WILL: "WILL", FS: "free safety", SS: "strong safety" })[naturalRole(p)] || naturalRole(p)}` : "");

// A small padlock (no emoji): locked players keep their share while you change the others.
const Lock = ({ on, size = 13 }) => <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" style={{ display: "block" }}><rect x="3" y="7" width="10" height="7.5" rx="1.6" fill={on ? "#facc15" : "none"} stroke={on ? "#facc15" : "#94a3b8"} strokeWidth="1.6" /><path d={on ? "M5.3 7V5a2.7 2.7 0 0 1 5.4 0v2" : "M5.3 7V5a2.7 2.7 0 0 1 5.3-.6"} fill="none" stroke={on ? "#facc15" : "#94a3b8"} strokeWidth="1.6" strokeLinecap="round" /></svg>;
const mini = { width: 24, height: 22, border: 0, borderRadius: 6, background: "#ffffff17", color: "#fff", fontSize: 15, fontWeight: 900, lineHeight: 1, cursor: "pointer", flexShrink: 0, padding: 0 };

// A starter's card. edit: snap counts mode (- and + right on the card). mine: you set his share.
function Card({ label, p, rating, share, on, warn, ghost, onClick, x, y, edit, onStep, mine, locked, why }) {
  const stop = (f) => (e) => { e.stopPropagation(); f(); };
  return (
    <div role="button" tabIndex={0} onClick={onClick} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }} title={warn || (p ? `${label}: ${p.name}${why ? `. ${why}` : ""}${mine ? " Snaps set by you." : ""}${locked ? " Locked." : ""}` : `${label}: empty`)}
      style={{ position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)", width: label.length >= 8 ? "clamp(200px, 16%, 240px)" : label.length >= 4 ? "clamp(150px, 12.6%, 190px)" : "clamp(118px, 11.3%, 176px)", zIndex: on ? 6 : 1, textAlign: "left", cursor: "pointer", color: "#f3f5f8", userSelect: "none",
        background: on ? "#3b82f6" : ghost ? "#0f1a14" : "#141b29", border: `2px ${ghost ? "dashed" : "solid"} ${on ? "#93c5fd" : warn ? "#f87171" : ghost ? "#ffffff22" : "#ffffff2b"}`, borderRadius: 14, padding: "7px 9px 8px", boxShadow: "0 6px 18px #0008", opacity: ghost ? 0.6 : 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 900, padding: "3px 6px", borderRadius: 6, background: on ? "#ffffff33" : "#ffffff17", letterSpacing: ".03em", flexShrink: 0 }}>{label}</span>
        <b style={{ fontSize: 14.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0, flex: 1 }}>{p ? p.short : "Empty"}</b>
        {p && <b style={{ fontSize: 15, color: on ? "#fff" : oC(rating), flexShrink: 0 }}>{rating}</b>}
      </div>
      {ghost ? <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ghost}</div>
        : <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: edit && share != null ? 5 : 7, height: edit && share != null ? 22 : 15 }}>
          {share != null ? <>
            {edit && <button type="button" aria-label={`5 fewer snaps for ${p?.name}`} onClick={stop(() => onStep(-5))} style={mini}>−</button>}
            <div style={{ flex: 1, height: 5, borderRadius: 9, background: "#ffffff1f", overflow: "hidden" }}><div style={{ width: `${share}%`, height: "100%", background: on ? "#fff" : mine ? "#facc15" : "#22c55e" }} /></div>
            {locked && <Lock on size={12} />}
            <span style={{ fontSize: 12, fontWeight: 800, color: on ? "#fff" : mine ? "#fde68a" : "#cbd5e1", minWidth: 32, textAlign: "right" }}>{share}%</span>
            {edit && <button type="button" aria-label={`5 more snaps for ${p?.name}`} onClick={stop(() => onStep(5))} style={mini}>+</button>}
          </> : <span style={{ fontSize: 12, color: on ? "#e0ecff" : "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p ? p.sub : ""}</span>}
        </div>}
      {warn && <span style={{ position: "absolute", top: -9, right: -9, background: "#f87171", color: "#0b0f17", borderRadius: 99, fontSize: 11, fontWeight: 900, padding: "1px 7px" }}>!</span>}
    </div>
  );
}

export default function DepthDesk({ api }) {
  const { roster, side, setSide, pick, setPick, form, setForm, pkg, setPkg, order, order0, depthList, fieldOrder, shares, pickedId, pickRole, chosen, place, switchSide, moveIn, splitOut, backToTE, situations, specOn, specNow, snaps, setSnaps, shape, setSel, onAutoFill, viewToggle, gamePlan, personnel, team, depthOrder, setDepthOrder, resetShares, previewPos, single, shown, lastName, spotName, spotOvr, defLean } = api;
  const fieldRef = useRef(null), popRef = useRef(null);
  const [fh, setFh] = useState(560); // the field fills the screen below the bar
  const [box, setBox] = useState({ w: 1200, h: 560 });
  const [popAt, setPopAt] = useState(null);
  const [plan, setPlan] = useState(false);
  const [help, setHelp] = useState(false);
  const [edit, setEdit] = useState(false); // snap counts mode: - and + on every card and bench chip
  // players whose share you locked: saved with the game, and shared with the list view (App's snapPins)
  const [ownLocks, setOwnLocks] = useState(() => new Set());
  const locks = api.locks || ownLocks, setLocks = api.setLocks || setOwnLocks;
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
  useEffect(() => { const k = (e) => { if (e.key === "Escape") { setPick(null); setPlan(false); setHelp(false); } }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [setPick]);

  const spots = side === "offense" ? [...FORMS[form], ...LINE] : side === "defense" ? [...DEF_CORE, ...DEF_FORMS[pkg]] : SPOTS[side];
  const sidePositions = [...new Set(spots.map(([pos]) => (pos === "FB" ? "RB" : pos)))];
  const OTHER_SETS = { WR: "two-tight-end sets", TE: "other sets", LB: "nickel and dime", CB: "base defense", S: "other packages", DL: "other fronts" };
  const restFor = (pos, id) => {
    const ln = laneSplit(pos, order(pos), snaps || {}, shape).find((l) => l.segs.some((sg) => sg.id === id));
    if (!ln) return "";
    const nm = Object.fromEntries(order(pos).map((q) => [q.id, lastName(q.name)]));
    const bits = ln.segs.filter((sg) => sg.id !== id && sg.v > 0).map((sg) => `${nm[sg.id]} ${sg.v}%`);
    if (ln.other > 0 && OTHER_SETS[pos]) bits.push(`${OTHER_SETS[pos]} ${ln.other}%`);
    return bits.length ? `The rest: ${bits.join(", ")}` : "Every snap at this spot";
  };
  const cards = spots.map(([pos, idx, x, y]) => {
    const full = order(pos), p = isSpec(pos) ? specOn(pos) : full.filter((q) => !q.injured)[idx];
    const at = !p || isSpec(pos) ? idx : Math.max(0, full.indexOf(p));
    const share = p && !single(pos) && pos !== "FB" ? shares(pos)[p.id] ?? 0 : null;
    // he's in because the man ahead of him is hurt
    const missing = !isSpec(pos) && pos !== "FB" && full[idx]?.injured ? full[idx] : null;
    const label = pos === "FB" ? "FB" : SPEC_NAME[pos] || spotName(pos, idx);
    const sub = isSpec(pos) ? `${SPEC_WHEN[pos]} · ${specNow?.[pos] ? `in for ${lastName(specNow[pos][1].name)}` : "starter stays on"}` : "";
    return { pos, idx, x, y, at, label, share, why: share != null && share < 100 ? `Plays ${share}% of the snaps. ${restFor(pos, p.id)}.` : null, p: p && { ...p, short: lastName(p.name), sub }, rating: p ? spotOvr(p, pos, idx) : null, warn: missing && p ? `Starting for the injured ${lastName(missing.name)}` : null };
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
    const cx = (c.x / 100) * W, cy = (c.y / 100) * FH, cw = (c.label || "").length >= 8 ? Math.min(240, Math.max(200, 0.16 * W)) : (c.label || "").length >= 4 ? Math.min(190, Math.max(150, 0.126 * W)) : Math.min(176, Math.max(118, 0.113 * W)), chh = 64;
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
  // set one player's share; the difference comes off (or goes to) the others at his position,
  // never a locked one (snapEdit.js linkedSet)
  const setShare = (pos, id, v) => setSnaps && setSnaps((o) => linkedSet(pos, order(pos), o || {}, shape, id, v, locks));
  const shareOf = (pos, id) => shares(pos)[id] ?? 0;
  const toggleLock = (id) => setLocks((l) => { const n = new Set(l); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  // the starters play every snap of their spot; the bench only keeps what you locked. Spot by spot,
  // so a formation that takes a receiver off the field (two-TE sets) still does.
  const startersOnly = (pos) => setSnaps && setSnaps((o0) => { const o = o0 || {}; const n = { ...o };
    const lanes = laneSplit(pos, order(pos), o, shape), st = fieldOrder(pos).slice(0, lanes.length);
    for (const q of order(pos).filter((x) => !x.injured)) if (!locks.has(q.id)) n[q.id] = 0;
    lanes.forEach((ln, k) => { const who = st[k]; if (!who || locks.has(who.id)) return; n[who.id] = Math.min(100, ln.segs.reduce((t, sg) => t + (locks.has(sg.id) && sg.id !== who.id ? 0 : sg.v), 0)); });
    return n; });
  const benchOpen = (p) => { const i = order(p.pos).findIndex((q) => q.id === p.id); setPick([p.pos, Math.max(0, Math.min(i, (fieldOrder(p.pos).length || 1) - 1))]); };

  // ---- the menu for the spot you opened
  const pos = pick?.[0];
  const isOne = pos && single(pos);
  // after a change, the menu shows the spot's new starter (a fresh key re-reads who's there)
  const refresh = (idx) => setPick([pos, idx, Date.now()]);
  const here = pick && chosen.filter((c) => !c.move && !c.wide && !c.back);
  const extra = pick && chosen.filter((c) => c.move || c.wide || c.back);
  const role = pos && ROLE_SLOTS[pos]?.[pickRole];
  const roleText = !pos ? "" : pos === "DL" ? (slotKind(pickRole) === "EDGE" ? "edge rusher" : "defensive tackle") : role ? ROLE_NAME[role] : SPEC_ROLES[pos] ? SPEC_ROLES[pos].label.toLowerCase() : { KR: "kick returner", PR: "punt returner", K: "kicker", P: "punter", QB: "quarterback", RB: "running back", TE: "tight end", LT: "left tackle", LG: "left guard", C: "center", RG: "right guard", RT: "right tackle" }[pos] || "";
  const picked = pick && roster.find((p) => p.id === pickedId);
  const healthyHere = pick ? order(pos).filter((p) => !p.injured) : [];
  const myShare = pick && picked && !picked.injured && !isOne && !NO_SNAPS.has(pos) && setSnaps ? shares(pos)[picked.id] ?? 0 : null;
  // who else plays his spot (the snaps he doesn't), from the split bars' lanes
  const restNote = myShare == null ? "" : restFor(pos, picked.id);
  const changed = pick && !isOne && order(pos).some((p) => snaps?.[p.id] != null);
  const sits = pick ? situations(pos) : [];
  const ratingAt = (p) => ((p.pos === pos || (pos === "WR" && p.pos === "TE")) && (pos === "DL" || ROLE_SLOTS[pos]) ? spotOvr(p, pos, pickRole) : shown(p, pos));

  const pop = pick && (
    <div ref={popRef} role="dialog" aria-label={`${spotName(pos, pickRole)} menu`} style={{ position: "absolute", zIndex: 8, width: !isOne && setSnaps ? 540 : sits.length ? 470 : 400, maxHeight: box.h - 20, overflowY: "auto", left: popAt?.left ?? 0, top: popAt?.top ?? 0, visibility: popAt ? "visible" : "hidden", background: "#1b2436", border: "1px solid #3b82f6", borderRadius: 16, boxShadow: "0 24px 60px #000c", padding: "14px 16px 16px", color: "#f3f5f8" }}>
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
            <div key={`${at}${p.id}`} role="button" tabIndex={0} onClick={() => { if (cur || p.injured) return; if (other) switchSide(pos, p); else place(pos, pick[1], p); refresh(other ? 0 : pick[1]); }}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 8px", borderRadius: 10, background: cur ? "#3b82f62b" : "transparent", opacity: p.injured ? 0.5 : 1, cursor: cur || p.injured ? "default" : "pointer" }}>
              <span style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${cur ? "#3b82f6" : "#ffffff44"}`, display: "grid", placeItems: "center", flexShrink: 0 }}>{cur && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6" }} />}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b onClick={(e) => { e.stopPropagation(); setSel(p); }} title="Open his card" style={{ fontSize: 14.5, cursor: "pointer", whiteSpace: "nowrap" }}>{p.name}</b>
                {sub && <div style={{ fontSize: 12, color: "#a3adbd", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>}
              </div>
              {out && <span style={{ fontSize: 12.5, fontWeight: 800, color: p.injured ? "#f87171" : "#eab308", whiteSpace: "nowrap" }}>{out}</span>}
              <b style={{ fontSize: 15, color: oC(v), minWidth: 24, textAlign: "right" }}>{v}</b>
              {!isOne && !NO_SNAPS.has(pos) && setSnaps && at === pos && !p.injured && (() => { const sv = shareOf(pos, p.id), lk = locks.has(p.id), mine = snaps?.[p.id] != null; return (
                <span onClick={(e) => e.stopPropagation()} style={{ display: "inline-flex", alignItems: "center", gap: 3, cursor: "default", marginLeft: 4 }}>
                  <button type="button" aria-label={`5 fewer snaps for ${p.name}`} disabled={lk} onClick={() => setShare(pos, p.id, sv - 5)} style={{ ...mini, opacity: lk ? 0.35 : 1 }}>−</button>
                  <b style={{ width: 40, textAlign: "center", fontSize: 13, color: lk ? "#facc15" : mine ? "#fde68a" : "#e5e7eb" }}>{sv}%</b>
                  <button type="button" aria-label={`5 more snaps for ${p.name}`} disabled={lk} onClick={() => setShare(pos, p.id, sv + 5)} style={{ ...mini, opacity: lk ? 0.35 : 1 }}>+</button>
                  <button type="button" aria-label={lk ? `Unlock ${p.name}'s snaps` : `Lock ${p.name}'s snaps`} aria-pressed={lk} title={lk ? "Locked: changing the others won't move him. Click to unlock." : "Lock his snaps so changing the others won't move him"} onClick={() => toggleLock(p.id)} style={{ ...mini, background: lk ? "#facc1526" : "transparent", display: "grid", placeItems: "center" }}><Lock on={lk} /></button>
                </span>); })()}
              {(isOne || !setSnaps || at !== pos || p.injured) && !isOne && <span style={{ width: 120 }} />}
            </div>
          );
        })}
      </div>
      {SPEC_ROLES[pos] && (depthOrder || {})[pos]?.length > 0 && <button type="button" onClick={() => setDepthOrder((d) => { const n = { ...d }; delete n[pos]; return n; })} style={{ background: "transparent", border: 0, color: "#7dd3fc", fontSize: 13, cursor: "pointer", padding: "6px 0 0" }}>Leave it to the staff</button>}
      {myShare != null && <>
        <div style={{ ...H, margin: "14px 0 4px", display: "flex", alignItems: "center", gap: 12 }}><span style={{ flex: 1 }}>Snap split</span>
          {(api.STARTERS[pos] || 1) > 0 && healthyHere.length > (api.STARTERS[pos] || 1) && <button type="button" onClick={() => startersOnly(pos)} title="The starters play every snap they can; backups only fill in" style={{ background: "transparent", border: 0, color: "#7dd3fc", fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0, textTransform: "none", letterSpacing: 0 }}>Starters only</button>}
          {changed && <button type="button" onClick={() => { resetShares(pos); setLocks((l) => { const n = new Set(l); for (const q of order(pos)) n.delete(q.id); return n; }); }} style={{ background: "transparent", border: 0, color: "#7dd3fc", fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0, textTransform: "none", letterSpacing: 0 }}>Reset to auto</button>}
        </div>
        <SplitBars pos={pos} players={order(pos)} overrides={snaps || {}} shape={shape} compact onChange={(next) => setSnaps(next)} laneName={(k) => spotName(pos, k)} />
        <div style={{ fontSize: 12.5, color: "#a3adbd", marginTop: 4, lineHeight: 1.35 }}>{restNote ? `${lastName(picked.name)} ${myShare}%. ${restNote}.` : ""} Drag a line in a bar to trade snaps, or use - and + beside each player.</div>
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
            <button type="button" onClick={() => { if (wide) splitOut(pick[1], p); else if (move) moveIn(pos, pick[1], p); else backToTE(pick[1], p); refresh(pick[1]); }} style={{ background: "#ffffff12", border: 0, color: "#e2e8f0", borderRadius: 8, padding: "5px 10px", fontSize: 12.5, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>{wide ? `Split out · ${spotOvr(p, "WR", pick[1])}` : move ? `Move here · ${previewPos ? previewPos(p, pos) : ""}` : "Back to TE"}</button>
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
        {side === "offense" && <span style={{ display: "inline-flex", alignItems: "center", gap: 8, marginLeft: 8 }}><span style={{ fontSize: 13.5, color: "#94a3b8" }}>Show</span><span style={{ display: "inline-flex", background: "#ffffff0d", borderRadius: 12, padding: 3 }}>{Object.keys(FORMS).map((k) => <button key={k} title={FORM_TIP[k]} onClick={() => { setForm(k); setPick(null); }} style={pill(form === k)}>{k}</button>)}</span><span style={{ fontSize: 13, color: "#cbd5e1", fontWeight: 700 }}>{FORM_WORDS[form]}</span></span>}
        {side === "defense" && <span style={{ display: "inline-flex", alignItems: "center", gap: 8, marginLeft: 8 }}><span style={{ fontSize: 13.5, color: "#94a3b8" }}>Show</span><span style={{ display: "inline-flex", background: "#ffffff0d", borderRadius: 12, padding: 3 }}>{Object.keys(DEF_FORMS).map((k) => <button key={k} title={PKG_TIP[k]} onClick={() => { setPkg(k); setPick(null); }} style={{ ...pill(pkg === k), textTransform: "capitalize" }}>{k}</button>)}</span><span style={{ fontSize: 13, color: "#cbd5e1", fontWeight: 700 }}>{PKG_WORDS[pkg]}</span></span>}
        <span style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" aria-pressed={help} onClick={() => { setPick(null); setPlan(false); setHelp((v) => !v); }} style={{ minHeight: 38, borderRadius: 10, border: 0, padding: "0 12px", background: help ? "#3b82f6" : "transparent", color: help ? "#fff" : "#94a3b8", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>How it works</button>
          {setSnaps && (side === "offense" || side === "defense") && <button type="button" aria-pressed={edit} onClick={() => { setPick(null); setEdit((v) => !v); }} title="Set everyone's snaps right on the field" style={{ minHeight: 38, borderRadius: 10, border: 0, padding: "0 14px", background: edit ? "#3b82f6" : "#ffffff12", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>Snap counts</button>}
          {gamePlan && <button type="button" onClick={() => { setPick(null); setHelp(false); setPlan((v) => !v); }} title={`What your team lines up in${personnel ? ` (now: ${personnel}${defLean ? `, ${defLean}` : ""})` : ""}, and your schemes`} style={{ minHeight: 38, borderRadius: 10, border: 0, padding: "0 14px", background: plan ? "#3b82f6" : "#ffffff12", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>Game plan</button>}
          {viewToggle}
          <AutoFill onAutoFill={() => { setPick(null); onAutoFill(); }} depthOrder={depthOrder} setDepthOrder={setDepthOrder} snaps={snaps} setSnaps={setSnaps} locks={locks} setLocks={setLocks} />
        </span>
      </div>
      <div ref={fieldRef} data-depth-field style={{ position: "relative", height: fh, borderRadius: 18, overflow: "hidden", border: "1px solid #ffffff12", background: "linear-gradient(180deg,#14402a,#0f3020)" }}>
        <div title="Line of scrimmage" style={{ position: "absolute", left: 0, right: 0, top: `${LOS[side]}%`, borderTop: "2px solid #ffffff3a" }} />
        {cards.map((c) => <Card key={`${c.pos}${c.idx}`} {...c} on={!!sel && sel === c} onClick={() => openSpot(c)} edit={edit && !pick && !NO_SNAPS.has(c.pos)} mine={!!c.p && snaps?.[c.p.id] != null} locked={!!c.p && locks.has(c.p.id)} onStep={(d) => setShare(c.pos, c.p.id, shareOf(c.pos, c.p.id) + d)} />)}
        {ghosts.map((g) => <Card key="ghost" {...g} on={!!sel && sel === g} onClick={() => setPick(["LB", Math.max(0, order("LB").indexOf(order("LB").filter((q) => !q.injured)[0]))])} />)}
        {cards.filter((c) => c.warn).map((c) => <div key={`w${c.pos}${c.idx}`} style={{ position: "absolute", left: `${c.x}%`, top: `calc(${c.y}% + 40px)`, transform: "translateX(-50%)", background: "#f87171", color: "#0b0f17", fontSize: 12, fontWeight: 800, borderRadius: 8, padding: "2px 8px", whiteSpace: "nowrap", zIndex: 2 }}>{c.warn}</div>)}
        {bench.length > 0 && <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 54, padding: "0 16px", background: "#0b0f17cc", borderTop: "1px solid #ffffff14", display: "flex", alignItems: "center", gap: 10, zIndex: 2 }}>
          <span style={{ ...H, flexShrink: 0 }}>Bench</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, height: 34, overflow: "hidden", flex: 1, minWidth: 0 }}>
            {bench.map(({ p, s }) => { const out = p.injured, canAdd = edit && !out && !single(p.pos) && !NO_SNAPS.has(p.pos) && setSnaps; return (
              <span key={p.id} style={{ display: "inline-flex", alignItems: "center", height: 34, background: out ? "#2a1518" : "#141b29", border: `1px solid ${out ? "#f8717155" : snaps?.[p.id] != null && s ? "#facc1566" : "#ffffff1f"}`, borderRadius: 10, whiteSpace: "nowrap", color: "#f3f5f8", overflow: "hidden", flexShrink: 0 }}>
                {canAdd && s > 0 && <button type="button" aria-label={`5 fewer snaps for ${p.name}`} onClick={() => setShare(p.pos, p.id, s - 5)} style={{ ...mini, borderRadius: 0, height: 34, width: 28, background: "#ffffff0d" }}>−</button>}
                <button type="button" onClick={() => benchOpen(p)} title={`${p.name}: ${p.pos} ${p.ovr}${out ? ` · out ${weeks(p.injWk || 1)}` : s ? ` · ${s}% of the snaps` : ""}`} style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 34, background: "transparent", border: 0, padding: "0 10px", cursor: "pointer", color: "#f3f5f8" }}>
                  <b style={{ fontSize: 13.5 }}>{p.name}</b><b style={{ fontSize: 13.5, color: oC(p.ovr) }}>{p.ovr}</b>
                  <span style={{ fontSize: 12, color: out ? "#f87171" : snaps?.[p.id] != null && s ? "#fde68a" : "#a3adbd", fontWeight: out ? 800 : 500 }}>{p.pos}{out ? ` · out ${weeks(p.injWk || 1)}` : p.hurt?.wks > 0 ? " · Q" : s ? ` · ${s}%` : ""}</span>
                </button>
                {canAdd && <button type="button" aria-label={`5 more snaps for ${p.name}`} title="Rotate him in: 5 more snaps" onClick={() => setShare(p.pos, p.id, s + 5)} style={{ ...mini, borderRadius: 0, height: 34, width: 28, background: "#22c55e33" }}>+</button>}
              </span>); })}
          </div>
        </div>}
        {(pick || plan || help) && <div onClick={() => { setPick(null); setPlan(false); setHelp(false); }} style={{ position: "absolute", inset: 0, background: "#05080da6", zIndex: 4 }} />}
        {pop}
        {help && <div role="dialog" aria-label="How the depth chart works" style={{ position: "absolute", zIndex: 8, top: 12, right: 12, width: "min(820px, calc(100% - 24px))", maxHeight: box.h - 24, overflowY: "auto", background: "#1b2436", border: "1px solid #3b82f6", borderRadius: 16, boxShadow: "0 24px 60px #000c", padding: "14px 18px 16px", color: "#f3f5f8" }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}><b style={{ fontSize: 17, flex: 1 }}>How the depth chart works</b><button type="button" onClick={() => setHelp(false)} aria-label="Close" style={{ background: "transparent", border: 0, color: "#a3adbd", fontSize: 22, lineHeight: 1, cursor: "pointer" }}>×</button></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 22 }}>{HELP.map(([k, v]) => <div key={k} style={{ padding: "8px 0", borderTop: "1px solid #ffffff12" }}><b style={{ fontSize: 14 }}>{k}</b><div style={{ fontSize: 13.5, color: "#cbd5e1", lineHeight: 1.45, marginTop: 2 }}>{v}</div></div>)}</div>
        </div>}
        {plan && gamePlan && <div style={{ position: "absolute", zIndex: 8, top: 12, right: 12, width: 460, maxHeight: box.h - 24, overflowY: "auto", background: "#111827", border: "1px solid #ffffff1f", borderRadius: 16, boxShadow: "0 24px 60px #000c", padding: 8 }}>
          <button type="button" onClick={() => setPlan(false)} aria-label="Close" style={{ position: "absolute", top: 18, right: 22, zIndex: 1, background: "transparent", border: 0, color: "#a3adbd", fontSize: 22, lineHeight: 1, cursor: "pointer" }}>×</button>
          {gamePlan}
        </div>}
      </div>
    </div>
  );
}
