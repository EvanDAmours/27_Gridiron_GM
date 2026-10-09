// The franchise hub, laid out like Madden's: a menu on the left, this week's matchup in the
// middle (week strip, both logos, team ratings), and top stories on the right.
import React from "react";
import { C, TeamLogo, Btn, kickoff } from "./ui.jsx";
import { unitRatings } from "./gamesim.js";
import { depthOrderFor } from "./DepthChart.jsx";
import { ROUND_NAMES } from "./playoffs.js";

const rec = (t) => `${t.w}-${t.l}${t.t ? `-${t.t}` : ""}`;
const PHASE = { preseason: "Preseason", combine: "Offseason: NFL Combine", resign: "Offseason: Re-sign Week", freeagency: "Offseason: Free Agency", draft: "Offseason: NFL Draft" };

// Madden-style team ratings from each club's healthy starters (yours by your depth chart and snaps).
export function teamRatings(t, depthOrder, snaps) {
  const healthy = (t.roster || []).filter((p) => !p.injured && !p.holdout);
  const u = unitRatings((pos) => depthOrderFor(healthy, depthOrder, pos, snaps));
  const off = Math.round(u.pass * 0.6 + u.run * 0.4), def = Math.round(u.passD * 0.6 + u.runD * 0.4);
  return { ovr: Math.round(off * 0.5 + def * 0.5), off, def };
}

function RatingBoxes({ mine, other }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {["ovr", "off", "def"].map((k) => {
        const best = mine[k] >= other[k];
        return (
          <div key={k} style={{ textAlign: "center", minWidth: 56 }}>
            <div style={{ fontSize: 26, fontWeight: 900, padding: "2px 8px", borderRadius: "6px 6px 0 0", border: `2px solid ${best ? C.gn : "#94a3b8"}`, borderBottom: 0, background: best ? `${C.gn}22` : "transparent" }}>{mine[k]}</div>
            <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1, padding: "1px 0", borderRadius: "0 0 6px 6px", background: best ? C.gn : "#94a3b8", color: "#0b1220" }}>{k.toUpperCase()}</div>
          </div>
        );
      })}
    </div>
  );
}

function Side({ t, rating, other, align }) {
  return (
    <div style={{ textAlign: align, minWidth: 0 }}>
      <div style={{ fontSize: 18, color: "#e2e8f0" }}>{t.city}</div>
      <div style={{ fontSize: "clamp(26px, 4.2vw, 44px)", fontWeight: 900, letterSpacing: 1, lineHeight: 1, textTransform: "uppercase" }}>{t.name}</div>
      <div style={{ fontSize: 16, color: "#cbd5e1", margin: "4px 0 8px" }}>{rec(t)}</div>
      <div style={{ display: "flex", justifyContent: align === "right" ? "flex-end" : "flex-start" }}><RatingBoxes mine={rating} other={other} /></div>
    </div>
  );
}

