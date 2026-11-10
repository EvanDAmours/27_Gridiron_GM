// The computer at the controls: plays a snap on the arcade field the way a real quarterback and
// ball carrier would. It runs the other team's offense, and yours when you're watching instead of
// playing. It's the same player the field is calibrated against (scripts/arcade-playtest.mjs), so
// a game it plays comes out where the engine's numbers do.
import { throwTo, juke, separation, ELIGIBLE, CONCEPTS, passPlan, HALF } from "./play.js";
import * as K from "./ratings.js";

const SKILL = { react: 0.4, aimErr: 1.2 };
const READS0 = { pass_quick: ["X", "Z", "SLOT", "TE", "RB"], pass_medium: ["Z", "SLOT", "X", "TE", "RB"], pass_deep: ["X", "Z", "SLOT", "TE", "RB"] };

// A fresh snap's plan: how patient he is, and now and then a forced throw or a shot deep.
export const autoState = (R = Math.random) => ({ thrown: false, patience: 0.8 + R() * 2.4, greedy: R() < 0.04, forced: R() < 0.06 });

// One frame of decisions on play S (call: the play's family, e.g. pass_medium or run_inside).
export function autoStep(S, call, state, R = Math.random) {
  if (call.startsWith("pass") && S.phase === "live" && S.ball.holder === "QB" && !state.thrown) {
    // a progression: the first read who's open once his route has developed, then the next; late, the check-down
    const READS = S.concept ? [...CONCEPTS[S.concept].reads, ...ELIGIBLE.filter((r) => !CONCEPTS[S.concept].reads.includes(r))] : READS0[call] || READS0.pass_medium;
    // a smarter quarterback (reading the defense, decisions) gets through his reads quicker
    const qbp = S.ents.QB?.p, iq = K.qbPoise(qbp), step = Math.max(0.28, 0.45 + (75 - iq) * 0.006);
    let best = null, bs = -1;
    for (const [i, r] of READS.entries()) {
      const e = S.ents[r]; if (!e || e.mode === "block" || e.mode === "back" || (Math.hypot(e.vx, e.vy) < 2.5 && e.mode !== "settle")) continue;
      if (S.t < 1.0 + i * step) continue; // his turn in the progression
      const broke = e.mode !== "route" || (e.path?.length ?? 0) <= 1, hot = S.pressureAt && S.t - S.pressureAt > 0.3, late = S.t > 1.6 + state.patience;
      if (!broke && !hot && !late && call !== "pass_quick") continue; // wait for him to make his break
      const sp = separation(S, r); if (sp > 2.6) { best = r; bs = sp; break; }
      if (sp > bs) { bs = sp; best = r; }
    }
    if (state.forced && S.t > 1.4 && !state.greedy) { const r = READS[0], e = S.ents[r]; if (e && e.mode !== "block" && e.mode !== "back" && separation(S, r) > 0.6) { best = r; bs = 9; } }
    if (state.greedy) { const deepest = ELIGIBLE.filter((r) => S.ents[r]?.mode === "route" || S.ents[r]?.mode === "stride").sort((a, b) => S.ents[b].x - S.ents[a].x)[0]; if (deepest) { best = deepest; bs = separation(S, best); } }
    // about to be hit: a rusher a step or two away (a poised quarterback feels it and gets it out)
    let rd = 99; for (const d of Object.values(S.ents)) if (d.side === "def" && d.down <= 0 && (d.mode === "free" || d.mode === "blitz" || d.penetrating)) rd = Math.min(rd, Math.hypot(d.x - S.ents.QB.x, d.y - S.ents.QB.y));
    // he has to feel it first: a rusher close for a beat (shorter for a poised one) before he reacts
    if (rd < 2.6) state.feltAt ??= S.t; else state.feltAt = null;
    const imminent = state.feltAt != null && S.t - state.feltAt > Math.max(0.15, Math.min(0.75, 0.42 - (iq - 70) * 0.012));
    const open = bs > 2.6, pressed = (S.pressureAt && S.t - S.pressureAt > SKILL.react) || imminent, clock = S.t > (call === "pass_quick" ? 1.25 : 1.6 + state.patience) || pressed;
    // nobody open and time's up: a smart one finds the check-down, or throws it away rather than
    // forcing it into coverage or eating the sack (a poor decision-maker forces it more often)
    state.wise ??= R() < Math.max(0.2, Math.min(0.8, 0.45 + (iq - 70) * 0.02)); // (this snap, does he make the smart play? a sharper one does more often)
    if (clock && S.t > 1.0 && bs < 1.0 && !state.forced && !state.greedy && state.wise) {
      let cd = null, cs = 1.6; for (const r of ELIGIBLE) { const e = S.ents[r]; if (!e || e.mode === "block" || e.mode === "back") continue; const sp = separation(S, r); if (e.x < S.los + 7 && sp > cs) { cs = sp; cd = r; } }
      if (cd) { best = cd; bs = cs; }
      else if ((pressed || S.t > 3.2 + state.patience * 0.5) && R() < 0.55 + (iq - 70) * 0.015) { const side = S.ents.QB.y >= 0 ? 1 : -1; throwTo(S, { x: S.los + 4, y: side * (HALF + 4) }, null, "lob"); state.thrown = true; S.threwAway = true; return; }
    }
    if (best && S.t > 1.0 && (open || clock)) {
      const e = S.ents[best];
      // lead him: where he'll be when the ball gets there (the flight time depends on the spot)
      let T = passPlan(S, e, "auto").T; for (let k = 0; k < 2; k++) T = passPlan(S, { x: e.x + e.vx * T, y: e.y + e.vy * T }, "auto").T;
      const end = e.stop && e.path?.length ? e.path[e.path.length - 1] : null, settled = e.mode === "settle";
      const tx = settled ? e.x : end ? end.x : e.x + e.vx * T, ty = settled ? e.y : end ? end.y : e.y + e.vy * T;
      // (never led out of bounds or out the back of the end zone: he puts it where his man can catch it)
      // he misses some, more the lower his overall: an overthrow, one behind his man or short of him, one
      // wide; an elite passer misses about one throw in eight, a backup one in three or four
      const ovr = qbp?.ovr ?? 75, err = SKILL.aimErr * (1 + Math.max(0, 85 - ovr) * 0.025), miss = R() < Math.max(0.11, Math.min(0.3, 0.19 + (88 - ovr) * 0.009));
      let mx = 0, my = 0;
      if (miss) { const u = R(), dir = Math.sign(e.vy || 0) || (R() < 0.5 ? -1 : 1); if (u < 0.4) mx = 4.5 + R() * 3.5; else if (u < 0.7) mx = -(3.8 + R() * 2.2); else my = dir * (3.8 + R() * 2.4) * (R() < 0.5 ? 1 : -1); /* (far enough off that he can't get to it, or only just) */ state.missed = true; }
      throwTo(S, { x: Math.min(108, tx + err * (R() - 0.5) + mx), y: Math.max(-HALF + 1.5, Math.min(HALF - 1.5, ty + err * (R() - 0.5) + my)) }); // (on a man by the sideline he throws it to the inside, where it can't drift out)
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
  if (kind === "run") { const rs = Object.keys(CONCEPTS).filter((k) => CONCEPTS[k].run); return rs[Math.floor(R() * rs.length)]; } // (one of the named runs: zone, power, counter, toss...)
  const u = R(), fam = u < 0.35 ? "pass_quick" : u < 0.8 ? "pass_medium" : "pass_deep";
  const ks = Object.keys(CONCEPTS).filter((k) => CONCEPTS[k].cat === fam);
  return ks.length ? ks[Math.floor(R() * ks.length)] : fam;
}
