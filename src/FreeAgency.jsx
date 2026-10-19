// Free agency, laid out like the trade screen: one big sortable table of real free agents, your
// cap and needs up top, and a real negotiation (years and money) when you go to sign someone.
import { fillsNeed } from "./needs.js";
import Select from "./Select.jsx";
import { MOBILE } from "./mobile.js";
import React, { useState } from "react";
import { C, oC, Bdg, Btn, Face } from "./ui.jsx";
import { yearlyAsk, maxYears } from "./negotiation.js";
// what the negotiation table opens at: his ask for the default length (two years, or one for a 33+ veteran)
const askingPrice = (p) => yearlyAsk(p, Math.min(2, maxYears(p)), "fa");
import Negotiate from "./Negotiate.jsx";
import { posTag } from "./dline.js";
import { devOf, DEV_TRAITS } from "./scouting.js";
import RoleTag from "./RoleTag.jsx";
import { ROLE_FILTERS, roleFilterMatch } from "./roleNeeds.js";


// his development trait as a small tag (normal shows nothing)
const DEV_C = { generational: "#f472b6", superstar: "#f5c542", star: "#60a5fa", late: "#34d399" };
const DevTag = ({ p }) => { const d = devOf(p); return DEV_C[d] ? <span title={DEV_TRAITS[d]?.desc} style={{ fontSize: 11, fontWeight: 900, color: DEV_C[d], border: `1px solid ${DEV_C[d]}66`, borderRadius: 999, padding: "0 6px", marginLeft: 6, whiteSpace: "nowrap" }}>{DEV_TRAITS[d]?.name}</span> : null; };

// the defensive line is two positions here: edge rushers and interior tackles
const POS = ["QB", "RB", "WR", "TE", "LT", "LG", "C", "RG", "RT", "EDGE", "DT", "LB", "CB", "S", "K", "P"];
const money = (n) => `$${(+n || 0).toFixed(1)}M`;
const sel = { background: C.bg, color: C.tx, border: `1px solid ${C.bd}`, borderRadius: 6, padding: "8px 10px", fontSize: 15 };

