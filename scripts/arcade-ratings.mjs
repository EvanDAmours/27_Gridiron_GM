// Do ratings matter on the arcade field? Plays the same calls with one unit's players set to
// elite ratings and then to poor ones (everyone else as on the roster), and prints the gap.
// Run: node scripts/arcade-ratings.mjs [plays]
import { newGame, lineups, runPlay, simOpponentDrive } from "../src/arcade/bridge.js";
import { setupPlay, snap, tick, throwTo, juke, separation, ELIGIBLE } from "../src/arcade/play.js";

const N = +process.argv[2] || 400;
const scale = (p, v) => ({ ...p, ovr: v, spd: Math.min(99, (p.spd ?? 75) + (v - 75) * 0.4), acc: Math.min(99, (p.acc ?? 75) + (v - 75) * 0.4), agi: Math.min(99, (p.agi ?? 75) + (v - 75) * 0.4), posAttrs: Object.fromEntries(Object.entries(p.posAttrs || {}).map(([k]) => [k, v])) });
// only some ratings: the rest of the player stays as on the roster
const only = (p, keys, v) => ({ ...p, posAttrs: { ...p.posAttrs, ...Object.fromEntries(keys.map((k) => [k, v])) } });
const OL = ["LT", "LG", "C", "RG", "RT"];
const UNITS = {
  "OL run block grades": (L, v) => ({ ...L, off: { ...L.off, ...Object.fromEntries(OL.map((k) => [k, only(L.off[k], ["runBlock", "drive", "strength", "pulling"], v)])) } }),
  "OL pass block grades": (L, v) => ({ ...L, off: { ...L.off, ...Object.fromEntries(OL.map((k) => [k, only(L.off[k], ["passBlock", "footwork", "anchor", "handUse"], v)])) } }),
  "DL pass rush grades": (L, v) => ({ ...L, def: { ...L.def, DL: L.def.DL.map((p) => only(p, ["passRush", "getOff"], v)) } }),
  "DL pass rush moves": (L, v) => ({ ...L, def: { ...L.def, DL: L.def.DL.map((p) => only(p, ["swim", "spin", "bullRush"], v)) } }),
  "blitz scheme (rate %)": (L, v, g) => { g.sides.a.dStyle = { blitz: v / 100, box: 0.15, cover: v > 50 ? 0.05 : 0.35 }; return L; },
  QB: (L, v) => ({ ...L, off: { ...L.off, QB: scale(L.off.QB, v) } }),
  receivers: (L, v) => ({ ...L, off: { ...L.off, X: scale(L.off.X, v), Z: scale(L.off.Z, v), SLOT: scale(L.off.SLOT, v), TE: scale(L.off.TE, v) } }),
  "running back": (L, v) => ({ ...L, off: { ...L.off, RB: scale(L.off.RB, v) } }),
  "offensive line": (L, v) => ({ ...L, off: { ...L.off, ...Object.fromEntries(["LT", "LG", "C", "RG", "RT"].map((k) => [k, scale(L.off[k], v)])) } }),
  secondary: (L, v) => ({ ...L, def: { ...L.def, CB: L.def.CB.map((p) => scale(p, v)), S: L.def.S.map((p) => scale(p, v)) } }),
  "defensive line": (L, v) => ({ ...L, def: { ...L.def, DL: L.def.DL.map((p) => scale(p, v)) } }),
};
function play(unit, v) {
  const st = { att: 0, comp: 0, pyds: 0, int: 0, sack: 0, ru: 0, ryds: 0, err: 0, errN: 0, sepN: 0, sep: 0, broke: 0 };
  let seed = 4242; const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let gi = 0; st.att + st.ru < N; gi++) {
    const { g } = newGame(gi % 32, (gi * 7 + 5) % 32, { rand }); runPlay(g);
    for (let n = 0; n < 40 && !g.done; n++) {
      if (g.koNext || g.poss !== "h") { simOpponentDrive(g); continue; }
      if (g.down === 4) { runPlay(g, "punt"); continue; }
      const call = ["pass_quick", "pass_medium", "pass_deep", "run_inside", "pass_medium", "run_outside"][n % 6];
      const L = UNITS[unit](lineups(g), v, g);
      const S = setupPlay(g, L, call); snap(S); let thrown = false, f = 0;
      while (tick(S, 1 / 60) && f++ < 1500) {
        if (call.startsWith("pass") && !thrown && S.ball.holder === "QB" && S.phase === "live" && S.t > 1.0) {
          // a quarterback's progression: his reads in order, each once his route has developed; the back is the check-down
          const READS = { pass_quick: ["X", "Z", "SLOT", "TE", "RB"], pass_medium: ["Z", "SLOT", "X", "TE", "RB"], pass_deep: ["X", "Z", "SLOT", "TE", "RB"] }[call];
          let best = null, bs = -1;
          for (const [i, r] of READS.entries()) { const e = S.ents[r]; if (!e || e.mode === "block" || e.mode === "back" || (Math.hypot(e.vx, e.vy) < 2.5 && e.mode !== "settle") || S.t < 1.0 + i * 0.45) continue; const sp = separation(S, r); if (sp > 2.6) { best = r; bs = sp; break; } if (sp > bs) { bs = sp; best = r; } }
          if (best && (bs > 2.6 || S.t > 3.2)) { const e = S.ents[best], qb = S.ents.QB; let T = Math.max(0.22, Math.hypot(e.x - qb.x, e.y - qb.y) / 24); throwTo(S, { x: e.x + e.vx * T, y: e.y + e.vy * T }); thrown = true; st.sep += bs; st.sepN++; }
        }
        const c = S.ball.holder && S.ents[S.ball.holder];
        if (c && c.side === "off" && c.key !== "QB") { let nd = null, nb = 99; for (const e of Object.values(S.ents)) if (e.side === "def" && e.down <= 0 && e.x > c.x - 1) { const d = Math.hypot(e.x - c.x, e.y - c.y); if (d < nb) { nb = d; nd = e; } } S.steer = nd && nb < 4.5 ? Math.max(-25, Math.min(25, c.y > nd.y ? c.y + 5 : c.y - 5)) : c.y; if (nd && nb < 2.4) juke(S); }
      }
      const ev = S.result; if (!ev || ev.type === "penalty") continue;
      if (call.startsWith("pass")) { st.att++; if (ev.type === "pass" || ev.type === "td") { st.comp++; st.pyds += ev.yards; } if (ev.type === "int") st.int++; if (ev.type === "sack") st.sack++; if (S.pick?.err != null) { st.err += S.pick.err; st.errN++; } }
      else { st.ru++; st.ryds += ev.yards; st.broke += S.broke; }
    }
  }
  return st;
}
const fmt = (s) => `comp ${(100 * s.comp / s.att).toFixed(0)}%  Y/A ${(s.pyds / s.att).toFixed(1)}  INT ${(100 * s.int / s.att).toFixed(1)}%  sack ${(100 * s.sack / s.att).toFixed(1)}%  sep@throw ${(s.sep / s.sepN).toFixed(2)}  miss ${(s.err / s.errN).toFixed(2)}yd  rush ${(s.ryds / s.ru).toFixed(1)}  broken ${(s.broke / s.ru).toFixed(2)}/run`;
for (const unit of Object.keys(UNITS).filter((u) => !process.argv[4] || u.includes(process.argv[4]))) { console.log(`${unit}:`); const [hi, lo] = (process.argv[3] || "95,55").split(",").map(Number); console.log(`  good (${hi}):`, fmt(play(unit, hi))); console.log(`  poor (${lo}):`, fmt(play(unit, lo))); }
