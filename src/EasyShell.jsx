// Easy Mode: the whole franchise behind one button. Same league, same engine, same season; the staff
// make the calls (contracts, free agency, the draft, the depth chart, trades are left alone) and you
// press CONTINUE. Drawn like a 16-bit sports broadcast: royal blue, chunky pixel lettering, gold
// numbers, pixelated club logos, green and red arrows for wins and losses.
import React, { useEffect, useRef, useState } from "react";
import { logoUrl } from "./ui.jsx";
import { MOBILE } from "./mobile.js";
import { headshotUrl } from "./headshots.js";
import { portraitSrc } from "./portraits.js";
import { depthOrderFor } from "./depth.js";
import { capSpace } from "./league.js";
import { yearlyAsk, maxYears } from "./negotiation.js";

const BASE = import.meta.env?.BASE_URL ?? "/";
const FONTS = `
@font-face { font-family: "Open Sans"; font-weight: 400 800; font-display: swap; src: url(${BASE}fonts/open-sans.woff2) format("woff2"); }
.ez * { box-sizing: border-box; }
.ez ::-webkit-scrollbar { width: 12px; } .ez ::-webkit-scrollbar-thumb { background: #0b2a8f; border: 3px solid #1d4ed8; } .ez ::-webkit-scrollbar-track { background: transparent; }
.ez-btn { font-family: "Segoe UI", "Open Sans", system-ui, sans-serif; font-weight: 700; cursor: pointer; letter-spacing: .2px; border: 0; transition: transform .06s, filter .1s; }
.ez-btn:hover { filter: brightness(1.12); } .ez-btn:active { transform: translateY(3px); }
.ez-row:hover { background: #00000008; } .ez-click { cursor: pointer; } .ez-click:hover { background: #eef3ff !important; }
@keyframes ezBlink { 50% { opacity: .35 } }
`;
// Segoe UI is Windows Vista's typeface; Open Sans (same designer, open licence) stands in where it isn't installed
const SANS = '"Segoe UI", "Open Sans", system-ui, sans-serif';
const H = { fontFamily: SANS, fontWeight: 800, color: "#fff", textShadow: "2px 2px 0 #0a1f6b" };
const GOLD = { fontFamily: SANS, fontWeight: 800, color: "#ffb300", textShadow: "2px 2px 0 #3a2200" };
const BLUE = "#1d4ed8", DEEP = "#0b2a8f";

// A club's logo, pixelated: drawn small, then blown up with no smoothing (like a 16-bit sprite)
function PixelLogo({ ab, size = 48, res = 22, style }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current; if (!cv || !ab) return;
    const im = new Image(); im.src = logoUrl(ab);
    im.onload = () => { const c = cv.getContext("2d"); if (!c) return; c.clearRect(0, 0, res, res); const k = Math.min(res / im.naturalWidth, res / im.naturalHeight), w = im.naturalWidth * k, h = im.naturalHeight * k; c.imageSmoothingEnabled = true; c.drawImage(im, (res - w) / 2, (res - h) / 2, w, h);
      // hard alpha, so the edges are pixels, not a blur
      const d = c.getImageData(0, 0, res, res); for (let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] > 110 ? 255 : 0; c.putImageData(d, 0, 0); };
  }, [ab, res]);
  return <canvas ref={ref} width={res} height={res} aria-label={ab} style={{ width: size, height: size, imageRendering: "pixelated", flexShrink: 0, filter: "drop-shadow(3px 3px 0 #0a1f6b)", ...style }} />;
}
// A player's photo as a 16-bit sprite: his ESPN headshot (or portrait-bank photo) cut to a head-and-
// shoulders square, shrunk to a few dozen pixels, held to a small palette, outlined in dark pixels and
// blown back up with no smoothing. Made once per photo and kept; any photo that won't load shows the
// club's pixel logo instead.
const FACES = new Map();
function spriteOf(src, res) {
  const key = `${src}|${res}`;
  if (!FACES.has(key)) FACES.set(key, new Promise((ok) => {
    const im = new Image(); im.crossOrigin = "anonymous";
    im.onerror = () => ok(null);
    im.onload = () => { try {
      const W = im.naturalWidth, Hh = im.naturalHeight, side = Math.min(W, Hh);
      const cv = document.createElement("canvas"); cv.width = cv.height = res; const c = cv.getContext("2d");
      c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high";
      c.drawImage(im, (W - side) / 2, 0, side, side, 0, 0, res, res);
      const d = c.getImageData(0, 0, res, res), a = d.data, q = (v) => Math.min(255, Math.round(v / 51) * 51);
      const solid = new Uint8Array(res * res);
      for (let i = 0; i < res * res; i++) { const o = i * 4; if (a[o + 3] > 120) { solid[i] = 1; a[o] = q(a[o]); a[o + 1] = q(a[o + 1]); a[o + 2] = q(a[o + 2]); a[o + 3] = 255; } else a[o + 3] = 0; }
      // a one-pixel dark outline round the figure, like a sprite
      for (let y = 0; y < res; y++) for (let x = 0; x < res; x++) { const i = y * res + x; if (solid[i]) continue;
        if ((x > 0 && solid[i - 1]) || (x < res - 1 && solid[i + 1]) || (y > 0 && solid[i - res]) || (y < res - 1 && solid[i + res])) { const o = i * 4; a[o] = 12; a[o + 1] = 18; a[o + 2] = 40; a[o + 3] = 255; } }
      c.putImageData(d, 0, 0); ok(cv.toDataURL());
    } catch { ok(null); } };
    im.src = src;
  }));
  return FACES.get(key);
}
function PixelFace({ p, ab, clr, size = 40, res = 28 }) {
  const f = p?.face || {};
  const src = f.espn ? headshotUrl(f.espn, 160, !!f.cfb) : f.pid ? portraitSrc(f.pid) : null;
  const [url, setUrl] = useState(null), [bad, setBad] = useState(!src);
  useEffect(() => { let live = true; setUrl(null); setBad(!src); if (src) spriteOf(src, res).then((u) => { if (live) { if (u) setUrl(u); else setBad(true); } }); return () => { live = false; }; }, [src, res]);
  return <span style={{ width: size, height: size, flexShrink: 0, display: "inline-flex", alignItems: "flex-end", justifyContent: "center", overflow: "hidden", background: clr || "#1d4ed8", boxShadow: "inset 0 0 0 2px #0002" }}>
    {url ? <img src={url} alt="" draggable="false" style={{ width: size, height: size, imageRendering: "pixelated", display: "block" }} />
      : bad ? <PixelLogo ab={ab} size={size * 0.7} style={{ filter: "none", alignSelf: "center" }} /> : null}
  </span>;
}
const Arrow = ({ up, size = 16 }) => (
  <svg width={size} height={size * 0.7} viewBox="0 0 10 7" shapeRendering="crispEdges" aria-label={up ? "win" : "loss"} style={{ flexShrink: 0, filter: "drop-shadow(2px 2px 0 #0a1f6b)" }}>
    {up ? <path d="M5 0 L10 7 L0 7 Z" fill="#22c55e" /> : <path d="M0 0 L10 0 L5 7 Z" fill="#ef4444" />}
  </svg>
);
const Btn = ({ children, onClick, big, disabled, kind = "gold", style }) => {
  const k = { gold: ["#ffb300", "#8a5a00", "#1a1000"], blue: ["#3b6cf0", DEEP, "#fff"], dark: ["#0f2f9c", "#061a5c", "#dbe6ff"] }[kind];
  return <button className="ez-btn" onClick={onClick} disabled={disabled} style={{ background: k[0], color: k[2], boxShadow: `0 ${big ? 6 : 4}px 0 ${k[1]}, inset 0 3px 0 #ffffff40`, fontSize: big ? (MOBILE ? 19 : 22) : 14, padding: big ? (MOBILE ? "13px 18px" : "14px 28px") : "9px 15px", opacity: disabled ? 0.6 : 1, ...style }}>{children}</button>;
};

