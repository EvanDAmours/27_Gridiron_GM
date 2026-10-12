// The Legacy Hall around the trophy shelves: championship banners in the rafters, gold jackets
// for the franchise's Hall of Famers, the Ring of Honor and retired numbers, and the franchise
// records wall.
import React from "react";
import { C, Btn } from "./ui.jsx";
import { CAREER_STATS, careerTotals } from "./history.js";
import { sbName, sbNumber } from "./data/superbowls.js";
import { RECORD_DEFS } from "./records.js";

const DIV = { AFC: "AFC", NFC: "NFC" };
const fmt = (n) => Math.round(n).toLocaleString();
const H = ({ children, sub }) => (
  <div style={{ display: "flex", alignItems: "baseline", gap: 10, margin: "4px 0 10px" }}>
    <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", color: "#e2e8f0" }}>{children}</span>
    {sub && <span style={{ fontSize: 13, color: C.mt }}>{sub}</span>}
  </div>
);

// A banner hanging from the rafters.
function Banner({ team, top, big, small, gold }) {
  const bg = team.clr || "#1e3a8a", ac = team.ac || "#e5e7eb";
  return (
    <svg viewBox="0 0 90 150" width={78} height={130} style={{ flex: "0 0 auto", filter: "drop-shadow(0 6px 8px #000a)" }}>
      <line x1="45" y1="0" x2="45" y2="8" stroke="#9ca3af" strokeWidth="1.5" />
      <rect x="6" y="8" width="78" height="4" rx="1" fill="#cbd5e1" />
      <path d="M8 12 H82 V128 L45 146 L8 128 Z" fill={bg} stroke={gold ? "#d4a017" : ac} strokeWidth="3" />
      <path d="M14 18 H76 V124 L45 139 L14 124 Z" fill="none" stroke={gold ? "#fde68a" : ac} strokeWidth="1" opacity=".7" />
      <text x="45" y="40" textAnchor="middle" fontSize="8.5" fontWeight="900" fill={gold ? "#fde68a" : "#fff"} fontFamily="system-ui" {...(String(top).length > 10 ? { textLength: 64, lengthAdjust: "spacingAndGlyphs" } : {})}>{top}</text>
      <text x="45" y="78" textAnchor="middle" fontSize={String(big).length > 4 ? 15 : 22} fontWeight="900" fill="#fff" fontFamily="Georgia, serif">{big}</text>
      <text x="45" y="100" textAnchor="middle" fontSize="7.5" fontWeight="800" fill={gold ? "#fde68a" : ac} fontFamily="system-ui" {...(String(small).length > 11 ? { textLength: 62, lengthAdjust: "spacingAndGlyphs" } : {})}>{small}</text>
      {gold && <polygon points="45,108 48,115 56,115 50,120 52,127 45,123 38,127 40,120 34,115 42,115" fill="#fde68a" />}
    </svg>
  );
}

export function Rafters({ team, sbs, divTitles }) {
  const items = [
    ...sbs.map((s) => ({ key: `sb${s.yr}`, yr: s.yr, el: <Banner key={`sb${s.yr}`} team={team} top="WORLD CHAMPIONS" big={s.yr} small={sbName(s.n ?? sbNumber(s.yr)).replace("Super Bowl ", "SUPER BOWL ")} gold /> })),
    ...divTitles.map((y) => ({ key: `d${y}`, yr: y, el: <Banner key={`d${y}`} team={team} top={`${DIV[team.c] || ""} ${String(team.d || "").toUpperCase()}`} big={y} small="DIVISION CHAMPIONS" /> })),
  ].sort((a, b) => a.yr - b.yr);
  return (
    <div style={{ marginBottom: 22 }}>
      <H sub={`${sbs.length} Super Bowl${sbs.length === 1 ? "" : "s"} · ${divTitles.length} division title${divTitles.length === 1 ? "" : "s"} in this league`}>The Rafters</H>
      <div style={{ background: "linear-gradient(180deg,#0b0f19,#111827)", border: `1px solid ${C.bd}`, borderRadius: 12, padding: "0 12px 14px", position: "relative", overflowX: "auto" }}>
        <div style={{ height: 8, margin: "0 -12px 0", background: "repeating-linear-gradient(90deg,#374151 0 14px,#1f2937 14px 28px)" }} />
        <div style={{ display: "flex", gap: 10, paddingTop: 2, minHeight: 130, alignItems: "flex-start" }}>
          {items.length ? items.map((x) => x.el) : <div style={{ color: C.mt, fontSize: 14, padding: "40px 6px" }}>No banners yet. Win the division or the Super Bowl and one goes up here.</div>}
        </div>
      </div>
    </div>
  );
}

