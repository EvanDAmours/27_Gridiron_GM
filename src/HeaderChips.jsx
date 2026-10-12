// The franchise's vital signs under the club name: plain-language chips (hover for what each one
// means, click to go to the screen behind it) instead of abbreviations.
import React from "react";
import { C } from "./ui.jsx";

const OWNER = {
  patient: ["Patient", "#22c55e", "Your owner gives you time to build. Losing seasons cost you less job security."],
  meddling: ["Meddling", "#f59e0b", "Your owner has opinions and will push for moves now and then."],
  demanding: ["Demanding", C.rd, "Your owner wants wins now. Losing burns through his patience fast."],
};

export default function HeaderChips({ yr, t, space, cap, sp, owner, go }) {
  if (!t) return null;
  const mor = t.morale ?? 50, rep = t.gmRep ?? 50;
  const morale = mor >= 75 ? ["High", C.gn] : mor >= 45 ? ["Medium", C.gd] : ["Low", C.rd];
  const repL = rep >= 90 ? "Legend" : rep >= 75 ? "Elite" : rep >= 60 ? "Respected" : rep >= 40 ? "Veteran" : "Rookie";
  const chips = [
    { k: "Season", v: `${yr} · ${t.w}-${t.l}${t.t ? `-${t.t}` : ""}`, tip: "This season and your record so far", to: ["schedule"] },
    { k: "Cap room", v: `$${space.toFixed(1)}M`, c: space >= 0 ? C.gn : C.rd, tip: `Cap space left this season, out of a $${cap}M cap. Click for the Front Office.`, to: ["contracts", "overview"] },
    { k: "Scouting", v: `${sp} pts`, c: "#93c5fd", tip: "Scouting points to spend on prospect reports (and training camp in the preseason). Click for scouting.", to: ["scouting"] },
    { k: "Morale", v: morale[0], c: morale[1], tip: `Locker-room morale (${mor}/100). Winning, playing time and contracts move it; low morale hurts on game day.` },
    { k: "GM rep", v: repL, c: rep >= 75 ? "#a78bfa" : rep >= 60 ? C.gd : "#cbd5e1", tip: `Your reputation as a GM (${rep}/100). Higher rep makes free agents and trade partners more willing.` },
    ...(owner && OWNER[owner] ? [{ k: "Owner", v: OWNER[owner][0], c: OWNER[owner][1], tip: OWNER[owner][2] }] : []),
  ];
  return (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 3 }}>
      {chips.map((ch) => (
        <button key={ch.k} title={ch.tip} onClick={ch.to ? () => go(...ch.to) : undefined}
          style={{ display: "inline-flex", alignItems: "baseline", gap: 4, background: "#ffffff0d", border: "1px solid #ffffff1f", borderRadius: 999, padding: "1px 8px", fontSize: 11, color: "#94a3b8", cursor: ch.to ? "pointer" : "help", lineHeight: 1.5 }}>
          <span>{ch.k}</span><b style={{ color: ch.c || "#e2e8f0", fontWeight: 800 }}>{ch.v}</b>
        </button>
      ))}
    </div>
  );
}
