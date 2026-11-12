// Easy Mode: the whole franchise behind one button. Same league, same engine, same season; the staff
// make the calls (contracts, free agency, the draft, the depth chart, trades are left alone) and you
// press CONTINUE. Drawn like a 16-bit sports broadcast: royal blue, chunky pixel lettering, gold
// numbers, pixelated club logos, green and red arrows for wins and losses.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { logoUrl } from "./ui.jsx";
import { MOBILE } from "./mobile.js";
import { headshotUrl } from "./headshots.js";
import { portraitSrc } from "./portraits.js";
import { depthOrderFor } from "./depth.js";
import { capSpace } from "./league.js";
import { yearlyAsk, maxYears } from "./negotiation.js";
import { nflSeeds, makeBracket, ROUND_NAMES } from "./playoffs.js";
import { sbName, sbNumber } from "./data/superbowls.js";
import { drawLombardi } from "./arcade/lombardi.js";
import { pixText, pixWidth } from "./arcade/pixfont.js";
import { awardRaces } from "./awards.js";
import { OFF_PLANS, DEF_PLANS } from "./gamePlan.js";
import { perSeason, OFFENSE as DEV_OFF, DEFENSE as DEV_DEF } from "./development.js";

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
// The Super Bowl in 8-bit, at the heart of the playoff tree: the arcade's pixel Lombardi (the one handed
// over in its trophy ceremony) on a little stage under a spotlight, stars twinkling, the game's numeral
// in gold. Drawn at 72x84 and blown up with no smoothing, like a 16-bit sprite.
const SB_W = 72, SB_H = 84;
function PixelSB({ yr, scale = 3 }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current, c = cv?.getContext("2d"); if (!c) return;
    const num = yr ? sbName(sbNumber(yr)).replace("Super Bowl ", "") : "";
    // the backdrop, once: deep blue, a spotlight in a lighter blue (dithered at its edge), the stage
    const bg = document.createElement("canvas"); bg.width = SB_W; bg.height = SB_H; const b = bg.getContext("2d");
    b.fillStyle = "#0b2a8f"; b.fillRect(0, 0, SB_W, SB_H);
    for (let y = 0; y < SB_H; y++) for (let x = 0; x < SB_W; x++) {
      const d = Math.hypot((x - SB_W / 2) / 26, (y - 40) / 30);
      if (d < 0.62 || (d < 0.86 && (x + y) % 2 === 0)) { b.fillStyle = d < 0.62 ? "#1d4ed8" : "#1640b8"; b.fillRect(x, y, 1, 1); }
    }
    b.fillStyle = "#082067"; b.fillRect(0, 62, SB_W, SB_H - 62); b.fillStyle = "#ffb300"; b.fillRect(14, 62, SB_W - 28, 1); // the stage, its gold edge
    const stars = [[5, 14], [65, 10], [9, 44], [62, 48], [17, 26], [57, 30], [28, 4], [46, 15], [4, 56], [68, 58]];
    const tr = document.createElement("canvas"); tr.width = SB_W; tr.height = SB_H; const t = tr.getContext("2d");
    const still = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const draw = () => {
      const now = performance.now();
      c.drawImage(bg, 0, 0);
      stars.forEach(([x, y], i) => { const k = ((now / 450 + i * 1.7) % 4); if (still || k < 3) { c.fillStyle = k < 0.5 && !still ? "#fff" : "#ffd166"; c.fillRect(x, y, 1, 1); } });
      // the trophy: drawn, then cut to hard pixels with a dark outline, like the field's sprites
      t.clearRect(0, 0, SB_W, SB_H); drawLombardi(t, SB_W / 2, 62, 2.6);
      const d = t.getImageData(0, 0, SB_W, SB_H), a = d.data, solid = new Uint8Array(SB_W * SB_H);
      for (let i = 0; i < SB_W * SB_H; i++) { if (a[i * 4 + 3] > 100) { solid[i] = 1; a[i * 4 + 3] = 255; } else a[i * 4 + 3] = 0; }
      for (let y = 0; y < SB_H; y++) for (let x = 0; x < SB_W; x++) { const i = y * SB_W + x; if (solid[i]) continue;
        if ((x > 0 && solid[i - 1]) || (x < SB_W - 1 && solid[i + 1]) || (y > 0 && solid[i - SB_W]) || (y < SB_H - 1 && solid[i + SB_W])) { const o = i * 4; a[o] = 10; a[o + 1] = 16; a[o + 2] = 40; a[o + 3] = 255; } }
      t.putImageData(d, 0, 0); c.drawImage(tr, 0, 0);
      pixText(c, "SUPER BOWL", SB_W / 2 + 1, 5, 1, "#0a1f6b", "center"); pixText(c, "SUPER BOWL", SB_W / 2, 4, 1, "#fff", "center");
      if (num) { const px = pixWidth(num, 2) <= SB_W - 6 ? 2 : 1, y = px === 2 ? 67 : 71; pixText(c, num, SB_W / 2 + 1, y + 1, px, "#3a2200", "center"); pixText(c, num, SB_W / 2, y, px, "#ffb300", "center"); }
    };
    draw(); if (still) return undefined;
    const iv = setInterval(draw, 120); return () => clearInterval(iv);
  }, [yr]);
  return <canvas ref={ref} width={SB_W} height={SB_H} role="img" aria-label={yr ? sbName(sbNumber(yr)) : "Super Bowl"} style={{ width: SB_W * scale, height: SB_H * scale, imageRendering: "pixelated", display: "block", border: "3px solid #111", boxShadow: "5px 5px 0 #0a1f6b" }} />;
}

const rec = (t) => `${t.w || 0}-${t.l || 0}${t.t ? `-${t.t}` : ""}`;
const pct = (t) => ((t.w || 0) + (t.t || 0) * 0.5) / Math.max(1, (t.w || 0) + (t.l || 0) + (t.t || 0));

