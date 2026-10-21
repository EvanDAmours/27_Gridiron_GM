// The offensive line's numbers (the play engine charges sacks and pressures to the blocker who lost
// his man, and credits the linemen whose gap a run went through): sacks and pressures allowed,
// pass-block win rate, and 0-100 pass and run block grades centred on a league-average starter.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const OL_POS = new Set(["LT", "LG", "C", "RG", "RT", "OL"]);

// s: a season (or game) line. null until he has blocked enough to say anything.
export function olLine(s) {
  const pb = s?.pbSnp || 0, rb = s?.rbSnp || 0, sk = s?.sackA || 0, pr = s?.presA || 0;
  if (pb + rb < 40) return null;
  const loss = pb ? (2 * sk + pr) / pb : null;
  const win = rb ? (s.rbWin || 0) / rb : null, stuff = rb ? (s.rbStuff || 0) / rb : null;
  return {
    sacks: sk, pres: pr, pbSnp: pb, rbSnp: rb,
    pbPct: pb ? Math.round(1000 * (1 - (sk + pr) / pb)) / 10 : null,
    passGrade: loss == null ? null : Math.round(clamp(66 - (loss - 0.063) * 450, 30, 99)),
    runGrade: rb < 20 ? null : Math.round(clamp(66 + (win - 0.485) * 160 - (stuff - 0.052) * 400, 30, 99)),
  };
}
