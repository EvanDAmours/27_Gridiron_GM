// Real NFL headshots: real players (the Madden 27 rosters and real free agents) carry their ESPN id
// on their face, and the portrait shows ESPN's photo instead of the drawn face. Generated players
// keep the drawn face, and so does anyone whose photo won't load (offline, or no photo).
import { ESPN_IDS } from "./data/headshots.js";

const GROUP = { QB: "QB", RB: "RB", WR: "WR", TE: "TE", LT: "OL", LG: "OL", C: "OL", RG: "OL", RT: "OL", DL: "DL", LB: "LB", CB: "DB", S: "DB", K: "SPEC", P: "SPEC" };
const norm = (n) => String(n || "").toLowerCase().replace(/[.'’]/g, "").replace(/\b(jr|sr|ii|iii|iv|v)\b/g, "").replace(/[^a-z]+/g, " ").trim();

export function espnIdOf(p) {
  if (!p || p.src !== "m27") return null;
  const n = norm(p.name);
  return ESPN_IDS[`${n}|${GROUP[p.pos]}`] ?? Object.entries(ESPN_IDS).find(([k]) => k.startsWith(`${n}|`))?.[1] ?? null;
}
// Stamps the photo id on a real player's face (once).
export function withHeadshot(p) {
  if (!p || p.face?.espn || p.src !== "m27") return p;
  const id = espnIdOf(p);
  if (id) p.face = { ...(p.face || {}), espn: id };
  return p;
}
// Every player in a save: rosters, practice squads, IR, free agents, waivers, retired players' cards.
export function headshotSave(d) {
  for (const t of d?.teams || []) for (const k of ["roster", "ps", "ir"]) (t[k] || []).forEach(withHeadshot);
  for (const k of ["fa", "waivers"]) (d?.[k] || []).forEach(withHeadshot);
  for (const r of d?.retired || []) if (r.card) withHeadshot(r.card);
  return d;
}
export const headshotUrl = (id, w = 160) => `https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/${id}.png&w=${w}&h=${Math.round(w * 0.725)}`;