export default function EasyShell({ teams, TEAMS, ui, yr, wk, sp, sched, pb, log, msg, step, busy, onFull, onSave, phaseLabel, depthOrder, setDepthOrder, awards, onResign, draft, onPick, trades, champs = [], seasonHistory = [], fa = [], faOpen = false, onSignFA, shop = null, canExt = null, extRoomFor = null, onExtend = null, devFocus = null, onDevFocus, powerRankings = [], ownerGoal = null, plan = null }) {
  const [view, setView] = useState("home");
  const [sub, setSub] = useState(() => ({ team: "roster", stats: "pass", lineup: "offense", draft: "All", league: "leaders", lead: "pass", scope: "league", conf: teams[ui]?.c || "AFC", moves: sp === "draft" ? "draft" : sp === "freeagency" ? "fa" : "trade", fa: "All", scoreWk: null, board: "All" }));
  const [card, setCard] = useState(null);       // the player card open: { id, ti, p }
  const [slot, setSlot] = useState(null);       // the lineup spot being chosen
  const [devPick, setDevPick] = useState(null); // the development focus side being chosen
  const [walked, setWalked] = useState(() => new Set());
  const [gameBox, setGameBox] = useState(null); // a played game's box score, opened from its row
  const ut = teams[ui], T = TEAMS[ui];
  const narrow = MOBILE;
  const games = (sched || []).filter((g) => g.played && (g.h === ui || g.a === ui)).sort((a, b) => (+b.wk || 0) - (+a.wk || 0));
  const next = sp === "regular" ? (sched || []).find((g) => g.wk === wk + 1 && !g.played && (g.h === ui || g.a === ui)) : null;
  const res = (g) => { const home = g.h === ui, us = home ? g.hs : g.as, them = home ? g.as : g.hs; return { opp: home ? g.a : g.h, home, us, them, win: us > them, tie: us === them }; };
  const tabs = [["home", "Home"], ["team", "Team"], ["schedule", "Schedule"], ["league", "League"], ["playoffs", "Playoffs"], ["moves", "Moves"]];
  const openCard = (p, ti = ui) => setCard({ id: p.id, ti, p });
  const setS = (k, v) => setSub((x) => ({ ...x, [k]: v }));

  // inside the white page: crisp sans headings, newspaper serif, blue names, a yellow highlighter
  const INK = "#151515", LINK = "#1a3fc4";
  const PH = { fontFamily: SANS, fontWeight: 700, color: INK };
  const NUM = { fontFamily: SANS, fontWeight: 800, color: INK, fontVariantNumeric: "tabular-nums" };
  const SERIF = { fontFamily: 'Georgia, "Times New Roman", serif', color: "#1d1d1d" };
  const CLUB = { fontFamily: SANS, fontWeight: 700, color: LINK };
  const Mark = ({ children }) => <span style={{ ...SERIF, fontWeight: 700, background: "#fff23a", padding: "1px 5px", boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}>{children}</span>;
  const Logo = (p) => <PixelLogo {...p} style={{ filter: "drop-shadow(2px 2px 0 #0002)", ...p.style }} />;
  const Face = ({ p, size = 36, res: r = 28, ti = ui }) => <PixelFace p={p} ab={TEAMS[ti]?.ab || T.ab} clr={ti < 0 ? "#6b7280" : TEAMS[ti]?.clr || T.clr} size={size} res={r} />;
  const Row = ({ children, style, onClick }) => <div className={onClick ? "ez-row ez-click" : "ez-row"} onClick={onClick} style={{ display: "flex", alignItems: "center", gap: narrow ? 10 : 14, padding: narrow ? "6px 4px" : "6px 10px", borderBottom: "2px solid #e4e4dc", ...style }}>{children}</div>;
  const Chips = ({ items, on, set }) => <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>{items.map(([k, l]) => <button key={k} className="ez-btn" onClick={() => set(k)} style={{ fontSize: 14, padding: "6px 12px", background: on === k ? "#1d4ed8" : "#e8ecf5", color: on === k ? "#fff" : INK, boxShadow: on === k ? "0 3px 0 #0b2a8f" : "0 3px 0 #c5ccdc" }}>{l}</button>)}</div>;
  const roster = ut?.roster || [];

  const gameRow = (g, i) => { const r = res(g); return (
    <Row key={i} onClick={g.boxH || g.boxA ? () => setGameBox(g) : undefined}>
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
  const playerRow = (p, extra, onClick = () => openCard(p), ti = ui) => (
    <Row key={p.id} onClick={onClick} style={{ gap: 12 }}>
      <span style={{ ...PH, fontSize: 13, width: 36, color: "#555" }}>{p.pos}</span>
      <Face p={p} size={narrow ? 34 : 36} ti={ti} />
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

  // one club's offer: what they get, what you get, yes or no
  const offerCard = (o, yes, no) => { const t = TEAMS[o.fromTm] || {}; return (
    <div key={o.id} style={{ background: "#fff", boxShadow: "inset 0 0 0 3px #c9d6f5", padding: narrow ? "10px 8px" : "12px 14px", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}><Logo ab={t.ab} size={30} /><span style={{ ...CLUB, fontSize: 17 }}>The {t.city} {t.name} offer</span></div>
      <div style={{ ...SERIF, fontSize: 14, color: "#555", margin: "2px 0" }}>They get</div>
      {playerRow(o.want, <><Stars v={o.want.ovr} size={narrow ? 12 : 14} />{!narrow && <span style={{ ...NUM, fontSize: 16, width: 30, textAlign: "right" }}>{o.want.ovr}</span>}</>)}
      <div style={{ ...SERIF, fontSize: 14, color: "#555", margin: "8px 0 2px" }}>You get</div>
      {o.give && playerRow(o.give, <><Stars v={o.give.ovr} size={narrow ? 12 : 14} />{!narrow && <span style={{ ...NUM, fontSize: 16, width: 30, textAlign: "right" }}>{o.give.ovr}</span>}</>, () => openCard(o.give, o.fromTm), o.fromTm)}
      {(o.givePicks || []).map((pk) => <div key={pk.id} style={{ ...CLUB, fontSize: 15, padding: "5px 4px" }}>{pk.yr ? `${pk.yr} ` : ""}round {pk.rd} draft pick{pk.overall ? ` (#${pk.overall})` : ""}</div>)}
      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        <button className="ez-btn" onClick={() => yes(o)} style={{ fontSize: 15, padding: "8px 18px", background: "#22a447", color: "#fff", boxShadow: "0 3px 0 #157a32" }}>Yes, trade</button>
        <button className="ez-btn" onClick={() => no(o)} style={{ fontSize: 15, padding: "8px 18px", background: "#e8ecf5", color: INK, boxShadow: "0 3px 0 #c5ccdc" }}>No thanks</button>
      </div>
    </div>); };
  // trade deadline day: a few clubs call with offers (a player, draft picks or both, for one of yours);
  // yes makes the trade, no turns it down. Anything left unanswered lapses when the day ends.
  const tradePanel = () => (
    <div style={{ marginTop: 18 }}>
      <div style={{ marginBottom: 6 }}><Mark>Trade offers</Mark> <span style={{ ...SERIF, fontSize: 15 }}>Say yes or no to each. Offers left open expire when the day ends.</span></div>
      {!trades.offers.length && <div style={{ ...SERIF, fontSize: 16, padding: "6px 2px" }}>No offers left on the table.</div>}
      {trades.offers.map((o) => offerCard(o, trades.yes, trades.no))}
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

  // ---- this week's game plan: the staff's pick, or yours (it lasts the week) ----
  const SHORT_PLAN = { run_stop: "Stack the box", coverage: "Coverage" };
  const planCard = () => {
    const row = (side, list) => { const cur = plan.cur?.[side], why = plan.opts?.[side]?.[cur]?.why; return (
      <div style={{ marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ ...PH, fontSize: 13, width: 62, color: "#555" }}>{side === "off" ? "Offense" : "Defense"}</span>
          {list.map((o) => { const on = cur === o.key, best = plan.best?.[side] === o.key; return <button key={o.key} className="ez-btn" onClick={() => plan.pick(side, o.key)} style={{ fontSize: 13, padding: "5px 10px", background: on ? "#1d4ed8" : "#e8ecf5", color: on ? "#fff" : INK, boxShadow: on ? "0 3px 0 #0b2a8f" : "0 3px 0 #c5ccdc" }}>{SHORT_PLAN[o.key] || o.label}{best ? " ★" : ""}</button>; })}
        </div>
        {why && <div style={{ ...SERIF, fontSize: 13, color: "#555", margin: "4px 0 0 70px" }}>{why.replace(/^\w/, (c) => c.toUpperCase())}.</div>}
      </div>); };
    return (<div style={{ marginTop: 12, padding: narrow ? "8px 8px 10px" : "10px 12px 12px", background: "#f6f8fd", boxShadow: "inset 0 0 0 2px #dbe3f5" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}><Mark>Game plan</Mark><span style={{ ...SERIF, fontSize: 14, color: "#555" }}>{plan.auto ? "The staff's pick for this opponent (★). Change it for this week if you like." : "Your call for this week."}</span>
        {!plan.auto && <button className="ez-btn" onClick={plan.staff} style={{ fontSize: 13, padding: "4px 10px", background: "#e8ecf5", color: INK, boxShadow: "0 3px 0 #c5ccdc" }}>Let the staff pick</button>}</div>
      {row("off", OFF_PLANS)}{row("def", DEF_PLANS)}
    </div>);
  };
  const home = () => {
    const opp = next ? TEAMS[next.h === ui ? next.a : next.h] : null, oppT = next ? teams[next.h === ui ? next.a : next.h] : null;
    const offseason = sp === "resign" || sp === "draft";
    return (
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "minmax(0,1fr)" : offseason ? "minmax(0,1.7fr) minmax(0,1fr)" : "minmax(0,1.1fr) minmax(0,1fr)", gap: narrow ? 18 : 32, alignItems: "start" }}>
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
            {/* a game this week: PLAY it (on the field, every snap yours), or play the moments, or sim it */}
            {step.play ? <>
              <Btn big onClick={step.play} disabled={busy} style={{ flex: narrow ? "1 1 100%" : "0 0 auto" }}>▶ {step.playLabel || "Play"}</Btn>
              {step.moments && <Btn kind="blue" onClick={step.moments} disabled={busy} style={narrow ? { flex: "1 1 0" } : undefined}>Play the moments</Btn>}
              <Btn kind="blue" onClick={step.run} disabled={busy} style={narrow ? { flex: "1 1 0" } : undefined}>{busy ? <span style={{ animation: "ezBlink .6s steps(2) infinite" }}>Working…</span> : "Sim"}</Btn>
            </> : <Btn big onClick={step.run} disabled={busy} style={{ flex: narrow ? "1 1 100%" : "0 0 auto" }}>{busy ? <span style={{ animation: "ezBlink .6s steps(2) infinite" }}>Working…</span> : <>▶ {step.label}</>}</Btn>}
            {step.simAll && <Btn kind="dark" onClick={step.simAll} disabled={busy} style={narrow ? { flex: "1 1 0" } : undefined}>Sim the season</Btn>}
          </div>}
          {msg && <div style={{ ...SERIF, fontSize: 16, marginTop: 12, fontStyle: "italic" }}>{msg}</div>}
          {(() => { // the playoff picture, in a line
            if (sp !== "regular" || !playedAny) return null;
            const seeds = seedsOf(ut.c), at = seeds.indexOf(ui), s7 = teams[seeds[6]];
            const back = s7 ? ((s7.w || 0) - (ut.w || 0) + (ut.l || 0) - (s7.l || 0)) / 2 : 0;
            const txt = at >= 0 ? `If the season ended today, you'd be the ${ut.c}'s #${at + 1} seed${at === 0 ? " (and the bye)" : ""}.` : back > 0 ? `${back} game${back === 1 ? "" : "s"} out of the last playoff spot in the ${ut.c}.` : `Tied for the last playoff spot in the ${ut.c}.`;
            return <div className="ez-click" title={ownerGoal ? `The owner wants ${ownerGoal} wins` : undefined} onClick={() => { setView("playoffs"); setS("conf", ut.c); }} style={{ ...SERIF, fontSize: 15, marginTop: 12, padding: "6px 8px", background: at >= 0 ? "#e7f6ea" : "#f3f4f6", boxShadow: `inset 3px 0 0 ${at >= 0 ? "#22a447" : "#9ca3af"}` }}>{txt}{ownerGoal ? ` The owner wants ${ownerGoal} wins (you have ${ut.w || 0}).` : ""} <span style={{ ...PH, fontSize: 13, color: LINK }}>Playoff picture</span></div>;
          })()}
          {plan && planCard()}
          {trades && tradePanel()}
          {sp === "resign" && resignPanel()}
          {sp === "draft" && draftPanel()}
          {!narrow && !offseason && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, marginTop: 20 }}>
            <div><div style={{ marginBottom: 4, fontSize: 16 }}><Mark>{ut.c} {ut.d}</Mark></div>{divRows(ut.c, ut.d)}</div>
            <div><div style={{ marginBottom: 4, fontSize: 16 }}><Mark>Best players</Mark></div>
              {[...roster].sort((a, b) => b.ovr - a.ovr).slice(0, 4).map((p) => <Row key={p.id} onClick={() => openCard(p)} style={{ gap: 10, padding: "4px 4px" }}><Face p={p} size={34} /><span style={{ ...PH, fontSize: 13, width: 30, color: "#555" }}>{p.pos}</span><span style={{ ...CLUB, fontSize: 15, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span><span style={{ ...NUM, fontSize: 16 }}>{p.ovr}</span></Row>)}</div>
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

  // ---- Season: the schedule, and the standings as a broadcast table ----
  const schedule = () => {
    const mine = (sched || []).filter((g) => g.h === ui || g.a === ui).sort((a, b) => (+a.wk || 0) - (+b.wk || 0));
    if (!mine.length) return <div style={{ ...SERIF, fontSize: 17 }}>The schedule comes out when the new season starts.</div>;
    return mine.map((g, i) => g.played ? gameRow(g, i) : (
      <Row key={i}><span style={{ width: 16 }} /><span style={{ ...PH, fontSize: 13, width: narrow ? 50 : 70, color: "#555" }}>Week {g.wk}</span><Logo ab={T.ab} size={narrow ? 28 : 32} /><span style={{ flex: 1, textAlign: "center" }}>{g.wk === wk + 1 ? <Mark>Next</Mark> : <span style={{ ...NUM, color: "#aaa" }}>-</span>}</span><span style={{ ...PH, fontSize: 13, color: "#555" }}>{g.h === ui ? "vs" : "at"}</span><Logo ab={TEAMS[g.h === ui ? g.a : g.h]?.ab} size={narrow ? 28 : 32} /></Row>));
  };
  // ---- the player card ----
  const cardView = () => { const cti = card.ti ?? ui, Tc = cti >= 0 ? TEAMS[cti] || T : { name: "Free agent", clr: "#4b5563", ab: T.ab }, p = (cti >= 0 ? teams[cti]?.roster : fa)?.find((x) => x.id === card.id) || card.p; const bits = statBits(p);
    // his career: the seasons before this one, plus this one
    const career = (() => { const cs = { ...(p.cs || {}) }; for (const [k, v] of Object.entries(p.ss || {})) if (typeof v === "number") cs[k] = (cs[k] || 0) + v; return statBits({ ...p, ss: cs }); })();
    const won = (awards || []).flatMap((a) => AWARD.filter(([k]) => a[k]?.pid === p.id).map(([, l]) => `${a.yr} ${l}`));
    const row = (l, v) => <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0", borderBottom: "2px solid #e4e4dc" }}><span style={{ ...PH, fontSize: 14, color: "#555" }}>{l}</span><span style={{ ...SERIF, fontSize: 15, textAlign: "right" }}>{v}</span></div>;
    return (
      <div onClick={() => setCard(null)} style={{ position: "absolute", inset: 0, zIndex: 10, background: "#0a1f6bb3", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: "min(560px, 100%)", maxHeight: "100%", overflowY: "auto", background: "#fbfbf8", border: "4px solid #111", boxShadow: "8px 8px 0 #0a1f6b" }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center", padding: 16, background: `linear-gradient(135deg, ${Tc.clr}, #0b2a8f)` }}>
            <span style={{ border: "4px solid #fff", lineHeight: 0 }}><Face p={p} size={narrow ? 96 : 120} res={40} ti={cti} /></span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ ...H, fontSize: narrow ? 21 : 26, lineHeight: 1.1 }}>{p.name}</div>
              <div style={{ ...H, fontSize: 15, fontWeight: 600, marginTop: 4, textShadow: "none", color: "#dbe6ff" }}>{p.pos} · age {p.age}{p.num != null ? ` · #${p.num}` : ""} · {Tc.name}</div>
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
            {p.cs && Object.keys(p.cs).length > 0 && career.length > 0 && row("Career", career.join(" · "))}
            {row("Awards", won.length ? won.join(", ") : "None yet")}
            {p.college && row("College", p.college)}
            <div style={{ marginTop: 14, textAlign: "right" }}><Btn kind="blue" onClick={() => setCard(null)}>Close</Btn></div>
          </div>
        </div>
      </div>); };

  // ======== the whole league (League tab), and the moves you make (Moves tab) ========
  const ordinal = (n) => { const v = n % 100; return n + (v >= 11 && v <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th"); };
  const allPlayers = useMemo(() => teams.flatMap((t, ti) => (t.roster || []).map((p) => ({ p, ti }))), [teams]);
  const withIds = useMemo(() => teams.map((t, i) => ({ ...t, id: i })), [teams]);
  const seedsOf = (c) => nflSeeds(withIds, c);
  const races = useMemo(() => (view === "league" ? awardRaces(teams, yr, 5) : null), [teams, yr, view]);
  const playedAny = teams.some((t) => (t.w || 0) + (t.l || 0) + (t.t || 0) > 0);
  const Name = ({ children, size = 16, me }) => <span style={{ ...CLUB, fontSize: size, color: me ? INK : LINK, display: "block", lineHeight: 1.2, overflowWrap: "anywhere" }}>{children}</span>;
  const Head = ({ cols, lead = 0, gap = narrow ? 8 : 12 }) => <div style={{ display: "flex", ...PH, fontSize: 12, color: "#666", padding: narrow ? "0 4px 4px" : "0 10px 4px", gap }}><span style={{ flex: 1, paddingLeft: lead }}>Player</span>{cols.map(([l, , w]) => <span key={l} style={{ width: w ? (narrow ? w - 10 : w) : narrow ? 38 : 50, textAlign: "right" }}>{l}</span>)}</div>;
  const statCells = (s, cols) => cols.map(([l, f, w]) => <span key={l} style={{ ...NUM, fontSize: narrow ? 14 : 16, width: w ? (narrow ? w - 10 : w) : narrow ? 38 : 50, textAlign: "right", flexShrink: 0 }}>{f(s)}</span>);

  // ---- League > Leaders: the top players in the league (or your team) at each stat ----
  const LEAD = {
    pass: ["Passing", (s) => s.passYds || 0, [["Cmp/Att", (s) => `${s.comp || 0}/${s.att || 0}`, 74], ["Yds", (s) => s.passYds || 0], ["TD", (s) => s.passTD || 0, 40], ["INT", (s) => s.passInt || 0, 40]]],
    rush: ["Rushing", (s) => s.rushYds || 0, [["Car", (s) => s.rushAtt || 0, 44], ["Yds", (s) => s.rushYds || 0], ["Avg", (s) => (s.rushAtt ? (s.rushYds / s.rushAtt).toFixed(1) : "0.0"), 44], ["TD", (s) => s.rushTD || 0, 40]]],
    rec: ["Receiving", (s) => s.recYds || 0, [["Rec", (s) => s.rec || 0, 44], ["Yds", (s) => s.recYds || 0], ["TD", (s) => s.recTD || 0, 40]]],
    tkl: ["Tackles", (s) => (s.tkl || 0) + (s.ast || 0), [["Tkl", (s) => (s.tkl || 0) + (s.ast || 0)], ["Sacks", (s) => s.sacks || 0], ["INT", (s) => s.ints || 0, 40]]],
    sack: ["Sacks", (s) => s.sacks || 0, [["Sacks", (s) => s.sacks || 0], ["Tkl", (s) => (s.tkl || 0) + (s.ast || 0)]]],
    int: ["INTs", (s) => (s.ints || 0) * 100 + (s.pd || 0), [["INT", (s) => s.ints || 0, 40], ["PD", (s) => s.pd || 0, 40], ["Tkl", (s) => (s.tkl || 0) + (s.ast || 0)]]],
    kick: ["Kicking", (s) => (s.fgM || 0) * 3 + (s.xpM || 0), [["FG", (s) => `${s.fgM || 0}/${s.fgA || 0}`, 60], ["XP", (s) => `${s.xpM || 0}/${s.xpA || 0}`, 60], ["Pts", (s) => (s.fgM || 0) * 3 + (s.xpM || 0), 44]]],
  };
  const leaderRow = ({ p, ti }, k, cols) => (
    <Row key={`${ti}-${p.id}`} onClick={() => openCard(p, ti)} style={{ gap: narrow ? 8 : 12, background: ti === ui ? "#fff9c4" : undefined }}>
      <span style={{ ...NUM, fontSize: 14, width: 22, color: "#666", textAlign: "right", flexShrink: 0 }}>{k + 1}</span>
      <Face p={p} ti={ti} size={narrow ? 32 : 36} />
      <span style={{ flex: 1, minWidth: 0 }}><Name size={narrow ? 15 : 16} me={ti === ui}>{p.name}</Name><span style={{ ...PH, fontSize: 12, color: "#666" }}>{p.pos} · {TEAMS[ti]?.ab}</span></span>
      {statCells(p.ss || {}, cols)}
    </Row>);
  const raceBox = (title, list) => list?.length ? <div style={{ marginBottom: 16 }}><div style={{ marginBottom: 4, fontSize: 16 }}><Mark>{title}</Mark></div>
    {list.slice(0, 5).map((x, k) => <Row key={x.pid} style={{ gap: 10, padding: "5px 4px", background: x.ti === ui ? "#fff9c4" : undefined }}><span style={{ ...NUM, fontSize: 14, width: 16, color: "#666" }}>{k + 1}</span><Logo ab={TEAMS[x.ti]?.ab} size={26} /><span style={{ flex: 1, minWidth: 0 }}><Name size={15} me={x.ti === ui}>{x.name}</Name><span style={{ ...SERIF, fontSize: 13, color: "#666" }}>{x.pos}, {x.team}{x.stat ? ` · ${x.stat}` : ""}</span></span></Row>)}</div> : null;
  const leadersView = () => {
    const [, key, cols] = LEAD[sub.lead], mine = sub.scope === "team";
    const list = allPlayers.filter((x) => (!mine || x.ti === ui) && key(x.p.ss || {}) > 0).sort((a, b) => key(b.p.ss || {}) - key(a.p.ss || {})).slice(0, mine ? 15 : 25);
    const aw = [...(awards || [])].sort((a, b) => b.yr - a.yr)[0];
    return (<div style={{ display: "grid", gridTemplateColumns: narrow ? "minmax(0,1fr)" : "minmax(0,1.6fr) minmax(0,1fr)", gap: narrow ? 18 : 30, alignItems: "start" }}>
      <div>
        <Chips items={[["league", "Whole league"], ["team", `${T.name} only`]]} on={sub.scope} set={(v) => setS("scope", v)} />
        <Chips items={Object.entries(LEAD).map(([k, v]) => [k, v[0]])} on={sub.lead} set={(v) => setS("lead", v)} />
        <Head cols={cols} lead={narrow ? 70 : 84} />
        {list.length ? list.map((x, k) => leaderRow(x, k, cols)) : <div style={{ ...SERIF, fontSize: 16, padding: 6 }}>No stats yet this season.</div>}
      </div>
      <div>
        {races && sp === "regular" && playedAny && <>{raceBox("MVP race", races.mvp)}{raceBox("Defensive Player of the Year race", races.dpoy)}{raceBox("Offensive Rookie of the Year race", races.oroy)}</>}
        <div style={{ marginBottom: 6, fontSize: 16 }}><Mark>{aw ? `${aw.yr} awards` : "Awards"}</Mark></div>
        {aw ? AWARD.filter(([k]) => aw[k]).map(([k, l]) => { const w = aw[k]; return <Row key={k} style={{ gap: 10, padding: "6px 4px", background: w.ti === ui ? "#fff9c4" : undefined }}><Logo ab={TEAMS[w.ti]?.ab} size={28} /><span style={{ flex: 1, minWidth: 0 }}><span style={{ ...PH, fontSize: 13, color: "#555", display: "block" }}>{l}</span><Name size={15} me={w.ti === ui}>{w.name}</Name><span style={{ ...SERIF, fontSize: 13, color: "#666" }}>{w.pos}, {w.team}</span></span></Row>; }) : <div style={{ ...SERIF, fontSize: 16, padding: 6 }}>Awards are handed out when the regular season ends.</div>}
      </div>
    </div>);
  };

  // ---- League > Standings: every division, a conference at a time, with the playoff seeds ----
  const standingsView = () => {
    const conf = sub.conf, seeds = playedAny ? seedsOf(conf) : [];
    const divs = [...new Set(teams.filter((t) => t.c === conf).map((t) => t.d))].sort((a, b) => (conf === ut.c && a === ut.d ? -1 : conf === ut.c && b === ut.d ? 1 : String(a).localeCompare(String(b))));
    const cols = narrow ? ["W", "L", "Diff", "Seed"] : ["W", "L", "T", "PF", "PA", "Diff", "Seed"];
    const cell = { display: "flex", alignItems: "center", justifyContent: "center" };
    const grid = { display: "grid", gridTemplateColumns: `${narrow ? 30 : 40}px ${narrow ? 46 : 60}px minmax(0,1fr)`, gap: 4 };
    const hd = { ...cell, background: "#ffb300", fontFamily: SANS, fontWeight: 800, fontSize: narrow ? 13 : 14, color: INK, padding: "6px 2px", lineHeight: 1.05, textAlign: "center" };
    return (<>
      <Chips items={[["AFC", "AFC"], ["NFC", "NFC"]]} on={conf} set={(v) => setS("conf", v)} />
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: narrow ? 14 : 22 }}>
        {divs.map((d) => <div key={d} style={{ background: BLUE, padding: 4, boxShadow: "4px 4px 0 #0a1f6b" }}>
          <div style={{ ...GOLD, fontSize: narrow ? 16 : 18, padding: "4px 6px 6px", textShadow: "2px 2px 0 #0a1f6b" }}>{conf} {d}</div>
          <div style={grid}><div style={hd}>Rk</div><div style={hd}>Team</div><div style={{ display: "grid", gridTemplateColumns: `repeat(${cols.length},1fr)`, gap: 4 }}>{cols.map((c) => <div key={c} style={hd}>{c}</div>)}</div></div>
          {teams.map((t, i) => ({ t, i })).filter((x) => x.t.c === conf && x.t.d === d).sort((a, b) => pct(b.t) - pct(a.t) || (b.t.pf - b.t.pa) - (a.t.pf - a.t.pa)).map((x, k) => {
            const sd = seeds.indexOf(x.i);
            const v = { W: x.t.w || 0, L: x.t.l || 0, T: x.t.t || 0, PF: x.t.pf || 0, PA: x.t.pa || 0, Diff: (x.t.pf || 0) - (x.t.pa || 0), Seed: sd >= 0 ? `#${sd + 1}` : "-" };
            const me = x.i === ui;
            return <div key={x.i} style={{ ...grid, marginTop: 4 }}>
              <div style={{ ...cell, background: "#ffb300", fontFamily: SANS, fontWeight: 800, fontSize: narrow ? 19 : 22, color: INK }}>{k + 1}</div>
              <div title={TEAMS[x.i].name} style={{ ...cell, background: TEAMS[x.i].clr || "#222", padding: "4px 0" }}><PixelLogo ab={TEAMS[x.i].ab} size={narrow ? 32 : 40} style={{ filter: "drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff) drop-shadow(0 2px 0 #fff) drop-shadow(0 -2px 0 #fff)" }} /></div>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols.length},1fr)`, background: me ? "#fff6c2" : "#fbfbf8", boxShadow: me ? "inset 0 0 0 3px #ffb300" : "none" }}>
                {cols.map((c) => <div key={c} style={{ ...cell, fontFamily: SANS, fontWeight: c === "Seed" ? 800 : 600, fontSize: narrow ? 16 : 19, color: c === "Seed" && sd >= 0 ? "#1d4ed8" : INK, fontVariantNumeric: "tabular-nums" }}>{c === "Diff" && v[c] > 0 ? `+${v[c]}` : v[c]}</div>)}
              </div>
            </div>; })}
        </div>)}
      </div>
      <div style={{ ...SERIF, fontSize: 14, color: "#555", marginTop: 12 }}>Seed: where a club would be in the playoffs if the season ended today (seven from each conference; the top seed gets a bye).</div>
    </>);
  };

  // ---- a game in a list: away at home, the winner in bold, yours on yellow ----
  const scoreRow = (g, key, onClick) => {
    const done = g.hs != null && g.as != null && (g.played || g.w != null), aw = done && g.as > g.hs, hw = done && g.hs > g.as, mine = g.h === ui || g.a === ui;
    const side = (ti, won, right) => <span style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: narrow ? 6 : 10, flexDirection: right ? "row-reverse" : "row", textAlign: right ? "right" : "left" }}>
      <Logo ab={TEAMS[ti]?.ab} size={narrow ? 26 : 30} />
      <span style={{ ...CLUB, fontSize: narrow ? 14 : 15, color: ti === ui ? INK : LINK, fontWeight: won ? 800 : 600, lineHeight: 1.15 }}>{narrow ? TEAMS[ti]?.ab : TEAMS[ti]?.name}</span></span>;
    return (<Row key={key} onClick={onClick} style={{ gap: narrow ? 6 : 10, background: mine ? "#fff9c4" : undefined }}>
      {side(g.a, aw)}
      <span style={{ ...NUM, fontSize: narrow ? 17 : 19, width: 34, textAlign: "right", color: done && !aw ? "#888" : INK }}>{done ? g.as : ""}</span>
      <span style={{ ...PH, fontSize: 13, color: "#999", width: 22, textAlign: "center" }}>{done ? "-" : "at"}</span>
      <span style={{ ...NUM, fontSize: narrow ? 17 : 19, width: 34, color: done && !hw ? "#888" : INK }}>{done ? g.hs : ""}</span>
      {side(g.h, hw, true)}
    </Row>);
  };

  // ---- Playoffs: where you'd be if the season ended today, the seeds, and the playoff tree (the real
  // one once the playoffs start), the Super Bowl in 8-bit at its heart ----
  const playoffsTab = () => {
    const live = !!pb && sp !== "regular" && sp !== "preseason"; // the real bracket (and last season's, through the off-season)
    if (!live && !playedAny) return <div style={{ ...SERIF, fontSize: 17 }}>The playoff picture fills in once the season's first games are played: who'd be in if the season ended today, and the bracket they'd make.</div>;
    const B = live ? pb : makeBracket(seedsOf("AFC"), seedsOf("NFC"));
    const confOf = (id) => (B.seeds.AFC.includes(id) ? "AFC" : B.seeds.NFC.includes(id) ? "NFC" : TEAMS[id]?.c || teams[id]?.c);
    const seedNo = (id) => { const c = confOf(id), k = B.seeds[c]?.indexOf(id) ?? -1; return k >= 0 ? k + 1 : null; };
    // a round's games: played ones with their scores, the next round's matchups, later rounds empty
    const games = (rd, c) => {
      const done = (B.res || []).filter((r) => r.rd === rd && (!c || confOf(r.h) === c));
      if (done.length || B.rd !== rd || B.ch != null) return done;
      return (B.m || []).filter(([h]) => !c || confOf(h) === c).map(([h, a]) => ({ h, a }));
    };
    const nm = (id) => TEAMS[id]?.name, mineIn = [...B.seeds.AFC, ...B.seeds.NFC].includes(ui);
    // ---- the line at the top: where you stand ----
    const status = (() => {
      const me = T.name, c = ut.c;
      if (!live) {
        const k = B.seeds[c].indexOf(ui);
        if (k === 0) return { in: true, big: `#1 seed in the ${c}`, txt: `If the season ended today, the ${me} would be the ${c}'s top seed: the only bye, and home field all the way to the Super Bowl.` };
        if (k > 0) { const m = B.m.find(([h, a]) => h === ui || a === ui), opp = m && (m[0] === ui ? m[1] : m[0]), home = m && m[0] === ui;
          return { in: true, big: `#${k + 1} seed in the ${c}`, txt: `If the season ended today, the ${me} would be the ${c}'s #${k + 1} seed (${k < 4 ? "a division champion" : "a wild card"}): a Wild Card game ${home ? "at home against" : "at"} the #${seedNo(opp)} ${nm(opp)}.` }; }
        const s7 = teams[B.seeds[c][6]], gb = s7 ? ((s7.w || 0) - (ut.w || 0) + (ut.l || 0) - (s7.l || 0)) / 2 : 0;
        return { in: false, big: gb > 0 ? `${gb} game${gb === 1 ? "" : "s"} out` : "On the bubble", txt: gb > 0 ? `If the season ended today, the ${me} would miss the playoffs: ${gb} game${gb === 1 ? "" : "s"} behind the ${nm(B.seeds[c][6])}, the ${c}'s #7 seed, for the last spot.` : `The ${me} are level with the ${nm(B.seeds[c][6])} for the ${c}'s last playoff spot, but lose the tiebreak right now.` };
      }
      if (B.ch === ui) return { in: true, gold: true, big: "Super Bowl champions", txt: `The ${me} won ${yr ? sbName(sbNumber(yr)) : "the Super Bowl"}!` };
      if (!mineIn) return { in: false, big: "Missed the playoffs", txt: B.ch != null ? `The ${me} missed the playoffs. The ${nm(B.ch)} won the Super Bowl.` : `The ${me} missed the playoffs this year. Here's how the bracket is playing out.` };
      const out = (B.res || []).find((r) => (r.h === ui || r.a === ui) && r.w !== ui);
      if (out) { const opp = out.h === ui ? out.a : out.h, us = out.h === ui ? out.hs : out.as, them = out.h === ui ? out.as : out.hs;
        return { in: false, big: `Out in the ${ROUND_NAMES[out.rd]}`, txt: `The ${me}' season ended in the ${ROUND_NAMES[out.rd]}: ${them}-${us} ${out.h === ui ? "against" : "at"} the ${nm(opp)}.${B.ch != null ? ` The ${nm(B.ch)} won the Super Bowl.` : ""}` }; }
      const m = (B.m || []).find(([h, a]) => h === ui || a === ui);
      if (m) { const opp = m[0] === ui ? m[1] : m[0]; return { in: true, big: `${ROUND_NAMES[B.rd]} next`, txt: `${ROUND_NAMES[B.rd]}: the ${me} ${B.rd === 4 ? "play" : m[0] === ui ? "host" : "visit"} the ${nm(opp)}.` }; }
      return { in: true, big: "On the bye", txt: `The ${me} have the bye: they wait at home for the lowest seed left after the Wild Card round.` };
    })();
    const banner = <div style={{ display: "flex", alignItems: "center", gap: narrow ? 10 : 16, padding: narrow ? "10px 10px" : "12px 18px", marginBottom: 16, background: status.gold ? "#fff6c2" : status.in ? "#e7f6ea" : "#f3f4f6", boxShadow: `inset 0 0 0 3px ${status.gold ? "#ffb300" : status.in ? "#22a447" : "#9ca3af"}` }}>
      <Logo ab={T.ab} size={narrow ? 42 : 54} />
      <div style={{ minWidth: 0 }}>
        <div style={{ ...PH, fontSize: narrow ? 12 : 13, color: "#555", textTransform: "uppercase", letterSpacing: 0.6 }}>{live ? (B.ch != null && sp !== "playoffs" ? "Last season's playoffs" : "The playoffs") : `If the season ended today${wk ? ` (after week ${wk})` : ""}`}</div>
        <div style={{ ...CLUB, color: INK, fontSize: narrow ? 19 : 23, lineHeight: 1.15 }}>{status.big}</div>
        <div style={{ ...SERIF, fontSize: narrow ? 14 : 15, marginTop: 2 }}>{status.txt}</div>
      </div>
    </div>;

    // ---- a game in the tree ----
    const card = (g, { sb = false, key } = {}) => {
      const wrap = { background: "#fff", border: `${sb ? 3 : 2}px solid ${sb ? "#ffb300" : "#111"}`, boxShadow: sb ? "4px 4px 0 #8a5a00" : "3px 3px 0 #0a1f6b" };
      if (!g) return <div key={key} style={{ ...wrap, border: "2px dashed #9ca3af", boxShadow: "none", background: "#f6f6f1", ...PH, fontSize: 13, color: "#888", textAlign: "center", padding: narrow ? "16px 4px" : "17px 4px" }}>TBD</div>;
      const played = g.hs != null && g.as != null, open = played && (g.boxH || g.boxA);
      const row = (id, pts) => { const won = played && g.w === id, lost = played && g.w !== id, me = id === ui;
        return <div style={{ display: "flex", alignItems: "center", gap: narrow ? 4 : 5, padding: narrow ? "4px 5px" : "5px 6px", background: me ? "#fff9c4" : undefined, opacity: lost ? 0.55 : 1 }}>
          <span style={{ ...NUM, fontSize: 11, color: "#888", width: 9, textAlign: "right", flexShrink: 0 }}>{seedNo(id) || ""}</span>
          <Logo ab={TEAMS[id]?.ab} size={narrow ? 20 : 22} />
          <span style={{ ...CLUB, flex: 1, minWidth: 0, fontSize: narrow ? 13.5 : 14.5, color: me ? INK : LINK, fontWeight: won ? 800 : 700, whiteSpace: "nowrap" }}>{TEAMS[id]?.ab}</span>
          {played && <span style={{ ...NUM, fontSize: narrow ? 15 : 16, color: won ? INK : "#888", minWidth: 20, textAlign: "right", flexShrink: 0, marginLeft: 3 }}>{pts}</span>}
        </div>; };
      return <div key={key} className={open ? "ez-click" : undefined} onClick={open ? () => setGameBox({ ...g, wk: ROUND_NAMES[g.rd || 4] }) : undefined} title={open ? "Box score" : undefined} style={wrap}>
        {row(g.a, g.as)}<div style={{ height: 2, background: "#e4e4dc" }} />{row(g.h, g.hs)}
      </div>;
    };
    const bye = (c) => { const id = B.seeds[c][0], me = id === ui; return <div style={{ display: "flex", alignItems: "center", gap: narrow ? 4 : 6, padding: narrow ? "5px 5px" : "6px 7px", background: me ? "#fff9c4" : "#f6f6f1", border: "2px solid #111", boxShadow: "3px 3px 0 #0a1f6b" }}>
      {!narrow && <span style={{ ...NUM, fontSize: 11, color: "#888", width: 11, textAlign: "right" }}>1</span>}<Logo ab={TEAMS[id]?.ab} size={narrow ? 20 : 24} />
      <span style={{ ...CLUB, flex: 1, minWidth: 0, fontSize: narrow ? 13.5 : 15, color: me ? INK : LINK, whiteSpace: "nowrap" }}>{TEAMS[id]?.ab}</span>
      <span style={{ ...PH, fontSize: 10, color: "#7a5600", background: "#ffe08a", padding: "1px 3px", flexShrink: 0 }}>BYE</span></div>; };
    // ---- the tree: a column per round, joined by lines; AFC feeds right, NFC feeds left ----
    const GAP = narrow ? 12 : 16, LINE = "#111", SLOT = narrow ? 96 : 104;
    const colHead = (txt) => <div style={{ ...PH, fontSize: narrow ? 11.5 : 13, color: "#555", textAlign: "center", textTransform: "uppercase", letterSpacing: 0.5, height: 22, whiteSpace: "nowrap" }}>{txt}</div>;
    const column = (title, slots, feeds, { into = false, out = true } = {}) => {
      const toward = feeds === "right" ? "right" : "left", from = feeds === "right" ? "left" : "right";
      return <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
        {colHead(title)}
        <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column" }}>
          {out && slots.length > 1 && <div aria-hidden style={{ position: "absolute", [toward]: -GAP / 2 - 1.5, top: `${50 / slots.length}%`, bottom: `${50 / slots.length}%`, width: 3, background: LINE }} />}
          {slots.map((x, i) => <div key={i} style={{ flex: 1, minHeight: SLOT, position: "relative", display: "flex", alignItems: "center" }}>
            {out && <div aria-hidden style={{ position: "absolute", top: "50%", marginTop: -1.5, [toward]: -GAP / 2, width: GAP / 2, height: 3, background: LINE }} />}
            {into && <div aria-hidden style={{ position: "absolute", top: "50%", marginTop: -1.5, [from]: -GAP / 2, width: GAP / 2, height: 3, background: LINE }} />}
            <div style={{ position: "relative", width: "100%" }}>{x}</div>
          </div>)}
        </div>
      </div>;
    };
    const confRounds = (c, feeds) => {
      const wc = games(1, c), dv = games(2, c), cf = games(3, c);
      const cols = [
        column("Wild card", [bye(c), card(wc[0]), card(wc[1]), card(wc[2])], feeds),
        column("Divisional", [card(dv[0]), card(dv[1])], feeds, { into: true }),
        column("Conference", [card(cf[0])], feeds, { into: true, out: !narrow }),
      ];
      return feeds === "right" ? cols : cols.reverse();
    };
    const sbGame = games(4)[0];
    const confTitle = (c) => <div style={{ ...CLUB, color: INK, fontSize: narrow ? 17 : 20, textAlign: "center", borderBottom: "3px solid #111", paddingBottom: 4, marginBottom: 8 }}>{c}</div>;
    const tree = narrow ? (<>
      {/* phone: the Super Bowl up top, then one conference's three rounds at a time (yours first) */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <PixelSB yr={yr} scale={2} />
        <div style={{ width: "min(230px, 100%)" }}>{card(sbGame, { sb: true })}</div>
      </div>
      <Chips items={[["AFC", "AFC"], ["NFC", "NFC"]]} on={sub.conf} set={(v) => setS("conf", v)} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", columnGap: GAP }}>{confRounds(sub.conf, "right")}</div>
    </>) : (<div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr)) minmax(184px,1.15fr) repeat(3,minmax(0,1fr))", columnGap: GAP }}>
        <div style={{ gridColumn: "1 / 4" }}>{confTitle("AFC")}</div><div /><div style={{ gridColumn: "5 / 8" }}>{confTitle("NFC")}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr)) minmax(184px,1.15fr) repeat(3,minmax(0,1fr))", columnGap: GAP, alignItems: "stretch" }}>
        {confRounds("AFC", "right")}
        {/* the Super Bowl: the 8-bit Lombardi over the game, the game level with the conference finals */}
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
          {colHead("")}
          <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center" }}>
            <div aria-hidden style={{ position: "absolute", top: "50%", marginTop: -1.5, left: -GAP / 2, width: GAP / 2, height: 3, background: LINE }} />
            <div aria-hidden style={{ position: "absolute", top: "50%", marginTop: -1.5, right: -GAP / 2, width: GAP / 2, height: 3, background: LINE }} />
            <div style={{ position: "relative", width: "100%" }}>
              <div style={{ position: "absolute", bottom: "100%", left: 0, right: 0, display: "flex", justifyContent: "center", paddingBottom: 12 }}><PixelSB yr={yr} scale={2.5} /></div>
              {card(sbGame, { sb: true })}
            </div>
          </div>
        </div>
        {confRounds("NFC", "left")}
      </div>
    </div>);

    // ---- the seeds, and who's chasing the last spot ----
    const seedLine = (i, label, tag, extra) => <Row key={i} style={{ gap: narrow ? 8 : 10, padding: "5px 4px", background: i === ui ? "#fff9c4" : undefined }}>
      <span style={{ ...NUM, fontSize: 14, width: 32, textAlign: "center", background: label ? (label === "#1" ? "#ffb300" : "#ffd166") : "#e8ecf5", padding: "3px 0", flexShrink: 0 }}>{label || "-"}</span>
      <Logo ab={TEAMS[i]?.ab} size={narrow ? 26 : 28} />
      <span style={{ flex: 1, minWidth: 0 }}><Name size={15} me={i === ui}>{narrow ? TEAMS[i]?.name : `${TEAMS[i]?.city} ${TEAMS[i]?.name}`}</Name></span>
      {tag && <span style={{ ...PH, fontSize: 11, padding: "2px 5px", flexShrink: 0, background: tag === "BYE" ? "#ffe08a" : tag === "DIV" ? "#d6e4ff" : "#ece3ff", color: tag === "BYE" ? "#7a5600" : tag === "DIV" ? "#1a3fc4" : "#5b21b6" }}>{tag}</span>}
      {extra && <span style={{ ...SERIF, fontSize: 13, color: "#555", flexShrink: 0 }}>{extra}</span>}
      <span style={{ ...NUM, fontSize: 15, minWidth: 46, textAlign: "right", flexShrink: 0, whiteSpace: "nowrap" }}>{rec(teams[i])}</span>
    </Row>;
    const seedsBlock = (c) => {
      const sd = B.seeds[c], s7 = teams[sd[6]], gb = (t) => ((s7.w || 0) - (t.w || 0) + (t.l || 0) - (s7.l || 0)) / 2;
      const hunt = live ? [] : teams.map((t, i) => ({ t, i })).filter((x) => x.t.c === c && !sd.includes(x.i)).sort((a, b) => pct(b.t) - pct(a.t)).slice(0, 4);
      return <div style={{ minWidth: 0 }}>
        <div style={{ marginBottom: 4, fontSize: 16 }}><Mark>{c} seeds</Mark></div>
        {sd.map((i, k) => seedLine(i, `#${k + 1}`, k === 0 ? "BYE" : k < 4 ? "DIV" : "WC"))}
        {hunt.length > 0 && <><div style={{ margin: "12px 0 4px", fontSize: 16 }}><Mark>In the hunt</Mark></div>{hunt.map((x) => seedLine(x.i, null, null, gb(x.t) > 0 ? `${gb(x.t)} back` : "tied"))}</>}
      </div>;
    };
    return (<>
      {banner}
      <div style={{ ...SERIF, fontSize: 14, color: "#555", marginBottom: 10 }}>{live ? "Tap a played game for its box score." : "The bracket these seeds would make. Seeds 1-4 win their divisions, 5-7 are wild cards; only the #1 seed gets a bye, and the bracket is reseeded after the Wild Card round."}</div>
      {tree}
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "minmax(0,1fr)" : "minmax(0,1fr) minmax(0,1fr)", gap: narrow ? 16 : 30, marginTop: 24, alignItems: "start" }}>
        {narrow ? seedsBlock(sub.conf) : <>{seedsBlock("AFC")}{seedsBlock("NFC")}</>}
      </div>
    </>);
  };

  // ---- League > Scores: every game, a week at a time ----
  const scoresView = () => {
    const weeks = [...new Set((sched || []).filter((g) => g.played && !/^P/.test(String(g.wk))).map((g) => +g.wk))].sort((a, b) => a - b);
    if (!weeks.length) return <div style={{ ...SERIF, fontSize: 17 }}>Scores show up here once the season's first games are played.</div>;
    const cur = weeks.includes(sub.scoreWk) ? sub.scoreWk : weeks[weeks.length - 1], at = weeks.indexOf(cur);
    const games = (sched || []).filter((g) => +g.wk === cur && g.played);
    const nav = (lbl, to) => <button className="ez-btn" disabled={to == null} onClick={() => setS("scoreWk", to)} style={{ fontSize: 14, padding: "6px 14px", background: "#e8ecf5", color: INK, boxShadow: "0 3px 0 #c5ccdc", opacity: to == null ? 0.4 : 1 }}>{lbl}</button>;
    return (<>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>{nav("◀ Earlier", at > 0 ? weeks[at - 1] : null)}<span style={{ ...PH, fontSize: 18, flex: 1, textAlign: "center" }}>Week {cur}</span>{nav("Later ▶", at < weeks.length - 1 ? weeks[at + 1] : null)}</div>
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "minmax(0,1fr)" : "minmax(0,1fr) minmax(0,1fr)", columnGap: 30 }}>
        {games.map((g, i) => scoreRow(g, i, g.boxH || g.boxA ? () => setGameBox(g) : undefined))}
      </div>
      <div style={{ ...SERIF, fontSize: 14, color: "#555", marginTop: 10 }}>Tap a game for its box score.</div>
    </>);
  };

  // ---- League > History: every champion and MVP ----
  const leagueHistoryView = () => {
    const list = [...(champs || [])].sort((a, b) => b.yr - a.yr);
    if (!list.length) return <div style={{ ...SERIF, fontSize: 17 }}>The first champion of your league is crowned at this season's Super Bowl.</div>;
    return (<>
      <div style={{ display: "flex", ...PH, fontSize: 12, color: "#666", padding: "0 6px 4px", gap: 12 }}><span style={{ width: 44 }}>Year</span><span style={{ flex: 1 }}>Champion</span>{!narrow && <span style={{ flex: 1 }}>MVP</span>}</div>
      {list.map((c) => { const mvp = (awards || []).find((a) => a.yr === c.yr)?.mvp; return (
        <Row key={c.yr} style={{ gap: 12, background: c.ti === ui ? "#fff9c4" : undefined, alignItems: "flex-start" }}>
          <span style={{ ...NUM, fontSize: 16, width: 44 }}>{c.yr}</span>
          <span style={{ flex: 1, minWidth: 0, display: "flex", gap: 10, alignItems: "center" }}><Logo ab={TEAMS[c.ti]?.ab} size={30} /><span style={{ minWidth: 0 }}><Name size={15} me={c.ti === ui}>{c.t}</Name>{c.score && <span style={{ ...SERIF, fontSize: 13, color: "#666" }}>beat the {TEAMS[c.opp]?.name || "opponent"} {c.score}</span>}{narrow && mvp && <span style={{ ...SERIF, fontSize: 13, color: "#666", display: "block" }}>MVP: {mvp.name}, {mvp.team}</span>}</span></span>
          {!narrow && <span style={{ flex: 1, minWidth: 0 }}>{mvp ? <><Name size={15} me={mvp.ti === ui}>{mvp.name}</Name><span style={{ ...SERIF, fontSize: 13, color: "#666" }}>{mvp.pos}, {mvp.team}</span></> : <span style={{ ...SERIF, color: "#999" }}>-</span>}</span>}
        </Row>); })}
    </>);
  };
  // ---- League > Power rankings: the whole league, best to worst, with the week's movement ----
  const powerView = () => {
    const list = (powerRankings || []).length ? powerRankings : [...teams.map((t, i) => ({ ab: TEAMS[i]?.ab, rank: 0, trend: "", i }))].sort((a, b) => pct(teams[b.i]) - pct(teams[a.i])).map((x, k) => ({ ...x, rank: k + 1 }));
    const byAb = new Map(TEAMS.map((t, i) => [t.ab, i]));
    return (<>
      <div style={{ ...SERIF, fontSize: 15, color: "#444", marginBottom: 8 }}>Updated every week: record first, then how good each roster is.</div>
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "minmax(0,1fr)" : "minmax(0,1fr) minmax(0,1fr)", columnGap: 30 }}>
        {list.map((x) => { const i = byAb.get(x.ab), up = x.trend === "▲", down = x.trend === "▽"; return <Row key={x.ab} style={{ gap: 10, padding: "5px 4px", background: i === ui ? "#fff9c4" : undefined }}>
          <span style={{ ...NUM, fontSize: 16, width: 28, textAlign: "right" }}>{x.rank}</span>
          <span style={{ width: 16, display: "inline-flex", justifyContent: "center" }}>{up ? <Arrow up size={12} /> : down ? <Arrow size={12} /> : <span style={{ color: "#bbb" }}>-</span>}</span>
          <Logo ab={x.ab} size={28} /><span style={{ flex: 1, minWidth: 0 }}><Name size={15} me={i === ui}>{TEAMS[i]?.city} {TEAMS[i]?.name}</Name></span>
          <span style={{ ...NUM, fontSize: 15 }}>{i != null ? rec(teams[i]) : ""}</span></Row>; })}
      </div>
    </>);
  };
  const leagueView = () => (<>
    <Chips items={[["leaders", "Leaders"], ["standings", "Standings"], ["power", "Power rankings"], ["scores", "Scores"], ["history", "History"]]} on={sub.league} set={(v) => setS("league", v)} />
    {{ leaders: leadersView, standings: standingsView, power: powerView, scores: scoresView, history: leagueHistoryView }[sub.league]()}
  </>);

  // ---- Team > Stats: your players, and where your club ranks ----
  const ranks = useMemo(() => {
    const rows = teams.map((t, i) => { const gp = Math.max(1, (t.w || 0) + (t.l || 0) + (t.t || 0)), sum = (k) => (t.roster || []).reduce((a, p) => a + (p.ss?.[k] || 0), 0);
      return { i, pts: (t.pf || 0) / gp, ptsA: (t.pa || 0) / gp, pass: sum("passYds") / gp, rush: sum("rushYds") / gp, sacks: sum("sacks"), take: sum("ints") }; });
    const rankOf = (k, low) => { const sorted = [...rows].sort((a, b) => (low ? a[k] - b[k] : b[k] - a[k])); return sorted.findIndex((r) => r.i === ui) + 1; };
    const me = rows[ui] || {};
    return [["Points a game", me.pts?.toFixed(1), rankOf("pts")], ["Points allowed a game", me.ptsA?.toFixed(1), rankOf("ptsA", true)], ["Passing yards a game", Math.round(me.pass || 0), rankOf("pass")], ["Rushing yards a game", Math.round(me.rush || 0), rankOf("rush")], ["Sacks", me.sacks || 0, rankOf("sacks")], ["Interceptions", me.take || 0, rankOf("take")]];
  }, [teams, ui]);
  const teamStatsView = () => {
    const [, key, cols] = LEAD[sub.lead];
    const list = roster.filter((p) => key(p.ss || {}) > 0).sort((a, b) => key(b.ss || {}) - key(a.ss || {})).slice(0, 15);
    return (<>
      {(ut.w || 0) + (ut.l || 0) + (ut.t || 0) > 0 && <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr 1fr" : "repeat(6, 1fr)", gap: 8, marginBottom: 16 }}>
        {ranks.map(([l, v, r]) => <div key={l} style={{ background: "#eef3ff", boxShadow: "inset 0 0 0 3px #c9d6f5", padding: "8px 10px" }}><div style={{ ...PH, fontSize: 12, color: "#555" }}>{l}</div><div style={{ ...NUM, fontSize: 22 }}>{v}</div><div style={{ ...SERIF, fontSize: 13, color: r <= 8 ? "#146b2c" : r >= 25 ? "#b42318" : "#555" }}>{ordinal(r)} of 32</div></div>)}
      </div>}
      <Chips items={Object.entries(LEAD).map(([k, v]) => [k, v[0]])} on={sub.lead} set={(v) => setS("lead", v)} />
      <Head cols={cols} lead={narrow ? 70 : 84} />
      {list.length ? list.map((p, k) => leaderRow({ p, ti: ui }, k, cols)) : <div style={{ ...SERIF, fontSize: 16, padding: 6 }}>No stats yet this season.</div>}
    </>);
  };

  // ---- Team > Contracts: what you pay, what's left, who's up ----
  const contractsView = () => {
    const payroll = roster.reduce((a, p) => a + (+p.salary || 0), 0), ending = roster.filter((p) => (p.contract || 0) <= 1).sort((a, b) => b.ovr - a.ovr), big = [...roster].sort((a, b) => (+b.salary || 0) - (+a.salary || 0)).slice(0, 10);
    const tile = (l, v) => <div style={{ background: "#eef3ff", boxShadow: "inset 0 0 0 3px #c9d6f5", padding: "8px 12px" }}><div style={{ ...PH, fontSize: 12, color: "#555" }}>{l}</div><div style={{ ...NUM, fontSize: 22 }}>{v}</div></div>;
    const money = (p) => <span style={{ ...SERIF, fontSize: 14, textAlign: "right", flexShrink: 0 }}>{p.contract || 0} yr · ${(+p.salary || 0).toFixed(1)}M</span>;
    return (<>
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr 1fr 1fr" : "repeat(3, minmax(0, 220px))", gap: 8, marginBottom: 16 }}>{tile("Payroll", `$${payroll.toFixed(1)}M`)}{tile("Cap space", `$${room.toFixed(1)}M`)}{tile("Players", roster.length)}</div>
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "minmax(0,1fr)" : "minmax(0,1fr) minmax(0,1fr)", gap: narrow ? 16 : 30, alignItems: "start" }}>
        <div><div style={{ marginBottom: 4, fontSize: 16 }}><Mark>Biggest contracts</Mark></div>{big.map((p) => playerRow(p, money(p)))}</div>
        <div><div style={{ marginBottom: 4, fontSize: 16 }}><Mark>Contracts ending this year</Mark></div>
          <div style={{ ...SERIF, fontSize: 14, color: "#555", margin: "2px 0 6px" }}>Extend a player now at his asking price (it starts next season), or decide in re-sign week, after the season.</div>
          {ending.length ? ending.map((p) => { const d = dealOf(p), ok = canExt?.(p), afford = ok && d.sal <= (extRoomFor?.(p) ?? 0); return <Row key={p.id} onClick={() => openCard(p)} style={{ gap: narrow ? 8 : 12 }}>
            <span style={{ ...PH, fontSize: 13, width: 30, color: "#555", flexShrink: 0 }}>{p.pos}</span>
            <Face p={p} size={narrow ? 34 : 36} />
            <span style={{ flex: 1, minWidth: 0 }}><Name size={narrow ? 15 : 16}>{p.name}</Name><span style={{ ...SERIF, fontSize: 13, color: "#666" }}>{p.ext ? `Extended: ${p.ext.yrs} yr, $${p.ext.apy ?? p.ext.sal}M` : `${p.ovr} · age ${p.age} · asks ${d.yrs} yr, $${d.sal}M`}</span></span>
            {!p.ext && ok && <button className="ez-btn" disabled={!afford} title={afford ? "" : "Not enough cap room next season"} onClick={(e) => { e.stopPropagation(); onExtend?.(p, d.sal, d.yrs); }} style={{ flexShrink: 0, fontSize: 13, padding: "6px 10px", background: afford ? "#22a447" : "#b9c2b9", color: "#fff", boxShadow: "0 3px 0 #146b2c" }}>Extend</button>}
          </Row>; }) : <div style={{ ...SERIF, fontSize: 16, padding: 6 }}>Nobody's contract is up this year.</div>}</div>
      </div>
    </>);
  };

  // ---- Team > History: your seasons and your trophies ----
  const franchiseView = () => {
    const full = `${T.city} ${T.name}`, titles = (champs || []).filter((c) => c.ti === ui);
    const mine = (awards || []).flatMap((a) => AWARD.filter(([k]) => a[k]?.ti === ui).map(([k, l]) => ({ yr: a.yr, l, w: a[k] }))).sort((a, b) => b.yr - a.yr);
    const seasons = [...(seasonHistory || [])].sort((a, b) => b.yr - a.yr);
    const tile = (l, v) => <div style={{ background: "#eef3ff", boxShadow: "inset 0 0 0 3px #c9d6f5", padding: "8px 12px" }}><div style={{ ...PH, fontSize: 12, color: "#555" }}>{l}</div><div style={{ ...NUM, fontSize: 22 }}>{v}</div></div>;
    const wins = seasons.reduce((a, h) => a + (h.w || 0), 0) + (ut.w || 0), losses = seasons.reduce((a, h) => a + (h.l || 0), 0) + (ut.l || 0);
    return (<>
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr 1fr 1fr" : "repeat(3, minmax(0, 220px))", gap: 8, marginBottom: 16 }}>{tile("Seasons", seasons.length + 1)}{tile("Record", `${wins}-${losses}`)}{tile("Super Bowls", titles.length)}</div>
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "minmax(0,1fr)" : "minmax(0,1fr) minmax(0,1fr)", gap: narrow ? 16 : 30, alignItems: "start" }}>
        <div><div style={{ marginBottom: 4, fontSize: 16 }}><Mark>Season by season</Mark></div>
          <Row style={{ gap: 12 }}><span style={{ ...NUM, fontSize: 16, width: 44 }}>{yr}</span><span style={{ ...NUM, fontSize: 16, width: 56 }}>{rec(ut)}</span><span style={{ ...SERIF, fontSize: 14, color: "#555", flex: 1 }}>{phaseLabel || "This season"}</span></Row>
          {seasons.map((h) => { const won = h.champion === full; return <Row key={h.yr} style={{ gap: 12, background: won ? "#fff6c2" : undefined }}><span style={{ ...NUM, fontSize: 16, width: 44 }}>{h.yr}</span><span style={{ ...NUM, fontSize: 16, width: 56 }}>{h.w}-{h.l}</span><span style={{ ...SERIF, fontSize: 14, flex: 1 }}>{won ? <b>Won the Super Bowl</b> : h.div ? "Division champions" : ""}</span></Row>; })}
        </div>
        <div><div style={{ marginBottom: 4, fontSize: 16 }}><Mark>Your award winners</Mark></div>
          {mine.length ? mine.map((m, i) => <div key={i} style={{ ...SERIF, fontSize: 15, padding: "6px 4px", borderBottom: "2px solid #e4e4dc" }}><b>{m.yr}</b> {m.l}: {m.w.name}</div>) : <div style={{ ...SERIF, fontSize: 16, padding: 6 }}>None yet. Awards are handed out when each regular season ends.</div>}
          {titles.length > 0 && <><div style={{ margin: "16px 0 4px", fontSize: 16 }}><Mark>Super Bowl wins</Mark></div>{titles.map((c) => <div key={c.yr} style={{ ...SERIF, fontSize: 15, padding: "6px 4px", borderBottom: "2px solid #e4e4dc" }}><b>{c.yr}</b>{c.score ? ` beat the ${TEAMS[c.opp]?.name || "opponent"} ${c.score}` : ""}</div>)}</>}
        </div>
      </div>
    </>);
  };
  // ---- Team > Development: the one player on each side who gets extra coaching every week ----
  const devView = () => {
    const sides = [["off", "Offense", DEV_OFF], ["def", "Defense", DEV_DEF]];
    const gain = (p) => `+${perSeason(p).toFixed(1)} a season`;
    return (<div style={{ display: "grid", gridTemplateColumns: narrow ? "minmax(0,1fr)" : "minmax(0,1.1fr) minmax(0,1fr)", gap: narrow ? 16 : 30, alignItems: "start" }}>
      <div>
        <div style={{ ...SERIF, fontSize: 16, lineHeight: 1.5, marginBottom: 10 }}><Mark>Development focus:</Mark> one player on each side of the ball gets extra coaching every week, and the young ones with high potential grow fastest. The staff pick for you unless you choose.</div>
        {sides.map(([k, label]) => { const p = roster.find((x) => String(x.id) === String(devFocus?.[k])), on = devPick === k; return (
          <Row key={k} onClick={() => setDevPick(on ? null : k)} style={{ gap: 12, background: on ? "#fff6c2" : undefined }}>
            <span style={{ ...NUM, fontSize: 15, width: 70, color: "#1d4ed8" }}>{label}</span>
            {p ? <><Face p={p} size={38} /><span style={{ flex: 1, minWidth: 0 }}><Name size={16}>{p.name}</Name><span style={{ ...SERIF, fontSize: 13, color: "#666" }}>{p.pos}, age {p.age} · {p.ovr} now · {gain(p)}</span></span></> : <span style={{ ...SERIF, flex: 1, color: "#888" }}>Nobody</span>}
            <span style={{ ...PH, fontSize: 13, color: "#1d4ed8", width: 54, textAlign: "right" }}>{on ? "Close" : "Change"}</span>
          </Row>); })}
      </div>
      <div>{devPick ? (() => { const pos = sides.find((x) => x[0] === devPick)[2], list = roster.filter((p) => pos.includes(p.pos) && p.ovr < 99).sort((a, b) => perSeason(b) - perSeason(a)).slice(0, 15); return <>
        <div style={{ marginBottom: 6, fontSize: 16 }}><Mark>Who grows the most</Mark></div>
        {list.map((p) => playerRow(p, <><span style={{ ...SERIF, fontSize: 13, width: narrow ? 64 : 90, textAlign: "right" }}>{gain(p)}</span><Stars v={p.pot} size={narrow ? 11 : 13} color="#1d4ed8" /></>, () => { onDevFocus?.(devPick, p.id); setDevPick(null); }))}</>; })()
        : <div style={{ ...SERIF, fontSize: 16, lineHeight: 1.55, color: "#333" }}>Tap a side to choose who gets the extra coaching. The list shows how much each player is likely to gain over a season with it.</div>}</div>
    </div>);
  };
  // ---- Team > Staff: your coaches ----
  const staffView = () => {
    const c = ut.coach || {}, roles = [["hc", "Head coach"], ["oc", "Offensive coordinator"], ["dc", "Defensive coordinator"], ["st", "Special teams coordinator"]];
    return (<div>
      <div style={{ ...SERIF, fontSize: 16, lineHeight: 1.5, marginBottom: 10 }}><Mark>Your coaching staff:</Mark> the better they are, the better your players play and grow. In Easy Mode the front office hires them for you.</div>
      {roles.map(([k, label]) => { const x = c[k]; return x ? <Row key={k} style={{ gap: 12 }}>
        <span style={{ flex: 1, minWidth: 0 }}><span style={{ ...PH, fontSize: 13, color: "#555", display: "block" }}>{label}</span><Name size={17}>{x.name}</Name><span style={{ ...SERIF, fontSize: 13, color: "#666" }}>{[x.scheme, x.trait, x.age ? `age ${x.age}` : null].filter(Boolean).join(" · ")}</span></span>
        <span style={{ textAlign: "right" }}><Stars v={x.rating} size={narrow ? 13 : 16} /><span style={{ ...NUM, fontSize: 15, display: "block" }}>{x.rating}</span></span>
      </Row> : null; })}
    </div>);
  };
  const teamView = () => (<>
    <Chips items={[["roster", "Roster"], ["lineup", "Lineup"], ["stats", "Stats"], ["dev", "Development"], ["money", "Contracts"], ["staff", "Staff"], ["history", "History"]]} on={sub.team} set={(v) => { setS("team", v); setSlot(null); setDevPick(null); }} />
    {{ roster: rosterView, lineup: lineupView, stats: teamStatsView, dev: devView, money: contractsView, staff: staffView, history: franchiseView }[sub.team]()}
  </>);

  // ---- Moves > Trade block: shop a player, answer the offers ----
  const tradeBlockView = () => {
    if (!shop) return null;
    if (!shop.open) return (<div style={{ ...SERIF, fontSize: 17, lineHeight: 1.5 }}>
      {trades ? "It's trade deadline day: the offers are on the Home page." : sp === "regular" ? `The trade deadline (week ${shop.deadlineWk}) has passed. Trades open again after the season, in re-sign week.` : sp === "playoffs" ? "No trades during the playoffs. They open again in re-sign week." : "Trades are closed right now. They open in re-sign week, free agency, the preseason and the regular season up to the trade deadline."}
    </div>);
    if (shop.cur) return (<div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 10 }}><Mark>Offers for {shop.cur.name}</Mark><button className="ez-btn" onClick={shop.clear} style={{ fontSize: 14, padding: "6px 12px", background: "#e8ecf5", color: INK, boxShadow: "0 3px 0 #c5ccdc" }}>Shop someone else</button></div>
      {shop.cur.list.length ? shop.cur.list.map((o) => offerCard(o, shop.yes, shop.no)) : <div style={{ ...SERIF, fontSize: 16, padding: "6px 2px" }}>No club made an offer for him. Try someone else.</div>}
    </div>);
    const ps = [...roster].sort((a, b) => b.ovr - a.ovr);
    return (<div>
      <div style={{ ...SERIF, fontSize: 16, lineHeight: 1.5, marginBottom: 10 }}><Mark>Trade block:</Mark> pick a player to shop. Up to three clubs that need him will make an offer (a player, draft picks or both), and you say yes or no.</div>
      {ps.map((p) => playerRow(p, <><span style={{ ...NUM, fontSize: 16, width: 30, textAlign: "right" }}>{p.ovr}</span>{!narrow && <span style={{ ...SERIF, fontSize: 14, width: 110, textAlign: "right" }}>${(+p.salary || 0).toFixed(1)}M</span>}<button className="ez-btn" onClick={(e) => { e.stopPropagation(); shop.shop(p); }} style={{ fontSize: 13, padding: "6px 12px", background: "#ffb300", color: "#1a1000", boxShadow: "0 3px 0 #8a5a00" }}>Shop</button></>))}
    </div>);
  };

  // ---- Moves > Free agents: sign anyone at his asking price ----
  const faDeal = (p) => { const yrs = Math.max(1, Math.min(maxYears(p), p.age <= 27 ? 3 : p.age <= 31 ? 2 : 1)); return { yrs, sal: yearlyAsk(p, yrs, "fa") }; };
  const faView = () => {
    const f = sub.fa, list = (fa || []).filter((p) => f === "All" || grp(p.pos) === f).sort((a, b) => b.ovr - a.ovr).slice(0, 40), full = sp === "regular" && roster.length >= 53;
    const note = !faOpen ? (sp === "resign" ? "Free agency opens after re-sign week. Here's who's out there so far." : "Free agency is closed until the off-season.") : full ? "Your roster is full (53 players): signing someone releases your lowest-rated player at his position (shown on each row)." : "Sign anyone you like at his asking price, if you have the cap space. The staff fill the rest of the roster.";
    return (<div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 8 }}><Mark>Free agents</Mark><span style={{ ...SERIF, fontSize: 15 }}>Cap space: <b style={NUM}>${room.toFixed(1)}M</b></span></div>
      <div style={{ ...SERIF, fontSize: 15, color: "#444", marginBottom: 10 }}>{note}</div>
      <Chips items={["All", "QB", "RB", "WR", "TE", "OL", "DL", "LB", "CB", "S", "K", "P"].map((k) => [k, k])} on={f} set={(v) => setS("fa", v)} />
      {list.length ? list.map((p) => {
        const d = faDeal(p), cut = full ? roster.filter((x) => grp(x.pos) === grp(p.pos) && x.ovr < p.ovr).sort((a, b) => a.ovr - b.ovr)[0] : null;
        const can = faOpen && (!full || cut) && d.sal <= room + (cut ? +cut.salary || 0 : 0);
        return <Row key={p.id} onClick={() => openCard(p, -1)} style={{ gap: narrow ? 8 : 12 }}>
          <span style={{ ...PH, fontSize: 13, width: 30, color: "#555", flexShrink: 0 }}>{p.pos}</span>
          <Face p={p} size={narrow ? 34 : 36} ti={-1} />
          <span style={{ flex: 1, minWidth: 0 }}><Name size={narrow ? 15 : 16}>{p.name}</Name><span style={{ ...SERIF, fontSize: 13, color: "#666" }}>age {p.age} · {d.yrs} yr, ${d.sal}M{cut ? ` · cuts ${cut.name} (${cut.ovr})` : ""}</span></span>
          <span style={{ ...NUM, fontSize: 16, width: 30, textAlign: "right", flexShrink: 0 }}>{p.ovr}</span>
          <button className="ez-btn" disabled={!can} title={can ? "" : !faOpen ? "Free agency is closed" : full && !cut ? "Roster full: nobody at his position rated below him" : "Not enough cap space"} onClick={(e) => { e.stopPropagation(); onSignFA?.(p, d.sal, d.yrs, cut?.id); }} style={{ flexShrink: 0, fontSize: 13, padding: "6px 12px", background: can ? "#22a447" : "#b9c2b9", color: "#fff", boxShadow: "0 3px 0 #146b2c" }}>Sign</button>
        </Row>; }) : <div style={{ ...SERIF, fontSize: 16, padding: 6 }}>Nobody available{f !== "All" ? ` at ${f}` : ""}.</div>}
    </div>);
  };

  // ---- Moves > Draft: the class before draft day, the picks on it ----
  const draftBoardView = () => {
    if (sp === "draft") return draftPanel();
    const f = sub.board, cls = (draft?.cls || []).filter((b) => f === "All" || grp(b.pos) === f).sort((a, b) => (b.pot * 0.6 + b.ovr * 0.4) - (a.pot * 0.6 + a.ovr * 0.4)).slice(0, 40);
    return (<div>
      <div style={{ ...SERIF, fontSize: 16, lineHeight: 1.5, marginBottom: 10 }}><Mark>The {yr} draft class:</Mark> the best prospects, as your scouts see them. On draft day you make your picks in the first three rounds; the staff take the rest.</div>
      <Chips items={["All", "QB", "RB", "WR", "TE", "OL", "DL", "LB", "CB", "S"].map((k) => [k, k])} on={f} set={(v) => setS("board", v)} />
      <div style={{ display: "flex", ...PH, fontSize: 12, color: "#666", padding: "0 10px 4px", gap: 12 }}><span style={{ width: 36 }}>Pos</span><span style={{ flex: 1 }}>Prospect</span><span style={{ width: narrow ? 70 : 84 }}>Now</span><span style={{ width: narrow ? 70 : 84 }}>Potential</span></div>
      {cls.length ? cls.map((b) => <Row key={b.id} style={{ gap: 12 }}>
        <span style={{ ...PH, fontSize: 13, width: 36, color: "#555" }}>{b.pos}</span>
        <span style={{ flex: 1, minWidth: 0 }}><Name size={15}>{b.name}</Name><span style={{ ...SERIF, fontSize: 13, color: "#666" }}>{b.college || b.school || ""}{b.age ? `${b.college || b.school ? ", " : ""}age ${b.age}` : ""}</span></span>
        <span style={{ width: narrow ? 70 : 84 }}><Stars v={b.ovr} size={narrow ? 12 : 15} /></span>
        <span style={{ width: narrow ? 70 : 84 }}><Stars v={b.pot} size={narrow ? 12 : 15} color="#1d4ed8" /></span>
      </Row>) : <div style={{ ...SERIF, fontSize: 16, padding: 6 }}>The scouts are still putting this class together.</div>}
    </div>);
  };
  const movesView = () => (<>
    <Chips items={[["trade", "Trade block"], ["fa", "Free agents"], ["draft", "Draft"]]} on={sub.moves} set={(v) => setS("moves", v)} />
    {{ trade: tradeBlockView, fa: faView, draft: draftBoardView }[sub.moves]()}
  </>);

  const views = { home, team: teamView, schedule: () => schedule(), league: leagueView, playoffs: playoffsTab, moves: movesView };
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
          {tabs.map(([k, l], i) => { const on = view === k, dot = k === "moves" && (sp === "freeagency" || myCall || (shop?.cur?.list?.length > 0)); return <button key={k} onClick={() => { setView(k); setCard(null); if (k === "moves") setS("moves", sp === "draft" ? "draft" : sp === "freeagency" ? "fa" : sub.moves); }} aria-current={on ? "page" : undefined} style={{ flex: narrow ? "1 1 auto" : "0 0 auto", minWidth: 0, whiteSpace: "nowrap", cursor: "pointer", fontFamily: SANS, fontWeight: 800, fontSize: narrow ? 13 : 18, color: INK, padding: narrow ? "9px 3px 7px" : "10px 22px 8px", background: on ? "#fbfbf8" : "linear-gradient(180deg,#6fa0cf,#4a7fb0)", border: "3px solid #111", borderBottom: on ? "3px solid #fbfbf8" : "3px solid #111", marginLeft: i ? -3 : 0, marginBottom: -3, position: "relative", zIndex: on ? 2 : 1, boxShadow: on ? "none" : "inset 0 2px 0 #ffffff55, inset 0 -3px 0 #0000002a" }}>{l}{dot && <span aria-label="needs you" style={{ display: "inline-block", width: 9, height: 9, background: "#ffb300", boxShadow: "0 0 0 2px #111", marginLeft: 6, verticalAlign: "middle" }} />}</button>; })}
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
      {gameBox && <div onClick={() => setGameBox(null)} style={{ position: "absolute", inset: 0, zIndex: 10, background: "#0a1f6bb3", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: "min(980px, 100%)", maxHeight: "100%", overflowY: "auto", background: "#fbfbf8", border: "4px solid #111", boxShadow: "8px 8px 0 #0a1f6b", padding: narrow ? 12 : 20 }}>
          <EasyBox home={TEAMS[gameBox.h]} away={TEAMS[gameBox.a]} hs={gameBox.hs} as={gameBox.as} boxH={gameBox.boxH} boxA={gameBox.boxA} title={`Week ${gameBox.wk} box score`} />
          <div style={{ marginTop: 14, textAlign: "right" }}><Btn kind="blue" onClick={() => setGameBox(null)}>Close</Btn></div>
        </div>
      </div>}
    </div>
  );
}

