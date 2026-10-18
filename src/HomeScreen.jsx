// The franchise hub, laid out like Madden's: a menu on the left, this week's matchup in the
// middle (week strip, both logos, team ratings), and top stories on the right.
import React, { useState } from "react";
import { C, TeamLogo, Btn, kickoff, Bdg, oC } from "./ui.jsx";
import { unitRatings } from "./gamesim.js";
import { depthOrderFor } from "./DepthChart.jsx";
import { ROUND_NAMES } from "./playoffs.js";
import { highestRatedPlayer } from "./spriteAssets.js";
import { InjTag } from "./InjuryTag.jsx";
import { injuryReport } from "./injuries.js";
import PixelMatchup from "./PixelMatchup.jsx";
import MatchupStakes from "./MatchupStakes.jsx";
import { teamNeeds, needName } from "./needs.js";
import { primeSlot } from "./seasonPreview.js";

const rec = (t) => `${t.w}-${t.l}${t.t ? `-${t.t}` : ""}`;
const PHASE = { preseason: "Preseason", combine: "Offseason: NFL Combine", resign: "Offseason: Re-sign Week", freeagency: "Offseason: Free Agency", draft: "Offseason: NFL Draft" };

// Madden-style team ratings from each club's healthy starters (yours by your depth chart and snaps).
export function teamRatings(t, depthOrder, snaps) {
  const healthy = (t.roster || []).filter((p) => !p.injured && !p.holdout);
  const u = unitRatings((pos) => depthOrderFor(healthy, depthOrder, pos, snaps));
  const off = Math.round(u.pass * 0.6 + u.run * 0.4), def = Math.round(u.passD * 0.6 + u.runD * 0.4);
  return { ovr: Math.round(off * 0.5 + def * 0.5), off, def };
}

// Phones: the matchup as a compact card (logos, records, team ratings, kickoff) instead of the
// big illustrated one, so the week's to-dos fit on the first screen.
function CompactMatchup({ away, home, ra, rh, label, kickoff }) {
  const Side = ({ t, r }) => (
    <div style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
      <div style={{ display: "inline-flex" }}><TeamLogo t={t} sz={48} glow /></div>
      <div style={{ fontSize: 15, fontWeight: 900, marginTop: 2 }}>{t.name}</div>
      <div style={{ fontSize: 12, color: "#cbd5e1" }}>{rec(t)}</div>
      {r && <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 4 }}>{[["OVR", r.ovr], ["OFF", r.off], ["DEF", r.def]].map(([k, v]) => <span key={k} style={{ fontSize: 11, fontWeight: 800, color: "#e2e8f0", background: "#ffffff14", borderRadius: 6, padding: "2px 5px" }}>{k} <b style={{ color: v >= 85 ? C.gn : v >= 75 ? "#a3e635" : "#cbd5e1" }}>{v}</b></span>)}</div>}
    </div>
  );
  return (
    <div style={{ background: "#00000040", border: "1px solid #ffffff1a", borderRadius: 12, padding: "10px 8px" }}>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.4, color: "#94a3b8", textAlign: "center", marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}><Side t={away} r={ra} /><b style={{ fontSize: 14, color: "#94a3b8" }}>AT</b><Side t={home} r={rh} /></div>
      <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", marginTop: 6 }}>{kickoff}</div>
    </div>
  );
}

