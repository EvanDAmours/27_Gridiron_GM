// The Legacy Hall around the trophy shelves: championship banners in the rafters, gold jackets
// for the franchise's Hall of Famers, the Ring of Honor and retired numbers, and the franchise
// records wall.
import React from "react";
import { C, Btn, TeamLogo } from "./ui.jsx";
import { CAREER_STATS, careerTotals } from "./history.js";
import { sbName, sbNumber } from "./data/superbowls.js";
import { RECORD_DEFS } from "./records.js";
import goldJacket from "./assets/gold-jacket.webp";
import { RING_OF_HONOR } from "./data/ringOfHonor.js";

const DIV = { AFC: "AFC", NFC: "NFC" };
const fmt = (n) => Math.round(n).toLocaleString();
const H = ({ children, sub }) => (
  <div style={{ display: "flex", alignItems: "baseline", gap: 10, margin: "4px 0 10px" }}>
    <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", color: "#e2e8f0" }}>{children}</span>
    {sub && <span style={{ fontSize: 13, color: C.mt }}>{sub}</span>}
  </div>
);

// A banner hanging from the rafters, laid out like the real ones in NFL stadiums: the club's logo,
// what was won on two lines, and the year, on team-color fabric with stitched trim.
function Banner({ team, line1, line2, year, years, gold }) {
  const bg = team.clr || "#1e3a8a", ac = team.ac || "#e5e7eb", trim = gold ? "#e8c45a" : ac;
  return (
    <div className="keep-dark" style={{ position: "relative", flex: "0 0 auto", width: years && years.length > 6 ? 116 : 96, paddingTop: 10 }}>
      <div style={{ position: "absolute", top: 0, left: 10, right: 10, height: 6, borderRadius: 3, background: "linear-gradient(180deg,#e5e7eb,#6b7280)" }} />
      <div style={{ position: "absolute", top: 4, left: 46, width: 4, height: 8, background: "#9ca3af" }} />
      <div style={{ filter: "drop-shadow(0 8px 10px #000b)" }}>
        <div style={{ clipPath: "polygon(0 0,100% 0,100% 88%,50% 100%,0 88%)", background: trim, padding: 3 }}>
          <div style={{ clipPath: "polygon(0 0,100% 0,100% 88%,50% 100%,0 88%)", background: `linear-gradient(100deg, ${bg} 0%, ${bg} 42%, color-mix(in srgb, ${bg} 80%, #fff) 50%, ${bg} 58%, ${bg} 100%)`, minHeight: 170, display: "flex", flexDirection: "column", alignItems: "center", padding: `8px 6px ${years ? 40 : 0}px`, boxSizing: "border-box", position: "relative" }}>
            <div style={{ position: "absolute", inset: 5, border: `1px dashed ${trim}99`, clipPath: "polygon(0 0,100% 0,100% 88%,50% 100%,0 88%)", pointerEvents: "none" }} />
            <div style={{ width: 42, height: 42, borderRadius: 21, background: "#ffffffee", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 0 2px ${trim}` }}><TeamLogo t={team} sz={34} /></div>
            <div style={{ marginTop: 8, fontSize: 9.5, fontWeight: 900, letterSpacing: 0.8, color: gold ? "#fde68a" : "#fff", textAlign: "center", lineHeight: 1.15, textShadow: "0 1px 2px #0008" }}>{line1}</div>
            <div style={{ fontSize: 9.5, fontWeight: 900, letterSpacing: 1.2, color: gold ? "#fde68a" : "#fff", textAlign: "center", textShadow: "0 1px 2px #0008" }}>{line2}</div>
            {years ? (
              <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: years.length > 6 ? "1fr 1fr" : "1fr", columnGap: 8, rowGap: 1, fontFamily: "Georgia, 'Times New Roman', serif", fontSize: years.length > 6 ? 13 : 15, fontWeight: 900, color: "#fff", textShadow: "0 1px 2px #0009", textAlign: "center" }}>{years.map((y) => <span key={y}>{y}</span>)}</div>
            ) : <div style={{ marginTop: 6, fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 26, fontWeight: 900, color: "#fff", textShadow: "0 2px 3px #0009" }}>{year}</div>}
            {gold && <div style={{ color: "#fde68a", fontSize: 14, marginTop: 1 }}>★</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// sbs: [{ yr, n }] Super Bowl wins; titles: [[yr, "NFL" | "AFL" | "AAFC"]] older league titles;
// confs: [[yr, "AFC" | "NFC" | ...]] conference championships; divs: [[yr, "AFC West"]] division titles.
export function Rafters({ team, sbs = [], titles = [], confs = [], divs = [] }) {
  const LG = { NFL: "NFL", AFL: "AFL", AAFC: "AAFC" };
  const big = [
    ...sbs.map((s) => ({ key: `sb${s.yr}`, yr: s.yr, el: <Banner key={`sb${s.yr}`} team={team} line1={sbName(s.n ?? sbNumber(s.yr)).toUpperCase()} line2="CHAMPIONS" year={s.yr} gold /> })),
    ...titles.map(([y, k]) => ({ key: `l${y}${k}`, yr: y, el: <Banner key={`l${y}${k}`} team={team} line1={`${LG[k] || k}`} line2="CHAMPIONS" year={y} gold /> })),
    ...confs.map(([y, k]) => ({ key: `c${y}`, yr: y, el: <Banner key={`c${y}`} team={team} line1={`${k}`.toUpperCase()} line2="CHAMPIONS" year={y} /> })),
  ].sort((a, b) => a.yr - b.yr || (a.key < b.key ? -1 : 1));
  const groups = {};
  for (const [y, n] of divs) (groups[n] ||= []).push(y);
  const order = Object.entries(groups).sort((a, b) => Math.min(...a[1]) - Math.min(...b[1]));
  const wall = (children) => (
    <div className="keep-dark" style={{ background: "linear-gradient(180deg,#0b0f19,#111827)", border: `1px solid ${C.bd}`, borderRadius: 12, padding: "0 12px 14px", position: "relative", overflowX: "auto", marginBottom: 10 }}>
      <div style={{ height: 8, margin: "0 -12px 0", background: "repeating-linear-gradient(90deg,#374151 0 14px,#1f2937 14px 28px)" }} />
      <div style={{ display: "flex", gap: 12, paddingTop: 2, minHeight: 190, alignItems: "flex-start" }}>{children}</div>
    </div>
  );
  const nDiv = divs.length, nTitles = sbs.length + titles.length;
  return (
    <div style={{ marginBottom: 22 }}>
      <H sub={`${nTitles} championship${nTitles === 1 ? "" : "s"} · ${confs.length} conference title${confs.length === 1 ? "" : "s"} · ${nDiv} division title${nDiv === 1 ? "" : "s"}`}>The Rafters</H>
      {wall(big.length ? big.map((x) => x.el) : <div style={{ color: C.mt, fontSize: 14, padding: "40px 6px" }}>No championship banners yet. Win the conference or the Super Bowl and one goes up here.</div>)}
      {order.length > 0 && wall(order.map(([name, ys]) => <Banner key={name} team={team} line1={name.toUpperCase()} line2="CHAMPIONS" years={[...ys].sort((a, b) => a - b)} />))}
    </div>
  );
}

// A gold jacket on a hanger.
function GoldJacket() {
  return <img src={goldJacket} alt="Hall of Fame gold jacket" width={96} height={102} style={{ objectFit: "contain", filter: "drop-shadow(0 8px 12px #000c)" }} />;
}

export function GoldJackets({ team, hofers, yr }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <H sub="Hall of Famers who finished their careers here">Gold Jackets</H>
      <div style={{ background: "radial-gradient(ellipse at 50% 0%,#3b2f2455,transparent 70%),#0f0c0a", border: "1px solid #2b211b", borderRadius: 12, padding: 14, display: "flex", gap: 14, flexWrap: "wrap" }}>
        {hofers.length ? hofers.map((h) => (
          <div key={h.id} style={{ width: 120, textAlign: "center" }}>
            <GoldJacket />
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
  const real = RING_OF_HONOR[team.ab] || { name: null, members: [] };
  const trim = team.ac || "#e5e7eb", bg = team.clr || "#1e3a8a";
  // retired numbers: the club's real ones, then any retired in this league
  const nums = [...real.members.filter((m) => m.ret && m.num != null).map((m) => ({ num: m.num, name: m.n })), ...(real.fans12 ? [{ num: 12, name: "The 12s (fans)" }] : []), ...hall.nums.filter((n) => !real.members.some((m) => m.ret && m.num === n.num)).map((n) => ({ ...n, mine: true }))].sort((a, b) => a.num - b.num);
  const plaques = [...real.members.map((m) => ({ key: m.n, name: m.n, num: m.num, pos: m.pos, yrs: m.yrs, ind: m.ind, ret: m.ret })), ...ring.map((r) => ({ key: r.id, name: r.name, num: r.num, pos: r.pos, ind: r.retYr, mine: true }))];
  return (
    <div style={{ marginBottom: 22 }}>
      <H sub={real.name ? `${team.city} ${team.name} ${real.name}${real.members.length ? `, ${plaques.length} members` : ""}` : "Honor the greats who played here"}>{real.name || "Ring of Honor"} & Retired Numbers</H>
      {nums.length > 0 && (
        <div className="keep-dark" style={{ background: "linear-gradient(180deg,#0b0f19,#111827)", border: `1px solid ${C.bd}`, borderRadius: 12, padding: "14px 12px", marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.5, color: "#fde68a", marginBottom: 10 }}>RETIRED NUMBERS</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {nums.map((n) => (
              <div key={`${n.num}${n.name}`} title={n.name} style={{ width: 92, textAlign: "center" }}>
                <div style={{ clipPath: "polygon(0 0,100% 0,100% 86%,50% 100%,0 86%)", background: trim, padding: 3 }}>
                  <div style={{ clipPath: "polygon(0 0,100% 0,100% 86%,50% 100%,0 86%)", background: bg, padding: "10px 4px 20px" }}>
                    <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 38, fontWeight: 900, lineHeight: 1, color: "#fff", textShadow: "0 2px 3px #0009" }}>{n.num}</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginTop: 4, lineHeight: 1.2 }}>{n.name}{n.mine && <span style={{ display: "block", fontSize: 10, color: "#fde68a" }}>RETIRED IN YOUR LEAGUE</span>}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="keep-dark" style={{ background: `linear-gradient(180deg,${bg},#0b1220)`, borderRadius: 12, padding: "12px 14px", border: `2px solid ${trim}` }}>
        {!plaques.length && <span style={{ color: "#fffa", fontSize: 14 }}>{real.name === null ? "The club has never had a Ring of Honor. Start one: induct a retired great below." : "The Ring of Honor is empty. Induct a retired great below."}</span>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 8 }}>
          {plaques.map((m) => (
            <div key={m.key} style={{ display: "flex", alignItems: "center", gap: 10, background: "#0006", border: `1px solid ${m.mine ? "#fde68a" : trim + "66"}`, borderRadius: 8, padding: "7px 10px" }}>
              <div style={{ minWidth: 38, height: 38, borderRadius: 19, display: "flex", alignItems: "center", justifyContent: "center", background: m.ret ? "#fde68a" : "#fff", color: m.ret ? "#3b2a0a" : bg, fontFamily: "Georgia, serif", fontWeight: 900, fontSize: 17 }}>{m.num ?? "★"}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "Georgia, serif", fontWeight: 900, fontSize: 14, letterSpacing: 0.5, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name.toUpperCase()}</div>
                <div style={{ fontSize: 11, color: "#fffb" }}>{[m.pos, m.yrs, m.ind && `inducted ${m.ind}`].filter(Boolean).join(" · ")}{m.mine && <b style={{ color: "#fde68a" }}> · YOUR LEAGUE</b>}</div>
              </div>
            </div>
          ))}
        </div>
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
