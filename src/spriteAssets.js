// Paths are relative to Vite's deployment base, including GitHub Pages/mobile.
const aliases = { GNB: 'GB', KCC: 'KC', LVR: 'LV', NEP: 'NE', NOS: 'NO', SFO: 'SF', TBB: 'TB', WSH: 'WAS', JAC: 'JAX' };
const teams = new Set('ARI ATL BAL BUF CAR CHI CIN CLE DAL DEN DET GB HOU IND JAX KC LV LAC LAR MIA MIN NE NO NYG NYJ PHI PIT SF SEA TB TEN WAS'.split(' '));
export function spriteTeam(ab) {
  const key = String(ab || '').toUpperCase();
  return aliases[key] || key;
}
export function spriteGroup(pos) {
  if (['LT', 'LG', 'C', 'RG', 'RT', 'OL'].includes(pos)) return 'OL';
  if (['DE', 'DT', 'NT', 'DL', 'EDGE'].includes(pos)) return 'DL';
  if (['FS', 'SS', 'S', 'DB', 'CB'].includes(pos)) return 'CB';
  if (['MLB', 'ILB', 'OLB', 'LB'].includes(pos)) return 'LB';
  if (['RB', 'FB'].includes(pos)) return 'RB';
  if (['TE', 'WR'].includes(pos)) return 'WR';
  return pos === 'QB' ? 'QB' : null;
}
export function spritePath(ab, pos, uniform = 'home', base = import.meta.env?.BASE_URL || './') {
  const team = spriteTeam(ab);
  if (!teams.has(team)) return null;
  const group = spriteGroup(pos);
  if (!group) return null;
  return `${base.replace(/\/?$/, '/')}sprites/public/sprites/${group}_${team}_${uniform === 'away' ? 'away' : 'home'}.png`;
}

// Read the current roster on every render; never retain a stale featured player.
// Injured/holdout players still count while rostered. Ties keep roster order.
export function highestRatedPlayer(team) {
  return (team?.roster || []).reduce((best, player) => {
    if (!Number.isFinite(player?.ovr)) return best;
    return !best || player.ovr > best.ovr ? player : best;
  }, null);
}
