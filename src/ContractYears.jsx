// A player's deal year by year on his card (scheduled deals: contractSchedule.js): the cap hit
// each league year, the March roster bonus, and when the money is (or becomes) guaranteed.
import React from "react";
import { schedHit } from "./contractSchedule.js";

const money = (n) => `$${(+n || 0).toFixed(1)}M`;
export default function ContractYears({ p }) {
  if (!p?.sched?.length || p.schedYr == null) return null;
  const th = { fontSize: 10.5, fontWeight: 900, letterSpacing: 1, color: "#64748b", textAlign: "right", padding: "0 0 3px" };
  const td = { fontSize: 13, textAlign: "right", padding: "3px 0", color: "#cbd5e1" };
  const rb = p.sched.some((y) => y.rb > 0);
  return (
    <div style={{ background: "#ffffff08", border: "1px solid #ffffff10", borderRadius: 10, padding: "8px 11px", marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1.3, color: "#64748b", marginBottom: 4 }}>CONTRACT BY YEAR{p.gtdAtSign ? ` · ${money(p.gtdAtSign)} GUARANTEED AT SIGNING` : ""}</div>
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead><tr><th style={{ ...th, textAlign: "left" }}>YEAR</th><th style={th}>SALARY</th>{rb && <th style={th}>ROSTER</th>}<th style={th}>BONUS</th><th style={th}>CAP HIT</th><th style={th}>GUARANTEED</th></tr></thead>
        <tbody>{p.sched.map((y, i) => (
          <tr key={i} style={{ borderTop: "1px solid #ffffff10" }}>
            <td style={{ ...td, textAlign: "left", fontWeight: 800, color: i === 0 ? "#fff" : "#94a3b8" }}>{p.schedYr + i}</td>
            <td style={td}>{money(y.base)}</td>{rb && <td style={td} title="Paid when the league year opens in March">{y.rb ? money(y.rb) : "-"}</td>}
            <td style={td}>{money(p.sb || 0)}</td>
            <td style={{ ...td, fontWeight: 900, color: "#fff" }}>{money(schedHit(p, i))}</td>
            <td style={{ ...td, fontWeight: 700, color: y.g === "full" ? "#4ade80" : y.g === "vest" ? "#93c5fd" : "#64748b" }} title={y.g === "vest" ? "Becomes guaranteed when this league year opens, if he's still on the roster" : undefined}>{y.g === "full" ? "Yes" : y.g === "vest" ? "In March" : "No"}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
