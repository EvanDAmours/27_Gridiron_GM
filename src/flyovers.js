// The stadiums with a drone-shot flyover before kickoff: a filmed pixel-art clip per kind of weather
// (public/video/<clip>_<clear|rain|snow>.webm and .mp4). A home club not listed here gets no flyover:
// the game just starts. Kept apart from StadiumFlyover.jsx so the screens that only need to ask
// "is there one?" don't load the player.
export const FLYOVERS = { NYG: { clip: "metlife" }, NYJ: { clip: "metlife" }, HOU: { clip: "nrg" } };
export const hasFlyover = (ab) => !!FLYOVERS[ab];
// the day's weather (weather.js keys) to a clip: snow, rain, or clear for everything else (a roof, wind, cold)
export const flyoverClip = (ab, wx) => {
  const f = FLYOVERS[ab]; if (!f) return null;
  return `video/${f.clip}_${/snow/i.test(wx || "") ? "snow" : /rain/i.test(wx || "") ? "rain" : "clear"}`;
};
