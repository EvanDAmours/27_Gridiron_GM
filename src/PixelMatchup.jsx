import React, { useState } from 'react';
import { TeamLogo } from './ui.jsx';
import { matchupPortraitPath } from './matchupPortraitAssets.js';
import './pixel-matchup.css';

const h = React.createElement;
const displayRating = value => Number.isFinite(value) ? Math.round(value) : '—';

// Matchup portraits are separate artwork; preserve readable jersey numbers.
export function PixelPlayer({ player, team, uniform = 'home' }) {
  const src = matchupPortraitPath(team?.ab, player?.pos, uniform);
  return h('figure', { className: 'pxm-player' },
    h(SpriteImage, { key: src, src, ab: team?.ab }),
    h('figcaption', null,
      h('strong', null, player?.name || `${team?.ab || ''} ${uniform === 'away' ? 'offense' : 'defense'}`),
      player && h('span', null, `${player.pos} • ${displayRating(player.ovr)} OVR`)));
}

function SpriteImage({ src, ab }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return h('div', { className: 'pxm-sprite-fallback', 'aria-hidden': true }, ab || 'NFL');
  return h('img', {
    className: 'pxm-sprite',
    src, alt: '', width: 360, height: 360, decoding: 'async',
    onError: () => setFailed(true),
  });
}

function Ratings({ mine = {}, other = {} }) {
  return h('div', { className: 'pxm-ratings' }, ...['ovr', 'off', 'def'].map(key => {
    const ahead = Number.isFinite(mine[key]) && Number.isFinite(other[key]) && mine[key] >= other[key];
    return h('div', { key, className: `pxm-rating${ahead ? ' pxm-rating--ahead' : ''}` },
      h('strong', null, displayRating(mine[key])), h('span', null, key.toUpperCase()));
  }));
}

function TeamSummary({ team, rating, other }) {
  return h('section', { className: 'pxm-team', 'aria-label': `${team.city} ${team.name} team ratings` },
    h('span', { className: 'pxm-city' }, team.city),
    h('h3', null, team.name),
    h('p', { className: 'pxm-record' }, `${team.w ?? 0}–${team.l ?? 0}${team.t ? `–${team.t}` : ''}`),
    h(Ratings, { mine: rating, other }));
}

// Ratings, records, players, venue and kickoff are passed from the live game.
// Uniform overrides are optional for alternate jerseys or neutral-site games.
export default function PixelMatchup({ away, home, awayPlayer, homePlayer, awayRating,
  homeRating, label, kickoff, venue, awayUniform = 'away', homeUniform = 'home', compact = false, prime = null, rivalry = false }) {
  if (!away || !home) return null;
  // big games dress up: a night game under the lights, a rivalry in both clubs' colors
  const cls = `pxm-card keep-dark${compact ? ' pxm-compact' : ''}${prime ? ' pxm-prime' : ''}${rivalry ? ' pxm-rival' : ''}`;
  return h('article', { className: cls, style: rivalry ? { '--pxm-a': away.clr || '#334155', '--pxm-h': home.clr || '#334155' } : undefined, 'aria-label': `${away.city} ${away.name} at ${home.city} ${home.name}` },
    h('header', { className: 'pxm-label' }, label,
      (prime || rivalry) && h('span', { className: 'pxm-badges' },
        rivalry && h('span', { className: 'pxm-badge pxm-badge--rival' }, 'RIVALRY WEEK'),
        prime && h('span', { className: 'pxm-badge pxm-badge--prime' }, `★ ${prime.toUpperCase()}`))),
    h('div', { className: 'pxm-field' },
      h('div', { className: 'pxm-yardmarks', 'aria-hidden': true }, ...['30', '40', '50', '40', '30'].map((mark, i) => h('span', { key: i }, mark))),
      h('div', { className: 'pxm-matchup' },
        h(PixelPlayer, { player: awayPlayer, team: away, uniform: awayUniform }),
        h('div', { className: 'pxm-logos', 'aria-hidden': true },
          h(TeamLogo, { t: away, sz: 96, glow: true }), h('b', null, 'AT'), h(TeamLogo, { t: home, sz: 96, glow: true })),
        h(PixelPlayer, { player: homePlayer, team: home, uniform: homeUniform }))),
    h('div', { className: 'pxm-kickoff' },
      kickoff && h('strong', null, kickoff), venue && h('span', null, venue)),
    h('div', { className: 'pxm-teams' },
      h(TeamSummary, { team: away, rating: awayRating, other: homeRating }),
      h(TeamSummary, { team: home, rating: homeRating, other: awayRating })));
}

