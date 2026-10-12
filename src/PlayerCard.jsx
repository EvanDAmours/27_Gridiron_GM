// The player card: a header in his team's colors with his number and an OVR ring, rating bars by
// skill group, a career OVR graph, season-by-season stats, a contract timeline and his honors.
import React from "react";
import { C, oC, Bdg, Face } from "./ui.jsx";

const r1 = (x) => Math.round(x * 10) / 10;
const money = (n) => `$${r1(+n || 0).toFixed(1)}M`;

export function OvrRing({ ovr, size = 70, label = "OVR" }) {
  const r = size / 2 - 5, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, ((ovr || 0) - 40) / 59));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flex: "0 0 auto" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="#0008" stroke="#ffffff22" strokeWidth="6" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={oC(ovr)} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${c * f} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" dy={size * 0.04} textAnchor="middle" fontSize={size * 0.34} fontWeight="900" fill="#fff" fontFamily="system-ui">{ovr}</text>
      <text x="50%" y="50%" dy={size * 0.26} textAnchor="middle" fontSize={size * 0.12} fontWeight="800" fill="#fffa" fontFamily="system-ui">{label}</text>
    </svg>
  );
}

// team: { clr, ac, city, name, ab } or null for a free agent.
export function CardHeader({ p, team, ovr, pot, sub, dev }) {
  const bg = team?.clr || "#334155", ac = team?.ac || "#94a3b8";
  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 12, margin: "-4px -4px 12px", background: `linear-gradient(120deg, ${bg} 0%, ${bg}cc 45%, #0b1220 100%)`, border: `1px solid ${ac}66` }}>
      <div style={{ position: "absolute", right: 74, top: -18, fontSize: 120, fontWeight: 900, color: "#ffffff14", fontFamily: "Georgia, serif", lineHeight: 1, pointerEvents: "none" }}>{p.num ?? ""}</div>
      <div style={{ height: 4, background: ac }} />
      <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 14px" }}>
        <div style={{ position: "relative" }}>
          <div style={{ background: "#0006", borderRadius: 40, padding: 3 }}><Face s={p.face} sz={58} /></div>
          {p.num != null && <div style={{ position: "absolute", right: -6, bottom: -4, minWidth: 26, height: 22, padding: "0 4px", borderRadius: 6, background: "#fff", color: bg, fontWeight: 900, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${ac}` }}>#{p.num}</div>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: "#fffb" }}>{team ? `${team.city} ${team.name}`.toUpperCase() : "FREE AGENT"}</div>
          <div style={{ fontSize: 21, fontWeight: 900, color: "#fff", lineHeight: 1.15 }}>{p.name}</div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 3, fontSize: 13, color: "#fffd" }}><Bdg pos={p.pos} />{sub}{dev}</div>
        </div>
        <div style={{ textAlign: "center", marginRight: 34 }}>
          <OvrRing ovr={ovr} />
          {pot != null && <div style={{ fontSize: 11, color: "#fffc", fontWeight: 700 }} title={p.potRev && p.potRev.stage < 3 ? "Your staff's current read. A young player's real ceiling becomes clear over his first two seasons." : undefined}>POT <b style={{ color: oC(pot) }}>{p.potRev && p.potRev.stage < 3 ? "~" : ""}{pot}</b></div>}
          {p.potRev && p.potRev.stage < 3 && <div style={{ fontSize: 10, color: "#fffa" }}>{p.potRev.stage === 0 ? "draft-day read" : "still unproven"}</div>}
        </div>
      </div>
    </div>
  );
}

const GROUPS = [["PHYSICAL", [["SPD", "spd"], ["ACC", "acc"], ["AGI", "agi"], ["STR", "str"], ["JMP", "jmp"], ["END", "end"]]]];
export function RatingBars({ p, labels = {}, showPos = true, posLimit = 99 }) {
  const pos = showPos && p.posAttrs ? Object.entries(p.posAttrs).slice(0, posLimit) : [];
  const groups = [...GROUPS.map(([g, list]) => [g, list.map(([l, k]) => [l, p[k]]).filter(([, v]) => v != null)]), ...(pos.length ? [["POSITION SKILLS", pos.map(([k, v]) => [labels[k] || k, v])]] : []), ["MENTAL", [["CONFIDENCE", p.conf || 60]]]];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10, marginBottom: 12 }}>
      {groups.map(([g, rows]) => (
        <div key={g} style={{ background: C.bg, borderRadius: 8, padding: "8px 10px" }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1, color: C.mt, marginBottom: 5 }}>{g}</div>
          {rows.map(([l, v]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
              <span style={{ fontSize: 11, color: "#cbd5e1", width: 78, flex: "0 0 auto", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l}</span>
              <div style={{ flex: 1, height: 7, background: "#ffffff12", borderRadius: 4 }}><div style={{ width: `${Math.max(3, Math.min(100, v))}%`, height: "100%", borderRadius: 4, background: oC(v) }} /></div>
              <b style={{ fontSize: 12, color: oC(v), width: 22, textAlign: "right" }}>{v}</b>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// Career OVR, season by season (p.oh) plus now.
export function CareerOvrGraph({ p, yr }) {
  const pts = [...(p.oh || []).map((h) => ({ y: h.y, o: h.o })), { y: yr, o: p.ovr }].filter((x, i, a) => a.findIndex((z) => z.y === x.y) === i);
  if (pts.length < 2) return null;
  const W = 300, H = 90, lo = Math.min(...pts.map((x) => x.o)) - 3, hi = Math.max(...pts.map((x) => x.o)) + 3;
  const X = (i) => 16 + (i * (W - 32)) / (pts.length - 1), Y = (o) => H - 16 - ((o - lo) / Math.max(1, hi - lo)) * (H - 30);
  const path = pts.map((x, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(x.o).toFixed(1)}`).join(" ");
  return (
    <div style={{ background: C.bg, borderRadius: 8, padding: "8px 10px", marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1, color: C.mt }}>CAREER OVR</div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
        <path d={`${path} L${X(pts.length - 1)} ${H - 12} L${X(0)} ${H - 12} Z`} fill="#3b82f622" />
        <path d={path} fill="none" stroke="#60a5fa" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        {pts.map((x, i) => <g key={x.y}><circle cx={X(i)} cy={Y(x.o)} r="3.5" fill={oC(x.o)} /><text x={X(i)} y={Y(x.o) - 7} textAnchor="middle" fontSize="10" fontWeight="800" fill="#e2e8f0">{x.o}</text><text x={X(i)} y={H - 1} textAnchor="middle" fontSize="9" fill="#94a3b8">{String(x.y).slice(2)}</text></g>)}
      </svg>
    </div>
  );
}

// Columns that matter for his position.
const COLS = {
  QB: [["CMP", "comp"], ["ATT", "att"], ["YDS", "passYds"], ["TD", "passTD"], ["INT", "passInt"], ["RUSH", "rushYds"]],
  RB: [["ATT", "rushAtt"], ["YDS", "rushYds"], ["TD", "rushTD"], ["REC", "rec"], ["REC YDS", "recYds"]],
  WR: [["REC", "rec"], ["YDS", "recYds"], ["TD", "recTD"]], TE: [["REC", "rec"], ["YDS", "recYds"], ["TD", "recTD"]],
  DL: [["TKL", "tkl"], ["SACK", "sacks"], ["TFL", "tfl"], ["FF", "ff"]], LB: [["TKL", "tkl"], ["SACK", "sacks"], ["INT", "ints"], ["PD", "pd"]],
  CB: [["TKL", "tkl"], ["INT", "ints"], ["PD", "pd"]], S: [["TKL", "tkl"], ["INT", "ints"], ["PD", "pd"]],
  K: [["FGM", "fgM"], ["FGA", "fgA"], ["XPM", "xpM"]], P: [["PUNTS", "punts"], ["YDS", "puntYds"]],
};
export const SEASON_KEYS = ["gp", "gs", "comp", "att", "passYds", "passTD", "passInt", "rushAtt", "rushYds", "rushTD", "rec", "recYds", "recTD", "tkl", "sacks", "tfl", "ff", "ints", "pd", "fgM", "fgA", "xpM", "punts", "puntYds"];
// A season's stats, trimmed to what the card shows (stored on the player at each rollover).
export const seasonLine = (ss, y, tm) => { const o = { y, tm }; for (const k of SEASON_KEYS) if (ss?.[k]) o[k] = ss[k]; return o; };

export function SeasonTable({ p, yr, teamAb }) {
  const cols = COLS[p.pos] || [["GP", "gp"]];
  const rows = [...(p.sh || []), ...(p.ss?.gp ? [seasonLine(p.ss, yr, teamAb)] : [])];
  if (!rows.length) return null;
  const tot = {}; for (const r of rows) for (const k of SEASON_KEYS) if (r[k]) tot[k] = (tot[k] || 0) + r[k];
  const td = { padding: "5px 6px", textAlign: "right", fontSize: 13, borderBottom: `1px solid ${C.bd}55`, whiteSpace: "nowrap" };
  const fmt = (v) => (v == null ? "–" : Number.isInteger(v) ? v.toLocaleString() : r1(v));
  return (
    <div style={{ background: C.bg, borderRadius: 8, padding: "8px 10px", marginBottom: 12, overflowX: "auto" }}>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1, color: C.mt, marginBottom: 4 }}>SEASON BY SEASON</div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["YEAR", "TM", "GP", ...cols.map(([l]) => l)].map((h, i) => <th key={h} style={{ ...td, textAlign: i < 2 ? "left" : "right", fontSize: 11, color: C.mt, fontWeight: 800 }}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => <tr key={i}><td style={{ ...td, textAlign: "left" }}>{r.y}</td><td style={{ ...td, textAlign: "left", color: C.mt }}>{r.tm || ""}</td><td style={td}>{fmt(r.gp)}</td>{cols.map(([, k]) => <td key={k} style={td}>{fmt(r[k])}</td>)}</tr>)}
          {rows.length > 1 && <tr style={{ fontWeight: 800 }}><td style={{ ...td, textAlign: "left" }} colSpan={2}>Career</td><td style={td}>{fmt(tot.gp)}</td>{cols.map(([, k]) => <td key={k} style={td}>{fmt(tot[k])}</td>)}</tr>}
        </tbody>
      </table>
    </div>
  );
}

