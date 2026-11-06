// The live game's broadcast drive tracker: the play-by-play grouped into drives (who had it, how
// many plays and yards, how long, how it ended), with the current drive on top.
import React from "react";
import { C, TeamLogo } from "./ui.jsx";
import { drivesOf } from "./drives.js";

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, s % 60)).padStart(2, "0")}`;

// One line under the field: the current drive so far.
export function DriveStrip({ log, team, mobile }) {
  const ds = drivesOf(log);
  const d = ds[ds.length - 1];
  if (!d || d.over) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: mobile ? 13 : 14, color: "#cbd5e1", padding: "6px 2px" }}>
      {team && <TeamLogo t={team} sz={18} />}
      <b style={{ color: "#fff" }}>Drive</b>
      <span>{d.plays.length} play{d.plays.length === 1 ? "" : "s"}</span><span style={{ color: C.mt }}>·</span>
      <span>{d.yds} yd{Math.abs(d.yds) === 1 ? "" : "s"}</span><span style={{ color: C.mt }}>·</span>
      <span>{mmss(d.t1 - d.t0)}</span>
    </div>
  );
}

// The feed: drives newest first. The current drive is open and shows its plays; finished drives
// are one line each and open on tap.
export function DriveFeed({ log, teams, userSide, max = 40 }) {
  const ds = drivesOf(log).slice(-max).reverse();
  const [open, setOpen] = React.useState(null);
  if (!ds.length) return <div style={{ fontSize: 14, color: C.mt, padding: "6px 2px" }}>{(log || []).length ? log[log.length - 1].text : "Waiting for kickoff."}</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {ds.map((d, i) => {
        const live = i === 0 && !d.over, show = live || open === d.t0 + d.poss;
        const t = teams[d.poss], mine = d.poss === userSide;
        return (
          <div key={`${d.t0}${d.poss}`} style={{ background: live ? "#ffffff12" : "#ffffff0a", borderRadius: 12, padding: "8px 10px", boxShadow: mine ? "inset 3px 0 0 #22c55e" : "none" }}>
            <div onClick={() => !live && setOpen(show ? null : d.t0 + d.poss)} style={{ display: "flex", alignItems: "center", gap: 8, cursor: live ? "default" : "pointer" }}>
              {t && <TeamLogo t={t} sz={20} />}
              <b style={{ fontSize: 14 }}>{t?.ab}</b>
              <span style={{ fontSize: 13, color: "#94a3b8", flex: 1, minWidth: 0, whiteSpace: "nowrap" }}>{d.plays.length} play{d.plays.length === 1 ? "" : "s"} · {d.yds} yds · {mmss(d.t1 - d.t0)}</span>
              {live ? <span style={{ fontSize: 12, fontWeight: 800, color: "#38bdf8" }}>ON THE FIELD</span>
                : d.result && <span style={{ fontSize: 12, fontWeight: 800, color: d.result[1] }}>{d.result[0]}</span>}
            </div>
            {show && <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 3 }}>
              {[...d.plays].reverse().map((e, k) => (
                <div key={k} style={{ fontSize: 13, lineHeight: 1.35, color: e.type === "td" ? "#86efac" : e.type === "int" || e.type === "fumble" ? "#fca5a5" : "#cbd5e1" }}>
                  <span style={{ color: "#64748b", fontVariantNumeric: "tabular-nums", marginRight: 6 }}>{e.qtr === "OT" ? "OT" : `Q${e.qtr}`} {mmss(e.clock ?? 0)}</span>{e.text}{e.by && <span style={{ color: "#64748b" }}> ({e.by.join(", ")})</span>}
                </div>
              ))}
            </div>}
          </div>
        );
      })}
    </div>
  );
}

// The drive chart under the arcade field, like a broadcast's: the field from end zone to end zone
// with each play of the drive as an arrow (runs gold, passes blue, losses red, scores green; an
// incompletion a ring, a flag a square), the line of scrimmage and the line to gain. The home club
// goes left to right, so a drive always reads the same way. A fixed height: nothing moves play to play.
const KIND = (e) => (e.type === "td" ? "td" : e.type === "int" || e.type === "fumble" ? "to" : e.type === "inc" ? "inc" : e.type === "penalty" ? "flag" : e.type === "sack" || (Number.isFinite(e.yards) && e.yards < 0) ? "loss" : e.k === "pass" || e.type === "pass" ? "pass" : "run");
const KCLR = { run: "#f5b83d", pass: "#38bdf8", loss: "#ef4444", td: "#22c55e", to: "#ef4444", inc: "#94a3b8", flag: "#facc15" };
export function DriveChart({ log, teams, userSide, poss, yard, toGo, momentum }) {
  const ref = React.useRef(null), [w, setW] = React.useState(0);
  React.useEffect(() => { const el = ref.current; if (!el || typeof ResizeObserver === "undefined") return; const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width))); ro.observe(el); setW(el.clientWidth); return () => ro.disconnect(); }, []);
  const ds = drivesOf(log), d = ds[ds.length - 1], t = d ? teams[d.poss] : null, me = teams[userSide];
  const H = 50, sx = (abs) => ((abs + 10) / 120) * w, abs = (side, y) => (side === "h" ? y : 100 - y);
  const plays = d ? d.plays.filter((e) => Number.isFinite(e.y0)).slice(-7) : [];
  const rowH = Math.min(9, (H - 10) / Math.max(1, plays.length)), mc = momentum >= 65 ? "#22c55e" : momentum <= 35 ? "#ef4444" : "#f59e0b";
  const live = d && !d.over && poss === d.poss, los = live ? sx(abs(poss, yard)) : null, gain = live && yard + toGo < 100 ? sx(abs(poss, yard + toGo)) : null;
  return (
    <div style={{ height: 112, boxSizing: "border-box", background: C.cd, borderRadius: 10, padding: "7px 10px 8px", display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, height: 20, whiteSpace: "nowrap", overflow: "hidden", fontSize: 13, color: "#cbd5e1" }}>
        {t && <TeamLogo t={t} sz={18} />}
        <b style={{ color: "#fff" }}>{d ? `${t?.ab} drive` : "Kickoff"}</b>
        {d && <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{d.plays.length} play{d.plays.length === 1 ? "" : "s"} · {d.yds} yd{Math.abs(d.yds) === 1 ? "" : "s"} · {mmss(d.t1 - d.t0)}</span>}
        {d?.over && d.result && <b style={{ marginLeft: "auto", color: d.result[1] }}>{d.result[0]}</b>}
      </div>
      <div ref={ref} style={{ flex: 1, minWidth: 0 }}>
        {w > 0 && <svg width={w} height={H} style={{ display: "block" }} aria-label="Drive chart">
          <rect x={0} y={0} width={w} height={H} rx={6} fill="#14532d" />
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => <rect key={i} x={sx(i * 10 - 10)} y={0} width={sx(10) - sx(0)} height={H} fill={i % 2 ? "#166534" : "#15803d"} opacity={0.55} />)}
          <rect x={0} y={0} width={sx(0)} height={H} fill={teams.h?.clr || "#334155"} opacity={0.75} rx={6} />
          <rect x={sx(100)} y={0} width={w - sx(100)} height={H} fill={teams.a?.clr || "#334155"} opacity={0.75} rx={6} />
          {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((y) => <g key={y}><line x1={sx(y)} x2={sx(y)} y1={0} y2={H} stroke="#ffffff" strokeOpacity={y === 50 ? 0.45 : 0.22} /><text x={sx(y)} y={H - 3} fill="#ffffff" fillOpacity={0.45} fontSize={9} fontWeight={700} textAnchor="middle">{y > 50 ? 100 - y : y}</text></g>)}
          {los != null && <line x1={los} x2={los} y1={0} y2={H} stroke="#3b82f6" strokeWidth={2} />}
          {gain != null && <line x1={gain} x2={gain} y1={0} y2={H} stroke="#facc15" strokeWidth={2} />}
          {plays.map((e, i) => {
            const k = KIND(e), c = KCLR[k], y = 5 + i * rowH + rowH / 2, x0 = sx(abs(e.poss, e.y0)), x1 = sx(abs(e.poss, Math.max(-10, Math.min(110, e.y0 + (e.yards || 0))))), dir = x1 >= x0 ? 1 : -1, a = Math.min(5, rowH * 0.6);
            if (k === "inc") return <circle key={i} cx={x0} cy={y} r={Math.max(2, a * 0.6)} fill="none" stroke={c} strokeWidth={1.5} />;
            if (k === "flag") return <rect key={i} x={x0 - 2.5} y={y - 2.5} width={5} height={5} fill={c} />;
            return <g key={i}><line x1={x0} x2={x1 - dir * a * 0.6} y1={y} y2={y} stroke={c} strokeWidth={Math.max(2, rowH * 0.4)} strokeLinecap="round" /><polygon points={`${x1},${y} ${x1 - dir * a},${y - a * 0.75} ${x1 - dir * a},${y + a * 0.75}`} fill={c} />{k === "to" && <text x={x1 + dir * 6} y={y + 3} fill={c} fontSize={10} fontWeight={900} textAnchor="middle">X</text>}</g>;
          })}
        </svg>}
      </div>
      {me && <div style={{ display: "flex", alignItems: "center", gap: 8, height: 16, fontSize: 12, color: C.mt, whiteSpace: "nowrap" }} title="How your team is rolling: big plays, scores and turnovers">{me.ab} momentum<span style={{ flex: 1, height: 6, background: "#1e293b", borderRadius: 3, overflow: "hidden", display: "inline-block" }}><span style={{ display: "block", height: "100%", width: `${momentum}%`, background: mc, transition: "width .3s ease" }} /></span><b style={{ color: mc, minWidth: 34, textAlign: "right" }}>{momentum >= 65 ? "Hot" : momentum <= 35 ? "Cold" : "Even"}</b></div>}
    </div>
  );
}