export default function FreeAgency({ startPos, fa, team, teams, ui, needs, capSpace, setSel, open, extras, sheets, talkFor, termsFor, onTalk, cy }) {
  const [pos, setPos] = useState(startPos || "ALL");
  const [q, setQ] = useState("");
  const [find, setFind] = useState(false);
  const [needOnly, setNeedOnly] = useState(false);
  const [sort, setSort] = useState(["ovr", -1]);
  const [n, setN] = useState(50);
  const [offer, setOffer] = useState(null);
  const cap = capSpace(team);
  const key = { ovr: (p) => p.ovr, age: (p) => p.age, ask: (p) => askingPrice(p), pos: (p) => POS.indexOf(posTag(p)), name: (p) => p.name };
  const rows = fa
    .filter((p) => pos === "ALL" || posTag(p) === pos || (pos.startsWith("R:") && roleFilterMatch(p, pos)))
    .filter((p) => !needOnly || fillsNeed(needs, p))
    .filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => { const x = key[sort[0]](a), y = key[sort[0]](b); return (typeof x === "string" ? x.localeCompare(y) : x - y) * sort[1]; });
  const th = (k, label, left) => (
    <th onClick={k ? () => setSort(([s, d]) => [k, s === k ? -d : k === "name" || k === "pos" ? 1 : -1]) : undefined} style={{ padding: "8px 6px", fontSize: 12, fontWeight: 800, letterSpacing: 1, color: sort[0] === k ? "#fff" : C.mt, borderBottom: `1px solid ${C.bd}`, textAlign: left ? "left" : "center", cursor: k ? "pointer" : "default", whiteSpace: "nowrap", position: "sticky", top: 0, background: C.cd }}>
      {label}{sort[0] === k ? (sort[1] < 0 ? " ▼" : " ▲") : ""}
    </th>
  );
  const td = { padding: "9px 6px", borderBottom: `1px solid ${C.bd}55`, textAlign: "center", fontSize: 15 };
  return (
    <div>
      <style>{"@media (max-width: 640px) { .fa-hide { display: none } }"}</style>
      <div style={{ display: "flex", alignItems: "baseline", gap: "6px 20px", flexWrap: "wrap", marginBottom: 12 }}>
        <span style={{ fontSize: 24, fontWeight: 900 }}>Free Agency</span>
        <span style={{ fontSize: 15, color: C.mt }}>Cap space <b style={{ fontSize: 20, color: cap >= 0 ? C.gn : C.rd }}>{money(cap)}</b></span>
        <span style={{ fontSize: 15, color: C.mt }}>Roster <b style={{ fontSize: 20, color: "#fff" }}>{team.roster.length}</b>/53</span>
        <span style={{ fontSize: 15, color: C.mt }}>{fa.length} free agents</span>
      </div>
      {!open && <div style={{ background: `${C.gd}18`, border: `1px solid ${C.gd}55`, borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 15, color: "#fde68a" }}>The big free agency period opens after the Combine. Right now it's whoever is left on the market.</div>}
      {sheets}
      <div style={{ background: C.cd, border: `1px solid ${C.bd}`, borderRadius: 10, padding: 12 }}>
        {MOBILE ? (
          <>
            {/* phones: one row (position, sort, needs, search behind 🔍) instead of three */}
            <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
              <Select value={pos} onChange={(e) => { setPos(e.target.value); setN(50); }} aria-label="Position" style={{ ...sel, flex: "1 1 0", minWidth: 0 }}>
                {["ALL", ...POS].map((x) => <option key={x} value={x}>{x === "ALL" ? "All pos." : x}</option>)}
              </Select>
              <Select value={sort[0]} onChange={(e) => setSort([e.target.value, ["name", "pos"].includes(e.target.value) ? 1 : -1])} aria-label="Sort free agents" style={{ ...sel, flex: "1 1 0", minWidth: 0 }}>
                {[["ovr", "Overall"], ["ask", "Price"], ["age", "Age"], ["pos", "Position"], ["name", "Name"]].map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </Select>
              <button onClick={() => setNeedOnly((v) => !v)} aria-pressed={needOnly} title={`Your needs: ${needs.slice(0, 4).join(", ") || "none"}`} style={{ ...sel, flex: "0 0 auto", cursor: "pointer", background: needOnly ? `${C.bl}33` : C.bg, borderColor: needOnly ? C.bl : C.bd, fontWeight: 700 }}>Needs</button>
              <button onClick={() => { setFind((v) => !v); if (find) setQ(""); }} aria-label="Search by name" style={{ ...sel, flex: "0 0 auto", cursor: "pointer", background: find || q ? `${C.bl}33` : C.bg }}>🔍</button>
            </div>
            {find && <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name" aria-label="Search free agents" style={{ ...sel, width: "100%", boxSizing: "border-box", marginBottom: 8 }} />}
          </>
        ) : <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Select value={pos} onChange={(e) => { setPos(e.target.value); setN(50); }} aria-label="Position" style={sel}>
            {["ALL", ...POS].map((x) => <option key={x} value={x}>{x === "ALL" ? "All positions" : x}</option>)}
            {ROLE_FILTERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <button onClick={() => setNeedOnly((v) => !v)} style={{ ...sel, cursor: "pointer", background: needOnly ? `${C.bl}33` : C.bg, borderColor: needOnly ? C.bl : C.bd, fontWeight: 700 }}>Your needs: {needs.slice(0, 4).join(", ") || "none"}</button>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name" aria-label="Search free agents" style={{ ...sel, flex: "1 1 160px" }} />
        </div>}
        {MOBILE ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {rows.slice(0, n).map((p) => {
              const ask = askingPrice(p);
              const from = p.formerTeam != null ? teams[p.formerTeam] : null;
              return (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, background: p.formerTeam === ui ? "#14532d22" : C.bg, border: `1px solid ${C.bd}`, borderRadius: 10, padding: "8px 10px" }}>
                  <span onClick={() => setSel(p)} style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0, cursor: "pointer" }}>
                    <Face s={p.face} sz={34} />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontWeight: 800, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}<DevTag p={p} /></span>
                      <span style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12.5, color: "#94a3b8", marginTop: 2, flexWrap: "wrap" }}><Bdg pos={posTag(p)} /><RoleTag p={p} /><span>Age {p.age}</span><span style={{ color: ask <= cap ? "#e2e8f0" : C.rd, fontWeight: 700 }}>{money(ask)}/yr</span>{from && <span style={{ color: p.formerTeam === ui ? C.gn : C.mt }}>{p.formerTeam === ui ? "Your former player" : `ex-${from.ab}`}</span>}</span>
                    </span>
                  </span>
                  <span style={{ fontSize: 22, fontWeight: 900, color: oC(p.ovr) }}>{p.ovr}</span>
                  {talkFor(p).walked ? <span style={{ fontSize: 12, color: C.rd, fontWeight: 700, width: 64, textAlign: "center" }}>Not interested</span> : <Btn onClick={() => setOffer(p)} bg={C.gn} style={{ fontSize: 14, minHeight: 42, padding: "6px 12px" }}>Offer</Btn>}
                </div>
              );
            })}
            {!rows.length && <div style={{ padding: 16, color: C.mt, fontSize: 15 }}>Nobody matches.</div>}
          </div>
        ) : (
        <div style={{ maxHeight: "70vh", overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{th("name", "PLAYER", true)}{th("pos", "POS")}{th("age", "AGE")}{th("ovr", "OVR")}<th className="fa-hide" style={{ padding: "8px 6px", fontSize: 12, fontWeight: 800, letterSpacing: 1, color: C.mt, borderBottom: `1px solid ${C.bd}`, position: "sticky", top: 0, background: C.cd }}>POT</th>{th("ask", "ASKING")}<th style={{ borderBottom: `1px solid ${C.bd}`, position: "sticky", top: 0, background: C.cd }}></th></tr></thead>
            <tbody>
              {rows.slice(0, n).map((p) => {
                const ask = askingPrice(p);
                const from = p.formerTeam != null ? teams[p.formerTeam] : null;
                return (
                  <tr key={p.id} style={{ background: p.formerTeam === ui ? "#14532d22" : "transparent" }}>
                    <td style={{ ...td, textAlign: "left" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <Face s={p.face} sz={28} />
                        <span>
                          <span onClick={() => setSel(p)} style={{ fontWeight: 700, color: "#f1f5f9", cursor: "pointer", textDecoration: "underline", textDecorationColor: "#334155", textUnderlineOffset: 3 }}>{p.name}</span>
                          {p.xf && <span title={`X-Factor: ${p.xf}`} style={{ marginLeft: 6, fontSize: 11, fontWeight: 900, color: "#f472b6" }}>XF</span>}<DevTag p={p} />
                          {from && <span style={{ display: "block", fontSize: 12, color: p.formerTeam === ui ? C.gn : C.mt }}>{p.formerTeam === ui ? "Your former player" : `Last with ${from.ab}`}</span>}
                        </span>
                      </span>
                    </td>
                    <td style={td}><Bdg pos={posTag(p)} /><RoleTag p={p} /></td>
                    <td style={{ ...td, color: "#cbd5e1" }}>{p.age}</td>
                    <td style={{ ...td, fontWeight: 900, fontSize: 18, color: oC(p.ovr) }}>{p.ovr}</td>
                    <td className="fa-hide" style={{ ...td, color: oC(p.pot || p.ovr) }}>{p.pot || p.ovr}</td>
                    <td style={{ ...td, whiteSpace: "nowrap", color: ask <= cap ? "#e2e8f0" : C.rd }}>{money(ask)}<span className="fa-hide" style={{ color: C.mt, fontSize: 12 }}>/yr</span></td>
                    <td style={{ ...td, textAlign: "right" }}>{talkFor(p).walked ? <span style={{ fontSize: 13, color: C.rd, fontWeight: 700 }}>Not interested</span> : <Btn onClick={() => setOffer(p)} bg={C.gn} style={{ fontSize: 14, padding: "6px 14px" }}>Negotiate</Btn>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length && <div style={{ padding: 16, color: C.mt, fontSize: 15 }}>Nobody matches.</div>}
        </div>
        )}
        {rows.length > n && <div style={{ textAlign: "center", marginTop: 10 }}><Btn onClick={() => setN(n + 50)} bg={C.bd} c="#cbd5e1" style={{ fontSize: 14, padding: "6px 14px" }}>Show more ({rows.length - n} left)</Btn></div>}
      </div>
      {extras}
      {offer && <Negotiate team={team} cy={cy} p={offer} mode="fa" cap={cap} t={termsFor(offer, "fa")} talk={talkFor(offer)} onResult={(r, o) => onTalk(offer, "fa", r, o)} onClose={() => setOffer(null)} rivalName={(id) => teams[id] && `${teams[id].city} ${teams[id].name}`} />}
    </div>
  );
}