const POS_ORDER = ["QB", "RB", "FB", "WR", "TE", "LT", "LG", "C", "RG", "RT", "OL", "OT", "OG", "G", "T", "EDGE", "LE", "RE", "DE", "DT", "DL", "LB", "MLB", "OLB", "ILB", "CB", "S", "FS", "SS", "K", "P", "LS"];
const posRank = (p) => { const i = POS_ORDER.indexOf(p); return i < 0 ? 99 : i; };
// ratings as stars, in half steps: 59 is one star, 68 two, 77 three, 86 four, 95 five
export const starsOf = (v) => Math.max(0.5, Math.min(5, Math.round((((v || 50) - 50) / 9) * 2) / 2));
const STAR = "M5 0.4 L6.3 3.6 L9.8 3.8 L7.1 6.0 L8.0 9.5 L5 7.6 L2 9.5 L2.9 6.0 L0.2 3.8 L3.7 3.6 Z";
const Stars = ({ v, size = 14, color = "#e6a100" }) => { const n = starsOf(v); return (
  <span aria-label={`${n} of 5 stars`} style={{ display: "inline-flex", gap: 1, verticalAlign: "middle" }}>
    {[0, 1, 2, 3, 4].map((i) => { const f = Math.max(0, Math.min(1, n - i)); return (
      <svg key={i} width={size} height={size} viewBox="0 0 10 10" shapeRendering="geometricPrecision"><path d={STAR} fill="#d6d6cf" />{f > 0 && <path d={STAR} fill={color} style={{ clipPath: f < 1 ? "inset(0 50% 0 0)" : undefined }} />}</svg>); })}
  </span>); };
const OL = new Set(["LT", "LG", "C", "RG", "RT", "OL", "OT", "OG", "G", "T"]);
const grp = (pos) => (OL.has(pos) ? "OL" : pos);
// stat lines a fan reads, by position
const statBits = (p) => { const s = p.ss || {}; const b = [];
  if (s.att) b.push(`${s.comp || 0}/${s.att} for ${s.passYds || 0} yds, ${s.passTD || 0} TD, ${s.passInt || 0} INT`);
  if (s.rushAtt && (p.pos !== "QB" || s.rushYds > 150)) b.push(`${s.rushAtt} rush, ${s.rushYds || 0} yds, ${s.rushTD || 0} TD`);
  if (s.rec) b.push(`${s.rec} rec, ${s.recYds || 0} yds, ${s.recTD || 0} TD`);
  if (s.tkl || s.sacks || s.ints) b.push([s.tkl || s.ast ? `${(s.tkl || 0) + (s.ast || 0)} tkl` : "", s.sacks ? `${s.sacks} sk` : "", s.ints ? `${s.ints} INT` : "", s.pd ? `${s.pd} PD` : ""].filter(Boolean).join(", "));
  if (s.fgA) b.push(`${s.fgM || 0}/${s.fgA} FG`);
  if (s.punts) b.push(`${s.punts} punts, ${(s.puntYds / Math.max(1, s.punts)).toFixed(1)} avg`);
  return b; };
const AWARD = [["mvp", "MVP"], ["opoy", "Offensive Player of the Year"], ["dpoy", "Defensive Player of the Year"], ["oroy", "Offensive Rookie of the Year"], ["droy", "Defensive Rookie of the Year"], ["cpoy", "Comeback Player of the Year"]];
// the lineup you set in Easy Mode: the skill spots and the defense's key men; the staff fill the rest
const SLOTS = { offense: [["QB", "QB", 0], ["RB", "RB", 0], ["WR1", "WR", 0], ["WR2", "WR", 1], ["TE", "TE", 0]], defense: [["LE", "DL", 0], ["RE", "DL", 3], ["MIKE", "LB", 1], ["CB1", "CB", 0], ["CB2", "CB", 1], ["S", "S", 0]] };
const rec = (t) => `${t.w || 0}-${t.l || 0}${t.t ? `-${t.t}` : ""}`;
const pct = (t) => ((t.w || 0) + (t.t || 0) * 0.5) / Math.max(1, (t.w || 0) + (t.l || 0) + (t.t || 0));