// The live game in Easy Mode: the field as the hero, a broadcast-table score bug above it (gold
// cells, each club's logo on its colour), and the plays on a white page beside it.
const clockOf = (s) => `${Math.floor((s || 0) / 60)}:${String((s || 0) % 60).padStart(2, "0")}`;
const ORD = ["", "1st", "2nd", "3rd", "4th"];
export function EasyLive({ TEAMS, ui, live, log, field, paused, onPause, speed, onSpeed, onFinish, onBack, onDone, callMode = "watch", onCallMode, onSimQuarter, box = null, fullLog = null }) {
  const [tab, setTab] = useState("plays"), [boxOpen, setBoxOpen] = useState(false);
  const narrow = MOBILE, INK = "#151515";
  const H2 = { h: TEAMS[live.h], a: TEAMS[live.a] };
  const off = H2[live.poss], def = H2[live.poss === "h" ? "a" : "h"];
  const spot = live.yard == null ? "" : live.yard === 50 ? "the 50" : live.yard > 50 ? `${def?.ab} ${100 - live.yard}` : `${off?.ab} ${live.yard}`;
  const cell = { display: "flex", alignItems: "center", justifyContent: "center" };
  const tile = (t) => <div style={{ ...cell, background: t?.clr || "#222", width: narrow ? 52 : 74 }}><PixelLogo ab={t?.ab} size={narrow ? 34 : 50} style={{ filter: "drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff) drop-shadow(0 2px 0 #fff) drop-shadow(0 -2px 0 #fff)" }} /></div>;
  const score = (side) => <div style={{ ...cell, flex: 1, gap: narrow ? 8 : 14, background: "#fbfbf8", padding: "0 10px", flexDirection: side === "a" ? "row-reverse" : "row", justifyContent: "space-between" }}>
    <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: narrow ? 17 : 24, color: INK }}>{H2[side]?.ab}{!live.done && live.poss === side && <span style={{ color: "#e6a100" }}> ●</span>}</span>
    <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: narrow ? 30 : 44, color: INK, fontVariantNumeric: "tabular-nums" }}>{side === "h" ? live.hs : live.as}</span></div>;
  const plays = [...(fullLog || log || [])].reverse();
  const scoring = plays.filter((e) => /^(td|fg|safety)$/i.test(e.type || "") || /touchdown|field goal is good|safety/i.test(e.text || ""));
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
          <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 10, ...(narrow ? {} : { overflowY: "auto", minHeight: 0 }) }}>
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
                {/* watch it, or call and play your own snaps on the field */}
                <div style={{ display: "flex", border: "3px solid #111", background: "#0b2a8f" }}>{[["watch", "Watch"], ["snaps", "Play your snaps"], ["moments", "Play the moments"]].map(([k, l]) => <button key={k} className="ez-btn" onClick={() => onCallMode?.(k)} aria-pressed={callMode === k} style={{ fontSize: narrow ? 14 : 15, padding: narrow ? "8px 10px" : "9px 14px", background: callMode === k ? "#ffb300" : "transparent", color: callMode === k ? "#1a1000" : "#dbe6ff" }}>{l}</button>)}</div>
                {B(paused ? "Resume" : "Pause", onPause, "gold")}
                {B(`Speed: ${speed}`, () => onSpeed(speeds[(speeds.indexOf(speed) + 1) % speeds.length] || "Normal"), "blue")}
                {live.q < 4 && onSimQuarter && B(`Sim to end of Q${live.q}`, onSimQuarter)}
                {box && B("Box score", () => setBoxOpen(true))}
                {B("Finish game", onFinish)}
                {B("Back to home", onBack)}</>}
            </div>
            {live.done && box && <div style={{ background: "#fbfbf8", border: "3px solid #111", boxShadow: "6px 6px 0 #0a1f6b", padding: narrow ? "12px 10px" : "18px 22px" }}><EasyBox home={H2.h} away={H2.a} hs={live.hs} as={live.as} boxH={box.h} boxA={box.a} scoring={[...scoring].reverse()} title="Final box score" /></div>}
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
      {boxOpen && box && <div onClick={() => setBoxOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 10, background: "#0a1f6bb3", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: "min(980px, 100%)", maxHeight: "100%", overflowY: "auto", background: "#fbfbf8", border: "4px solid #111", boxShadow: "8px 8px 0 #0a1f6b", padding: narrow ? 12 : 20 }}>
          <EasyBox home={H2.h} away={H2.a} hs={live.hs} as={live.as} boxH={box.h} boxA={box.a} scoring={[...scoring].reverse()} />
          <div style={{ marginTop: 14, textAlign: "right" }}><Btn kind="blue" onClick={() => setBoxOpen(false)}>Close</Btn></div>
        </div>
      </div>}
    </div>
  );
}

