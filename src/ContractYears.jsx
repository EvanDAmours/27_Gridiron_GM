// A player's deal year by year on his card (scheduled deals: contractSchedule.js): the cap hit
// each league year, the March roster bonus, and when the money is (or becomes) guaranteed.
import React from "react";
import { yearHit } from "./contractSchedule.js";

const money = (n) => `$${(+n || 0).toFixed(1)}M`;
// One deal's table: rows of { base, rb, pr?, g } from year y0.
function Table({ title, rows, sb, y0 }) {
  const th = { fontSize: 10.5, fontWeight: 900, letterSpacing: 1, color: "#64748b", textAlign: "right", padding: "0 0 3px" };
  const td = { fontSize: 13, textAlign: "right", padding: "3px 0", color: "#cbd5e1" };
  const rb = rows.some((y) => y.rb > 0);
  return (
    <div style={{ background: "#ffffff08", border: "1px solid #ffffff10", borderRadius: 10, padding: "8px 11px", marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1.3, color: "#64748b", marginBottom: 4 }}>{title}</div>
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead><tr><th style={{ ...th, textAlign: "left" }}>YEAR</th><th style={th}>SALARY</th>{rb && <th style={th}>ROSTER</th>}<th style={th}>BONUS</th><th style={th}>CAP HIT</th><th style={th}>GUARANTEED</th></tr></thead>
        <tbody>{rows.map((y, i) => (
          <tr key={i} style={{ borderTop: "1px solid #ffffff10" }}>
            <td style={{ ...td, textAlign: "left", fontWeight: 800, color: i === 0 ? "#fff" : "#94a3b8" }}>{y0 != null ? y0 + i : `Yr ${i + 1}`}</td>
            <td style={td}>{money(y.base)}</td>{rb && <td style={td} title="Paid when the league year opens in March">{y.rb ? money(y.rb) : "-"}</td>}
            <td style={td}>{money(y.pr ?? sb ?? 0)}</td>
            <td style={{ ...td, fontWeight: 900, color: "#fff" }}>{money(yearHit(y, sb))}</td>
            <td style={{ ...td, fontWeight: 700, color: y.g === "full" ? "#4ade80" : y.g === "vest" ? "#93c5fd" : "#64748b" }} title={y.g === "vest" ? "Becomes guaranteed when this league year opens, if he's still on the roster" : undefined}>{y.g === "full" ? (y.part < 1 ? `${Math.round(y.part * 100)}%` : "Yes") : y.g === "vest" ? (y.part < 1 ? `${Math.round(y.part * 100)}% Mar` : "In March") : "No"}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

// extStart: the league year his extension starts (when this deal runs out).
export default function ContractYears({ p, extStart }) {
  const cur = p?.sched?.length && p.schedYr != null;
  const ext = p?.ext?.sched?.length;
  if (!cur && !ext) return null;
  return <>
    {cur && <Table title={`CONTRACT BY YEAR${p.gtdAtSign ? ` · ${money(p.gtdAtSign)} GUARANTEED AT SIGNING` : ""}`} rows={p.sched} sb={p.sb} y0={p.schedYr} />}
    {ext && <Table title={`EXTENSION: ${p.ext.yrs} YR${p.ext.yrs > 1 ? "S" : ""}, ${money(p.ext.apy ?? p.ext.sal)} A YEAR${p.ext.gtd ? ` · ${money(p.ext.gtd)} GUARANTEED` : ""}`} rows={p.ext.sched} sb={p.ext.sb} y0={extStart} />}
  </>;
}
