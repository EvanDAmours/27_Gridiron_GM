// Headless check of the arcade field showing the franchise's live game (game.js live mode): a whole
// game watched (the computer plays both offenses on the field), and one where you take your own
// snaps. Every play has to reach the app (onEvent) the real way round, with the score and the
// play log agreeing. Run: node scripts/arcade-live-check.mjs [games]
const noop = () => {};
globalThis.window = { addEventListener: noop, removeEventListener: noop, devicePixelRatio: 1 };
globalThis.document = { addEventListener: noop, removeEventListener: noop, fullscreenElement: null };
globalThis.matchMedia = () => ({ matches: false });
globalThis.requestAnimationFrame = () => 0; globalThis.cancelAnimationFrame = noop;
globalThis.localStorage = { getItem: () => null, setItem: noop };
globalThis.Image = class { set src(v) { this._s = v; } };
const { initTeams, calibrateLeague, gameSetup } = await import("../src/league.js");
const { createGame } = await import("../src/playsim.js");
const { ArcadeGame } = await import("../src/arcade/game.js");
const { autoState, autoStep } = await import("../src/arcade/autopilot.js");
const ctx = new Proxy({}, { get: (t, k) => (k === "measureText" ? () => ({ width: 10 }) : k in t ? t[k] : noop), set: (t, k, v) => ((t[k] = v), true) });
const canvas = { addEventListener: noop, removeEventListener: noop, parentElement: { clientWidth: 1000, clientHeight: 600, style: {} }, style: {}, getContext: () => ctx, getBoundingClientRect: () => ({ left: 0, top: 0 }) };
const N = +process.argv[2] || 2;
const teams = initTeams(-1); calibrateLeague(teams);
for (const [gi, watch] of Array.from({ length: N * 2 }, (_, i) => [i, i % 2 === 0])) {
  const H = teams[(gi * 5) % 32], A = teams[(gi * 9 + 4) % 32], userSide = gi % 4 < 2 ? "a" : "h";
  const su = gameSetup(H, A, null, null, "clear");
  const g = createGame(su.home, su.away, { rec: true, wx: su.wx });
  const evs = []; let bad = 0;
  const pres = (t, away) => ({ ab: t.ab, city: t.city, name: t.name, clr: t.clr || "#333", ac: t.ac || "#fff", isAway: away });
  let game; game = new ArcadeGame(canvas, { skipMenu: true, live: { g, userSide, watch, teams: { h: pres(H, false), a: pres(A, true) }, onEvent: (ev, off) => {
    if (off !== "h" && off !== "a") bad++;
    if (g.patDefer) bad++; // between snaps the game is the app's: no arcade settings left on it
    evs.push([ev.type, off, g.score.h, g.score.a]); if (game?.flipped) { bad++; if (bad < 4) console.log("EMITTED WHILE FLIPPED", ev.type, ev.text, "mode", game.mode, "q", g.qtr, g.clock); }
  } } });
  game.speed = 3;
  let frames = 0, mine = 0;
  while (!(g.done && game.mode === "idle") && frames++ < 400000) {
    // you, when it's your snap: pick the first card, then play it like the computer would
    if (game.mode === "pick") { const k = game.choices?.[0] || "run_inside"; game.call(g.down === 4 ? (g.yard >= 62 ? "fg" : "punt") : k); if (!game.S.kind) game.mine = { call: game.S.call, state: autoState() }; mine++; }
    if (game.mode === "pat") game.patChoice("xp");
    if (game.mode === "play" && game.S && !game.auto) {
      const P = game.S;
      if (P.kind) { if (P.phase === "presnap") { const { kickFlick } = await import("../src/arcade/kick.js"); kickFlick(P, 10, 0); } }
      else { if (P.phase === "presnap") { const { snap } = await import("../src/arcade/play.js"); snap(P); } if (game.mine) autoStep(P, game.mine.call, game.mine.state); }
    }
    if (game.mode === "result" && game.banner) game.banner.at = -1e9; // don't wait on the banner
    game.advanceTime(1 / 60);
  }
  const last = evs[evs.length - 1];
  console.log(`${watch ? "WATCH" : "PLAY "} ${A.ab} at ${H.ab} (you ${userSide}): final ${g.score.a}-${g.score.h}, done ${g.done}, ${evs.length} plays reached the app, your snaps ${mine}, field flipped now: ${game.flipped}, bad ${bad}, last event score ${last?.[3]}-${last?.[2]}, play log entries ${g.pl.length}`);
  game.destroy();
}