// A gold jacket on a hanger.
function GoldJacket({ team }) {
  return (
    <svg viewBox="0 0 100 110" width={84} height={92} style={{ filter: "drop-shadow(0 6px 10px #000b)" }}>
      <defs><linearGradient id="gj-gold" x1="0" x2="1"><stop offset="0" stopColor="#8a6212" /><stop offset=".35" stopColor="#f6d77a" /><stop offset=".6" stopColor="#d4a017" /><stop offset="1" stopColor="#7c5a10" /></linearGradient></defs>
      <path d="M50 4 C46 4 45 9 48 10" stroke="#9ca3af" strokeWidth="1.6" fill="none" />
      <path d="M22 18 L50 12 L78 18" stroke="#6b7280" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M24 18 L40 14 L50 30 L60 14 L76 18 L92 34 L84 100 L58 104 L50 44 L42 104 L16 100 L8 34 Z" fill="url(#gj-gold)" stroke="#5b3a06" strokeWidth="1" />
      <path d="M40 14 L50 44 L60 14" fill="#f3f4f6" />
      <path d="M45 26 L50 44 L55 26 L50 22 Z" fill={team.clr || "#1e3a8a"} />
      <path d="M40 14 L34 40 L50 44 Z M60 14 L66 40 L50 44 Z" fill="#b8892b" opacity=".8" />
      <circle cx="68" cy="56" r="7" fill="#1e3a8a" stroke="#fde68a" strokeWidth="1.5" />
      <text x="68" y="59" textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#fde68a" fontFamily="Georgia, serif">HOF</text>
      {[60, 72, 84].map((y) => <circle key={y} cx="52" cy={y} r="1.6" fill="#5b3a06" />)}
    </svg>
  );
}

export function GoldJackets({ team, hofers, yr }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <H sub="Hall of Famers who finished their careers here">Gold Jackets</H>
      <div style={{ background: "radial-gradient(ellipse at 50% 0%,#3b2f2455,transparent 70%),#0f0c0a", border: "1px solid #2b211b", borderRadius: 12, padding: 14, display: "flex", gap: 14, flexWrap: "wrap" }}>
        {hofers.length ? hofers.map((h) => (
          <div key={h.id} style={{ width: 120, textAlign: "center" }}>
            <GoldJacket team={team} />
            <div style={{ fontWeight: 900, fontSize: 14, marginTop: 4 }}>{h.name}</div>
            <div style={{ fontSize: 12, color: "#fde68a" }}>{h.pos} · Class of {h.hofClass}</div>
            {h.hofClass > yr && <div style={{ fontSize: 11, color: C.mt }}>enshrined in {h.hofClass}</div>}
          </div>
        )) : <div style={{ color: "#a8a29e", fontSize: 14, padding: "26px 6px" }}>No Hall of Famers yet. A legend who retires here gets his gold jacket hung on this wall.</div>}
      </div>
    </div>
  );
}

