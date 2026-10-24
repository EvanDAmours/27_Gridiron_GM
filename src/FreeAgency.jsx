// Free agency, laid out like the trade screen: one big sortable table of real free agents, your
// cap and needs up top, and a real negotiation (years and money) when you go to sign someone.
import { fillsNeed } from "./needs.js";
import Select from "./Select.jsx";
import { MOBILE } from "./mobile.js";
import React, { useState } from "react";
import { C, oC, Bdg, Btn, Face, Sheet } from "./ui.jsx";
import { yearlyAsk, maxYears } from "./negotiation.js";
// what the negotiation table opens at: his ask for the default length (two years, or one for a 33+ veteran)
const askingPrice = (p) => yearlyAsk(p, Math.min(2, maxYears(p)), "fa");
import Negotiate from "./Negotiate.jsx";
import { FA_DAYS, MARKET_MIN, bidsFor, committed, decideDay, standing } from "./faMarket.js";
import { posTag } from "./dline.js";
import { devOf, DEV_TRAITS } from "./scouting.js";
import RoleTag from "./RoleTag.jsx";
import { ROLE_FILTERS, roleFilterMatch } from "./roleNeeds.js";


// his development trait as a small tag (normal shows nothing)
const DEV_C = { generational: "#f472b6", superstar: "#f5c542", star: "#60a5fa", late: "#34d399" };
const DevTag = ({ p }) => { const d = devOf(p); return DEV_C[d] ? <span title={DEV_TRAITS[d]?.desc} style={{ fontSize: 11, fontWeight: 900, color: DEV_C[d], border: `1px solid ${DEV_C[d]}66`, borderRadius: 999, padding: "0 6px", marginLeft: 6, whiteSpace: "nowrap" }}>{DEV_TRAITS[d]?.name}</span> : null; };

// The market on a player: how many clubs have offered, yours and where it stands if you have, and
// when he decides.
const whenOf = (p, market) => { const dd = Math.max(market.day, decideDay(p, market.yr)); return dd <= market.day ? "decides today" : `decides day ${dd}`; };
function MarketTag({ p, market, ui, teams }) {
  if (!market || p.ovr < MARKET_MIN) return null;
  const bids = bidsFor(market, p.id), mine = bids.find((b) => b.team === ui), others = bids.length - (mine ? 1 : 0);
  const when = whenOf(p, market);
  if (!bids.length) return <span style={{ fontSize: 12, color: C.mt, whiteSpace: "nowrap" }}>No offers · {when}</span>;
  const st = mine ? standing(p, market, teams, ui) : null;
  return (
    <span style={{ fontSize: 12, fontWeight: 800, whiteSpace: "nowrap", color: mine ? "#93c5fd" : "#fca5a5" }}>
      {mine ? <>Your offer ${mine.sal}M <span style={{ color: st === "lead" ? C.gn : "#fbbf24" }}>{st === "lead" ? "✓ leading" : "▲ outbid"}</span></> : ""}{mine && others ? " · " : ""}{others ? `${others} other offer${others > 1 ? "s" : ""}` : ""}{` · ${when}`}
    </span>
  );
}

// the defensive line is two positions here: edge rushers and interior tackles
const POS = ["QB", "RB", "WR", "TE", "LT", "LG", "C", "RG", "RT", "EDGE", "DT", "LB", "CB", "S", "K", "P"];
const money = (n) => `$${(+n || 0).toFixed(1)}M`;
const sel = { background: C.bg, color: C.tx, border: `1px solid ${C.bd}`, borderRadius: 6, padding: "8px 10px", fontSize: 15 };

