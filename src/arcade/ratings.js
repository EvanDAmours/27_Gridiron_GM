// Player ratings for the arcade field, read the way the franchise engine reads them. Every skill
// is a blend of the position's own ratings (posAttrs: accuracy, manCov, passRush...) and the
// player's overall, and carries his form this season and any playing-hurt penalty: makeSide
// (playsim.js) folds those into `ovr` and records the shift as `form`, and the same shift is
// applied to his position ratings here. So a hot streak, a slump or a bad ankle shows up on the
// field just as it does in a simulated game.
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// One skill: parts are [ratingName, weight]; a rating the player doesn't have is skipped (a back
// has no "catching", so his "receiving" stands in). Physical ratings (spd, acc, agi, str, jmp) are
// read off the player; the rest from his position ratings. A quarter of every skill is his
// overall, as the engine leans on overall for nearly everything it decides.
const PHYS = new Set(["spd", "acc", "agi", "str", "jmp", "end"]);
export function skill(p, parts, ovrShare = 0.25) {
  if (!p) return 60;
  const form = p.form || 0, ovr = p.ovr ?? 70;
  let s = 0, w = 0;
  for (const [k, wt] of parts) {
    const v = PHYS.has(k) ? p[k] : p.posAttrs?.[k];
    if (v != null) { s += v * wt; w += wt; }
  }
  const own = w ? s / w + form : ovr;
  return clamp(own * (1 - ovrShare) + ovr * ovrShare, 25, 105);
}
// how far a skill sits from an average starter (75), per point
export const edge = (v, avg = 75) => v - avg;

// ---- the passer ----
export const qbArm = (p) => skill(p, [["armStr", 1]], 0.15);
export const qbAccuracy = (p, lob) => skill(p, lob ? [["accuracy", 0.6], ["touch", 0.4]] : [["accuracy", 0.85], ["touch", 0.15]]);
// keeping his mechanics with a rusher in his face: pocket awareness and decision making
export const qbPoise = (p) => skill(p, [["pocketAwr", 0.6], ["decisions", 0.25], ["readDef", 0.15]]);

// ---- receivers and backs ----
export const hands = (p) => skill(p, [["catching", 1], ["receiving", 1]]);
export const contested = (p) => skill(p, [["catchTraffic", 0.6], ["catching", 0.2], ["toughness", 0.2], ["redZone", 0.2], ["receiving", 0.2]]);
export const bodyCtrl = (p) => skill(p, [["bodyCtrl", 0.7], ["catching", 0.3], ["receiving", 0.3]]);
export const release = (p) => skill(p, [["release", 0.7], ["routeRun", 0.3], ["blocking", 0.1]]);
export const routeSkill = (p) => skill(p, [["routeRun", 0.5], ["separation", 0.4], ["seaming", 0.3], ["receiving", 0.2]]);
export const deepSpeed = (p) => { const d = p?.posAttrs?.deepSpd; return d != null ? (p.spd ?? 75) * 0.5 + (d + (p.form || 0)) * 0.5 : p?.spd ?? 75; };
export const afterCatch = (p) => skill(p, [["yac", 0.5], ["elusiveness", 0.4], ["breakTkl", 0.3], ["agi", 0.2]]);
export const elusive = (p) => skill(p, [["elusiveness", 0.6], ["agi", 0.3], ["yac", 0.3], ["burst", 0.1]]);
export const power = (p) => skill(p, [["breakTkl", 0.5], ["stiffArm", 0.25], ["balance", 0.25], ["str", 0.2], ["toughness", 0.2]]);
export const balance = (p) => skill(p, [["balance", 0.7], ["str", 0.3], ["toughness", 0.2]]);
export const burst = (p) => skill(p, [["burst", 0.6], ["acc", 0.4]], 0.1);
export const vision = (p) => skill(p, [["vision", 1]]);

// ---- blockers ----
export const passBlock = (p) => skill(p, [["passBlock", 0.6], ["footwork", 0.2], ["anchor", 0.2], ["handUse", 0.1]]);
export const runBlock = (p) => skill(p, [["runBlock", 0.6], ["drive", 0.2], ["strength", 0.15], ["blocking", 0.6], ["pulling", 0.05]]);

// ---- the defense ----
export const passRush = (p) => skill(p, [["passRush", 0.5], ["getOff", 0.2], ["handUse", 0.1], ["swim", 0.07], ["spin", 0.07], ["bullRush", 0.06], ["blitzing", 0.5]]);
export const getOff = (p) => skill(p, [["getOff", 0.7], ["acc", 0.3]], 0.1);
export const runStop = (p) => skill(p, [["runStop", 0.5], ["shedBlock", 0.3], ["handUse", 0.2], ["runFit", 0.3], ["runSupport", 0.3]]);
// man coverage: a corner's manCov; a linebacker the engine's own lbCover blend; a safety his coverage
export function coverMan(p) {
  if (p?.pos === "LB") return skill(p, [["coverage", 0.55], ["zoneAwr", 0.25], ["spd", 0.2]]);
  return skill(p, [["manCov", 0.6], ["coverage", 0.6], ["footwork", 0.15], ["press", 0.1], ["zoneCov", 0.15]]);
}
export const press = (p) => skill(p, [["press", 0.7], ["manCov", 0.3], ["coverage", 0.3]]);
export const recovery = (p) => skill(p, [["recovery", 0.6], ["range", 0.6], ["spd", 0.4]], 0.15);
// reading the throw: how soon he breaks on the ball
export const ballRead = (p) => skill(p, [["playRec", 0.6], ["instincts", 0.6], ["zoneAwr", 0.3], ["comms", 0.2], ["range", 0.2], ["zoneCov", 0.2]]);
export const ballSkills = (p) => skill(p, [["ballSkills", 0.7], ["ballHawk", 0.7], ["coverage", 0.3], ["zoneCov", 0.1]]);
export const tackling = (p) => skill(p, [["tackling", 0.7], ["runStop", 0.4], ["runSupport", 0.2], ["str", 0.1]]);
export const pursuit = (p) => skill(p, [["pursuit", 0.6], ["range", 0.6], ["motor", 0.4], ["recovery", 0.2]], 0.15);

// ---- kickers ----
export const kickLeg = (p) => skill(p, [["legStr", 0.7], ["distance", 0.3], ["power", 1]], 0.15);
export const kickAccuracy = (p) => skill(p, [["accuracy", 0.6], ["consistency", 0.2], ["clutch", 0.2]]);
