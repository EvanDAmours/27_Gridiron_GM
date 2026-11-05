// The engine's own numbers for the arcade playtest's matchups (both sides played by the engine):
// the target the arcade's on-field play is calibrated to. Run: node scripts/arcade-baseline.mjs [games]
import { newGame } from "../src/arcade/bridge.js";
import { step } from "../src/playsim.js";
const N = +process.argv[2] || 200, seedOf = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);
const t = { att: 0, comp: 0, yds: 0, td: 0, int: 0, sack: 0, long: 0, rushAtt: 0, rushYds: 0, pts: 0, plays: 0 };
for (let gi = 0; gi < N; gi++) {
  const { g } = newGame((gi * 7) % 32, (gi * 11 + 3) % 32, { rand: seedOf(100 + gi) });
  let n = 0; while (!g.done && n++ < 400) {
    const ev = step(g); if (!ev || ev.poss !== "h") continue;
    if (ev.k === "pass" || ev.k === "inc" || ev.k === "int") { t.att++; if (ev.k === "pass") { t.comp++; t.yds += ev.yards || 0; if ((ev.yards || 0) >= 20) t.long++; if (ev.td) t.td++; } if (ev.k === "int") t.int++; }
    if (ev.k === "sack") t.sack++;
    if (ev.k === "run") { t.rushAtt++; t.rushYds += ev.yards || 0; }
  }
  t.pts += g.score.h;
}
const p = (a, b) => (100 * a / Math.max(1, b)).toFixed(1) + "%";
console.log(`engine, ${N} games, side h: comp ${p(t.comp, t.att)}, Y/A ${(t.yds / t.att).toFixed(2)}, 20+ completions ${p(t.long, t.comp)}, sack% ${p(t.sack, t.att + t.sack)}, INT% ${p(t.int, t.att)}, pass TD% ${p(t.td, t.att)}, rush Y/C ${(t.rushYds / t.rushAtt).toFixed(2)}, pts/team ${(t.pts / N).toFixed(1)}, pass share ${p(t.att + t.sack, t.att + t.sack + t.rushAtt)}`);