// This week's top stories (written after every week), with the league wire as a fallback.
function Stories({ stories, news, teams, onStory }) {
  if (!stories.length && !news.length) return <div style={{ fontSize: 15, color: "#cbd5e1" }}>Quiet around the league so far. Stories arrive after every week.</div>;
  if (!stories.length) return news.map((n, i) => (
    <div key={i} style={{ background: "#ffffff0d", border: "1px solid #ffffff1a", borderRadius: 10, padding: 12, marginBottom: 10 }}>
      {n.team && <div style={{ marginBottom: 6 }}><TeamLogo t={n.team} sz={28} /></div>}
      <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.35 }}>{n.text}</div>
    </div>
  ));
  // a short list (the off-season's retirement story) tops up from the league wire
  const wire = stories.length < 3 ? news.slice(0, 3 - stories.length).map((n, i) => (
    <div key={`w${i}`} style={{ background: "#ffffff0d", border: "1px solid #ffffff1a", borderRadius: 10, padding: 12, marginBottom: 10 }}>
      {n.team && <div style={{ marginBottom: 6 }}><TeamLogo t={n.team} sz={28} /></div>}
      <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.35 }}>{n.text}</div>
    </div>
  )) : [];
  return [...stories.map((st, i) => {
    const t = teams[st.team];
    return (
      <div key={st.id} onClick={(st.inc || st.retire) && onStory ? () => onStory(st) : undefined} title={st.inc ? "Read the full story" : st.retire ? "See everyone who retired" : undefined} style={{ cursor: (st.inc || st.retire) && onStory ? "pointer" : "default", background: i === 0 ? `linear-gradient(135deg, ${t?.clr || "#1e3a5f"}cc, #0b1220)` : "#ffffff0d", border: `1px solid ${st.mine ? "#f97316" : "#ffffff1a"}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          {t && <TeamLogo t={t} sz={i === 0 ? 40 : 26} />}
          {st.breaking && <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1, color: "#fff", background: "#dc2626", borderRadius: 4, padding: "2px 6px" }}>BREAKING</span>}
          {st.mine && <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1, color: "#fdba74" }}>YOUR TEAM</span>}
        </div>
        <div style={{ fontSize: i === 0 ? 17 : 15, fontWeight: 800, lineHeight: 1.3 }}>{st.head}</div>
        <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.45, marginTop: 4 }}>{st.text}</div>
        {(st.inc || st.retire) && onStory && <div style={{ fontSize: 12, fontWeight: 800, color: "#7dd3fc", marginTop: 6 }}>{st.retire ? "👋 See the whole retirement class →" : "📰 Read the full story →"}</div>}
      </div>
    );
  }), ...wire];
}

// Your injured players, then the biggest names out around the league.
function Injuries({ teams, ui, onNav, wk }) {
  const mine = injuryReport(teams[ui], wk);
  const league = teams.flatMap((t, i) => (i === ui ? [] : injuryReport(t, wk).filter(({ p, st }) => p.ovr >= 78 && st.tag !== "Q").map(({ p, st }) => ({ p, t, st })))).sort((a, b) => b.p.ovr - a.p.ovr).slice(0, 8);
  const row = (p, t, st) => (
    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid #ffffff14" }}>
      {t && <TeamLogo t={t} sz={22} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name} <span style={{ color: "#94a3b8", fontWeight: 600 }}>{p.pos} {p.ovr}</span></div>
        <div style={{ fontSize: 12, display: "flex", alignItems: "center" }}><InjTag st={st} showNote style={{ marginLeft: 0 }} /></div>
      </div>
    </div>
  );
  return (
    <>
      <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1, color: "#94a3b8", margin: "2px 0 4px" }}>YOUR TEAM · {mine.length}</div>
      {mine.length ? mine.map(({ p, st }) => row(p, null, st)) : <div style={{ fontSize: 14, color: C.gn, padding: "6px 0 10px" }}>Fully healthy.</div>}
      <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1, color: "#94a3b8", margin: "14px 0 4px" }}>AROUND THE LEAGUE</div>
      {league.length ? league.map(({ p, t, st }) => row(p, t, st)) : <div style={{ fontSize: 14, color: "#cbd5e1", padding: "6px 0" }}>No big names out.</div>}
      {mine.length > 0 && <button onClick={() => onNav("roster")} style={{ marginTop: 10, background: "transparent", border: 0, color: "#7dd3fc", fontSize: 13, cursor: "pointer", padding: 0 }}>Manage roster →</button>}
    </>
  );
}

// The off-season (and bye weeks) has no matchup: the middle shows the club's needs and the
// players whose futures are on the table, each a shortcut to the screen where you act on it.
function OffseasonBoard({ me, sp, onNav }) {
  const needs = teamNeeds(me.roster).list.filter((x) => x.score >= 0.2).slice(0, 4);
  const expiring = me.roster.filter((p) => (p.contract ?? 2) <= 1).sort((a, b) => b.ovr - a.ovr).slice(0, 5);
  const young = me.roster.filter((p) => (p.age || 30) <= 24).sort((a, b) => b.ovr - a.ovr).slice(0, 5);
  const keep = sp === "combine" || sp === "resign" || sp === "regular";
  const list = keep && expiring.length ? expiring : young;
  const box = { background: "#00000040", border: "1px solid #ffffff1a", borderRadius: 10, padding: "10px 12px", minWidth: 0, flex: "1 1 260px" };
  const head = { fontSize: 11, fontWeight: 900, letterSpacing: 1.5, color: "#94a3b8", marginBottom: 6 };
  const go = sp === "freeagency" ? "freeagency" : sp === "draft" ? "draft" : sp === "combine" ? "scouting" : "contracts";
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
      <div style={box}>
        <div style={head}>BIGGEST NEEDS</div>
        {needs.length ? needs.map((n) => (
          <button key={n.pos} onClick={() => onNav(go)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", background: "transparent", border: 0, borderBottom: "1px solid #ffffff10", padding: "5px 0", color: "#fff", cursor: "pointer" }}>
            <Bdg pos={n.pos} /><b style={{ fontSize: 14, textTransform: "capitalize" }}>{needName(n.pos)}</b>
            <span style={{ fontSize: 12.5, color: "#94a3b8", marginLeft: "auto", textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.why[0] || ""}</span>
          </button>
        )) : <div style={{ fontSize: 14, color: "#cbd5e1" }}>No glaring holes. Build depth and stay young.</div>}
      </div>
      <div style={box}>
        <div style={head}>{list === expiring ? "DEALS ENDING" : "YOUR YOUNG CORE"}</div>
        {list.map((p) => (
          <button key={p.id} onClick={() => onNav(list === expiring ? (sp === "resign" ? "freeagency" : "contracts") : "roster")} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", background: "transparent", border: 0, borderBottom: "1px solid #ffffff10", padding: "5px 0", color: "#fff", cursor: "pointer" }}>
            <Bdg pos={p.pos} /><span style={{ fontSize: 14, fontWeight: 700, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>{p.age}</span>
            <b style={{ color: oC(p.ovr), minWidth: 22, textAlign: "right" }}>{p.ovr}</b>
          </button>
        ))}
        {!list.length && <div style={{ fontSize: 14, color: "#cbd5e1" }}>Nobody yet.</div>}
      </div>
    </div>
  );
}

export default function HomeScreen({ mobile, teams, ui, depthOrder, playingTime, sched, wk, sp, yr, pb, byeMap, news, stories = [], messages, menu, primary, onNav, side, planCard, onStory, rivalId }) {
  const me = teams[ui];
  // a tall window (big desktop) has room for the full-size matchup art
  const roomy = !mobile && typeof window !== "undefined" && window.innerHeight / (parseFloat(document.documentElement.style.zoom) || 1) >= 900;
  const [panel, setPanel] = useState("stories");
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
    <div className="keep-dark" style={{ borderRadius: 14, overflow: "hidden", background: bg, border: `1px solid ${C.bd}`, marginBottom: 14, position: "relative" }}>
      <style>{"@media (max-width: 760px) { .hm-main { order: -1; padding: 12px !important } .hm-menu, .hm-side { max-width: none !important; border: 0 !important } .hm-logo > * { width: clamp(48px, 15vw, 96px) !important; height: clamp(48px, 15vw, 96px) !important } }"}</style>
      {/* desktop: Home fills the window, so a big screen has no empty band under it */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 0, minHeight: mobile ? undefined : "calc(var(--vh, 100vh) - 200px)" }}>
        {/* Menu */}
        <div className="hm-menu" style={{ flex: "1 1 220px", maxWidth: 300, padding: "14px 14px", borderRight: `1px solid #ffffff14`, display: mobile ? "none" : "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, paddingBottom: 6, borderBottom: "1px solid #ffffff22", marginBottom: 6 }}>This week</div>
          {/* the to-do list scrolls inside its column, so it never makes the page taller */}
          <div style={{ flex: "1 1 0", minHeight: 120, position: "relative" }}><div style={{ position: "absolute", inset: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
          {menu.map((m, i) => (
            <button key={m.label} onClick={m.onClick} style={{ textAlign: "left", background: i === 0 ? "#00000055" : "transparent", border: i === 0 ? "1px solid #f97316" : "1px solid transparent", borderLeft: i > 0 && m.tone ? `3px solid ${m.tone === "urgent" ? C.rd : m.tone === "action" ? C.gd : "#38bdf8"}` : undefined, borderRadius: 8, padding: i === 0 ? "8px 10px" : "4px 10px", color: "#fff", cursor: "pointer" }}>
              <div style={{ fontSize: i === 0 ? 16 : 13.5, fontWeight: i === 0 ? 800 : 600, lineHeight: 1.3 }}>{m.label}</div>
              {i === 0 && m.sub && <div style={{ fontSize: 12.5, color: "#cbd5e1", marginTop: 2 }}>{m.sub}</div>}
            </button>
          ))}
          {menu.length <= 1 && <div style={{ fontSize: 14, color: "#94a3b8", padding: "6px 12px" }}>Nothing else needs you this week.</div>}
          </div></div>
                  </div>

        {/* Matchup */}
        <div className="hm-main" style={{ flex: "3 1 460px", minWidth: 0, padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: mobile ? "wrap" : "nowrap" }}>
          <div style={{ fontSize: 16, fontWeight: 800, whiteSpace: "nowrap" }}>{label}</div>
          {/* in season the top bar has Play/Sim, so the buttons here only show off-season and in the playoffs */}
          {primary.length > 0 && sp !== "regular" && sp !== "preseason" && (
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-start", flexWrap: "wrap", marginBottom: 14 }}>
              {primary.map((b, i) => <Btn key={b.label} onClick={b.onClick} bg={i === 0 ? C.gn : "#ffffff22"} c="#fff" style={{ fontSize: 16, padding: "10px 20px", fontWeight: 900 }}>{b.label}</Btn>)}
            </div>
          )}
          {strip.length > 0 && (
            <div style={{ display: "flex", gap: 6, overflowX: "auto", flex: 1, minWidth: 0, justifyContent: "flex-end" }}>
              {strip.map((w) => {
                const g = sched.find((x) => x.wk === w && (x.h === ui || x.a === ui));
                const opp = g && teams[g.h === ui ? g.a : g.h];
                const us = g?.played ? (g.h === ui ? g.hs : g.as) : null, them = g?.played ? (g.h === ui ? g.as : g.hs) : null;
                const cur = w === nextWk;
                return (
                  <div key={w} style={{ flex: "0 1 64px", minWidth: 48, textAlign: "center" }}>
                    <div style={{ height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: cur ? me.clr : "#ffffff10", border: `2px solid ${cur ? "#fff" : "#ffffff40"}`, opacity: g?.played || cur ? 1 : 0.75 }}>
                      {opp ? <TeamLogo t={opp} sz={22} /> : <span style={{ fontWeight: 900, fontSize: 13 }}>BYE</span>}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 800, marginTop: 1, whiteSpace: "nowrap", color: us == null ? "#cbd5e1" : us > them ? C.gn : us < them ? C.rd : "#cbd5e1" }}>{us == null ? `WK ${w}` : `${us > them ? "W" : us < them ? "L" : "T"} ${us}-${them}`}</div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
          {game && mobile ? (
            <CompactMatchup away={away} home={home} ra={ra} rh={rh} label={sp === "playoffs" ? `${yr} Playoffs: ${ROUND_NAMES[pb?.rd] || "Gameday"}` : `${sp === "preseason" ? "Preseason" : "Regular season"} · Week ${game.wk ?? nextWk}`} kickoff={game.date ? kickoff(game) : "Kickoff TBD"} />
          ) : game ? (
            <PixelMatchup
              key={`${sp}-${game.wk ?? pb?.rd ?? 0}-${game.a}-${game.h}`}
              away={away} home={home}
              awayPlayer={highestRatedPlayer(away)}
              homePlayer={highestRatedPlayer(home)}
              awayRating={ra} homeRating={rh} compact={!mobile && !roomy}
              prime={sp !== "playoffs" ? primeSlot(game) : null} rivalry={rivalId != null && (game.h === rivalId || game.a === rivalId) && (game.h === ui || game.a === ui)}
              label={sp === "playoffs" ? `${yr} Playoffs: ${ROUND_NAMES[pb?.rd] || "Gameday"}` : `${sp === "preseason" ? "Preseason" : "Regular season"} • Week ${game.wk ?? nextWk}`}
              kickoff={game.date ? kickoff(game) : "Kickoff TBD"}
              venue={sp === "playoffs" && pb?.rd === 4 ? "Super Bowl • neutral site" : [game.venue || home.city, game.intl && game.city].filter(Boolean).join(", ")}
            />
          ) : null}
          {game && (sp === "regular" || sp === "playoffs" || sp === "preseason") && <MatchupStakes teams={teams} ui={ui} game={game} sched={sched} wk={wk} ra={ra} rh={rh} playoff={sp === "playoffs"} neutral={!!game.neutral || (sp === "playoffs" && pb?.rd === 4)} />}
          {game && (sp === "regular" || sp === "playoffs") && planCard && <div style={{ marginTop: 12 }}>{planCard}</div>}
          {mobile && menu.length > 0 && (
            <div style={{ marginTop: 12, background: "#00000040", border: "1px solid #ffffff1a", borderRadius: 12, padding: "10px 10px 6px" }}>
              <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.4, color: "#94a3b8", marginBottom: 6 }}>THIS WEEK</div>
              {menu.map((m, i) => (
                <button key={m.label} onClick={m.onClick} style={{ display: "block", width: "100%", textAlign: "left", background: i === 0 ? "#00000055" : "transparent", border: i === 0 ? "1px solid #f97316" : "1px solid transparent", borderLeft: i > 0 && m.tone ? `3px solid ${m.tone === "urgent" ? C.rd : m.tone === "action" ? C.gd : "#38bdf8"}` : undefined, borderRadius: 8, padding: "8px 10px", marginBottom: 4, color: "#fff", cursor: "pointer" }}>
                  <div style={{ fontSize: i === 0 ? 16 : 14, fontWeight: i === 0 ? 800 : 600, lineHeight: 1.35 }}>{m.label}</div>
                  {i === 0 && m.sub && <div style={{ fontSize: 12.5, color: "#cbd5e1", marginTop: 2 }}>{m.sub}</div>}
                </button>
              ))}
            </div>
          )}
          {mobile && side && <div style={{ marginTop: 12 }}>{side}</div>}
          {game ? null : (<>
            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: mobile ? "12px 4px" : "8px 4px 14px", justifyContent: mobile ? "center" : "flex-start" }}>
              <div style={{ display: "inline-flex" }}><TeamLogo t={me} sz={mobile ? 72 : 88} glow /></div>
              <div>
                <div style={{ fontSize: "clamp(24px, 3vw, 34px)", fontWeight: 900, textTransform: "uppercase", lineHeight: 1.05 }}>{sp === "regular" ? "Bye week" : PHASE[sp]?.replace("Offseason: ", "") || "Season complete"}</div>
                <div style={{ fontSize: 15, color: "#cbd5e1", marginTop: 4 }}>{me.city} {me.name} · {rec(me)}</div>
              </div>
            </div>
            <OffseasonBoard me={me} sp={sp} onNav={onNav} />
          </>)}
        </div>

        {/* Top stories */}
        {/* the news up top, your development focus underneath (always on Home) */}
        <div className="hm-side" style={{ flex: "1 1 260px", maxWidth: 340, padding: "14px 14px", borderLeft: `1px solid #ffffff14`, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          <div role="tablist" style={{ display: "flex", gap: 4, paddingBottom: 6, borderBottom: "1px solid #ffffff22" }}>
            {[["stories", "Top Stories"], ["injuries", "Injury Report"]].map(([k, l]) => (
              <button key={k} role="tab" aria-selected={panel === k} onClick={() => setPanel(k)} style={{ flex: 1, background: panel === k ? "#ffffff1f" : "transparent", border: `1px solid ${panel === k ? "#ffffff40" : "transparent"}`, borderRadius: 8, padding: "5px 6px", color: panel === k ? "#fff" : "#94a3b8", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>{l}</button>
            ))}
          </div>
          <div style={mobile ? { maxHeight: side ? 300 : 520, overflowY: "auto", paddingRight: 2 } : { flex: "1 1 0", minHeight: 200, position: "relative" }}>
            <div style={mobile ? undefined : { position: "absolute", inset: 0, overflowY: "auto", paddingRight: 2 }}>
              {panel === "stories" ? <Stories stories={stories} news={news} teams={teams} onStory={onStory} /> : <Injuries teams={teams} ui={ui} onNav={onNav} wk={wk} />}
            </div>
          </div>
          {side && !mobile && <div>{side}</div>}
        </div>
      </div>
    </div>
  );
}