export default function HomeScreen({ teams, ui, depthOrder, playingTime, sched, wk, sp, yr, pb, byeMap, news, messages, menu, primary, onNav }) {
  const me = teams[ui];
  const inSeason = sp === "regular" || sp === "preseason";
  const nextWk = sp === "preseason" ? 1 : wk + 1;
  // This week's game (or the next playoff game).
  let game = null, label = PHASE[sp] || `${yr} Week ${nextWk}: Gameday`;
  if (sp === "regular") { game = sched.find((g) => g.wk === nextWk && (g.h === ui || g.a === ui)); label = `${yr} Week ${nextWk}: ${game ? "Gameday" : "Bye Week"}`; }
  if (sp === "preseason") { game = sched.find((g) => g.wk === 1 && (g.h === ui || g.a === ui)); label = `${yr} Preseason`; }
  if (sp === "playoffs" && pb) {
    const m = pb.ch == null && pb.m.find(([h, a]) => h === ui || a === ui);
    if (m) game = { h: m[0], a: m[1] };
    label = pb.ch != null ? `${yr} Season Complete` : `${yr} Playoffs: ${ROUND_NAMES[pb.rd]}`;
  }
  // Week strip: last week, this week, and the next few.
  const strip = inSeason ? Array.from({ length: 5 }, (_, i) => Math.max(1, Math.min(14, nextWk - 1)) + i).filter((w) => w <= 18) : [];
  const away = game && teams[game.a], home = game && teams[game.h];
  const mine = (t) => (t === me ? [depthOrder, playingTime] : []);
  const ra = away && teamRatings(away, ...mine(away)), rh = home && teamRatings(home, ...mine(home));
  const bg = `radial-gradient(ellipse at 50% 35%, ${me.clr}55, transparent 60%), linear-gradient(160deg, #0b2a33, #050b12 70%)`;
  return (
    <div style={{ borderRadius: 14, overflow: "hidden", background: bg, border: `1px solid ${C.bd}`, marginBottom: 14, position: "relative" }}>
      <style>{"@media (max-width: 760px) { .hm-main { order: -1; padding: 12px !important } .hm-menu, .hm-side { max-width: none !important; border: 0 !important } .hm-logo > * { width: clamp(72px, 26vw, 150px) !important; height: clamp(72px, 26vw, 150px) !important } }"}</style>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 0 }}>
        {/* Menu */}
        <div className="hm-menu" style={{ flex: "1 1 220px", maxWidth: 300, padding: 18, borderRight: `1px solid #ffffff14`, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, paddingBottom: 8, borderBottom: "1px solid #ffffff22", marginBottom: 8 }}>Menu</div>
          {menu.map((m, i) => (
            <button key={m.label} onClick={m.onClick} style={{ textAlign: "left", background: i === 0 ? "#00000055" : "transparent", border: i === 0 ? "1px solid #f97316" : "1px solid transparent", borderRadius: 8, padding: i === 0 ? "10px 12px" : "6px 12px", color: "#fff", cursor: "pointer" }}>
              <div style={{ fontSize: i === 0 ? 17 : 16, fontWeight: i === 0 ? 800 : 500 }}>{m.label}</div>
              {i === 0 && m.sub && <div style={{ fontSize: 13, color: "#cbd5e1", marginTop: 2 }}>{m.sub}</div>}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          {messages > 0 && (
            <button onClick={() => onNav("log")} style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10, background: "#ffffff14", border: "1px solid #ffffff22", borderRadius: 8, padding: "10px 12px", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 800 }}>
              ✉ {messages} NEW MESSAGE{messages > 1 ? "S" : ""} <span style={{ color: C.rd }}>●</span>
            </button>
          )}
        </div>

        {/* Matchup */}
        <div className="hm-main" style={{ flex: "3 1 460px", minWidth: 0, padding: 18 }}>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>{label}</div>
          {strip.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto" }}>
              {strip.map((w) => {
                const g = sched.find((x) => x.wk === w && (x.h === ui || x.a === ui));
                const opp = g && teams[g.h === ui ? g.a : g.h];
                const us = g?.played ? (g.h === ui ? g.hs : g.as) : null, them = g?.played ? (g.h === ui ? g.as : g.hs) : null;
                const cur = w === nextWk;
                return (
                  <div key={w} style={{ flex: "1 0 82px", textAlign: "center" }}>
                    <div style={{ height: 44, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: cur ? me.clr : "#ffffff10", border: `2px solid ${cur ? "#fff" : "#ffffff40"}`, opacity: g?.played || cur ? 1 : 0.75 }}>
                      {opp ? <TeamLogo t={opp} sz={34} /> : <span style={{ fontWeight: 900, fontSize: 18 }}>BYE</span>}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 800, marginTop: 4, color: us == null ? "#cbd5e1" : us > them ? C.gn : us < them ? C.rd : "#cbd5e1" }}>{us == null ? `WEEK ${w}` : `${us > them ? "W" : us < them ? "L" : "T"} ${us}-${them}`}</div>
                  </div>
                );
              })}
            </div>
          )}
          {game ? (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4%", margin: "6px 0 4px" }}>
                <span className="hm-logo"><TeamLogo t={away} sz={150} /></span>
                <div style={{ fontSize: 36, fontWeight: 900, color: "#e2e8f0" }}>AT</div>
                <span className="hm-logo"><TeamLogo t={home} sz={150} /></span>
              </div>
              <div style={{ textAlign: "center", fontSize: 15, color: "#cbd5e1", marginBottom: 14 }}>{sp === "playoffs" && pb?.rd === 4 ? "Super Bowl · neutral site" : game.date ? `${kickoff(game)} · ${game.venue}${game.intl ? `, ${game.city}` : ""}` : `1:00 PM · ${home.city}`}</div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <Side t={away} rating={ra} other={rh} align="left" />
                <Side t={home} rating={rh} other={ra} align="right" />
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "30px 10px" }}>
              <span className="hm-logo"><TeamLogo t={me} sz={150} /></span>
              <div style={{ fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 900, textTransform: "uppercase", marginTop: 10 }}>{sp === "regular" ? "Bye week" : PHASE[sp]?.replace("Offseason: ", "") || "Season complete"}</div>
              <div style={{ fontSize: 16, color: "#cbd5e1", marginTop: 4 }}>{me.city} {me.name} · {rec(me)}</div>
            </div>
          )}
          {primary.length > 0 && (
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 18 }}>
              {primary.map((b, i) => <Btn key={b.label} onClick={b.onClick} bg={i === 0 ? C.gn : "#ffffff22"} c="#fff" style={{ fontSize: 17, padding: "11px 22px", fontWeight: 900 }}>{b.label}</Btn>)}
            </div>
          )}
        </div>

        {/* Top stories */}
        <div className="hm-side" style={{ flex: "1 1 240px", maxWidth: 320, padding: 18, borderLeft: `1px solid #ffffff14`, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, paddingBottom: 8, borderBottom: "1px solid #ffffff22", marginBottom: 10 }}>Top Stories</div>
          {news.length === 0 && <div style={{ fontSize: 15, color: "#cbd5e1" }}>Quiet around the league so far.</div>}
          {news.map((n, i) => (
            <div key={i} style={{ background: i === 0 ? `linear-gradient(135deg, ${n.team?.clr || "#1e3a5f"}cc, #0b1220)` : "#ffffff0d", border: "1px solid #ffffff1a", borderRadius: 10, padding: 12, marginBottom: 10 }}>
              {n.team && <div style={{ marginBottom: 6 }}><TeamLogo t={n.team} sz={i === 0 ? 46 : 28} /></div>}
              <div style={{ fontSize: i === 0 ? 17 : 14, fontWeight: i === 0 ? 800 : 600, lineHeight: 1.35 }}>{n.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
