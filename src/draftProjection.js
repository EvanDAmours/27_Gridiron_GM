// One draft order for the whole game. Until the draft starts, every pick's number is projected
// the NFL way (playoffs.js draftOrder: non-playoff clubs worst record first, then playoff clubs
// by the round they went out in, the champion last), and every screen reads the same numbers:
// the pick tracker, the mock draft, Scouting HQ, your scouts' shortlist and trade values.
// Before anyone has played a game the numbers stay where they were set at the start of the
// season (last season's order).
import { draftOrder } from "./playoffs.js";

// picks: this year's picks [{ rd, overall, orig, owner, comp? }]. Returns the same array when
// nothing moved, or a new one with rd/num/overall re-projected (owners never change here).
export function reprojectPicks(picks, teams, pb, yr) {
  if (!picks?.length || !teams?.length) return picks;
  if (!teams.some((t) => (t.w || 0) + (t.l || 0) + (t.t || 0) > 0) && !pb) return picks;
  const order = draftOrder(teams.map((t, i) => ({ ...t, id: t.id ?? i })), pb);
  const pos = new Map(order.map((tid, i) => [tid, i]));
  const n = order.length;
  let comp = 0, changed = false;
  const out = picks.map((pk) => {
    if (yr != null && pk.yr != null && pk.yr !== yr) return pk;
    const overall = pk.comp ? 7 * n + 1 + comp++ : (pk.rd - 1) * n + (pos.get(pk.orig ?? pk.owner) ?? 0) + 1;
    const num = pk.comp ? n + comp : (pos.get(pk.orig ?? pk.owner) ?? 0) + 1;
    if (overall === pk.overall && num === pk.num) return pk;
    changed = true;
    return { ...pk, overall, num };
  });
  return changed ? [...out].sort((a, b) => a.overall - b.overall) : picks;
}

// Your remaining picks this year (overall numbers, earliest first).
export const slotsFor = (picks, ui, yr, used = []) => {
  const done = new Set(used);
  return (picks || []).filter((pk) => pk.owner === ui && (pk.yr == null || pk.yr === yr) && !done.has(pk.id)).map((pk) => pk.overall).sort((a, b) => a - b);
};