export default function EasyShell({ teams, TEAMS, ui, yr, wk, sp, sched, pb, log, msg, step, busy, onFull, onSave, phaseLabel, depthOrder, setDepthOrder, awards, onResign, draft, onPick }) {
  const [view, setView] = useState("home");
  const [sub, setSub] = useState({ season: "schedule", stats: "pass", lineup: "offense", draft: "All" });
  const [card, setCard] = useState(null);       // the player card open
  const [slot, setSlot] = useState(null);       // the lineup spot being chosen
  const [walked, setWalked] = useState(() => new Set());
  const ut = teams[ui], T = TEAMS[ui];
  const narrow = MOBILE;
  const games = (sched || []).filter((g) => g.played && (g.h === ui || g.a === ui)).sort((a, b) => (+b.wk || 0) - (+a.wk || 0));
  const next = sp === "regular" ? (sched || []).find((g) => g.wk === wk + 1 && !g.played && (g.h === ui || g.a === ui)) : null;
  const res = (g) => { const home = g.h === ui, us = home ? g.hs : g.as, them = home ? g.as : g.hs; return { opp: home ? g.a : g.h, home, us, them, win: us > them, tie: us === them }; };
  const tabs = [["home", "Home"], ["roster", "Roster"], ["lineup", "Lineup"], ["stats", "Stats"], ["season", "Season"]];
  const setS = (k, v) => setSub((x) => ({ ...x, [k]: v }));

  // inside the white page: crisp sans headings, newspaper serif, blue names, a yellow highlighter
  const INK = "#151515", LINK = "#1a3fc4";
  const PH = { fontFamily: SANS, fontWeight: 700, color: INK };
  const NUM = { fontFamily: SANS, fontWeight: 800, color: INK, fontVariantNumeric: "tabular-nums" };
  const SERIF = { fontFamily: 'Georgia, "Times New Roman", serif', color: "#1d1d1d" };
  const CLUB = { fontFamily: SANS, fontWeight: 700, color: LINK };
  const Mark = ({ children }) => <span style={{ ...SERIF, fontWeight: 700, background: "#fff23a", padding: "1px 5px", boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}>{children}</span>;
  const Logo = (p) => <PixelLogo {...p} style={{ filter: "drop-shadow(2px 2px 0 #0002)", ...p.style }} />;
  const Face = ({ p, size = 36, res: r = 28 }) => <PixelFace p={p} ab={T.ab} clr={T.clr} size={size} res={r} />;
  const Row = ({ children, style, onClick }) => <div className={onClick ? "ez-row ez-click" : "ez-row"} onClick={onClick} style={{ display: "flex", alignItems: "center", gap: narrow ? 10 : 14, padding: narrow ? "6px 4px" : "6px 10px", borderBottom: "2px solid #e4e4dc", ...style }}>{children}</div>;
  const Chips = ({ items, on, set }) => <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>{items.map(([k, l]) => <button key={k} className="ez-btn" onClick={() => set(k)} style={{ fontSize: 14, padding: "6px 12px", background: on === k ? "#1d4ed8" : "#e8ecf5", color: on === k ? "#fff" : INK, boxShadow: on === k ? "0 3px 0 #0b2a8f" : "0 3px 0 #c5ccdc" }}>{l}</button>)}</div>;
  const roster = ut?.roster || [];

  const gameRow = (g, i) => { const r = res(g); return (
    <Row key={i}>
      {r.tie ? <span style={{ width: 16 }} /> : <Arrow up={r.win} />}
      <span style={{ ...PH, fontSize: 13, width: narrow ? 50 : 70, color: "#555" }}>{/^P/.test(String(g.wk)) ? "Playoff" : `Week ${g.wk}`}</span>
      <Logo ab={T.ab} size={narrow ? 28 : 32} />
      <span style={{ ...NUM, fontSize: narrow ? 18 : 21, flex: 1, textAlign: "center" }}>{r.us}-{r.them}</span>
      <span style={{ ...PH, fontSize: 13, color: "#555" }}>{r.home ? "vs" : "at"}</span>
      <Logo ab={TEAMS[r.opp]?.ab} size={narrow ? 28 : 32} />
    </Row>); };
  const divRows = (c, d) => teams.map((t, i) => ({ t, i })).filter((x) => x.t.c === c && x.t.d === d).sort((a, b) => pct(b.t) - pct(a.t) || (b.t.pf - b.t.pa) - (a.t.pf - a.t.pa)).map((x, k) => (
    <Row key={x.i} style={{ gap: 10, padding: "5px 4px", background: x.i === ui ? "#fff9c4" : undefined }}>
      <span style={{ ...PH, fontSize: 13, width: 16, color: "#666" }}>{k + 1}</span>
      <Logo ab={TEAMS[x.i].ab} size={26} />
      <span style={{ ...CLUB, fontSize: 15, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{TEAMS[x.i].name}</span>
      <span style={{ ...NUM, fontSize: 16 }}>{rec(x.t)}</span>
    </Row>));
  const playerRow = (p, extra, onClick = () => setCard(p)) => (
    <Row key={p.id} onClick={onClick} style={{ gap: 12 }}>
      <span style={{ ...PH, fontSize: 13, width: 36, color: "#555" }}>{p.pos}</span>
      <Face p={p} size={narrow ? 34 : 36} />
      <span style={{ ...CLUB, fontSize: 16, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
      {extra}
    </Row>);

  // ---- Home: this week and the one button; in the off-season, the decisions that are yours ----
  const expiring = roster.filter((p) => (p.contract || 0) <= 1 && !p.ext).sort((a, b) => b.ovr - a.ovr);
  const kept = roster.filter((p) => p.resigned?.yr === yr);
  const dealOf = (p) => { const yrs = Math.max(1, Math.min(maxYears(p), p.age <= 27 ? 4 : p.age <= 30 ? 3 : 2)); return { yrs, sal: yearlyAsk(p, yrs, "resign") }; };
  const room = ut ? capSpace(ut) : 0;
  const resignPanel = () => (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 6 }}><Mark>Contracts ending</Mark><span style={{ ...SERIF, fontSize: 15 }}>Cap space: <b style={NUM}>${room.toFixed(1)}M</b></span></div>
      {!expiring.length && <div style={{ ...SERIF, fontSize: 16, padding: "6px 2px" }}>{kept.length ? "Everyone you wanted is signed." : "Nobody's contract is up this year."}</div>}
      <div style={{ maxHeight: narrow ? undefined : 300, overflowY: narrow ? undefined : "auto" }}>
        {expiring.map((p) => { const d = dealOf(p), gone = walked.has(p.id), afford = d.sal <= room; return playerRow(p, <>
          <span style={{ ...NUM, fontSize: 16, width: 30, textAlign: "right" }}>{p.ovr}</span>
          <span style={{ ...SERIF, fontSize: 14, width: narrow ? 74 : 110, textAlign: "right", color: gone ? "#999" : INK }}>{d.yrs} yr, ${d.sal}M</span>
          {gone ? <button className="ez-btn" onClick={(e) => { e.stopPropagation(); setWalked((s) => { const n = new Set(s); n.delete(p.id); return n; }); }} style={{ fontSize: 13, padding: "6px 10px", background: "#eee", color: "#666" }}>Leaving · undo</button> : <>
            <button className="ez-btn" disabled={!afford} title={afford ? "" : "Not enough cap space"} onClick={(e) => { e.stopPropagation(); onResign(p, d.sal, d.yrs); }} style={{ fontSize: 13, padding: "6px 10px", background: afford ? "#22a447" : "#b9c2b9", color: "#fff", boxShadow: "0 3px 0 #146b2c" }}>Re-sign</button>
            <button className="ez-btn" onClick={(e) => { e.stopPropagation(); setWalked((s) => new Set(s).add(p.id)); }} style={{ fontSize: 13, padding: "6px 10px", background: "#e8ecf5", color: INK, boxShadow: "0 3px 0 #c5ccdc" }}>Let walk</button></>}
        </>); })}
      </div>
      {kept.length > 0 && <div style={{ ...SERIF, fontSize: 14, marginTop: 8, color: "#444" }}>Re-signed: {kept.map((p) => p.name).join(", ")}</div>}
    </div>);

  const cur = draft?.picks?.[draft.idx];
  const myCall = sp === "draft" && cur && cur.owner === ui && cur.rd <= 3;
  const draftPanel = () => {
    const f = sub.draft, cls = (draft?.cls || []).filter((b) => f === "All" || grp(b.pos) === f).sort((a, b) => (b.pot * 0.6 + b.ovr * 0.4) - (a.pot * 0.6 + a.ovr * 0.4)).slice(0, 40);
    const mine = (draft?.log || []).filter((d) => d.owner === ui);
    return (<div style={{ marginTop: 16 }}>
      {cur && <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}><Logo ab={TEAMS[cur.owner]?.ab} size={30} /><span style={{ ...SERIF, fontSize: 16 }}><Mark>Round {cur.rd}, pick {cur.overall}:</Mark> {myCall ? "you're on the clock. Pick a player." : `the ${TEAMS[cur.owner]?.name} are picking.`}</span></div>}
      {myCall && <>
        <Chips items={["All", "QB", "RB", "WR", "TE", "OL", "DL", "LB", "CB", "S"].map((k) => [k, k])} on={f} set={(v) => setS("draft", v)} />
        <div style={{ display: "flex", ...PH, fontSize: 12, color: "#666", padding: "0 10px 4px", gap: 12 }}><span style={{ width: 36 }}>Pos</span><span style={{ flex: 1 }}>Prospect</span><span style={{ width: narrow ? 70 : 84 }}>Now</span><span style={{ width: narrow ? 70 : 84 }}>Potential</span><span style={{ width: 64 }} /></div>
        <div style={{ maxHeight: narrow ? undefined : 330, overflowY: narrow ? undefined : "auto" }}>
          {cls.map((b) => <Row key={b.id} style={{ gap: 12 }}>
            <span style={{ ...PH, fontSize: 13, width: 36, color: "#555" }}>{b.pos}</span>
            <span style={{ flex: 1, minWidth: 0 }}><span style={{ ...CLUB, fontSize: 15, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.name}</span><span style={{ ...SERIF, fontSize: 13, color: "#666" }}>{b.college || b.school || ""}{b.age ? `${b.college || b.school ? ", " : ""}age ${b.age}` : ""}</span></span>
            <span style={{ width: narrow ? 70 : 84 }}><Stars v={b.ovr} size={narrow ? 12 : 15} /></span>
            <span style={{ width: narrow ? 70 : 84 }}><Stars v={b.pot} size={narrow ? 12 : 15} color="#1d4ed8" /></span>
            <button className="ez-btn" onClick={() => onPick(b)} style={{ width: 64, fontSize: 13, padding: "6px 0", background: "#ffb300", color: "#1a1000", boxShadow: "0 3px 0 #8a5a00" }}>Draft</button>
          </Row>)}
        </div></>}
      {mine.length > 0 && <div style={{ marginTop: 12 }}><Mark>Your picks</Mark>{mine.map((d) => <Row key={d.player?.id || d.overall} style={{ gap: 10 }}><span style={{ ...PH, fontSize: 13, width: 54, color: "#555" }}>Rd {d.rd}</span><span style={{ ...PH, fontSize: 13, width: 36 }}>{d.player?.pos}</span><span style={{ ...CLUB, fontSize: 15, flex: 1 }}>{d.player?.name}</span><Stars v={d.player?.pot} size={13} color="#1d4ed8" /></Row>)}</div>}
    </div>);
  };

  const home = () => {
    const opp = next ? TEAMS[next.h === ui ? next.a : next.h] : null, oppT = next ? teams[next.h === ui ? next.a : next.h] : null;
    const offseason = sp === "resign" || sp === "draft";
    return (
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : offseason ? "minmax(0,1.7fr) minmax(0,1fr)" : "minmax(0,1.1fr) minmax(0,1fr)", gap: narrow ? 18 : 32, alignItems: "start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Logo ab={T.ab} size={narrow ? 34 : 40} />
            <div style={{ ...CLUB, fontSize: narrow ? 21 : 26, lineHeight: 1.1 }}>{T.city} {T.name}: <span style={{ color: INK }}>{rec(ut)}</span></div>
          </div>
          <div style={{ marginTop: 12, fontSize: narrow ? 16 : 18, lineHeight: 1.5 }}><Mark>{phaseLabel}:</Mark> <span style={SERIF}>{step?.note || (opp ? `${next.h === ui ? "Home against" : "On the road at"} the ${opp.city} ${opp.name}.` : "")}</span></div>
          {opp && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", gap: 10, marginTop: 14, padding: narrow ? "10px 4px" : "12px 18px", background: "#eef3ff", boxShadow: "inset 0 0 0 3px #c9d6f5" }}>
              <div style={{ textAlign: "center" }}><Logo ab={T.ab} size={narrow ? 52 : 62} /><div style={{ ...NUM, fontSize: 16, marginTop: 4 }}>{rec(ut)}</div></div>
              <div style={{ ...PH, fontSize: narrow ? 18 : 22 }}>{next.h === ui ? "vs" : "at"}</div>
              <div style={{ textAlign: "center" }}><Logo ab={opp.ab} size={narrow ? 52 : 62} /><div style={{ ...NUM, fontSize: 16, marginTop: 4 }}>{oppT ? rec(oppT) : ""}</div></div>
            </div>
          )}
          {step && !myCall && <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <Btn big onClick={step.run} disabled={busy} style={{ flex: narrow ? "1 1 100%" : "0 0 auto" }}>{busy ? <span style={{ animation: "ezBlink .6s steps(2) infinite" }}>Working…</span> : <>▶ {step.label}</>}</Btn>
            {step.watch && <Btn kind="blue" onClick={step.watch} disabled={busy} style={narrow ? { flex: "1 1 0" } : undefined}>Watch the game</Btn>}
            {step.simAll && <Btn kind="dark" onClick={step.simAll} disabled={busy} style={narrow ? { flex: "1 1 0" } : undefined}>Sim the season</Btn>}
          </div>}
          {msg && <div style={{ ...SERIF, fontSize: 16, marginTop: 12, fontStyle: "italic" }}>{msg}</div>}
          {sp === "resign" && resignPanel()}
          {sp === "draft" && draftPanel()}
          {!narrow && !offseason && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, marginTop: 20 }}>
            <div><div style={{ marginBottom: 4, fontSize: 16 }}><Mark>{ut.c} {ut.d}</Mark></div>{divRows(ut.c, ut.d)}</div>
            <div><div style={{ marginBottom: 4, fontSize: 16 }}><Mark>Best players</Mark></div>
              {[...roster].sort((a, b) => b.ovr - a.ovr).slice(0, 4).map((p) => <Row key={p.id} onClick={() => setCard(p)} style={{ gap: 10, padding: "4px 4px" }}><Face p={p} size={34} /><span style={{ ...PH, fontSize: 13, width: 30, color: "#555" }}>{p.pos}</span><span style={{ ...CLUB, fontSize: 15, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span><span style={{ ...NUM, fontSize: 16 }}>{p.ovr}</span></Row>)}</div>
          </div>}
        </div>
        <div>
          <div style={{ marginBottom: 6, fontSize: 16 }}><Mark>Recent games</Mark></div>
          {games.length ? games.slice(0, narrow ? 3 : 4).map(gameRow) : <div style={{ ...SERIF, fontSize: 16, padding: "6px 2px" }}>No games played yet.</div>}
          <div style={{ margin: "16px 0 6px", fontSize: 16 }}><Mark>News</Mark></div>
          {(log || []).filter((l) => !/INJUR|injur|placed on IR/.test(String(l))).slice(0, narrow ? 4 : 5).map((l, i) => <div key={i} style={{ ...SERIF, fontSize: 15, lineHeight: 1.4, padding: "5px 2px", borderBottom: "2px solid #e4e4dc", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{String(l)}</div>)}
        </div>
      </div>
    );
  };

  const rosterView = () => {
    const ps = [...roster].sort((a, b) => posRank(a.pos) - posRank(b.pos) || b.ovr - a.ovr);
    return (<>
      <div style={{ fontSize: 16, lineHeight: 1.5, marginBottom: 10 }}><Mark>Your team:</Mark> <span style={SERIF}>tap a player for his card. Set your starters on the Lineup page.</span></div>
      <div style={{ display: "flex", ...PH, fontSize: 12, color: "#666", padding: "0 10px 6px", gap: 12 }}><span style={{ width: 36 }}>Pos</span><span style={{ width: narrow ? 34 : 36 }} /><span style={{ flex: 1 }}>Player</span><span style={{ width: 34, textAlign: "right" }}>Age</span><span style={{ width: 34, textAlign: "right" }}>OVR</span>{!narrow && <span style={{ width: 84 }}>Potential</span>}{!narrow && <span style={{ width: 120, textAlign: "right" }}>Contract</span>}</div>
      {ps.map((p) => playerRow(p, <>
        <span style={{ ...SERIF, fontSize: 15, width: 34, textAlign: "right" }}>{p.age}</span>
        <span style={{ ...NUM, fontSize: 16, width: 34, textAlign: "right" }}>{p.ovr}</span>
        {!narrow && <span style={{ width: 84 }}><Stars v={p.pot} size={14} color="#1d4ed8" /></span>}
        {!narrow && <span style={{ ...SERIF, fontSize: 14, width: 120, textAlign: "right" }}>{p.contract || 0} yr · ${(+p.salary || 0).toFixed(1)}M</span>}
      </>))}
    </>);
  };

  // ---- Lineup: your picks at the spots that matter; the staff set the rest by rating ----
  const able = roster.filter((p) => !p.injured && !p.holdout && !p.suspended);
  const starterAt = (pos, i) => depthOrderFor(able, depthOrder || {}, pos, null)[i];
  const choose = (pos, i, id) => { const n = { ...(depthOrder || {}) }; const arr = [...(n[pos] || [])].map((x) => (x === id ? null : x)); while (arr.length <= i) arr.push(null); arr[i] = id; n[pos] = arr; setDepthOrder(n); setSlot(null); };
  const lineupView = () => {
    const side = sub.lineup, list = SLOTS[side];
    const auto = side === "offense" ? [["Offensive line", ["LT", "LG", "C", "RG", "RT"]]] : [["Defensive tackles", ["DL"], [1, 2]], ["Other linebackers", ["LB"], [0, 2]], ["Nickel and second safety", ["CB", "S"], [2, 1]]];
    return (<>
      <Chips items={[["offense", "Offense"], ["defense", "Defense"]]} on={side} set={(v) => { setS("lineup", v); setSlot(null); }} />
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "minmax(0,1.2fr) minmax(0,1fr)", gap: narrow ? 16 : 30, alignItems: "start" }}>
        <div>
          <div style={{ marginBottom: 6, fontSize: 16 }}><Mark>Your starters</Mark> <span style={{ ...SERIF, fontSize: 14, color: "#555" }}>tap a spot to change it</span></div>
          {list.map(([label, pos, i]) => { const p = starterAt(pos, i); const on = slot && slot[0] === label; return (
            <Row key={label} onClick={() => setSlot(on ? null : [label, pos, i])} style={{ gap: 12, background: on ? "#fff6c2" : undefined }}>
              <span style={{ ...NUM, fontSize: 15, width: 48, color: "#1d4ed8" }}>{label}</span>
              {p ? <><Face p={p} size={38} /><span style={{ ...CLUB, fontSize: 16, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span><span style={{ ...NUM, fontSize: 16 }}>{p.ovr}</span></> : <span style={{ ...SERIF, flex: 1, color: "#888" }}>Nobody</span>}
              <span style={{ ...PH, fontSize: 13, color: "#1d4ed8", width: 54, textAlign: "right" }}>{on ? "Close" : "Change"}</span>
            </Row>); })}
          <div style={{ marginTop: 14, marginBottom: 6, fontSize: 16 }}><Mark>Set by the staff</Mark> <span style={{ ...SERIF, fontSize: 14, color: "#555" }}>best rating at each spot</span></div>
          {auto.map(([label, poses, idx]) => { const ps = idx ? poses.flatMap((pos, k) => (poses.length > 1 ? [starterAt(pos, idx[k])] : idx.map((j) => starterAt(pos, j)))).filter(Boolean) : poses.map((pos) => starterAt(pos, 0)).filter(Boolean); return (
            <div key={label} style={{ ...SERIF, fontSize: 15, padding: "6px 4px", borderBottom: "2px solid #e4e4dc" }}><b>{label}:</b> {ps.map((p) => `${p.name} (${p.ovr})`).join(", ")}</div>); })}
          <div style={{ marginTop: 12 }}><button className="ez-btn" onClick={() => { setDepthOrder({}); setSlot(null); }} style={{ fontSize: 14, padding: "7px 12px", background: "#e8ecf5", color: INK, boxShadow: "0 3px 0 #c5ccdc" }}>Let the staff pick everyone</button></div>
        </div>
        <div>
          {slot ? <>
            <div style={{ marginBottom: 6, fontSize: 16 }}><Mark>Pick your {slot[0]}</Mark></div>
            {roster.filter((p) => p.pos === slot[1]).sort((a, b) => b.ovr - a.ovr).map((p) => { const now = starterAt(slot[1], slot[2])?.id === p.id; return playerRow(p, <><span style={{ ...NUM, fontSize: 16 }}>{p.ovr}</span>{now && <span style={{ ...PH, fontSize: 12, color: "#22a447" }}>Starting</span>}</>, () => choose(slot[1], slot[2], p.id)); })}
          </> : <div style={{ ...SERIF, fontSize: 16, lineHeight: 1.55, color: "#333" }}>{side === "offense" ? "Choose your quarterback, running back, top two receivers and tight end. The line is set for you: the best player at each spot." : "Choose your two ends, your middle linebacker, your top two corners and a safety. The tackles and everyone else are set for you by rating."}</div>}
        </div>
      </div>
    </>);
  };

  // ---- Stats: your players this season, and the league's awards ----
  const statsView = () => {
    const g = sub.stats;
    const cols = { pass: [["Att", (s) => s.att], ["Cmp", (s) => s.comp], ["Yds", (s) => s.passYds], ["TD", (s) => s.passTD], ["INT", (s) => s.passInt]], rush: [["Car", (s) => s.rushAtt], ["Yds", (s) => s.rushYds], ["TD", (s) => s.rushTD]], rec: [["Rec", (s) => s.rec], ["Yds", (s) => s.recYds], ["TD", (s) => s.recTD]], def: [["Tkl", (s) => (s.tkl || 0) + (s.ast || 0)], ["Sacks", (s) => s.sacks], ["INT", (s) => s.ints], ["PD", (s) => s.pd]] }[g];
    const key = { pass: (s) => s.passYds || 0, rush: (s) => s.rushYds || 0, rec: (s) => s.recYds || 0, def: (s) => (s.tkl || 0) + (s.ast || 0) + (s.sacks || 0) * 4 + (s.ints || 0) * 6 }[g];
    const list = roster.filter((p) => key(p.ss || {}) > 0).sort((a, b) => key(b.ss || {}) - key(a.ss || {})).slice(0, 12);
    const aw = [...(awards || [])].sort((a, b) => b.yr - a.yr);
    const last = aw[0];
    const mine = aw.flatMap((a) => AWARD.filter(([k]) => a[k]?.ti === ui).map(([k, l]) => ({ yr: a.yr, l, w: a[k] })));
    return (<div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "minmax(0,1.3fr) minmax(0,1fr)", gap: narrow ? 18 : 30, alignItems: "start" }}>
      <div>
        <Chips items={[["pass", "Passing"], ["rush", "Rushing"], ["rec", "Receiving"], ["def", "Defense"]]} on={g} set={(v) => setS("stats", v)} />
        <div style={{ display: "flex", ...PH, fontSize: 12, color: "#666", padding: "0 10px 4px", gap: 12 }}><span style={{ width: 36 }}>Pos</span><span style={{ width: 36 }} /><span style={{ flex: 1 }}>Player</span>{cols.map(([l]) => <span key={l} style={{ width: narrow ? 34 : 46, textAlign: "right" }}>{l}</span>)}</div>
        {list.length ? list.map((p) => playerRow(p, cols.map(([l, f]) => <span key={l} style={{ ...NUM, fontSize: 15, width: narrow ? 34 : 46, textAlign: "right" }}>{f(p.ss || {}) || 0}</span>))) : <div style={{ ...SERIF, fontSize: 16, padding: 6 }}>No stats yet this season.</div>}
      </div>
      <div>
        <div style={{ marginBottom: 6, fontSize: 16 }}><Mark>{last ? `${last.yr} awards` : "Awards"}</Mark></div>
        {last ? AWARD.filter(([k]) => last[k]).map(([k, l]) => { const w = last[k]; return <Row key={k} style={{ gap: 10, padding: "6px 4px", background: w.ti === ui ? "#fff9c4" : undefined }}><Logo ab={TEAMS[w.ti]?.ab} size={28} /><span style={{ flex: 1, minWidth: 0 }}><span style={{ ...PH, fontSize: 13, color: "#555", display: "block" }}>{l}</span><span style={{ ...CLUB, fontSize: 15 }}>{w.name}</span><span style={{ ...SERIF, fontSize: 13, color: "#666" }}> {w.pos}, {w.team}</span></span></Row>; }) : <div style={{ ...SERIF, fontSize: 16, padding: 6 }}>Awards are handed out when the regular season ends.</div>}
        {mine.length > 0 && <><div style={{ margin: "16px 0 6px", fontSize: 16 }}><Mark>Your trophies</Mark></div>{mine.map((m, i) => <div key={i} style={{ ...SERIF, fontSize: 15, padding: "5px 4px", borderBottom: "2px solid #e4e4dc" }}><b>{m.yr}</b> {m.l}: {m.w.name}</div>)}</>}
      </div>
    </div>);
  };

  // ---- Season: the schedule, and the standings as a broadcast table ----
  const schedule = () => {
    const mine = (sched || []).filter((g) => g.h === ui || g.a === ui).sort((a, b) => (+a.wk || 0) - (+b.wk || 0));
    if (!mine.length) return <div style={{ ...SERIF, fontSize: 17 }}>The schedule comes out when the new season starts.</div>;
    return mine.map((g, i) => g.played ? gameRow(g, i) : (
      <Row key={i}><span style={{ width: 16 }} /><span style={{ ...PH, fontSize: 13, width: narrow ? 50 : 70, color: "#555" }}>Week {g.wk}</span><Logo ab={T.ab} size={narrow ? 28 : 32} /><span style={{ flex: 1, textAlign: "center" }}>{g.wk === wk + 1 ? <Mark>Next</Mark> : <span style={{ ...NUM, color: "#aaa" }}>-</span>}</span><span style={{ ...PH, fontSize: 13, color: "#555" }}>{g.h === ui ? "vs" : "at"}</span><Logo ab={TEAMS[g.h === ui ? g.a : g.h]?.ab} size={narrow ? 28 : 32} /></Row>));
  };
  const standings = () => {
    const divs = [...new Set(teams.filter((t) => t.c === ut.c).map((t) => t.d))].sort((a, b) => (a === ut.d ? -1 : b === ut.d ? 1 : String(a).localeCompare(String(b))));
    const cols = narrow ? ["W", "L", "PF", "PA"] : ["W", "L", "T", "PF", "PA", "Diff"];
    const cell = { display: "flex", alignItems: "center", justifyContent: "center" };
    const grid = { display: "grid", gridTemplateColumns: `${narrow ? 30 : 40}px ${narrow ? 46 : 60}px minmax(0,1fr)`, gap: 4 };
    const hd = { ...cell, background: "#ffb300", fontFamily: SANS, fontWeight: 800, fontSize: narrow ? 13 : 14, color: INK, padding: "6px 2px", lineHeight: 1.05, textAlign: "center" };
    return (<div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: narrow ? 14 : 22 }}>
      {divs.map((d) => <div key={d} style={{ background: BLUE, padding: 4, boxShadow: "4px 4px 0 #0a1f6b" }}>
        <div style={{ ...GOLD, fontSize: narrow ? 16 : 18, padding: "4px 6px 6px", textShadow: "2px 2px 0 #0a1f6b" }}>{ut.c} {d}</div>
        <div style={grid}><div style={hd}>Rk</div><div style={hd}>Team</div><div style={{ display: "grid", gridTemplateColumns: `repeat(${cols.length},1fr)`, gap: 4 }}>{cols.map((c) => <div key={c} style={hd}>{c}</div>)}</div></div>
        {teams.map((t, i) => ({ t, i })).filter((x) => x.t.c === ut.c && x.t.d === d).sort((a, b) => pct(b.t) - pct(a.t) || (b.t.pf - b.t.pa) - (a.t.pf - a.t.pa)).map((x, k) => {
          const v = { W: x.t.w || 0, L: x.t.l || 0, T: x.t.t || 0, PF: x.t.pf || 0, PA: x.t.pa || 0, Diff: (x.t.pf || 0) - (x.t.pa || 0) };
          const me = x.i === ui;
          return <div key={x.i} style={{ ...grid, marginTop: 4 }}>
            <div style={{ ...cell, background: "#ffb300", fontFamily: SANS, fontWeight: 800, fontSize: narrow ? 19 : 22, color: INK }}>{k + 1}</div>
            <div title={TEAMS[x.i].name} style={{ ...cell, background: TEAMS[x.i].clr || "#222", padding: "4px 0" }}><PixelLogo ab={TEAMS[x.i].ab} size={narrow ? 32 : 40} style={{ filter: "drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff) drop-shadow(0 2px 0 #fff) drop-shadow(0 -2px 0 #fff)" }} /></div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols.length},1fr)`, background: me ? "#fff6c2" : "#fbfbf8", boxShadow: me ? "inset 0 0 0 3px #ffb300" : "none" }}>
              {cols.map((c) => <div key={c} style={{ ...cell, fontFamily: SANS, fontWeight: 600, fontSize: narrow ? 16 : 19, color: INK, fontVariantNumeric: "tabular-nums" }}>{c === "Diff" && v[c] > 0 ? `+${v[c]}` : v[c]}</div>)}
            </div>
          </div>; })}
      </div>)}
    </div>);
  };
  const seasonView = () => <><Chips items={[["schedule", "Schedule"], ["standings", "Standings"]]} on={sub.season} set={(v) => setS("season", v)} />{sub.season === "schedule" ? schedule() : standings()}</>;

  // ---- the player card ----
  const cardView = () => { const p = roster.find((x) => x.id === card.id) || card; const bits = statBits(p);
    const won = (awards || []).flatMap((a) => AWARD.filter(([k]) => a[k]?.pid === p.id).map(([, l]) => `${a.yr} ${l}`));
    const row = (l, v) => <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0", borderBottom: "2px solid #e4e4dc" }}><span style={{ ...PH, fontSize: 14, color: "#555" }}>{l}</span><span style={{ ...SERIF, fontSize: 15, textAlign: "right" }}>{v}</span></div>;
    return (
      <div onClick={() => setCard(null)} style={{ position: "absolute", inset: 0, zIndex: 10, background: "#0a1f6bb3", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: "min(560px, 100%)", maxHeight: "100%", overflowY: "auto", background: "#fbfbf8", border: "4px solid #111", boxShadow: "8px 8px 0 #0a1f6b" }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center", padding: 16, background: `linear-gradient(135deg, ${T.clr}, #0b2a8f)` }}>
            <span style={{ border: "4px solid #fff", lineHeight: 0 }}><Face p={p} size={narrow ? 96 : 120} res={40} /></span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ ...H, fontSize: narrow ? 21 : 26, lineHeight: 1.1 }}>{p.name}</div>
              <div style={{ ...H, fontSize: 15, fontWeight: 600, marginTop: 4, textShadow: "none", color: "#dbe6ff" }}>{p.pos} · age {p.age}{p.num != null ? ` · #${p.num}` : ""} · {T.name}</div>
              <div style={{ display: "flex", gap: 16, marginTop: 10, alignItems: "flex-end" }}>
                <div><div style={{ ...GOLD, fontSize: narrow ? 30 : 36, lineHeight: 1 }}>{p.ovr}</div><div style={{ ...H, fontSize: 12, textShadow: "none" }}>Overall</div></div>
                <div><Stars v={p.ovr} size={16} color="#ffb300" /><div style={{ ...H, fontSize: 12, textShadow: "none", marginTop: 4 }}>Now</div></div>
                <div><Stars v={p.pot} size={16} color="#7fb2ff" /><div style={{ ...H, fontSize: 12, textShadow: "none", marginTop: 4 }}>Potential</div></div>
              </div>
            </div>
          </div>
          <div style={{ padding: "8px 16px 16px" }}>
            {row("Contract", `${p.contract || 0} yr${(p.contract || 0) === 1 ? "" : "s"} left · $${(+p.salary || 0).toFixed(1)}M a year`)}
            {p.dev && row("Development", String(p.dev).replace(/^\w/, (c) => c.toUpperCase()))}
            {row(`${yr} season`, bits.length ? bits.join(" · ") : (p.ss?.gp ? `${p.ss.gp} games` : "Hasn't played yet"))}
            {p.ss?.gp ? row("Games", `${p.ss.gp} played, ${p.ss.gs || 0} started`) : null}
            {row("Awards", won.length ? won.join(", ") : "None yet")}
            {p.college && row("College", p.college)}
            <div style={{ marginTop: 14, textAlign: "right" }}><Btn kind="blue" onClick={() => setCard(null)}>Close</Btn></div>
          </div>
        </div>
      </div>); };

  const views = { home, roster: rosterView, lineup: lineupView, stats: statsView, season: seasonView };
  return (
    <div className="ez" style={{ position: "fixed", inset: 0, overflow: "hidden", display: "flex", flexDirection: "column", background: `linear-gradient(180deg, #2457e6, ${BLUE} 40%, #1a44c4)` }}>
      <style>{FONTS}</style>
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "repeating-linear-gradient(0deg, #0000 0 2px, #00000010 2px 3px)", zIndex: 4 }} />
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", boxShadow: "inset 0 0 160px #0009", zIndex: 4 }} />
      <PixelLogo ab={T.ab} size={narrow ? 320 : 620} res={32} style={{ position: "absolute", left: "50%", top: "52%", transform: "translate(-50%,-50%)", opacity: 0.08, filter: "none", pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 3, display: "flex", alignItems: "center", justifyContent: "center", gap: 14, padding: narrow ? "calc(env(safe-area-inset-top) + 12px) 12px 8px" : "12px 20px 10px" }}>
        <PixelLogo ab={T.ab} size={narrow ? 38 : 46} style={{ filter: "drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff) drop-shadow(0 2px 0 #fff) drop-shadow(0 -2px 0 #fff) drop-shadow(3px 3px 0 #0a1f6b)" }} />
        <div>
          <div style={{ ...GOLD, fontSize: narrow ? 23 : 32, lineHeight: 1.05, textShadow: "0 3px 0 #0a1f6b" }}>{T.city} {T.name}</div>
          <div style={{ ...H, fontSize: narrow ? 13 : 15, fontWeight: 600, marginTop: 4 }}>{yr} Season · Easy Mode</div>
        </div>
      </div>
      <div style={{ position: "relative", zIndex: 3, flex: 1, minHeight: 0, width: "100%", maxWidth: 1120, margin: "0 auto", padding: narrow ? "0 8px" : "0 24px", display: "flex", flexDirection: "column" }}>
        <nav style={{ display: "flex", alignItems: "flex-end" }}>
          {tabs.map(([k, l], i) => { const on = view === k; return <button key={k} onClick={() => { setView(k); setCard(null); }} aria-current={on ? "page" : undefined} style={{ flex: narrow ? "1 1 0" : "0 0 auto", minWidth: 0, cursor: "pointer", fontFamily: SANS, fontWeight: 800, fontSize: narrow ? 13 : 18, color: INK, padding: narrow ? "9px 2px 7px" : "10px 26px 8px", background: on ? "#fbfbf8" : "linear-gradient(180deg,#6fa0cf,#4a7fb0)", border: "3px solid #111", borderBottom: on ? "3px solid #fbfbf8" : "3px solid #111", marginLeft: i ? -3 : 0, marginBottom: -3, position: "relative", zIndex: on ? 2 : 1, boxShadow: on ? "none" : "inset 0 2px 0 #ffffff55, inset 0 -3px 0 #0000002a" }}>{l}</button>; })}
        </nav>
        <main style={{ flex: 1, minHeight: 0, overflowY: "auto", background: "#fbfbf8", border: "3px solid #111", boxShadow: "6px 6px 0 #0a1f6b, inset 0 0 40px #0000000d", padding: narrow ? "14px 12px 16px" : "20px 28px 20px" }}>
          {views[view]()}
        </main>
      </div>
      <footer style={{ position: "relative", zIndex: 3, display: "flex", justifyContent: "center", gap: 10, padding: narrow ? "12px 8px calc(env(safe-area-inset-bottom) + 10px)" : "12px 10px 12px", flexWrap: "wrap" }}>
        <Btn kind="dark" onClick={onSave}>Save</Btn>
        <Btn kind="dark" onClick={onFull}>Switch to full mode</Btn>
      </footer>
      {card && cardView()}
    </div>
  );
}

