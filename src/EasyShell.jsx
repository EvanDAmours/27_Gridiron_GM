// Easy Mode: the whole franchise behind one button. Same league, same engine, same season; the staff
// make the calls (contracts, free agency, the draft, the depth chart, trades are left alone) and you
// press CONTINUE. Drawn like a 16-bit sports broadcast: royal blue, chunky pixel lettering, gold
// numbers, pixelated club logos, green and red arrows for wins and losses.
import React, { useEffect, useRef, useState } from "react";
import { logoUrl } from "./ui.jsx";
import { MOBILE } from "./mobile.js";

const BASE = import.meta.env?.BASE_URL ?? "/";
const FONTS = `
@font-face { font-family: "Silkscreen"; font-weight: 400; font-display: swap; src: url(${BASE}fonts/silkscreen-400.woff2) format("woff2"); }
@font-face { font-family: "Silkscreen"; font-weight: 700; font-display: swap; src: url(${BASE}fonts/silkscreen-700.woff2) format("woff2"); }
@font-face { font-family: "Pixelify Sans"; font-weight: 400 700; font-display: swap; src: url(${BASE}fonts/pixelify-sans.woff2) format("woff2"); }
.ez * { box-sizing: border-box; }
.ez ::-webkit-scrollbar { width: 12px; } .ez ::-webkit-scrollbar-thumb { background: #0b2a8f; border: 3px solid #1d4ed8; } .ez ::-webkit-scrollbar-track { background: transparent; }
.ez-btn { font-family: "Silkscreen", monospace; font-weight: 700; text-transform: uppercase; cursor: pointer; border: 0; transition: transform .06s, filter .1s; }
.ez-btn:hover { filter: brightness(1.12); } .ez-btn:active { transform: translateY(3px); }
.ez-row:hover { background: #ffffff10; }
@keyframes ezBlink { 50% { opacity: .35 } }
`;
const H = { fontFamily: '"Silkscreen", monospace', fontWeight: 700, textTransform: "uppercase", color: "#fff", textShadow: "3px 3px 0 #0a1f6b", letterSpacing: 1 };
const GOLD = { fontFamily: '"Silkscreen", monospace', fontWeight: 700, color: "#ffb300", textShadow: "3px 3px 0 #3a2200" };
const BODY = { fontFamily: '"Pixelify Sans", "Silkscreen", monospace', color: "#dbe6ff" };
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
const Arrow = ({ up, size = 16 }) => (
  <svg width={size} height={size * 0.7} viewBox="0 0 10 7" shapeRendering="crispEdges" aria-label={up ? "win" : "loss"} style={{ flexShrink: 0, filter: "drop-shadow(2px 2px 0 #0a1f6b)" }}>
    {up ? <path d="M5 0 L10 7 L0 7 Z" fill="#22c55e" /> : <path d="M0 0 L10 0 L5 7 Z" fill="#ef4444" />}
  </svg>
);
const Btn = ({ children, onClick, big, disabled, kind = "gold", style }) => {
  const k = { gold: ["#ffb300", "#8a5a00", "#1a1000"], blue: ["#3b6cf0", DEEP, "#fff"], dark: ["#0f2f9c", "#061a5c", "#dbe6ff"] }[kind];
  return <button className="ez-btn" onClick={onClick} disabled={disabled} style={{ background: k[0], color: k[2], boxShadow: `0 ${big ? 6 : 4}px 0 ${k[1]}, inset 0 3px 0 #ffffff40`, fontSize: big ? (MOBILE ? 18 : 22) : 13, padding: big ? (MOBILE ? "14px 18px" : "16px 26px") : "9px 14px", opacity: disabled ? 0.6 : 1, ...style }}>{children}</button>;
};

const POS_ORDER = ["QB", "RB", "FB", "WR", "TE", "LT", "LG", "C", "RG", "RT", "OL", "OT", "OG", "G", "T", "EDGE", "LE", "RE", "DE", "DT", "DL", "LB", "MLB", "OLB", "ILB", "CB", "S", "FS", "SS", "K", "P", "LS"];
const posRank = (p) => { const i = POS_ORDER.indexOf(p); return i < 0 ? 99 : i; };
const rec = (t) => `${t.w || 0}-${t.l || 0}${t.t ? `-${t.t}` : ""}`;
const pct = (t) => ((t.w || 0) + (t.t || 0) * 0.5) / Math.max(1, (t.w || 0) + (t.l || 0) + (t.t || 0));

