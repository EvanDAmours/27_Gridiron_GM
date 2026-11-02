// Small tags for a player's name on the depth chart: a circled R for a rookie (this season's, or a
// draft pick waiting for his first season), and his development trait. Normal development shows
// nothing, so the tags only appear where they tell you something.
import React from "react";
import { rookieSeason } from "./awards.js";
import { devOf, DEV_TRAITS } from "./scouting.js";

// the same colors as the trait badges on the player card (ScoutingUI DEV_STYLE)
const DEV_COLOR = { generational: "#f472b6", superstar: "#f5c542", star: "#60a5fa", late: "#c4b5fd" };
const DEV_SHORT = { generational: "GEN", superstar: "SUPER", star: "STAR", late: "LATE" };

// a rookie: his first season is this one or the next (drafted this spring)
export const isRookie = (p, yr) => { const r = p ? rookieSeason(p) : null; return r != null && yr != null && r >= yr; };

export function RookieDot({ size = 16, style }) {
  return <span title="Rookie" aria-label="Rookie" style={{ display: "inline-grid", placeItems: "center", width: size, height: size, borderRadius: "50%", background: "#0b0f17", border: "1.5px solid #fbbf24", color: "#fbbf24", fontSize: size * 0.62, fontWeight: 900, lineHeight: 1, flexShrink: 0, ...style }}>R</span>;
}

export function DevTag({ p, style }) {
  const d = p ? devOf(p) : null, c = DEV_COLOR[d];
  if (!c) return null;
  return <span title={`${DEV_TRAITS[d].name} development: ${DEV_TRAITS[d].desc}`} style={{ display: "inline-flex", alignItems: "center", height: 16, padding: "0 5px", borderRadius: 5, border: `1px solid ${c}`, background: "#0b0f17", color: c, fontSize: 9.5, fontWeight: 900, letterSpacing: ".06em", lineHeight: 1, flexShrink: 0, whiteSpace: "nowrap", ...style }}>{DEV_SHORT[d]}</span>;
}

// both, inline after a name
export function NameTags({ p, yr, gap = 5 }) {
  const r = isRookie(p, yr), dv = p && DEV_COLOR[devOf(p)];
  if (!r && !dv) return null;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginLeft: gap, verticalAlign: "middle" }}>{r && <RookieDot />}{dv && <DevTag p={p} />}</span>;
}
