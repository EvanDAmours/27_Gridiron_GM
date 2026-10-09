// Position changes in the secondary: a cornerback can move to safety and back. His Madden skills
// are translated to the new spot (a corner's recovery speed becomes a safety's range, his ball
// skills become ball-hawking) and his OVR is re-rated on them, with a small learning cost and,
// for a safety moving to corner, a penalty if he isn't fast enough to play on the outside. The
// move remembers where he came from, so moving him back restores his old rating exactly.

const avg = (...xs) => Math.round(xs.reduce((s, x) => s + x, 0) / xs.length);
const mean = (o) => { const v = Object.values(o || {}); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : 60; };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export const DB_SWAP = { CB: "S", S: "CB" };
// How Madden's OVR sits against the average of a position's skills (median over every real
// CB and S): safeties rate about 4 above theirs, corners about 1 below.
const OVR_OFFSET = { CB: -1, S: 3.9 };
export const canMoveDB = (p) => !!DB_SWAP[p?.pos];

function cbToS(a, spd) {
  const g = (k, d = 65) => a[k] ?? d;
  return {
    range: avg(g("recovery"), spd ?? g("recovery")), runSupport: g("tackling"), coverage: avg(g("manCov"), g("zoneCov")),
    tackling: g("tackling"), ballHawk: g("ballSkills"), blitzing: Math.min(g("tackling"), 60), comms: g("playRec"), versatility: avg(g("manCov"), g("zoneCov"), g("press")),
  };
}
function sToCB(a) {
  const g = (k, d = 65) => a[k] ?? d;
  return {
    manCov: g("coverage") - 3, zoneCov: g("coverage"), press: avg(g("runSupport"), g("coverage")) - 4, ballSkills: g("ballHawk"),
    tackling: g("tackling"), recovery: g("range"), footwork: avg(g("range"), g("versatility")), playRec: g("comms"),
  };
}

// The player at his new position. Returns him unchanged if he isn't a CB or S.
export function moveDB(p) {
  const to = DB_SWAP[p.pos];
  if (!to) return p;
  // Going back where he came from: undo the move exactly (keeping any growth since).
  if (p.posFrom?.pos === to) {
    const { posFrom, ...rest } = p;
    const ovr = clamp((p.ovr || 0) - posFrom.shift, 40, 99);
    const pot = clamp((p.pot || p.ovr || 0) - posFrom.shift, ovr, 99);
    return { ...rest, pos: to, mpos: posFrom.mpos, posAttrs: posFrom.attrs, ovr, trueOvr: ovr, pot, truePot: pot };
  }
  const attrs = to === "S" ? cbToS(p.posAttrs || {}, p.spd) : sToCB(p.posAttrs || {});
  const speedCost = to === "CB" ? Math.max(0, 90 - (p.spd ?? 88)) / 3 : 0;
  const shift = Math.round(mean(attrs) + OVR_OFFSET[to] - (mean(p.posAttrs) + OVR_OFFSET[p.pos]) - 1 - speedCost);
  const ovr = clamp((p.ovr || 0) + shift, 40, 99);
  const pot = clamp((p.pot || p.ovr || 0) + shift, ovr, 99);
  return {
    ...p, pos: to, mpos: to === "S" ? "FS" : "CB", posAttrs: attrs, ovr, trueOvr: ovr, pot, truePot: pot,
    posFrom: { pos: p.pos, mpos: p.mpos, attrs: p.posAttrs, shift },
  };
}

// What the move would do to his rating, for the button label.
export const moveDBPreview = (p) => { const n = moveDB(p); return { to: n.pos, ovr: n.ovr }; };