export default function EasyShell({ teams, TEAMS, ui, yr, wk, sp, sched, pb, log, msg, step, busy, onFull, onSave, phaseLabel }) {
  const [view, setView] = useState("home");
  const ut = teams[ui], T = TEAMS[ui];
  const games = (sched || []).filter((g) => g.played && (g.h === ui || g.a === ui)).sort((a, b) => (+b.wk || 0) - (+a.wk || 0));
  const next = sp === "regular" ? (sched || []).find((g) => g.wk === wk + 1 && !g.played && (g.h === ui || g.a === ui)) : null;
  const res = (g) => { const home = g.h === ui, us = home ? g.hs : g.as, them = home ? g.as : g.hs; return { opp: home ? g.a : g.h, home, us, them, win: us > them, tie: us === them }; };
  const tabs = [["home", "Home"], ["roster", "Roster"], ["schedule", "Schedule"], ["standings", MOBILE ? "Table" : "Standings"]];
  const narrow = MOBILE;
  // inside the white page: black pixel headings, newspaper serif, blue club names, a yellow highlighter
  const INK = "#151515", LINK = "#1a3fc4";
  const PH = { fontFamily: '"Silkscreen", monospace', fontWeight: 700, textTransform: "uppercase", color: INK, letterSpacing: 0.5 };
  const NUM = { fontFamily: '"Silkscreen", monospace', fontWeight: 700, color: INK };
  const SERIF = { fontFamily: 'Georgia, "Times New Roman", serif', color: "#1d1d1d" };
  const CLUB = { fontFamily: '"Helvetica Neue", Arial, sans-serif', fontWeight: 700, color: LINK };
  const Mark = ({ children }) => <span style={{ ...SERIF, fontWeight: 700, background: "#fff23a", padding: "1px 5px", boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}>{children}</span>;
  const Logo = (p) => <PixelLogo {...p} style={{ filter: "drop-shadow(2px 2px 0 #0002)", ...p.style }} />;

  const Row = ({ children, style }) => <div className="ez-row" style={{ display: "flex", alignItems: "center", gap: narrow ? 10 : 16, padding: narrow ? "7px 4px" : "7px 10px", borderBottom: "2px solid #e4e4dc", ...style }}>{children}</div>;
  const gameRow = (g, i) => { const r = res(g); return (
    <Row key={i}>
      {r.tie ? <span style={{ width: 16 }} /> : <Arrow up={r.win} />}
      <span style={{ ...PH, fontSize: 12, width: narrow ? 50 : 66, color: "#555" }}>{/^P/.test(String(g.wk)) ? "Playoff" : `Wk ${g.wk}`}</span>
      <Logo ab={T.ab} size={narrow ? 28 : 32} />
      <span style={{ ...NUM, fontSize: narrow ? 18 : 22, flex: 1, textAlign: "center" }}>{r.us}-{r.them}</span>
      <span style={{ ...PH, fontSize: 11, color: "#555" }}>{r.home ? "vs" : "at"}</span>
      <Logo ab={TEAMS[r.opp]?.ab} size={narrow ? 28 : 32} />
    </Row>); };

  const divRows = (c, d) => teams.map((t, i) => ({ t, i })).filter((x) => x.t.c === c && x.t.d === d).sort((a, b) => pct(b.t) - pct(a.t) || (b.t.pf - b.t.pa) - (a.t.pf - a.t.pa)).map((x, k) => (
    <Row key={x.i} style={{ gap: 10, padding: "5px 4px", background: x.i === ui ? "#fff9c4" : undefined }}>
      <span style={{ ...PH, fontSize: 12, width: 16, color: "#666" }}>{k + 1}</span>
      <Logo ab={TEAMS[x.i].ab} size={26} />
      <span style={{ ...CLUB, fontSize: 15, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{TEAMS[x.i].name}</span>
      <span style={{ ...NUM, fontSize: 16 }}>{rec(x.t)}</span>
    </Row>));
  // ---- the screens ----
  const home = () => {
    const opp = next ? TEAMS[next.h === ui ? next.a : next.h] : null, oppT = next ? teams[next.h === ui ? next.a : next.h] : null;
    return (
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "minmax(0,1.1fr) minmax(0,1fr)", gap: narrow ? 18 : 34, alignItems: "start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Logo ab={T.ab} size={narrow ? 34 : 40} />
            <div style={{ ...CLUB, fontSize: narrow ? 20 : 26, lineHeight: 1.1 }}>{T.city} {T.name}: <span style={{ color: INK }}>{rec(ut)}</span></div>
          </div>
          <div style={{ marginTop: 12, fontSize: narrow ? 16 : 18, lineHeight: 1.5 }}><Mark>{phaseLabel}:</Mark> <span style={SERIF}>{step?.note || (opp ? `${next.h === ui ? "Home against" : "On the road at"} the ${opp.city} ${opp.name}.` : "")}</span></div>
          {opp && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", gap: 10, marginTop: 14, padding: narrow ? "10px 4px" : "14px 18px", background: "#eef3ff", boxShadow: "inset 0 0 0 3px #c9d6f5" }}>
              <div style={{ textAlign: "center" }}><Logo ab={T.ab} size={narrow ? 52 : 66} /><div style={{ ...NUM, fontSize: 15, marginTop: 4 }}>{rec(ut)}</div></div>
              <div style={{ ...PH, fontSize: narrow ? 18 : 22 }}>{next.h === ui ? "vs" : "at"}</div>
              <div style={{ textAlign: "center" }}><Logo ab={opp.ab} size={narrow ? 52 : 66} /><div style={{ ...NUM, fontSize: 15, marginTop: 4 }}>{oppT ? rec(oppT) : ""}</div></div>
            </div>
          )}
          {step && <div style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <Btn big onClick={step.run} disabled={busy} style={{ flex: narrow ? "1 1 100%" : "0 0 auto" }}>{busy ? <span style={{ animation: "ezBlink .6s steps(2) infinite" }}>Working…</span> : <>▶ {step.label}</>}</Btn>
            {step.watch && <Btn kind="blue" onClick={step.watch} disabled={busy} style={narrow ? { flex: "1 1 0" } : undefined}>Watch the game</Btn>}
            {step.simAll && <Btn kind="dark" onClick={step.simAll} disabled={busy} style={narrow ? { flex: "1 1 0" } : undefined}>Sim the season</Btn>}
          </div>}
          {msg && <div style={{ ...SERIF, fontSize: 16, marginTop: 12, fontStyle: "italic" }}>{msg}</div>}
          {!narrow && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, marginTop: 22 }}>
            <div><div style={{ marginBottom: 4, fontSize: 16 }}><Mark>{ut.c} {ut.d}</Mark></div>{divRows(ut.c, ut.d)}</div>
            <div><div style={{ marginBottom: 4, fontSize: 16 }}><Mark>Best players</Mark></div>
              {[...(ut.roster || [])].sort((a, b) => b.ovr - a.ovr).slice(0, 4).map((p) => <Row key={p.id} style={{ gap: 10, padding: "5px 4px" }}><span style={{ ...PH, fontSize: 12, width: 34, color: "#555" }}>{p.pos}</span><span style={{ ...CLUB, fontSize: 15, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span><span style={{ ...NUM, fontSize: 16 }}>{p.ovr}</span></Row>)}</div>
          </div>}
        </div>
        <div>
          <div style={{ marginBottom: 6, fontSize: 16 }}><Mark>Recent games</Mark></div>
          {games.length ? games.slice(0, narrow ? 3 : 4).map(gameRow) : <div style={{ ...SERIF, fontSize: 16, padding: "6px 2px" }}>No games played yet.</div>}
          <div style={{ margin: "16px 0 6px", fontSize: 16 }}><Mark>News</Mark></div>
          {(log || []).slice(0, narrow ? 4 : 5).map((l, i) => <div key={i} style={{ ...SERIF, fontSize: 15, lineHeight: 1.4, padding: "5px 2px", borderBottom: "2px solid #e4e4dc", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{String(l)}</div>)}
        </div>
      </div>
    );
  };
  const roster = () => {
    const ps = [...(ut?.roster || [])].sort((a, b) => posRank(a.pos) - posRank(b.pos) || b.ovr - a.ovr);
    return (<>
      <div style={{ fontSize: 16, lineHeight: 1.5, marginBottom: 10 }}><Mark>Your staff:</Mark> <span style={SERIF}>sets the lineup, signs and re-signs players and runs the draft. Here's who you have.</span></div>
      <div style={{ display: "flex", ...PH, fontSize: 11, color: "#666", padding: "0 10px 6px", gap: 12 }}><span style={{ width: 54 }}>Pos</span><span style={{ flex: 1 }}>Player</span><span style={{ width: 40, textAlign: "right" }}>Age</span><span style={{ width: 50, textAlign: "right" }}>OVR</span>{!narrow && <span style={{ width: 130, textAlign: "right" }}>Contract</span>}</div>
      {ps.map((p) => <Row key={p.id} style={{ gap: 12, padding: narrow ? "5px 4px" : "5px 10px" }}>
        <span style={{ ...PH, fontSize: 12, width: 54, color: "#555" }}>{p.pos}</span>
        <span style={{ ...CLUB, fontSize: 16, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}{p.injured ? <span style={{ color: "#c62828", fontWeight: 400 }}> (hurt)</span> : null}</span>
        <span style={{ ...SERIF, fontSize: 16, width: 40, textAlign: "right" }}>{p.age}</span>
        <span style={{ ...NUM, fontSize: 17, width: 50, textAlign: "right" }}>{p.ovr}</span>
        {!narrow && <span style={{ ...SERIF, fontSize: 15, width: 130, textAlign: "right" }}>{p.contract || 0} yr · ${(+p.salary || 0).toFixed(1)}M</span>}
      </Row>)}
    </>);
  };
  const schedule = () => {
    const mine = (sched || []).filter((g) => g.h === ui || g.a === ui).sort((a, b) => (+a.wk || 0) - (+b.wk || 0));
    if (!mine.length) return <div style={{ ...SERIF, fontSize: 17 }}>The schedule comes out when the new season starts.</div>;
    return mine.map((g, i) => g.played ? gameRow(g, i) : (
      <Row key={i}><span style={{ width: 16 }} /><span style={{ ...PH, fontSize: 12, width: narrow ? 50 : 66, color: "#555" }}>Wk {g.wk}</span><Logo ab={T.ab} size={narrow ? 28 : 32} /><span style={{ flex: 1, textAlign: "center" }}>{g.wk === wk + 1 ? <Mark>Next</Mark> : <span style={{ ...NUM, color: "#aaa" }}>-</span>}</span><span style={{ ...PH, fontSize: 11, color: "#555" }}>{g.h === ui ? "vs" : "at"}</span><Logo ab={TEAMS[g.h === ui ? g.a : g.h]?.ab} size={narrow ? 28 : 32} /></Row>));
  };
  // standings as a broadcast graphic: gold header and rank cells, each logo on its club's colour, white rows, blue gutters
  const standings = () => {
    const divs = [...new Set(teams.filter((t) => t.c === ut.c).map((t) => t.d))].sort((a, b) => (a === ut.d ? -1 : b === ut.d ? 1 : String(a).localeCompare(String(b))));
    const cols = narrow ? ["W", "L", "PF", "PA"] : ["W", "L", "T", "PF", "PA", "Diff"];
    const cell = { display: "flex", alignItems: "center", justifyContent: "center" };
    const grid = { display: "grid", gridTemplateColumns: `${narrow ? 30 : 40}px ${narrow ? 46 : 60}px minmax(0,1fr)`, gap: 4 };
    const hd = { ...cell, background: "#ffb300", fontFamily: '"Pixelify Sans", monospace', fontWeight: 700, fontSize: narrow ? 13 : 15, color: INK, padding: "6px 2px", lineHeight: 1.05, textAlign: "center" };
    return (<div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: narrow ? 14 : 22 }}>
      {divs.map((d) => <div key={d} style={{ background: BLUE, padding: 4, boxShadow: "4px 4px 0 #0a1f6b" }}>
        <div style={{ ...GOLD, fontSize: narrow ? 15 : 17, padding: "6px 6px 8px", textShadow: "2px 2px 0 #0a1f6b" }}>{ut.c} {d}</div>
        <div style={grid}>
          <div style={hd}>Rk</div><div style={hd}>Team</div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols.length},1fr)`, gap: 4 }}>{cols.map((c) => <div key={c} style={hd}>{c}</div>)}</div>
        </div>
        {teams.map((t, i) => ({ t, i })).filter((x) => x.t.c === ut.c && x.t.d === d).sort((a, b) => pct(b.t) - pct(a.t) || (b.t.pf - b.t.pa) - (a.t.pf - a.t.pa)).map((x, k) => {
          const v = { W: x.t.w || 0, L: x.t.l || 0, T: x.t.t || 0, PF: x.t.pf || 0, PA: x.t.pa || 0, Diff: (x.t.pf || 0) - (x.t.pa || 0) };
          const me = x.i === ui;
          return <div key={x.i} style={{ ...grid, marginTop: 4 }}>
            <div style={{ ...cell, background: "#ffb300", fontFamily: '"Pixelify Sans", monospace', fontWeight: 700, fontSize: narrow ? 20 : 24, color: INK }}>{k + 1}</div>
            <div title={TEAMS[x.i].name} style={{ ...cell, background: TEAMS[x.i].clr || "#222", padding: "4px 0" }}><PixelLogo ab={TEAMS[x.i].ab} size={narrow ? 32 : 40} style={{ filter: "drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff) drop-shadow(0 2px 0 #fff) drop-shadow(0 -2px 0 #fff)" }} /></div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols.length},1fr)`, background: me ? "#fff6c2" : "#fbfbf8", boxShadow: me ? "inset 0 0 0 3px #ffb300" : "none" }}>
              {cols.map((c) => <div key={c} style={{ ...cell, fontFamily: '"Pixelify Sans", monospace', fontSize: narrow ? 17 : 21, color: INK }}>{c === "Diff" && v[c] > 0 ? `+${v[c]}` : v[c]}</div>)}
            </div>
          </div>; })}
      </div>)}
    </div>);
  };

  return (
    <div className="ez" style={{ position: "fixed", inset: 0, overflow: "hidden", display: "flex", flexDirection: "column", background: `linear-gradient(180deg, #2457e6, ${BLUE} 40%, #1a44c4)` }}>
      <style>{FONTS}</style>
      {/* the CRT: scan lines and a vignette, and the club's logo faint behind everything */}
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "repeating-linear-gradient(0deg, #0000 0 2px, #00000014 2px 3px)", zIndex: 4 }} />
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", boxShadow: "inset 0 0 160px #0009", zIndex: 4 }} />
      <PixelLogo ab={T.ab} size={narrow ? 320 : 620} res={32} style={{ position: "absolute", left: "50%", top: "52%", transform: "translate(-50%,-50%)", opacity: 0.08, filter: "none", pointerEvents: "none" }} />
      {/* the masthead */}
      <div style={{ position: "relative", zIndex: 3, display: "flex", alignItems: "center", justifyContent: "center", gap: 14, padding: narrow ? "calc(env(safe-area-inset-top) + 12px) 12px 8px" : "14px 20px 10px" }}>
        <PixelLogo ab={T.ab} size={narrow ? 38 : 48} style={{ filter: "drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff) drop-shadow(0 2px 0 #fff) drop-shadow(0 -2px 0 #fff) drop-shadow(3px 3px 0 #0a1f6b)" }} />
        <div>
          <div style={{ ...GOLD, fontSize: narrow ? 20 : 32, lineHeight: 1.05, textShadow: "0 4px 0 #0a1f6b" }}>{T.city} {T.name}</div>
          <div style={{ ...H, fontSize: narrow ? 12 : 14, marginTop: 6, textShadow: "2px 2px 0 #0a1f6b" }}>{yr} Season · Easy Mode</div>
        </div>
      </div>
      {/* the page: chunky pixel tabs over a white sheet, the open tab part of the sheet */}
      <div style={{ position: "relative", zIndex: 3, flex: 1, minHeight: 0, width: "100%", maxWidth: 1120, margin: "0 auto", padding: narrow ? "0 8px" : "0 24px", display: "flex", flexDirection: "column" }}>
        <nav style={{ display: "flex", alignItems: "flex-end" }}>
          {tabs.map(([k, l], i) => { const on = view === k; return <button key={k} onClick={() => setView(k)} aria-current={on ? "page" : undefined} style={{ flex: narrow ? "1 1 0" : "0 0 auto", minWidth: 0, cursor: "pointer", fontFamily: '"Silkscreen", monospace', fontWeight: 700, textTransform: "uppercase", fontSize: narrow ? 12 : 20, letterSpacing: narrow ? 0 : 1, color: INK, padding: narrow ? "10px 2px 8px" : "12px 26px 10px", background: on ? "#fbfbf8" : "linear-gradient(180deg,#5d93c4,#457aac)", border: "4px solid #111", borderBottom: on ? "4px solid #fbfbf8" : "4px solid #111", marginLeft: i ? -4 : 0, marginBottom: -4, position: "relative", zIndex: on ? 2 : 1, boxShadow: on ? "none" : "inset 0 3px 0 #ffffff40, inset 0 -4px 0 #0000002a" }}>{l}</button>; })}
        </nav>
        <main style={{ flex: 1, minHeight: 0, overflowY: "auto", background: "#fbfbf8", border: "4px solid #111", boxShadow: "6px 6px 0 #0a1f6b, inset 0 0 40px #0000000d", padding: narrow ? "14px 12px 16px" : "22px 30px 22px" }}>
          {view === "home" ? home() : view === "roster" ? roster() : view === "schedule" ? schedule() : standings()}
        </main>
      </div>
      <footer style={{ position: "relative", zIndex: 3, display: "flex", justifyContent: "center", gap: 10, padding: narrow ? "12px 8px calc(env(safe-area-inset-bottom) + 10px)" : "14px 10px 14px", flexWrap: "wrap" }}>
        <Btn kind="dark" onClick={onSave}>Save</Btn>
        <Btn kind="dark" onClick={onFull}>Switch to full mode</Btn>
      </footer>
    </div>
  );
}
