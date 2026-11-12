// Play the moments: in a franchise game on the arcade field, you play a few drives a quarter (on offense
// or on defense) and the engine sims the rest. At the start of each possession the director decides
// whether this one's yours. It always gives you the opening drive, crunch time in a close fourth
// quarter and overtime; otherwise it aims for about two drives a quarter (three in the fourth),
// leaning to close games, short fields and the two-minute drill, spacing them out and swapping
// between your offense and your defense.

// h: what's happened so far this game, one entry per possession start: { q, play, mine }
// at: the possession about to start: { qtr, clock, qLen, ot, me, them (scores), mine (your ball),
//     yard (where the drive starts, the offense's own yard line; null before a kickoff) }
export function pickMoment(at, h = [], rand = Math.random) {
  const { qtr, clock, ot } = at, qLen = at.qLen || 900, diff = (at.me || 0) - (at.them || 0), gap = Math.abs(diff);
  const played = h.filter((x) => x.play), inQ = played.filter((x) => x.q === qtr).length, last = h[h.length - 1], lastPlayed = played[played.length - 1];
  const side = at.mine ? "Your offense" : "Your defense";
  if (ot) return { play: true, why: "Overtime" };
  if (!played.length && !h.length) return { play: true, why: "The opening drive" };
  // the game on the line: a one-score game late in the fourth
  if (qtr >= 4 && gap <= 8 && clock <= qLen * 0.45) return { play: true, why: diff < 0 ? "Down late: time to answer" : diff > 0 ? "Hold the lead" : "Tied late" };
  // the end of the half in a close game
  if (qtr === 2 && clock <= Math.max(60, qLen * 0.15) && gap <= 14 && inQ < 3) return { play: true, why: "The two-minute drill" };
  const quota = qtr >= 4 ? (gap >= 21 ? 2 : 3) : 2;
  if (inQ >= quota) return { play: false };
  // a quarter that went by without one (a long drive ate it): the next one's yours
  if (qtr > 1 && inQ === 0 && h.some((x) => x.q === qtr - 1) && !played.some((x) => x.q === qtr - 1)) return { play: true, why: "Back in the action" };
  // every quarter gets at least one
  // (a long drive can eat most of a quarter: the first chance after the first few minutes is taken)
  if (inQ === 0 && clock <= qLen * 0.7) return { play: true, why: `${side} in the ${["", "first", "second", "third", "fourth"][qtr] || "fourth"} quarter` };
  let p = 0.38;
  if (gap <= 8) p += 0.15;
  if (gap >= 17) p -= 0.15;
  if (last?.play) p -= 0.25; // (not two in a row)
  if (lastPlayed) p += lastPlayed.mine === at.mine ? -0.1 : 0.1; // (offense, then defense)
  const short = at.yard != null && at.yard >= 50;
  if (short) p += 0.2; // (a short field: a turnover or a big return)
  p = Math.max(0.05, Math.min(0.9, p));
  return rand() < p ? { play: true, why: short ? (at.mine ? "A short field" : "Short field for them: hold them") : gap <= 8 ? "A tight game" : side } : { play: false };
}

// the line that says what happened to a drive the engine played: its plays, its yards and how it ended
export function driveLine(d, name) {
  const how = d.end || "ends";
  return `${name}: ${d.plays} play${d.plays === 1 ? "" : "s"}, ${d.yds} yard${Math.abs(d.yds) === 1 ? "" : "s"}, ${how}`;
}
export function driveEnd(ev) {
  if (!ev) return null;
  if (ev.td) return ev.turnover ? "turnover returned for a TD" : "TOUCHDOWN";
  if (ev.type === "fg") return "field goal";
  if (ev.type === "fg_miss") return "missed field goal";
  if (ev.type === "punt") return "punt";
  if (ev.type === "int") return "interception";
  if (ev.type === "fumble" || (ev.turnover && /fumble/i.test(ev.text || ""))) return "fumble";
  if (ev.type === "safety" || /safety/i.test(ev.text || "")) return "safety";
  if (/turnover on downs/i.test(ev.text || "")) return "turnover on downs";
  if (ev.turnover) return "turnover";
  return null;
}
