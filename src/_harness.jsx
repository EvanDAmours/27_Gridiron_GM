import React from "react";
import { createRoot } from "react-dom/client";
import TrophyRoom from "./TrophyRoom.jsx";
import { SaveSlots, CapGlossary } from "./SaveSlots.jsx";
import { CardHeader, RatingBars, CareerOvrGraph, SeasonTable, ContractTimeline, HonorsRow } from "./PlayerCard.jsx";
import { initTeams, TEAMS } from "./league.js";
import { C, PA_LABELS } from "./ui.jsx";
const teams = initTeams(13);
const which = new URLSearchParams(location.search).get("v") || "card";
const p = { ...teams[13].roster.find((x) => x.pos === "QB"), scoutLvl: 2, oh: [{ y: 2026, o: 88 }, { y: 2027, o: 91 }, { y: 2028, o: 93 }], sh: [{ y: 2026, tm: "KC", gp: 17, comp: 401, att: 597, passYds: 4512, passTD: 33, passInt: 11, rushYds: 380 }, { y: 2027, tm: "KC", gp: 16, comp: 388, att: 560, passYds: 4890, passTD: 41, passInt: 8, rushYds: 290 }], ss: { gp: 8, comp: 190, att: 280, passYds: 2300, passTD: 19, passInt: 4, rushYds: 120 }, honors: [{ k: "ap1", yr: 2027 }, { k: "pb", yr: 2026 }], salary: 52.4, contract: 3, baseBack: 12, voidYrs: 1, voidDead: 6.2, inc: { label: "4,000 pass yds", amt: 5 } };
createRoot(document.getElementById("root")).render(<div style={{ padding: 16, maxWidth: 560, background: C.cd }}>
  <CardHeader p={p} team={TEAMS[13]} ovr={p.ovr} pot={p.pot} sub={<span>Age {p.age} • Texas Tech</span>} />
  <HonorsRow p={p} awards={[{ yr: 2027, mvp: { pid: p.id } }]} />
  <RatingBars p={p} labels={PA_LABELS} />
  <CareerOvrGraph p={p} yr={2029} />
  <SeasonTable p={p} yr={2029} teamAb="KC" />
  <ContractTimeline p={p} yr={2029} yearsLeft={3} proration={9.5} deadNow={28.5} />
</div>);