// Each year left on his deal: the cap hit split into base and bonus, plus what cutting him that
// year would leave as dead money. Void years show after the real ones.
export function ContractTimeline({ p, yr, yearsLeft, proration, deadNow }) {
  if (!yearsLeft || yearsLeft < 1) return null;
  const pr = proration || 0;
  const years = Array.from({ length: yearsLeft }, (_, i) => {
    const hit = i === 0 ? p.salary || 0 : (p.salary || 0) + (p.baseBack || 0);
    return { y: yr + i, hit: r1(hit), bonus: r1(Math.min(hit, pr)), dead: i === 0 ? deadNow : r1(pr * (yearsLeft - i) + (p.voidDead || 0)) };
  });
  const voids = Array.from({ length: p.voidYrs || 0 }, (_, i) => ({ y: yr + yearsLeft + i, void: true }));
  const max = Math.max(...years.map((x) => x.hit), 1);
  return (
    <div style={{ background: C.bg, borderRadius: 8, padding: "8px 10px", marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1, color: C.mt, marginBottom: 6 }}>CONTRACT TIMELINE <span style={{ fontWeight: 600, letterSpacing: 0 }}>· <span style={{ color: "#60a5fa" }}>■</span> base <span style={{ color: C.gd }}>■</span> bonus <span style={{ color: C.rd }}>■</span> dead money if cut</span></div>
      <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
        {years.map((x) => (
          <div key={x.y} style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 800 }}>{money(x.hit)}</div>
            <div style={{ height: 70, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              <div style={{ height: `${((x.hit - x.bonus) / max) * 66}px`, background: "#3b82f6", borderRadius: "4px 4px 0 0" }} />
              <div style={{ height: `${(x.bonus / max) * 66}px`, background: C.gd }} />
            </div>
            <div style={{ fontSize: 11, color: C.mt }}>{x.y}</div>
            <div style={{ fontSize: 11, color: x.dead ? C.rd : C.mt }}>{x.dead ? `${money(x.dead)} dead` : "no dead $"}</div>
          </div>
        ))}
        {voids.map((x) => <div key={x.y} style={{ flex: 1, minWidth: 0, textAlign: "center", opacity: 0.6 }}><div style={{ fontSize: 12 }}>void</div><div style={{ height: 70, display: "flex", alignItems: "flex-end" }}><div style={{ width: "100%", height: 10, background: "repeating-linear-gradient(45deg,#7c3aed55 0 4px,transparent 4px 8px)", borderRadius: 3 }} /></div><div style={{ fontSize: 11, color: C.mt }}>{x.y}</div></div>)}
      </div>
      {p.ext && <div style={{ fontSize: 12, color: C.gn, marginTop: 6 }}>Extension: {money(p.ext.sal)} a year × {p.ext.yrs} from {yr + yearsLeft}</div>}
      {p.inc?.amt > 0 && <div style={{ fontSize: 12, color: "#67e8f9", marginTop: 4 }}>Incentive: {money(p.inc.amt)} for {p.inc.label}</div>}
    </div>
  );
}

