// Milestone watch for a live game: your players closing in on a season milestone (1,000 yards,
// 4,000 passing, 10 sacks...), counting what they've done so far today. ss: the season before this
// game; live: this game's lines by player id (liveView).
const DEFS = [
  ["passYds", "passYds", "passing yards", [3000, 4000, 5000], 350],
  ["rushYds", "rushYds", "rushing yards", [1000, 1500, 2000], 130],
  ["recYds", "recYds", "receiving yards", [1000, 1500, 2000], 130],
  ["sacks", "sack", "sacks", [10, 15, 20], 2],
];

// roster: your players; live: { [id]: line }. Returns { chase: [...], hit: [...] }, each
// { id, name, label, target, need }.
export function milestoneWatch(roster, live = {}) {
  const chase = [], hit = [];
  for (const p of roster || []) {
    for (const [sk, lk, label, targets, reach] of DEFS) {
      const before = p.ss?.[sk] || 0;
      const now = before + (live[p.id]?.[lk] || 0);
      const target = targets.find((t) => t > before);
      if (!target || before === 0) continue;
      const e = { id: p.id, name: p.name, label, target, need: Math.max(0, target - now) };
      if (now >= target) hit.push(e);
      else if (target - before <= reach) chase.push(e);
    }
  }
  chase.sort((a, b) => a.need / a.target - b.need / b.target);
  return { chase: chase.slice(0, 3), hit };
}
