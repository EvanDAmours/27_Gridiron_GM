// The week's matchup on the home screen, like a TV game promo: each club's half in its colors, its
// star standing large toward the middle (his number is on his jersey: a big one behind each man read
// as one long number across the two halves), the club's record and ratings on the outside, AT
// between them. Prime-time and rivalry games dress up; the holiday trim
// goes around it (HolidayCard). The phone keeps its compact card (HomeScreen CompactMatchup).
import React from "react";
import { TeamLogo } from "./ui.jsx";
import PlayerArt from "./PlayerArt.jsx";
import { BLOCK, FONT_CSS } from "./Spotlight.jsx";
import "./broadcast-matchup.css";

// The face of the club for the promo: its best healthy player who isn't a lineman, kicker or punter,
// leaning to the quarterback, then a receiver (a QB counts 6 OVR better, a WR 3). Anyone at all if
// the club has nobody else.
const NOT_FEATURED = new Set(["LT", "LG", "C", "RG", "RT", "OL", "DL", "K", "P"]);
const LEAN = { QB: 6, WR: 3 };
export function featuredPlayer(team) {
  const roster = (team?.roster || []).filter((p) => Number.isFinite(p?.ovr));
  const pool = roster.filter((p) => !NOT_FEATURED.has(p.pos) && !p.injured && !p.holdout);
  const score = (p) => p.ovr + (LEAN[p.pos] || 0);
  return (pool.length ? pool : roster).reduce((best, p) => (!best || score(p) > score(best) ? p : best), null);
}

const show = (v) => (Number.isFinite(v) ? Math.round(v) : "–");
function Ratings({ mine = {}, other = {} }) {
  return (
    <div className="bm-ratings">
      {["ovr", "off", "def"].map((k) => {
        const ahead = Number.isFinite(mine[k]) && Number.isFinite(other[k]) && mine[k] >= other[k];
        return <div key={k} className={`bm-rating${ahead ? " bm-rating--ahead" : ""}`}><b>{show(mine[k])}</b><span>{k.toUpperCase()}</span></div>;
      })}
    </div>
  );
}

function Half({ team, player, rating, other, home }) {
  return (
    <div className={`bm-half${home ? " bm-half--home" : ""}`}>
      {player && <div className="bm-art"><PlayerArt p={player} ab={team.ab} width={200} crop={0.92} /></div>}
      <div className="bm-info">
        <div className="bm-logo"><TeamLogo t={team} sz={46} glow /></div>
        <div className="bm-city">{team.city}</div>
        <div className="bm-name">{team.name}</div>
        <div className="bm-record">{team.w ?? 0}-{team.l ?? 0}{team.t ? `-${team.t}` : ""}</div>
        {player && <>
          <div className="bm-kicker">STAR TO WATCH</div>
          <div className="bm-star">{player.name}</div>
          <div className="bm-pos">{player.pos} · {player.ovr} OVR</div>
        </>}
        <Ratings mine={rating} other={other} />
      </div>
    </div>
  );
}

// away, home: the clubs. awayRating, homeRating: { ovr, off, def }. label: the week. kickoff, venue,
// weather ({ kind, icon, label, note }): the game. prime: the night slot's name. rivalry: a division
// rival. compact: a shorter card (a small laptop screen, so the home screen fits without scrolling).
export default function BroadcastMatchup({ away, home, awayRating, homeRating, label, kickoff, venue, weather = null, prime = null, rivalry = false, compact = false }) {
  if (!away || !home) return null;
  const cls = `bm-card keep-dark${compact ? " bm-compact" : ""}${prime ? " bm-prime" : ""}${rivalry ? " bm-rival" : ""}`;
  return (
    <article className={cls} aria-label={`${away.city} ${away.name} at ${home.city} ${home.name}`}>
      <style>{FONT_CSS}</style>
      <header className="bm-head">
        <span>{label}</span>
        {rivalry && <span className="bm-badge bm-badge--rival">RIVALRY WEEK</span>}
        {prime && <span className="bm-badge bm-badge--prime">★ {prime.toUpperCase()}</span>}
        <span className="bm-when">{[kickoff, venue].filter(Boolean).join(" · ")}</span>
      </header>
      <div className="bm-body" style={{ "--bm-font": BLOCK, "--bm-a": away.clr || "#334155", "--bm-h": home.clr || "#334155" }}>
        <Half team={away} player={featuredPlayer(away)} rating={awayRating} other={homeRating} />
        <Half team={home} player={featuredPlayer(home)} rating={homeRating} other={awayRating} home />
        <div className="bm-at">AT</div>
        {weather && <div className={`bm-wx bm-wx--${weather.kind}`}><b>{weather.icon} {weather.label}</b>{weather.note ? ` · ${weather.note}` : ""}</div>}
      </div>
    </article>
  );
}
