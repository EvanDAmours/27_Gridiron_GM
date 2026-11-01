// In-season roster updates: real players whose play has outrun their ratings. Each is applied once
// to a save in the season it's made for (a franchise already past it keeps what it has), and only
// raises a player's overall: one who has grown past the update keeps his own numbers. New franchises get the
// same ratings from data/madden27.json.
export const ROSTER_UPDATES = [
  {
    // PFF had him a top-30 corner (coverage top-25) through Week 7, near the league lead in passes
    // defensed, winning in press-man against the opponent's best receiver (Nico Collins: 2 catches).
    id: "2026-10-banks", yr: 2026, name: "Deonte Banks", pos: "CB",
    ovr: 82, pot: 90, dev: "star",
    posAttrs: { manCov: 86, zoneCov: 73, press: 92, ballSkills: 78, tackling: 62, recovery: 95, footwork: 91, playRec: 77 },
  },
  // November 2026: the season's breakout players through Week 7
  {
    // leads the NFL in passing yards (2,246) with 16 TDs (through Week 7). GB, 84 -> 89.
    id: "2026-11-jordan-love", yr: 2026, name: "Jordan Love", pos: "QB",
    ovr: 89, pot: 91, dev: "star",
    posAttrs: { armStr: 97, accuracy: 95, pocketAwr: 91, decisions: 89, mobility: 92, touch: 90, readDef: 90 },
  },
  {
    // third in passing yards (1,921), 13 TDs (through Week 7). CAR, 80 -> 85.
    id: "2026-11-bryce-young", yr: 2026, name: "Bryce Young", pos: "QB",
    ovr: 85, pot: 89, dev: "normal",
    posAttrs: { armStr: 92, accuracy: 94, pocketAwr: 91, decisions: 86, mobility: 91, touch: 92, readDef: 88 },
  },
  {
    // 1,721 passing yards and 13 TDs in his second season (through Week 7). NO, 80 -> 84.
    id: "2026-11-tyler-shough", yr: 2026, name: "Tyler Shough", pos: "QB",
    ovr: 84, pot: 86, dev: "normal",
    posAttrs: { armStr: 96, accuracy: 94, pocketAwr: 82, decisions: 80, mobility: 90, touch: 86, readDef: 82 },
  },
  {
    // tied for the league lead with 16 TD passes (through Week 7). LV, 77 -> 82.
    id: "2026-11-kirk-cousins", yr: 2026, name: "Kirk Cousins", pos: "QB",
    ovr: 82, pot: 82, dev: "normal",
    posAttrs: { armStr: 92, accuracy: 93, pocketAwr: 88, decisions: 85, mobility: 81, touch: 83, readDef: 87 },
  },
  {
    // 561 rushing yards, top six in the league (through Week 7). PIT, 84 -> 87.
    id: "2026-11-jaylen-warren", yr: 2026, name: "Jaylen Warren", pos: "RB",
    ovr: 87, pot: 89, dev: "normal",
    posAttrs: { vision: 90, elusiveness: 90, breakTkl: 91, receiving: 75, burst: 97, balance: 95, stiffArm: 79 },
  },
  {
    // 540 rushing yards (through Week 7). CAR, 83 -> 86.
    id: "2026-11-chuba-hubbard", yr: 2026, name: "Chuba Hubbard", pos: "RB",
    ovr: 86, pot: 88, dev: "normal",
    posAttrs: { vision: 92, elusiveness: 88, breakTkl: 87, receiving: 76, burst: 95, balance: 90, stiffArm: 81 },
  },
  {
    // 418 rushing yards at 22 as the Jets' lead back (through Week 7). NYJ, 73 -> 79.
    id: "2026-11-braelon-allen", yr: 2026, name: "Braelon Allen", pos: "RB",
    ovr: 79, pot: 85, dev: "star",
    posAttrs: { vision: 86, elusiveness: 88, breakTkl: 86, receiving: 70, burst: 95, balance: 90, stiffArm: 82 },
  },
  {
    // second in the NFL in receiving yards (708) (through Week 7). GB, 82 -> 88.
    id: "2026-11-christian-watson", yr: 2026, name: "Christian Watson", pos: "WR",
    ovr: 88, pot: 90, dev: "normal",
    posAttrs: { routeRun: 89, catching: 94, separation: 90, release: 80, bodyCtrl: 91, yac: 91, deepSpd: 99, catchTraffic: 91 },
  },
  {
    // 619 receiving yards in his second season (through Week 7). GB, 79 -> 85.
    id: "2026-11-matthew-golden", yr: 2026, name: "Matthew Golden", pos: "WR",
    ovr: 85, pot: 91, dev: "star",
    posAttrs: { routeRun: 85, catching: 92, separation: 90, release: 82, bodyCtrl: 86, yac: 88, deepSpd: 99, catchTraffic: 85 },
  },
  {
    // 491 receiving yards at 22 (through Week 7). CHI, 79 -> 83.
    id: "2026-11-luther-burden-iii", yr: 2026, name: "Luther Burden III", pos: "WR",
    ovr: 83, pot: 89, dev: "star",
    posAttrs: { routeRun: 81, catching: 88, separation: 89, release: 78, bodyCtrl: 86, yac: 92, deepSpd: 96, catchTraffic: 84 },
  },
  {
    // 474 receiving yards (through Week 7). LV, 78 -> 82.
    id: "2026-11-tre-tucker", yr: 2026, name: "Tre Tucker", pos: "WR",
    ovr: 82, pot: 86, dev: "normal",
    posAttrs: { routeRun: 85, catching: 91, separation: 85, release: 78, bodyCtrl: 83, yac: 89, deepSpd: 99, catchTraffic: 81 },
  },
  {
    // leads the NFL with 7 sacks (through Week 7). NO, 83 -> 88.
    id: "2026-11-chase-young", yr: 2026, name: "Chase Young", pos: "DL",
    ovr: 88, pot: 90, dev: "normal",
    posAttrs: { passRush: 87, runStop: 84, handUse: 91, motor: 84, getOff: 93, bullRush: 82, swim: 91, spin: 90 },
  },
  {
    // 6 sacks in 6 games (through Week 7). MIN, 82 -> 87.
    id: "2026-11-dallas-turner", yr: 2026, name: "Dallas Turner", pos: "DL",
    ovr: 87, pot: 93, dev: "star",
    posAttrs: { passRush: 87, runStop: 80, handUse: 87, motor: 89, getOff: 97, bullRush: 87, swim: 87, spin: 88 },
  },
  {
    // 5.5 sacks and 7 tackles for loss as a rookie (through Week 7). NYJ, 81 -> 85.
    id: "2026-11-david-bailey", yr: 2026, name: "David Bailey", pos: "DL",
    ovr: 85, pot: 91, dev: "superstar",
    posAttrs: { passRush: 84, runStop: 84, handUse: 86, motor: 82, getOff: 95, bullRush: 81, swim: 86, spin: 88 },
  },
  {
    // 5.5 sacks and 7 tackles for loss (through Week 7). NE, 72 -> 79.
    id: "2026-11-elijah-ponder", yr: 2026, name: "Elijah Ponder", pos: "DL",
    ovr: 79, pot: 83, dev: "star",
    posAttrs: { passRush: 79, runStop: 76, handUse: 80, motor: 85, getOff: 95, bullRush: 77, swim: 80, spin: 85 },
  },
  {
    // 5.5 sacks in 6 games (through Week 7). NO, 79 -> 83.
    id: "2026-11-carl-granderson", yr: 2026, name: "Carl Granderson", pos: "DL",
    ovr: 83, pot: 83, dev: "normal",
    posAttrs: { passRush: 80, runStop: 86, handUse: 84, motor: 86, getOff: 89, bullRush: 76, swim: 84, spin: 81 },
  },
  {
    // 4 sacks off the bench (through Week 7). TB, 69 -> 75.
    id: "2026-11-david-walker", yr: 2026, name: "David Walker", pos: "DL",
    ovr: 75, pot: 77, dev: "normal",
    posAttrs: { passRush: 74, runStop: 77, handUse: 71, motor: 91, getOff: 91, bullRush: 78, swim: 71, spin: 78 },
  },
  {
    // leads the NFL with 11 passes defensed (through Week 7). TB, 79 -> 83.
    id: "2026-11-jacob-parrish", yr: 2026, name: "Jacob Parrish", pos: "CB",
    ovr: 83, pot: 89, dev: "star",
    posAttrs: { manCov: 79, zoneCov: 81, press: 80, ballSkills: 77, tackling: 71, recovery: 98, footwork: 93, playRec: 83 },
  },
  {
    // 3 interceptions as a rookie (through Week 7). LV, 73 -> 78.
    id: "2026-11-hezekiah-masses", yr: 2026, name: "Hezekiah Masses", pos: "CB",
    ovr: 78, pot: 84, dev: "star",
    posAttrs: { manCov: 74, zoneCov: 81, press: 79, ballSkills: 70, tackling: 68, recovery: 95, footwork: 88, playRec: 82 },
  },
  {
    // 3 interceptions (through Week 7). SF, 77 -> 81.
    id: "2026-11-renardo-green", yr: 2026, name: "Renardo Green", pos: "CB",
    ovr: 81, pot: 85, dev: "normal",
    posAttrs: { manCov: 83, zoneCov: 80, press: 86, tackling: 72, recovery: 94, footwork: 92, playRec: 77 },
  },
  {
    // 3 interceptions (through Week 7). CIN, 77 -> 81.
    id: "2026-11-jordan-battle", yr: 2026, name: "Jordan Battle", pos: "S",
    ovr: 81, pot: 85, dev: "normal",
    posAttrs: { range: 92, runSupport: 89, coverage: 80, tackling: 76, ballHawk: 76, comms: 84, versatility: 72 },
  },
  {
    // 39 tackles as a 21-year-old rookie (through Week 7). NYG, 82 -> 85.
    id: "2026-11-arvell-reese", yr: 2026, name: "Arvell Reese", pos: "LB",
    ovr: 85, pot: 91, dev: "generational",
    posAttrs: { tackling: 89, coverage: 65, blitzing: 75, runFit: 85, instincts: 86, pursuit: 91, shedBlock: 78, zoneAwr: 70 },
  },
  {
    // leads all defensive backs with 44 tackles (through Week 7). GB, 79 -> 82.
    id: "2026-11-evan-williams", yr: 2026, name: "Evan Williams", pos: "S",
    ovr: 82, pot: 86, dev: "normal",
    posAttrs: { range: 89, runSupport: 85, coverage: 80, tackling: 80, ballHawk: 71, comms: 80, versatility: 78 },
  },
];