// A big box score in the Easy look: each club's passing, rushing, receiving and defense, the
// score up top, and (from a game you watched) every scoring play.
const BOX_CATS = [
  ["Passing", (s) => s.att, (s) => s.passYds || 0, [["C/A", (s) => `${s.comp || 0}/${s.att || 0}`], ["Yds", (s) => s.passYds || 0], ["TD", (s) => s.passTD || 0], ["Int", (s) => s.passInt || 0]], 2],
  ["Rushing", (s) => s.rushAtt, (s) => s.rushYds || 0, [["Car", (s) => s.rushAtt || 0], ["Yds", (s) => s.rushYds || 0], ["TD", (s) => s.rushTD || 0]], 3],
  ["Receiving", (s) => s.rec, (s) => s.recYds || 0, [["Rec", (s) => s.rec || 0], ["Yds", (s) => s.recYds || 0], ["TD", (s) => s.recTD || 0]], 4],
  ["Defense", (s) => s.tkl || s.sacks || s.ints || s.pd, (s) => (s.tkl || 0) + (s.ast || 0) + (s.sacks || 0) * 3 + (s.ints || 0) * 5, [["Tkl", (s) => (s.tkl || 0) + (s.ast || 0)], ["Sk", (s) => s.sacks || 0], ["Int", (s) => s.ints || 0]], 4],
  ["Kicking", (s) => s.fgA || s.xpA, (s) => (s.fgM || 0) * 3, [["FG", (s) => `${s.fgM || 0}/${s.fgA || 0}`], ["XP", (s) => `${s.xpM || 0}/${s.xpA || 0}`]], 1],
];
export function EasyBox({ home, away, hs, as, boxH, boxA, scoring = null, title = "Box score" }) {
  const INK = "#151515", narrow = MOBILE;
  const Mark = ({ children }) => <span style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 700, background: "#fff23a", padding: "1px 5px" }}>{children}</span>;
  const team = (t, box, pts) => (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: BLUE, padding: 4, boxShadow: "3px 3px 0 #0a1f6b" }}>
        <span style={{ background: t?.clr || "#222", padding: "4px 6px", lineHeight: 0 }}><PixelLogo ab={t?.ab} size={narrow ? 30 : 38} style={{ filter: "drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff) drop-shadow(0 2px 0 #fff) drop-shadow(0 -2px 0 #fff)" }} /></span>
        <span style={{ ...H, fontSize: narrow ? 16 : 19, flex: 1 }}>{t?.city} {t?.name}</span>
        <span style={{ ...GOLD, fontSize: narrow ? 24 : 30, padding: "0 8px", textShadow: "2px 2px 0 #0a1f6b" }}>{pts}</span>
      </div>
      {BOX_CATS.map(([cat, has, key, cols, n]) => {
        const rows = Object.values(box || {}).filter((s) => has(s)).sort((a, b) => key(b) - key(a)).slice(0, n);
        if (!rows.length) return null;
        return (<div key={cat} style={{ marginTop: 10 }}>
          <div style={{ display: "flex", alignItems: "baseline", fontSize: 15 }}><span style={{ flex: 1 }}><Mark>{cat}</Mark></span>{cols.map(([l]) => <span key={l} style={{ width: narrow ? 40 : 52, textAlign: "right", fontFamily: SANS, fontWeight: 700, fontSize: 12, color: "#666" }}>{l}</span>)}</div>
          {rows.map((s, i) => <div key={i} style={{ display: "flex", alignItems: "center", padding: "4px 2px", borderBottom: "2px solid #e4e4dc" }}>
            <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: SANS, fontWeight: 700, fontSize: 15, color: "#1a3fc4" }}>{s.name}<span style={{ color: "#777", fontWeight: 600, fontSize: 12 }}> {s.pos}</span></span>
            {cols.map(([l, f]) => <span key={l} style={{ width: narrow ? 40 : 52, textAlign: "right", fontFamily: SANS, fontWeight: 800, fontSize: 15, color: INK, fontVariantNumeric: "tabular-nums" }}>{f(s)}</span>)}
          </div>)}
        </div>);
      })}
    </div>);
  return (
    <div>
      <div style={{ fontSize: 17, marginBottom: 10 }}><Mark>{title}</Mark></div>
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: narrow ? 18 : 28 }}>{team(away, boxA, as)}{team(home, boxH, hs)}</div>
      {scoring?.length > 0 && <div style={{ marginTop: 16 }}>
        <Mark>Scoring</Mark>
        {scoring.map((e, i) => <div key={i} style={{ padding: "6px 2px", borderBottom: "2px solid #e4e4dc", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 15, lineHeight: 1.4 }}><b style={{ fontFamily: SANS, fontSize: 12, color: "#666", marginRight: 6 }}>Q{e.qtr}</b>{e.text}</div>)}
      </div>}
    </div>);
}