const HONOR = { ap1: ["FIRST-TEAM ALL-PRO", "#fde68a", "#713f12"], ap2: ["SECOND-TEAM ALL-PRO", "#e5e7eb", "#374151"], pb: ["PRO BOWL", "#bfdbfe", "#1e3a8a"] };
const AWARD = { mvp: "MVP", opoy: "OFF. PLAYER OF THE YEAR", dpoy: "DEF. PLAYER OF THE YEAR", oroy: "OFF. ROOKIE OF THE YEAR", droy: "DEF. ROOKIE OF THE YEAR", sbmvp: "SUPER BOWL MVP" };
export function HonorsRow({ p, awards = [] }) {
  const badges = [];
  for (const a of awards) for (const k of Object.keys(AWARD)) if (a?.[k]?.pid === p.id) badges.push({ key: `${k}${a.yr}`, label: AWARD[k], yr: a.yr, fg: "#1a1200", bg: "linear-gradient(180deg,#fde68a,#d4a017)" });
  for (const h of p.honors || []) { const [l, fg, bg] = HONOR[h.k] || []; if (l) badges.push({ key: `${h.k}${h.yr}`, label: l, yr: h.yr, fg, bg }); }
  if (!badges.length) return null;
  badges.sort((a, b) => b.yr - a.yr);
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
      {badges.map((b) => <span key={b.key} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px", borderRadius: 999, fontSize: 11, fontWeight: 900, letterSpacing: 0.5, color: b.fg, background: b.bg, boxShadow: "0 1px 3px #0008" }}>🏅 {b.label} <span style={{ opacity: 0.75 }}>{b.yr}</span></span>)}
    </div>
  );
}