// The live game in Easy Mode: the field as the hero, a broadcast-table score bug above it (gold
// cells, each club's logo on its colour), and the plays on a white page beside it.
const clockOf = (s) => `${Math.floor((s || 0) / 60)}:${String((s || 0) % 60).padStart(2, "0")}`;
const ORD = ["", "1st", "2nd", "3rd", "4th"];
export function EasyLive({ TEAMS, ui, live, log, field, paused, onPause, speed, onSpeed, onFinish, onBack, onDone }) {
  const [tab, setTab] = useState("plays");
  const narrow = MOBILE, INK = "#151515";
  const H2 = { h: TEAMS[live.h], a: TEAMS[live.a] };
  const off = H2[live.poss], def = H2[live.poss === "h" ? "a" : "h"];
  const spot = live.yard == null ? "" : live.yard === 50 ? "the 50" : live.yard > 50 ? `${def?.ab} ${100 - live.yard}` : `${off?.ab} ${live.yard}`;
  const cell = { display: "flex", alignItems: "center", justifyContent: "center" };
  const tile = (t) => <div style={{ ...cell, background: t?.clr || "#222", width: narrow ? 52 : 74 }}><PixelLogo ab={t?.ab} size={narrow ? 34 : 50} style={{ filter: "drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff) drop-shadow(0 2px 0 #fff) drop-shadow(0 -2px 0 #fff)" }} /></div>;
  const score = (side) => <div style={{ ...cell, flex: 1, gap: narrow ? 8 : 14, background: "#fbfbf8", padding: "0 10px", flexDirection: side === "a" ? "row-reverse" : "row", justifyContent: "space-between" }}>
    <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: narrow ? 17 : 24, color: INK }}>{H2[side]?.ab}{!live.done && live.poss === side && <span style={{ color: "#e6a100" }}> ●</span>}</span>
    <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: narrow ? 30 : 44, color: INK, fontVariantNumeric: "tabular-nums" }}>{side === "h" ? live.hs : live.as}</span></div>;
  const plays = [...(log || [])].reverse();
  const scoring = plays.filter((e) => /td|fg|safety|xp|2pt/i.test(e.type || "") || /touchdown|field goal is good|safety/i.test(e.text || ""));
  const list = tab === "plays" ? plays.slice(0, 60) : scoring;
  const B = (label, on, k = "dark", st) => <Btn kind={k} onClick={on} style={{ fontSize: narrow ? 14 : 15, padding: narrow ? "9px 10px" : "10px 14px", ...st }}>{label}</Btn>;
  const speeds = ["Slow", "Normal", "Fast"];
  return (
    <div className="ez" style={{ position: "fixed", inset: 0, overflow: narrow ? "auto" : "hidden", display: "flex", flexDirection: "column", background: `linear-gradient(180deg, #2457e6, ${BLUE} 40%, #1a44c4)` }}>
      <style>{FONTS}</style>
      <div aria-hidden style={{ position: "fixed", inset: 0, pointerEvents: "none", background: "repeating-linear-gradient(0deg, #0000 0 2px, #00000010 2px 3px)", zIndex: 4 }} />
      <div style={{ position: "relative", zIndex: 3, width: "100%", maxWidth: 1360, margin: "0 auto", padding: narrow ? "calc(env(safe-area-inset-top) + 8px) 8px 8px" : "12px 22px", display: "flex", flexDirection: "column", gap: narrow ? 8 : 12, flex: 1, minHeight: 0 }}>
        {/* the score bug */}
        <div style={{ background: BLUE, padding: 4, boxShadow: "4px 4px 0 #0a1f6b", border: "3px solid #111" }}>
          <div style={{ display: "flex", gap: 4, height: narrow ? 52 : 70 }}>
            {tile(H2.h)}{score("h")}
            <div style={{ ...cell, flexDirection: "column", background: "#ffb300", minWidth: narrow ? 74 : 120, fontFamily: SANS, color: INK }}>
              <span style={{ fontWeight: 800, fontSize: narrow ? 18 : 24, lineHeight: 1 }}>{live.done ? "Final" : clockOf(live.clock)}</span>
              {!live.done && <span style={{ fontWeight: 700, fontSize: narrow ? 12 : 14 }}>{live.q > 4 ? "OT" : `${ORD[live.q] || live.q} quarter`}</span>}
            </div>
            {score("a")}{tile(H2.a)}
          </div>
          {!live.done && <div style={{ marginTop: 4, background: "#fbfbf8", textAlign: "center", fontFamily: SANS, fontWeight: 700, fontSize: narrow ? 13 : 15, color: INK, padding: "3px 6px" }}>{off?.ab} ball · {ORD[live.down] || live.down} &amp; {live.toGo >= 100 - (live.yard || 0) ? "goal" : live.toGo}{spot ? ` · on the ${spot}` : ""}</div>}
        </div>
        <div style={{ display: narrow ? "flex" : "grid", flexDirection: "column", gridTemplateColumns: "minmax(0,2.3fr) minmax(300px,1fr)", gap: narrow ? 8 : 14, flex: 1, minHeight: 0 }}>
          {/* the field */}
          <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {live.done || !field ? (() => { const won = (live.h === ui ? live.hs > live.as : live.as > live.hs), tie = live.hs === live.as; return (
              <div style={{ background: "#fbfbf8", border: "3px solid #111", boxShadow: "6px 6px 0 #0a1f6b", padding: narrow ? "18px 12px" : "34px 24px", textAlign: "center" }}>
                <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: narrow ? 15 : 18, color: "#555" }}>{live.done ? "Final" : "Loading the field…"}</div>
                {live.done && <><div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: narrow ? 14 : 36, marginTop: 10 }}>
                  {["h", "a"].map((sd, k) => <React.Fragment key={sd}>{k === 1 && <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: narrow ? 20 : 28, color: "#888" }}>-</span>}<div style={{ display: "flex", flexDirection: k ? "row-reverse" : "row", alignItems: "center", gap: narrow ? 10 : 18 }}><PixelLogo ab={H2[sd]?.ab} size={narrow ? 56 : 96} style={{ filter: "drop-shadow(3px 3px 0 #0002)" }} /><span style={{ fontFamily: SANS, fontWeight: 800, fontSize: narrow ? 40 : 64, color: INK, fontVariantNumeric: "tabular-nums" }}>{sd === "h" ? live.hs : live.as}</span></div></React.Fragment>)}
                </div>
                <div style={{ marginTop: 14, fontFamily: 'Georgia, serif', fontSize: narrow ? 17 : 20 }}><span style={{ background: tie ? "#e8ecf5" : won ? "#fff23a" : "#ffd6d6", fontWeight: 700, padding: "2px 8px" }}>{tie ? "A tie." : won ? `The ${TEAMS[ui]?.name} win!` : `The ${TEAMS[ui]?.name} lose.`}</span></div></>}
              </div>); })() : <div style={{ border: "3px solid #111", boxShadow: "6px 6px 0 #0a1f6b", background: "#0b0e14", lineHeight: 0, ...(narrow ? { aspectRatio: "16 / 10", position: "relative" } : {}) }}>{field}</div>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {live.done ? <Btn big onClick={onDone} style={{ flex: narrow ? "1 1 100%" : "0 0 auto" }}>▶ Continue</Btn> : <>
                {B(paused ? "Resume" : "Pause", onPause, "gold")}
                {B(`Speed: ${speed}`, () => onSpeed(speeds[(speeds.indexOf(speed) + 1) % speeds.length] || "Normal"), "blue")}
                {B("Finish game", onFinish)}
                {B("Back to home", onBack)}</>}
            </div>
          </div>
          {/* the plays */}
          <div style={{ minWidth: 0, minHeight: narrow ? 260 : 0, display: "flex", flexDirection: "column" }}>
            <nav style={{ display: "flex", alignItems: "flex-end" }}>
              {[["plays", "Plays"], ["scoring", "Scoring"]].map(([k, l], i) => { const on = tab === k; return <button key={k} onClick={() => setTab(k)} style={{ cursor: "pointer", fontFamily: SANS, fontWeight: 800, fontSize: narrow ? 14 : 16, color: INK, padding: "8px 20px 6px", background: on ? "#fbfbf8" : "linear-gradient(180deg,#6fa0cf,#4a7fb0)", border: "3px solid #111", borderBottom: on ? "3px solid #fbfbf8" : "3px solid #111", marginLeft: i ? -3 : 0, marginBottom: -3, position: "relative", zIndex: on ? 2 : 1 }}>{l}</button>; })}
            </nav>
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", background: "#fbfbf8", border: "3px solid #111", boxShadow: "6px 6px 0 #0a1f6b", padding: "8px 12px" }}>
              {list.length ? list.map((e, i) => { const big = /td|int|fumble|fg/i.test(e.type || ""); return (
                <div key={i} style={{ padding: "7px 2px", borderBottom: "2px solid #e4e4dc", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 15, lineHeight: 1.4, color: "#1d1d1d" }}>
                  <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 12, color: "#666", marginRight: 6 }}>Q{e.qtr}</span>
                  {big ? <span style={{ background: e.type === "td" || e.type === "fg" ? "#fff23a" : "#ffd6d6", fontWeight: 700, padding: "0 3px" }}>{e.text}</span> : e.text}
                </div>); }) : <div style={{ fontFamily: 'Georgia, serif', fontSize: 16, padding: 6 }}>{tab === "plays" ? "Kickoff is coming up." : "No points yet."}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
