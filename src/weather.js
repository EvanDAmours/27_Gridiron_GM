// Game-day weather. Clubs under a roof (domes and retractable roofs) always play indoors. Everyone
// else gets the weather of its city for that time of year: rain any week (Seattle the most), snow
// from mid-November on in the cold-weather cities (Buffalo and Green Bay the most), now and then a
// windy day. Rain and snow come light or heavy.
//
// What it does to the game: teams run more, passes are harder to complete and easier to pick off,
// the ball comes out more, footing slows the run game in snow, and kicks get shorter.

export const ROOF = new Set(["ARI", "ATL", "DAL", "DET", "HOU", "IND", "LV", "LAR", "LAC", "MIN", "NO"]);
// late-season snow chance in each open-air city, and its rain chance in any week
const SNOW = { BUF: 0.3, GB: 0.28, CHI: 0.2, CLE: 0.2, DEN: 0.2, NE: 0.18, PIT: 0.16, KC: 0.12, NYG: 0.12, NYJ: 0.12, CIN: 0.12, PHI: 0.1, BAL: 0.08, WAS: 0.06, SEA: 0.04, TEN: 0.04, CAR: 0.02 };
const RAIN = { SEA: 0.28, MIA: 0.15, TB: 0.15, JAX: 0.14, PIT: 0.13, NE: 0.12, PHI: 0.12, NYG: 0.12, NYJ: 0.12, CLE: 0.12, BAL: 0.12, WAS: 0.12, CAR: 0.12, CIN: 0.12, TEN: 0.12, BUF: 0.11, CHI: 0.11, KC: 0.1, SF: 0.1, GB: 0.08, DEN: 0.05 };
const HEAVY = 0.35, WIND = 0.05;

// Each condition: how it shows, and what it does. run: shift toward calling runs; comp: completion
// rate; int: interception rate; fum: fumble multiplier; fg: field-goal odds; runYds: yards per carry.
export const WX = {
  clear: { label: "Clear", icon: "☀️" },
  dome: { label: "Indoors", icon: "🏟️" },
  wind: { label: "Windy", icon: "💨", run: 0.03, comp: -0.02, int: 0.003, fg: -0.06 },
  lightRain: { label: "Light rain", icon: "🌦️", rain: 1, run: 0.05, comp: -0.03, int: 0.004, fum: 1.5, fg: -0.04 },
  heavyRain: { label: "Heavy rain", icon: "🌧️", rain: 2, run: 0.12, comp: -0.07, int: 0.009, fum: 2.3, fg: -0.1, runYds: -0.2 },
  lightSnow: { label: "Light snow", icon: "🌨️", snow: 1, run: 0.07, comp: -0.03, int: 0.004, fum: 1.4, fg: -0.05, runYds: -0.2 },
  heavySnow: { label: "Heavy snow", icon: "❄️", snow: 2, run: 0.15, comp: -0.07, int: 0.008, fum: 2.0, fg: -0.12, runYds: -0.5 },
};
export const wxOf = (key) => WX[key] || WX.clear;
export const isWet = (key) => !!(WX[key]?.rain || WX[key]?.snow);

const hash = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967296; };

// How far into snow season a week is: none before November, a little early November, full from
// mid-November and in the playoffs (weeks after 18, or "P1"-style playoff weeks).
export function snowSeason(wk) {
  const w = typeof wk === "number" ? wk : 19;
  return w >= 11 ? (w > 18 ? 1.2 : 1) : w >= 9 ? 0.3 : 0;
}

// The weather for one game (fixed for that game, so the preview and the game agree).
// g: { wk, h, a, neutral }; homeAb: the home club's abbreviation.
export function gameWeather(g, yr, homeAb) {
  if (g.neutral) return "clear";
  if (!homeAb || ROOF.has(homeAb)) return "dome";
  const r = hash(`${yr}|${g.wk}|${g.h}|${g.a}|wx`), heavy = hash(`${yr}|${g.wk}|${g.h}|${g.a}|hv`) < HEAVY;
  const snow = (SNOW[homeAb] || 0) * snowSeason(g.wk), rain = RAIN[homeAb] ?? 0.1;
  if (r < snow) return heavy ? "heavySnow" : "lightSnow";
  if (r < snow + rain) return heavy ? "heavyRain" : "lightRain";
  if (r < snow + rain + WIND) return "wind";
  return "clear";
}