export default function FreeAgency({ startPos, fa, team, teams, ui, needs, capSpace, setSel, open, extras, sheets, talkFor, termsFor, onTalk, cy, market, onNextDay }) {
  const [pos, setPos] = useState(startPos || "ALL");
  const [q, setQ] = useState("");
  const [find, setFind] = useState(false);
  const [needOnly, setNeedOnly] = useState(false);
  const [sort, setSort] = useState(["ovr", -1]);
  const [n, setN] = useState(50);
  const [offer, setOffer] = useState(null);
  // your open offers hold their money until the player decides
  const out = market ? committed(market, ui) : 0, nOut = market ? Object.values(market.bids).flat().filter((b) => b.team === ui).length : 0;
  const cap = capSpace(team) - out;
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
  const negotiate = () => (<Negotiate note={market && offer.ovr >= MARKET_MIN ? (() => { const o = bidsFor(market, offer.id).filter((b) => b.team !== ui).length, dd = Math.max(market.day, decideDay(offer, market.yr)); const st = standing(offer, market, teams, ui); return `📋 ${o ? `${o} club${o > 1 ? "s have" : " has"} made him an offer.` : "No offers yet."}${st === "lead" ? " Your offer is the best one for him right now." : st === "behind" ? " Another club's offer is better for him right now." : ""} He decides ${dd <= market.day ? "at the end of today" : `on day ${dd}`}. He takes the best offer for him: more money, or a club with what he wants. Only a big overpay (20%+ over his ask) signs him on the spot.`; })() : null} team={team} cy={cy} p={offer} mode="fa" cap={cap + (bidsFor(market, offer.id).find((b) => b.team === ui)?.sal || 0)} t={termsFor(offer, "fa")} talk={talkFor(offer)} onResult={(r, o) => onTalk(offer, "fa", r, o)} onClose={() => setOffer(null)} rivalName={(id) => teams[id] && `${teams[id].city} ${teams[id].name}`} />);
  if (MOBILE) return <PhoneFA {...{ fa, rows, n, setN, pos, setPos, needOnly, setNeedOnly, needs, q, setQ, find, setFind, sort, setSort, cap, out, nOut, open, market, onNextDay, sheets, extras, teams, ui, talkFor, setSel, offer, setOffer }} negotiate={offer && negotiate()} />;
  return (
    <div>
      <style>{"@media (max-width: 640px) { .fa-hide { display: none } }"}</style>
      <div style={{ display: "flex", alignItems: "baseline", gap: "6px 20px", flexWrap: "wrap", marginBottom: 12 }}>
        <span style={{ fontSize: 24, fontWeight: 900 }}>Free Agency</span>
        <span style={{ fontSize: 15, color: C.mt }}>Cap space <b style={{ fontSize: 20, color: cap >= 0 ? C.gn : C.rd }}>{money(cap)}</b>{out > 0 && <span style={{ fontSize: 13 }}> after {nOut} open offer{nOut > 1 ? "s" : ""} ({money(out)})</span>}</span>
        <span style={{ fontSize: 15, color: C.mt }}>Roster <b style={{ fontSize: 20, color: "#fff" }}>{team.roster.length}</b>/53</span>
        <span style={{ fontSize: 15, color: C.mt }}>{fa.length} free agents</span>
      </div>
      {!open && <div style={{ background: `${C.gd}18`, border: `1px solid ${C.gd}55`, borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 15, color: "#fde68a" }}>The big free agency period opens after the Combine. Right now it's whoever is left on the market.</div>}
      {market && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", background: `${C.bl}14`, border: `1px solid ${C.bl}55`, borderRadius: 10, padding: "10px 14px", marginBottom: 12 }}>
          <span style={{ fontSize: 18, fontWeight: 900 }}>📅 Day {market.day} of {FA_DAYS}</span>
          <span style={{ flex: "1 1 260px", fontSize: 13, color: "#cbd5e1", lineHeight: 1.4 }}>Clubs make offers every day. Each player takes the best one on his day: the money, plus the role, scheme and winning he wants. Only a big overpay signs him on the spot.</span>
          {market.day < FA_DAYS ? <Btn onClick={onNextDay} bg={C.bl} style={{ fontSize: 15, padding: "9px 18px", fontWeight: 900 }}>Next day →</Btn> : <span style={{ fontSize: 13, color: "#fde68a", fontWeight: 700 }}>Last day: everyone still deciding chooses when you finish free agency.</span>}
        </div>
      )}
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
                      <span style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12.5, color: "#94a3b8", marginTop: 2, flexWrap: "wrap" }}><Bdg pos={posTag(p)} /><RoleTag p={p} /><span>Age {p.age}</span><span style={{ color: ask <= cap ? "#e2e8f0" : C.rd, fontWeight: 700 }}>{money(ask)}/yr</span>{from && <span style={{ color: p.formerTeam === ui ? C.gn : C.mt }}>{p.formerTeam === ui ? "Your former player" : `ex-${from.ab}`}</span>}<MarketTag p={p} market={market} ui={ui} teams={teams} /></span>
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
                          {market && p.ovr >= MARKET_MIN && <span style={{ display: "block" }}><MarketTag p={p} market={market} ui={ui} teams={teams} /></span>}
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
      {offer && negotiate()}
    </div>
  );
}

