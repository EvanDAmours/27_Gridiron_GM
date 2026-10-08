// Development focus: one player on each side of the ball gets extra coaching every week.
// Young players with high development traits gain the most.
import { devOf } from "./scouting.js";

export const OFFENSE = ["QB", "RB", "WR", "TE", "LT", "LG", "C", "RG", "RT"];
export const DEFENSE = ["DL", "LB", "CB", "S"];
const DEV_MULT = { generational: 2.2, superstar: 1.7, star: 1.3, normal: 1 };

// Chance each week that a focused player gains a point of OVR.
export function focusChance(p) {
  const d = devOf(p);
  const dev = d === "late" ? (p.age >= 23 ? 1.3 : 0.8) : DEV_MULT[d] || 1;
  const age = p.age <= 23 ? 1.3 : p.age <= 26 ? 1 : p.age <= 29 ? 0.6 : 0.25;
  const ceiling = p.ovr >= 97 ? 0.3 : p.ovr >= 93 ? 0.6 : 1; // the last few points come hard
  return Math.min(0.6, 0.1 * dev * age * ceiling);
}
// Expected OVR gained over a regular season (17 games).
export const perSeason = (p) => Math.round(focusChance(p) * 17 * 10) / 10;

// One week in the lab for each focused player on the roster. Mutates players; returns gains.
export function runFocusWeeks(roster, focus, weeks) {
  const out = [];
  for (const side of ["off", "def"]) {
    const p = roster.find((x) => x.id === focus?.[side]);
    if (!p) continue;
    let g = 0;
    for (let w = 0; w < weeks; w++) {
      if (p.ovr >= 99 || p.injured) break;
      if (Math.random() < focusChance(p)) {
        p.ovr += 1;
        p.trueOvr = p.ovr;
        if (p.pot < p.ovr) p.pot = p.truePot = p.ovr;
        g++;
      }
    }
    if (g) {
      p.labGains = (p.labGains || 0) + g;
      out.push({ p, g });
    }
  }
  return out;
}