// The Ring of Honor and retired numbers. ring: inducted ids; nums: retired numbers. candidates:
// notable players who retired here (history entries).
export function RingOfHonor({ team, retired, hall, onInduct, onRetireNum }) {
  const ring = retired.filter((r) => hall.ring.includes(r.id));
  const cands = retired.filter((r) => !hall.ring.includes(r.id) && (r.hof || r.legacy >= 20)).sort((a, b) => b.legacy - a.legacy).slice(0, 8);
  const taken = new Set(hall.nums.map((n) => n.num));
  return (
    <div style={{ marginBottom: 22 }}>
      <H sub="Honor the greats who played here">Ring of Honor & Retired Numbers</H>
      <div style={{ background: `linear-gradient(180deg,${team.clr || "#1e293b"},#0b1220)`, borderRadius: 12, padding: "12px 14px", border: `2px solid ${team.ac || C.bd}` }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", minHeight: 44 }}>
          {ring.length ? ring.map((r) => <span key={r.id} style={{ fontFamily: "Georgia, serif", fontWeight: 900, fontSize: 18, letterSpacing: 1.5, color: "#fff", textShadow: "0 2px 4px #000a", padding: "2px 10px", borderRight: `2px solid ${team.ac || "#fff"}55` }}>{r.name.toUpperCase()} <span style={{ fontSize: 13, opacity: 0.8 }}>{r.retYr}</span></span>) : <span style={{ color: "#fffa", fontSize: 14 }}>The Ring of Honor is empty. Induct a retired great below.</span>}
        </div>
        {hall.nums.length > 0 && <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
          {hall.nums.map((n) => (
            <div key={n.num} style={{ textAlign: "center" }}>
              <div style={{ width: 62, height: 62, borderRadius: 31, background: "#fff", color: team.clr || "#111", border: `4px solid ${team.ac || "#999"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 900, fontFamily: "Georgia, serif" }}>{n.num}</div>
              <div style={{ fontSize: 11, color: "#fffc", marginTop: 3, maxWidth: 80 }}>{n.name}</div>
            </div>
          ))}
        </div>}
      </div>
      {(cands.length > 0 || ring.some((r) => r.num != null && !taken.has(r.num))) && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))", gap: 8, marginTop: 8 }}>
        {cands.map((r) => (
          <div key={r.id} style={{ background: C.cd, border: `1px solid ${C.bd}`, borderRadius: 8, padding: "8px 10px", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 800, fontSize: 14 }}>{r.name} {r.hof && <span style={{ color: "#fde68a", fontSize: 11 }}>HOF</span>}</div><div style={{ fontSize: 12, color: C.mt }}>{r.pos} · retired {r.retYr} · legacy {r.legacy}</div></div>
            <Btn onClick={() => onInduct(r)} bg="#b45309" style={{ fontSize: 12, padding: "4px 10px" }}>Induct</Btn>
          </div>
        ))}
        {ring.filter((r) => r.num != null && !taken.has(r.num)).map((r) => (
          <div key={`n${r.id}`} style={{ background: C.cd, border: `1px solid ${C.bd}`, borderRadius: 8, padding: "8px 10px", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 800, fontSize: 14 }}>{r.name}</div><div style={{ fontSize: 12, color: C.mt }}>Ring of Honor · wore #{r.num}</div></div>
            <Btn onClick={() => onRetireNum(r)} bg="#1e3a5f" c="#7dd3fc" style={{ fontSize: 12, padding: "4px 10px" }}>Retire #{r.num}</Btn>
          </div>
        ))}
      </div>}
    </div>
  );
}

// Franchise records: career leaders for the club (current players and those who retired here)
// and the league records your players hold.
export function RecordsWall({ team, retired, book }) {
  const rows = CAREER_STATS.map((c) => {
    let best = null;
    for (const p of team.roster || []) { const v = careerTotals(p)[c.key]; if (v > 0 && (!best || v > best.v)) best = { name: p.name, v, active: true }; }
    for (const r of retired) { const v = r.career?.[c.key]; if (v > 0 && (!best || v > best.v)) best = { name: r.name, v, active: false }; }
    return { ...c, best };
  }).filter((r) => r.best);
  const held = Object.entries(book?.best || {}).filter(([, b]) => b.team === team.ab && !b.nfl).map(([k, b]) => ({ ...b, label: RECORD_DEFS.find((d) => d.key === k)?.label || k }));
  return (
    <div style={{ marginBottom: 22 }}>
      <H sub="Career marks in this league">Franchise Records</H>
      <div style={{ background: "linear-gradient(180deg,#2a1d13,#1a120c)", border: "1px solid #3d2a1a", borderRadius: 12, padding: 12, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 8 }}>
        {rows.length ? rows.map((r) => (
          <div key={r.key} style={{ background: "linear-gradient(180deg,#f6e7b8,#d9bf7a)", borderRadius: 6, padding: "8px 10px", color: "#2b1d0e", boxShadow: "inset 0 0 0 2px #8a6a2a, 0 3px 6px #0008" }}>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase" }}>{r.label}</div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 900 }}>{fmt(r.best.v)}</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{r.best.name}{r.best.active ? " · active" : ""}</div>
          </div>
        )) : <div style={{ color: "#d6c3a0", fontSize: 14, padding: 10 }}>Records start piling up as your players build careers here.</div>}
      </div>
      {held.length > 0 && <div style={{ marginTop: 8, fontSize: 13, color: "#fde68a" }}>🏅 League records held: {held.map((b) => `${b.label}: ${b.name}, ${b.yr}`).join(" · ")}</div>}
    </div>
  );
}
