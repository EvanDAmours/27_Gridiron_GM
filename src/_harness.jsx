import React from "react";
import { createRoot } from "react-dom/client";
import TrophyRoom from "./TrophyRoom.jsx";
import { initTeams } from "./league.js";
const teams = initTeams(13);
const ut = { ...teams[13], divTitles: [2026, 2027], legacyHall: { ring: ["r1"], nums: [{ num: 87, name: "Travis Kelce" }] } };
const awards = [{ yr: 2027, gm: 13, mvp: { name: "Patrick Mahomes", pos: "QB", ti: 13 }, dpoy: { name: "Chris Jones", pos: "DL", ti: 13 } }, { yr: 2028, gm: 13, opoy: { name: "Rashee Rice", pos: "WR", ti: 13 } }];
const retired = [{ id: "r1", name: "Travis Kelce", pos: "TE", num: 87, team: "KC", retYr: 2027, legacy: 90, hof: true, hofClass: 2032, career: { rec: 180 } }];
createRoot(document.getElementById("root")).render(<div style={{ padding: 16 }}><TrophyRoom team={ut} ui={13} teams={teams} champs={[]} awards={awards} retired={retired} yr={2029} book={{ best: {} }} /></div>);