const DEV_RANK = { late: 0, normal: 1, star: 2, superstar: 3, generational: 4 };

export function applyRosterUpdates(d, list = ROSTER_UPDATES) {
  const done = [];
  if (!d || !Array.isArray(d.teams)) return done;
  for (const u of list) {
    if (d.yr != null && d.yr !== u.yr) continue;
    for (const t of d.teams) for (const p of [...(t?.roster || []), ...(t?.ps || []), ...(t?.ir || [])]) {
      if (!p || p.name !== u.name || p.pos !== u.pos || (p.upd || []).includes(u.id)) continue;
      p.upd = [...(p.upd || []), u.id];
      const behind = (p.ovr || 0) <= u.ovr;
      if (behind) { p.ovr = u.ovr; p.trueOvr = u.ovr; }
      if ((p.truePot ?? p.pot ?? 0) < u.pot) { p.pot = Math.max(p.pot || 0, u.pot); p.truePot = u.pot; }
      if ((DEV_RANK[p.dev] ?? 1) < (DEV_RANK[u.dev] ?? 1)) p.dev = u.dev;
      // the reworked skill profile (what kind of player he is), unless he's already grown past it
      if (u.posAttrs && behind) p.posAttrs = { ...(p.posAttrs || {}), ...u.posAttrs };
      if (u.arch) p.arch = u.arch;
      done.push(`${u.name} (${u.pos}) updated to ${p.ovr} OVR`);
    }
  }
  return done;
}
