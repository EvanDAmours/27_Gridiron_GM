// The injury report. Questionable players are playing hurt: they suit up at a reduced rating.
// Doubtful players miss the next game and are back the week after; Out players miss longer;
// injured reserve shows when a player can come back.
// wk: games played so far this season (the next game is wk + 1).
export function injStatus(p, { ir = false, wk = 0 } = {}) {
  if (!p) return null;
  const back = (n) => wk + n + 1;
  if (ir) {
    const minBack = (p.irWk ?? wk) + 4 + 1;
    const healBack = p.injured ? back(p.injWk || 0) : wk + 1;
    const ret = p.irReturnWk || Math.max(minBack, healBack);
    return { tag: "IR", label: "Injured reserve", color: "#a855f7", back: ret, note: p.injured ? (p.injType || "Injured") : "Healthy: ready to activate" };
  }
  if (p.injured) {
    const n = p.injWk || 1;
    if (n <= 1) return { tag: "D", label: "Doubtful", color: "#f97316", back: back(1), note: p.injType || "Injured" };
    return { tag: "OUT", label: "Out", color: "#ef4444", back: back(n), note: p.injType || "Injured" };
  }
  if (p.hurt?.wks > 0) return { tag: "Q", label: "Questionable", color: "#eab308", back: null, pen: p.hurt.pen, note: `${p.hurt.type || "Banged up"}: playing hurt (−${p.hurt.pen} OVR)` };
  return null;
}

// The rating penalty a hurt player plays with.
export const hurtPen = (p) => (p?.hurt?.wks > 0 && !p.injured ? p.hurt.pen || 0 : 0);

// Every injury on a club, worst first: { p, st }.
export function injuryReport(team, wk) {
  const rows = [
    ...(team.roster || []).map((p) => ({ p, st: injStatus(p, { wk }) })),
    ...(team.ir || []).map((p) => ({ p, st: injStatus(p, { ir: true, wk }) })),
  ].filter((r) => r.st);
  const rank = { IR: 0, OUT: 1, D: 2, Q: 3 };
  return rows.sort((a, b) => rank[a.st.tag] - rank[b.st.tag] || (b.p.ovr || 0) - (a.p.ovr || 0));
}
