// Homepage artwork is separate from the original gameplay sprites.
import { spriteGroup, spriteTeam } from './spriteAssets.js';
const teams = new Set('ARI ATL BAL BUF CAR CHI CIN CLE DAL DEN DET GB HOU IND JAX KC LV LAC LAR MIA MIN NE NO NYG NYJ PHI PIT SF SEA TB TEN WAS'.split(' '));
export function matchupPortraitPath(ab, pos, uniform = 'home', base = import.meta.env?.BASE_URL || './') {
  const team = spriteTeam(ab);
  const group = spriteGroup(pos);
  if (!teams.has(team) || !group) return null;
  return `${base.replace(/\/?$/, '/')}matchup-portraits/${group}_${team}_${uniform === 'away' ? 'away' : 'home'}.webp`;
}