// Phones: one line a free agent (position, name, his ask or where your offer stands, overall). A tap
// opens him in a sheet with one big button: make an offer.
const FA_SORTS = [["ovr", "Overall"], ["ask", "Price"], ["age", "Age"], ["pos", "Position"], ["name", "Name"]];
function PhoneFA({ fa, rows, n, setN, pos, setPos, needOnly, setNeedOnly, needs, q, setQ, find, setFind, sort, setSort, cap, out, nOut, open, market, onNextDay, sheets, extras, teams, ui, talkFor, setSel, offer, setOffer, negotiate }) {
  const [pick, setPick] = useState(null), [sortOpen, setSortOpen] = useState(false);
  const icon = { height: 44, borderRadius: 10, border: 0, background: "#ffffff0f", color: "#cbd5e1", fontSize: 16, fontWeight: 700, cursor: "pointer", flexShrink: 0, padding: "0 12px" };
  const pk = pick && fa.find((p) => p.id === pick);
  const mineOf = (p) => market && p.ovr >= MARKET_MIN && bidsFor(market, p.id).find((b) => b.team === ui);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 24, fontWeight: 900 }}>Free Agency</span>
        <span style={{ marginLeft: "auto", fontSize: 14, color: C.mt }}>{fa.length} available</span>
      </div>
      {out > 0 && <div style={{ fontSize: 14, color: "#93c5fd", marginBottom: 4 }}>{money(out)} held in {nOut} open offer{nOut > 1 ? "s" : ""} · {money(cap)} left</div>}
      {!open && <div style={{ fontSize: 14, color: "#fde68a", marginBottom: 8 }}>The main market opens after the Combine.</div>}
      {market && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: `${C.bl}1f`, borderRadius: 14, padding: "10px 12px", margin: "8px 0" }}>
          <span style={{ flex: 1, fontSize: 17, fontWeight: 900 }}>Day {market.day} of {FA_DAYS}</span>
          {market.day < FA_DAYS ? <Btn onClick={onNextDay} bg={C.bl} style={{ fontSize: 15, minHeight: 44, padding: "0 18px", fontWeight: 900, borderRadius: 10 }}>Next day</Btn> : <span style={{ fontSize: 13, color: "#fde68a", fontWeight: 700 }}>Last day</span>}
        </div>
      )}
      {sheets}
      <div style={{ display: "flex", gap: 8, margin: "8px 0" }}>
        <Select value={pos} onChange={(e) => { setPos(e.target.value); setN(50); }} aria-label="Position" style={{ ...sel, flex: "1 1 0", minWidth: 0, minHeight: 44, borderRadius: 10 }}>
          {["ALL", ...POS].map((x) => <option key={x} value={x}>{x === "ALL" ? "All positions" : x}</option>)}
        </Select>
        <button onClick={() => setNeedOnly((v) => !v)} aria-pressed={needOnly} style={{ ...icon, background: needOnly ? `${C.bl}33` : icon.background, color: needOnly ? "#fff" : icon.color }}>Needs</button>
        <button onClick={() => { setFind((v) => !v); if (find) setQ(""); }} aria-label="Search by name" style={{ ...icon, fontSize: 18, background: find || q ? `${C.bl}33` : icon.background }}>⌕</button>
        <button onClick={() => setSortOpen(true)} aria-label="Sort free agents" style={{ ...icon, fontSize: 18, background: sort[0] !== "ovr" ? `${C.bl}33` : icon.background }}>⇅</button>
      </div>
      {find && <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name" aria-label="Search free agents" style={{ ...sel, width: "100%", boxSizing: "border-box", marginBottom: 8, borderRadius: 10 }} />}
      <div style={{ background: C.cd, borderRadius: 14, padding: "0 12px" }}>
        {rows.slice(0, n).map((p, i) => {
          const ask = askingPrice(p), mine = mineOf(p), walked = talkFor(p).walked;
          const st = mine ? standing(p, market, teams, ui) : null;
          return (
            <button key={p.id} onClick={() => setPick(p.id)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 52, textAlign: "left", background: "transparent", border: 0, borderTop: i ? "1px solid #ffffff10" : 0, padding: "0 2px", color: C.tx, cursor: "pointer", opacity: walked ? 0.5 : 1 }}>
              <span style={{ width: 42, flexShrink: 0 }}><Bdg pos={posTag(p)} /></span>
              {/* the fit (his role, green when your lineup needs it) and his development trait stay on the row */}
              <span style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 2, overflow: "hidden" }}>
                <span style={{ minWidth: 0, fontWeight: 700, fontSize: 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: p.formerTeam === ui ? C.gn : "#f1f5f9" }}>{p.name}</span>
                <span style={{ flexShrink: 0, display: "inline-flex", alignItems: "center" }}><RoleTag p={p} /><DevTag p={p} /></span>
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", color: mine ? (st === "lead" ? C.gn : "#fbbf24") : walked ? C.rd : ask <= cap ? "#94a3b8" : C.rd }}>{mine ? (st === "lead" ? "Leading" : "Outbid") : walked ? "Not interested" : `${money(ask)}`}</span>
              <b style={{ fontSize: 20, width: 32, textAlign: "right", color: oC(p.ovr) }}>{p.ovr}</b>
            </button>
          );
        })}
        {!rows.length && <div style={{ padding: 16, color: C.mt, fontSize: 15 }}>Nobody matches.</div>}
      </div>
      {rows.length > n && <div style={{ textAlign: "center", marginTop: 10 }}><Btn onClick={() => setN(n + 50)} bg={C.bd} c="#cbd5e1" style={{ fontSize: 15, minHeight: 44, padding: "0 18px", borderRadius: 10 }}>Show more</Btn></div>}
      {extras}
      {pk && !offer && (
        <Sheet title={pk.name} onClose={() => setPick(null)}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <Face s={pk.face} sz={56} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}><Bdg pos={posTag(pk)} /><RoleTag p={pk} /><DevTag p={pk} /></div>
              <div style={{ fontSize: 14, color: "#94a3b8", marginTop: 4 }}>Age {pk.age}{pk.formerTeam != null && teams[pk.formerTeam] ? ` · last with ${pk.formerTeam === ui ? "you" : teams[pk.formerTeam].ab}` : ""}</div>
            </div>
            <b style={{ fontSize: 34, color: oC(pk.ovr) }}>{pk.ovr}</b>
          </div>
          <div style={{ display: "flex", alignItems: "center", minHeight: 48, padding: "0 4px", fontSize: 16 }}><b>Asking</b><span style={{ marginLeft: "auto", color: askingPrice(pk) <= cap ? "#e2e8f0" : C.rd }}>{money(askingPrice(pk))} a year</span></div>
          {market && pk.ovr >= MARKET_MIN && <div style={{ padding: "10px 4px", borderTop: "1px solid #ffffff14" }}><MarketTag p={pk} market={market} ui={ui} teams={teams} /></div>}
          {talkFor(pk).walked ? <div style={{ fontSize: 15, color: C.rd, fontWeight: 700, textAlign: "center", padding: "12px 0" }}>He isn't interested in your club.</div>
            : <button onClick={() => { setOffer(pk); setPick(null); }} style={{ width: "100%", minHeight: 52, marginTop: 12, borderRadius: 14, border: 0, background: C.gn, color: "#fff", fontSize: 17, fontWeight: 900, cursor: "pointer" }}>Make an offer</button>}
          <button onClick={() => { setSel(pk); setPick(null); }} style={{ width: "100%", minHeight: 48, marginTop: 8, borderRadius: 14, border: 0, background: "#ffffff0f", color: "#e2e8f0", fontSize: 16, fontWeight: 800, cursor: "pointer" }}>Player card</button>
          <div style={{ height: 8 }} />
        </Sheet>
      )}
      {negotiate}
    </div>
  );
}
