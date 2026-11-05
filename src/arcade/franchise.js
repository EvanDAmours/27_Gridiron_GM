// Arcade mode inside the franchise: your real game of the week, played on the arcade field.
// The arcade always plays your club as side "h" (your drives go left to right, your sideline is the
// near one), so when you're the away team the game is built the other way round and turned back
// before it's booked. The engine still decides every play, so the result goes into the season just
// like a simmed or live-simmed game.
import { createGame, step } from "../playsim.js";
import { windFor } from "./game.js";

export { flipSides } from "./bridge.js";
import { flipSides } from "./bridge.js";

// The engine game for an arcade franchise game. su: gameSetup()'s result (the real rosters, depth
// charts, week plans, injuries and weather); game: the schedule entry; userHome: are you the home
// team. Full-length quarters, so season stats stay comparable with every other game.
export function franchiseGame(su, game, userHome, { rand = Math.random } = {}) {
  const neutral = !!game.neutral || game.wk === "P4";
  const user = userHome ? su.home : su.away, opp = userHome ? su.away : su.home;
  const g = createGame(user, opp, { playoff: !!game.playoff, neutral, rec: true, wx: su.wx, rand, homeSide: userHome ? "h" : "a" });
  g.patDefer = { h: true }; // you play your own extra points and two-point tries
  const wind = windFor(su.wx, rand); if (wind) g.wind = wind;
  return g;
}

// Play out whatever is left with the engine (quitting mid-game: the game still counts, the way
// Finish game works in the live sim).
export function finishWithEngine(g, max = 900) {
  let n = 0;
  while (!g.done && n++ < max) step(g);
  return g.done;
}

// The finished game as the season books it: home and away the real way round, nothing of the
// arcade's left on it.
export function toSeason(g, userHome) {
  delete g.patDefer; delete g.patPending; delete g.wind;
  if (!userHome) flipSides(g);
  g.homeSide = "h";
  return g;
}

// The live sim's play-by-play rows (LiveDrives.jsx) from the engine's play log.
export const logFromPlays = (g) => (g.pl || []).map((e) => ({ qtr: e.q > 4 ? "OT" : e.q, clock: e.c, yards: e.yd, text: e.x, type: e.td ? "td" : e.t, poss: e.p }));
