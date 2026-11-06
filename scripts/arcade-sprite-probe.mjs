// Playthrough probe for the arcade field's sprites: full games (the franchise's live game, watched and
// played, and the standalone arcade), every frame drawn, logging each man's frame; then it lists frames
// that switch when they shouldn't: mid-play swaps between the two sprite sheets, A-B-A flickers,
// facing jitter and poses out of context. Run it after a new sprite pack: node scripts/arcade-sprite-probe.mjs [games]
const noop = () => {};
const ctx0 = new Proxy({}, { get: (t, k) => (k === "measureText" ? () => ({ width: 10 }) : k === "createLinearGradient" || k === "createRadialGradient" ? () => ({ addColorStop: () => {} }) : k === "createPattern" ? () => null : k in t ? t[k] : () => {}), set: (t, k, v) => ((t[k] = v), true) });
globalThis.window = { addEventListener: noop, removeEventListener: noop, devicePixelRatio: 1 };
globalThis.document = { addEventListener: noop, removeEventListener: noop, fullscreenElement: null, createElement: () => ({ getContext: () => ctx0, width: 1, height: 1 }) };
globalThis.matchMedia = () => ({ matches: false });
globalThis.requestAnimationFrame = () => 0; globalThis.cancelAnimationFrame = noop;
globalThis.localStorage = { getItem: () => null, setItem: noop };
globalThis.Image = class { set src(v) { this._s = v; } };
globalThis.performance ??= { now: () => Date.now() };
const { initTeams, calibrateLeague, gameSetup } = await import("../src/league.js");
const { createGame } = await import("../src/playsim.js");
const { ArcadeGame } = await import("../src/arcade/game.js");
const { poseProbe } = await import("../src/arcade/retro.js");
const ACTS2 = (await import("../src/pixel/actionSprites2.json", { with: { type: "json" } })).default;
const { autoState, autoStep } = await import("../src/arcade/autopilot.js");
const { snap } = await import("../src/arcade/play.js");
const { kickFlick } = await import("../src/arcade/kick.js");
const ctx = new Proxy({}, { get: (t, k) => (k === "measureText" ? () => ({ width: 10 }) : k === "createLinearGradient" || k === "createRadialGradient" ? () => ({ addColorStop: noop }) : k === "createPattern" ? () => null : k in t ? t[k] : noop), set: (t, k, v) => ((t[k] = v), true) });
const canvas = { addEventListener: noop, removeEventListener: noop, parentElement: { clientWidth: 1000, clientHeight: 560, style: {} }, style: {}, width: 1000, height: 560, getContext: () => ctx, getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 560 }) };
const teams = initTeams(-1); calibrateLeague(teams);
const fam = (n) => (n ? String(n).replace(/_\d+$/, "") : "-");
const stats = { frames: 0, plays: 0, sheetSwitch: {}, flicker: {}, facingFlips: 0, facingSamples: [], weird: {} };
const bump = (o, k) => (o[k] = (o[k] || 0) + 1);
let hist = new Map(), curPlay = null;
poseProbe.cb = (S, e, r) => {
  if (S !== curPlay) { curPlay = S; hist = new Map(); stats.plays++; }
  stats.frames++;
  const has2 = !!ACTS2[r.team?.ab];
  const h = hist.get(e.key) || []; const rec = { t: S.t, ph: S.phase, sheet: !has2 ? "1" : r.p2 ? "2" : "1", f: has2 && r.p2 ? fam(r.p2) : `a:${r.pose}`, face: r.facing, ball: S.ball.holder === e.key };
  h.push(rec); hist.set(e.key, h);
  const n = h.length;
  if (n >= 2 && has2 && S.phase !== "presnap" && h[n - 2].ph !== "presnap" && h[n - 2].sheet !== rec.sheet) bump(stats.sheetSwitch, `${e.side}:${e.key.replace(/\d/, "")} ${h[n - 2].f} -> ${rec.f} [${rec.ph}]`);
  if (n >= 3 && h[n - 3].f === rec.f && h[n - 2].f !== rec.f && rec.ph !== "presnap") bump(stats.flicker, `${e.key.replace(/\d/, "")}: ${rec.f} / ${h[n - 2].f} [${rec.ph}]`);
  if (n >= 2 && h[n - 2].face !== rec.face && S.phase !== "presnap") { stats.facingFlips++; const back = h.slice(-8).filter((x, i, a) => i && a[i - 1].face !== x.face).length; if (back >= 3) bump(stats.weird, `facing jitter ${e.side}:${e.key.replace(/\d/, "")} [${rec.ph}]${rec.ball ? " with ball" : ""}`); }
  if (r.p2 && /^td_/.test(r.p2) && !S.result?.td) bump(stats.weird, `td pose without a TD (${r.p2})`);
  if (r.p2 && /^run_ball/.test(r.p2) && S.ball.holder !== e.key) bump(stats.weird, `ball-carrier run without the ball (${e.key})`);
  if (r.p2 && /^catch/.test(r.p2) && !S.ball.flight && S.catchAt == null) bump(stats.weird, `catch pose with no ball in the air (${e.key} ${r.p2})`);
};
const N = +process.argv[2] || 2;
for (let gi = 0; gi < N * 2; gi++) {
  const watch = gi % 2 === 0, Ht = teams.find((t) => t.ab === ["NYG", "PHI", "HOU", "GB", "DET", "WAS"][gi % 6]), At = teams.find((t) => t.ab === ["HOU", "DET", "MIN", "CHI", "NYG", "PHI"][gi % 6]);
  const su = gameSetup(Ht, At, null, null, "clear"); const g = createGame(su.home, su.away, { rec: true, wx: su.wx });
  const pres = (t, away) => ({ ab: t.ab, city: t.city, name: t.name, clr: t.clr || "#333", ac: t.ac || "#fff", isAway: away });
  const game = new ArcadeGame(canvas, { skipMenu: true, live: { g, userSide: "h", watch, teams: { h: pres(Ht, false), a: pres(At, true) }, onEvent: noop } });
  game.speed = 1; let frames = 0;
  while (!(g.done && game.mode === "idle") && frames++ < 400000) {
    if (game.mode === "pick") { const k = game.choices?.[0] || "run_inside"; game.call(g.down === 4 ? (g.yard >= 62 ? "fg" : "punt") : k); if (!game.S.kind) game.mine = { call: game.S.call, state: autoState() }; }
    if (game.mode === "pat") game.patChoice("xp");
    if (game.mode === "play" && game.S && !game.auto) { const P = game.S; if (P.kind) { if (P.phase === "presnap") kickFlick(P, 10, 0); } else { if (P.phase === "presnap") snap(P); if (game.mine) autoStep(P, game.mine.call, game.mine.state); } }
    if (game.mode === "result" && game.banner) game.banner.at = -1e9;
    if (game.mode === "replay") game.endReplay();
    game.advanceTime(1 / 60); game.draw();
  }
  console.log(`${watch ? "WATCH" : "PLAY "} ${At.ab} at ${Ht.ab}: ${g.score.a}-${g.score.h} done=${g.done}`);
  game.destroy();
}
// and the standalone arcade: the same live path, set up by the franchise's own code
{ const game = new ArcadeGame(canvas, { skipMenu: true, userTi: 17, oppTi: 12 }); game.qMin = 4; game.start();
  for (let i = 0; i < 400 && game.mode === "loading"; i++) await new Promise((r) => setTimeout(r, 25));
  const g = game.g; let frames = 0;
  while (game.mode !== "final" && game.mode !== "ceremony" && frames++ < 300000) {
    if (game.mode === "pick") { const k = game.choices?.[0] || "run_inside"; game.call(g.down === 4 ? (g.yard >= 62 ? "fg" : "punt") : k); if (!game.S.kind) game.mine = { call: game.S.call, state: autoState() }; }
    if (game.mode === "pat") game.patChoice("xp");
    if (game.mode === "play" && game.S && !game.auto) { const P = game.S; if (P.kind) { if (P.phase === "presnap") kickFlick(P, 10, 0); } else { if (P.phase === "presnap") snap(P); if (game.mine) autoStep(P, game.mine.call, game.mine.state); } }
    if (game.mode === "result" && game.banner) game.banner.at = -1e9;
    if (game.mode === "replay") game.endReplay();
    game.advanceTime(1 / 60); game.draw();
  }
  console.log(`SOLO  (standalone arcade, franchise setup): ${g?.score?.h}-${g?.score?.a} done=${g?.done} mode=${game.mode} box=${!!game.box} flipped=${game.flipped}`);
  game.destroy(); }
const top = (o, n = 25) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);
console.log("plays", stats.plays, "frames", stats.frames);
console.log("\nSHEET SWITCHES mid-play (act2 <-> act1) by context:"); for (const [k, v] of top(stats.sheetSwitch)) console.log(String(v).padStart(6), k);
console.log("\nFLICKERS (A, B, A):"); for (const [k, v] of top(stats.flicker)) console.log(String(v).padStart(6), k);
console.log("\nWEIRD:"); for (const [k, v] of top(stats.weird)) console.log(String(v).padStart(6), k);
