// Editing snap shares (the depth chart's two editors). The budget at a position is always full:
// moving one player's share moves someone else's the other way, so nothing sticks or overflows.
// Once you touch a position, every healthy player there gets an explicit share (your overrides);
// "Reset to auto" hands the position back to the staff.
//
// Linked sliders (the list view): set one player's share; the difference comes off the bench first
// (deepest first) or goes to the next man down, never touching anyone you've locked.
// Split bars (the field view): each spot on the field (WR1, WR2, the slot...) is a bar split between
// the players who play it; dragging the line between two of them trades snaps between just those two.
import { positionSnaps, snapBudget, SNAP_SLOTS } from "./snaps.js";

const healthyOf = (players) => players.filter((p) => !p.injured);
// the current shares at a position, every healthy player listed
export function sharesOf(pos, players, overrides = {}, shape) {
  const h = healthyOf(players);
  const s = positionSnaps(pos, h, overrides, shape);
  return Object.fromEntries(h.map((p) => [p.id, s[p.id] || 0]));
}
const explicit = (overrides, s) => ({ ...overrides, ...s });

// One player's share set to v. pinned: ids you've locked. Returns the new overrides.
export function linkedSet(pos, players, overrides, shape, id, v, pinned = new Set()) {
  const ids = healthyOf(players).map((p) => p.id), i = ids.indexOf(id);
  if (i < 0) return overrides;
  const s = sharesOf(pos, players, overrides, shape), budget = snapBudget(pos, shape);
  const lockedOthers = ids.reduce((t, x) => t + (x !== id && pinned.has(x) ? s[x] : 0), 0);
  const free = ids.filter((x) => x !== id && !pinned.has(x));
  v = Math.max(0, Math.min(100, Math.round(v), budget - lockedOthers));
  // never more than the others can give up, nor less than they can take
  const canGive = free.reduce((t, x) => t + s[x], 0), canTake = free.reduce((t, x) => t + (100 - s[x]), 0);
  v = Math.min(v, s[id] + canGive);
  if (v < s[id]) v = Math.max(v, s[id] - canTake);
  let d = v - s[id];
  s[id] = v;
  const below = free.filter((x) => ids.indexOf(x) > i), above = free.filter((x) => ids.indexOf(x) < i);
  // taking: the deepest bench man first, then up; giving: the next man down first, then on
  const order = d > 0 ? [...below.reverse(), ...above.reverse()] : [...below, ...above.reverse()];
  for (const x of order) {
    if (!d) break;
    if (d > 0) { const t = Math.min(d, s[x]); s[x] -= t; d -= t; }
    else { const g = Math.min(-d, 100 - s[x]); s[x] += g; d += g; }
  }
  return explicit(overrides, s);
}

// Trade `amount` snaps from one player to another (a split bar's handle). Clamped so nobody goes
// under 0 or over 100. Returns the new overrides.
export function transfer(pos, players, overrides, shape, fromId, toId, amount) {
  const s = sharesOf(pos, players, overrides, shape);
  if (s[fromId] == null || s[toId] == null || fromId === toId) return overrides;
  const a = Math.max(-s[toId], Math.min(Math.round(amount), s[fromId], 100 - s[toId]));
  s[fromId] -= a; s[toId] += a;
  return explicit(overrides, s);
}

// The spots on the field for a position and who plays each, from the shares: each starter has his
// own spot (as much of it as he plays), the bench fills the rest from the last spot up (backups
// spell the slot and WR3 first), and a spot the club's personnel doesn't always use shows that as
// "other" (a two-tight-end club's third receiver). Returns [{ segs: [{ id, v }], other }].
export function laneSplit(pos, players, overrides = {}, shape) {
  const s = sharesOf(pos, players, overrides, shape);
  const order = healthyOf(players).map((p, i) => [p, i]).sort((a, b) => s[b[0].id] - s[a[0].id] || a[1] - b[1]).map(([p]) => p);
  const n = SNAP_SLOTS[pos] || 1, budget = snapBudget(pos, shape);
  // the room each spot really has (the budget can be less than n full spots)
  const cap = Array.from({ length: n }, (_, k) => Math.max(0, Math.min(100, budget - 100 * k)));
  const lanes = cap.map(() => ({ segs: [], other: 0 }));
  const room = [...cap];
  order.slice(0, n).forEach((p, k) => { const v = Math.min(s[p.id], room[k]); if (v > 0) { lanes[k].segs.push({ id: p.id, v }); room[k] -= v; } });
  for (const p of order.slice(n)) {
    let left = s[p.id];
    for (let k = n - 1; k >= 0 && left > 0; k--) { const v = Math.min(left, room[k]); if (v > 0) { lanes[k].segs.push({ id: p.id, v }); room[k] -= v; left -= v; } }
  }
  // a starter who plays past his own spot's room (rare): the rest wherever there's room
  order.slice(0, n).forEach((p, k) => {
    let left = s[p.id] - (lanes[k].segs.find((x) => x.id === p.id)?.v || 0);
    for (let j = n - 1; j >= 0 && left > 0; j--) { const v = Math.min(left, room[j]); if (v > 0) { lanes[j].segs.push({ id: p.id, v }); room[j] -= v; left -= v; } }
  });
  lanes.forEach((l, k) => { l.other = 100 - cap[k]; l.open = room[k]; });
  return lanes;
}
