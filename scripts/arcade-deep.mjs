// Deep-ball check: plays the shot concepts the way a person does (wait for a man to get
// vertical, then throw to the deep receiver with the most room) and prints NFL-style deep-pass
// numbers. NFL reference for 20+ air yards: ~35-40% completions, ~4-5% INT, ~11-12 Y/A.
// Run: node scripts/arcade-deep.mjs [games] [lob|bullet]
import { newGame, lineups, runPlay, simOpponentDrive } from "../src/arcade/bridge.js";
import { setupPlay, snap, tick, throwTo, passPlan, ELIGIBLE } from "../src/arcade/play.js";
const N = +(process.argv[2] || 200), KIND = process.argv[3] || "lob";
let seed = 4242; const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const CONC = ["four_verts", "shot", "mills", "post_wheel", "yankee"];
const st = { att: 0, comp: 0, yds: 0, td: 0, int: 0, sack: 0, air: [], sep: [], noThrow: 0, byC: {} };
for (let n = 0; n < N; n++) {
  const { g } = newGame(n % 32, (n * 7 + 3) % 32, { rand }); runPlay(g); if (g.koNext || g.poss !== "h") simOpponentDrive(g);
  g.yard = 20 + Math.floor(rand() * 30); g.down = 1; g.toGo = 10;
  const c = CONC[n % CONC.length], S = setupPlay(g, lineups(g), c); snap(S);
  let thrown = false, air = 0, sepAt = 0;
  for (let i = 0; i < 900 && tick(S, 1 / 60); i++) {
    if (thrown || S.phase !== "live" || S.ball.holder !== "QB") continue;
    const deep = ELIGIBLE.map((r) => S.ents[r]).filter((e) => e && e.mode !== "block" && e.x - S.los > 14);
    if (!deep.length || S.t < 2.2) continue;
    const room = (e) => Math.min(...Object.values(S.ents).filter((d) => d.side === "def").map((d) => Math.hypot(d.x - e.x, d.y - e.y)));
    const e = deep.sort((a, b) => room(b) - room(a))[0];
    let T = passPlan(S, e, KIND).T; for (let k = 0; k < 2; k++) T = passPlan(S, { x: e.x + e.vx * T, y: e.y + e.vy * T }, KIND).T;
    const to = { x: e.x + e.vx * T, y: e.y + e.vy * T };
    if (throwTo(S, to, null, KIND)) { thrown = true; air = to.x - S.los; sepAt = room(e); }
  }
  const ev = S.result; if (!ev) continue;
  const b = (st.byC[c] ||= { att: 0, comp: 0, yds: 0, td: 0, int: 0 });
  if (ev.type === "sack") { st.sack++; continue; }
  if (!thrown) { st.noThrow++; continue; }
  st.att++; b.att++; const w = S.log.filter((x) => !/juked|misses/.test(x)).join('/') || ev.type; (st.why ||= {})[w] = (st.why[w] || 0) + 1; if (S.catchAt != null) (st.yac ||= []).push(ev.yards - air); st.air.push(air); st.sep.push(sepAt);
  const caught = (ev.type === "pass" || ev.td) && S.catchAt != null;
  if (caught) { st.comp++; b.comp++; st.yds += ev.yards; b.yds += ev.yards; if (ev.td) { st.td++; b.td++; } }
  if (ev.type === "int") { st.int++; b.int++; }
}
const pc = (a, b) => `${Math.round((a / Math.max(1, b)) * 100)}%`, avg = (a) => (a.reduce((s, x) => s + x, 0) / Math.max(1, a.length)).toFixed(1);
console.log(`${KIND.toUpperCase()} deep: ${st.att} att, comp ${pc(st.comp, st.att)} (NFL ~37%), Y/A ${(st.yds / Math.max(1, st.att)).toFixed(1)} (~11.5), TD ${pc(st.td, st.att)} (~9%), INT ${pc(st.int, st.att)} (~4.5%), air ${avg(st.air)} yd, room at release ${avg(st.sep)} yd, sacks ${st.sack}, no throw ${st.noThrow}`);
console.log('  outcomes:', Object.entries(st.why || {}).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([w, n]) => `${w} ${n}`).join(', '), '| yac', avg(st.yac || []));
for (const [c, b] of Object.entries(st.byC)) console.log(`  ${c.padEnd(11)} ${b.att} att comp ${pc(b.comp, b.att)} Y/A ${(b.yds / Math.max(1, b.att)).toFixed(1)} TD ${b.td} INT ${b.int}`);
