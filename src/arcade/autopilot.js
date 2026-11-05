// The computer at the controls: plays a snap on the arcade field the way a real quarterback and
// ball carrier would. It runs the other team's offense, and yours when you're watching instead of
// playing. It's the same player the field is calibrated against (scripts/arcade-playtest.mjs), so
// a game it plays comes out where the engine's numbers do.
import { throwTo, juke, separation, ELIGIBLE, CONCEPTS, passPlan } from "./play.js";

const SKILL = { react: 0.4, aimErr: 1.2 };
const READS0 = { pass_quick: ["X", "Z", "SLOT", "TE", "RB"], pass_medium: ["Z", "SLOT", "X", "TE", "RB"], pass_deep: ["X", "Z", "SLOT", "TE", "RB"] };

// A fresh snap's plan: how patient he is, and now and then a forced throw or a shot deep.
export const autoState = (R = Math.random) => ({ thrown: false, patience: 0.8 + R() * 2.4, greedy: R() < 0.06, forced: R() < 0.12 });

// One frame of decisions on play S (call: the play's family, e.g. pass_medium or run_inside).
export function autoStep(S, call, state, R = Math.random) {
  if (call.startsWith("pass") && S.phase === "live" && S.ball.holder === "QB" && !state.thrown) {
    // a progression: the first read who's open once his route has developed, then the next; late, the check-down
    const READS = S.concept ? [...CONCEPTS[S.concept].reads, ...ELIGIBLE.filter((r) => !CONCEPTS[S.concept].reads.includes(r))] : READS0[call] || READS0.pass_medium;
    let best = null, bs = -1;
    for (const [i, r] of READS.entries()) {
      const e = S.ents[r]; if (!e || e.mode === "block" || e.mode === "back" || (Math.hypot(e.vx, e.vy) < 2.5 && e.mode !== "settle")) continue;
      if (S.t < 1.0 + i * 0.45) continue; // his turn in the progression
      const broke = e.mode !== "route" || (e.path?.length ?? 0) <= 1, hot = S.pressureAt && S.t - S.pressureAt > 0.3, late = S.t > 1.6 + state.patience;
      if (!broke && !hot && !late && call !== "pass_quick") continue; // wait for him to make his break
      const sp = separation(S, r); if (sp > 2.6) { best = r; bs = sp; break; }
      if (sp > bs) { bs = sp; best = r; }
    }
    if (state.forced && S.t > 1.4 && !state.greedy) { const r = READS[0], e = S.ents[r]; if (e && e.mode !== "block" && e.mode !== "back") { best = r; bs = 9; } }
    if (state.greedy) { const deepest = ELIGIBLE.filter((r) => S.ents[r]?.mode === "route" || S.ents[r]?.mode === "stride").sort((a, b) => S.ents[b].x - S.ents[a].x)[0]; if (deepest) { best = deepest; bs = separation(S, best); } }
    const open = bs > 2.6, clock = S.t > (call === "pass_quick" ? 1.25 : 1.6 + state.patience) || (S.pressureAt && S.t - S.pressureAt > SKILL.react);
    if (best && S.t > 1.0 && (open || clock)) {
      const e = S.ents[best];
      // lead him: where he'll be when the ball gets there (the flight time depends on the spot)
      let T = passPlan(S, e, "auto").T; for (let k = 0; k < 2; k++) T = passPlan(S, { x: e.x + e.vx * T, y: e.y + e.vy * T }, "auto").T;
      const end = e.stop && e.path?.length ? e.path[e.path.length - 1] : null, settled = e.mode === "settle";
      const tx = settled ? e.x : end ? end.x : e.x + e.vx * T, ty = settled ? e.y : end ? end.y : e.y + e.vy * T;
      throwTo(S, { x: tx + SKILL.aimErr * (R() - 0.5), y: ty + SKILL.aimErr * (R() - 0.5) });
      state.thrown = true;
    }
  }
  const c = S.ball.holder && S.ents[S.ball.holder];
  if (c && c.side === "off" && c.key !== "QB") {
    let nd = null, nb = 99;
    for (const e of Object.values(S.ents)) if (e.side === "def" && e.down <= 0 && (e.x > c.x - 1 || Math.hypot(e.x - c.x, e.y - c.y) < 2.5)) { const d = Math.hypot(e.x - c.x, e.y - c.y); if (d < nb) { nb = d; nd = e; } }
    // a runner follows his lane until someone's in it, then cuts away from him
    const lane = !call.startsWith("pass") && c.x < S.los + 2 ? S.lane : c.y;
    S.steer = nd && nb < 4.5 ? Math.max(-25, Math.min(25, c.y > nd.y ? c.y + 5 : c.y - 5)) : lane;
    if (nd && nb < 2.4 && R() < 0.5) juke(S);
  }
}

// The call for a snap the computer runs: the family the engine's coach chose (run or pass), and a
// concept from that family for a pass.
export function autoCall(kind, R = Math.random) {
  if (kind === "run") return R() < 0.4 ? "run_outside" : "run_inside";
  const u = R(), fam = u < 0.35 ? "pass_quick" : u < 0.8 ? "pass_medium" : "pass_deep";
  const ks = Object.keys(CONCEPTS).filter((k) => CONCEPTS[k].cat === fam);
  return ks.length ? ks[Math.floor(R() * ks.length)] : fam;
}
