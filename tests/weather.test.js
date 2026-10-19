// Weather: roofs stay dry, snow only comes late in cold cities, and bad weather changes the game.
import test from "node:test";
import assert from "node:assert/strict";
import { gameWeather, snowSeason, WX } from "../src/weather.js";
import { initTeams, simGame } from "../src/league.js";

test("domes are indoors; snow only from mid-November on", () => {
  for (let w = 1; w <= 18; w++) assert.equal(gameWeather({ wk: w, h: 0, a: 1 }, 2027, "DET"), "dome");
  assert.equal(snowSeason(3), 0);
  for (let w = 1; w <= 8; w++) for (let a = 0; a < 32; a++) assert.ok(!WX[gameWeather({ wk: w, h: 5, a }, 2027, "BUF")].snow);
  let snow = 0; for (let a = 0; a < 32; a++) for (const y of [2027, 2028, 2029]) if (WX[gameWeather({ wk: 16, h: 5, a }, y, "BUF")].snow) snow++;
  assert.ok(snow > 10, `Buffalo in December should see snow (${snow}/96)`);
  assert.equal(gameWeather({ wk: 16, h: 5, a: 3 }, 2027, "BUF"), gameWeather({ wk: 16, h: 5, a: 3 }, 2027, "BUF"));
});

test("heavy snow: more runs, fewer completions, more giveaways", () => {
  const teams = initTeams();
  const run = (wx) => { const t = { run: 0, plays: 0, comp: 0, att: 0, to: 0 }; for (let i = 0; i < 240; i++) { const r = simGame(teams[i % 32], teams[(i + 7) % 32], null, null, wx, { dry: true }); for (const s of [r.game.stats.h, r.game.stats.a]) { t.run += s.rushAtt; t.plays += s.rushAtt + s.passAtt; t.comp += s.comp; t.att += s.passAtt; t.to += s.ints + s.fumLost; } } return t; };
  const c = run("clear"), s = run("heavySnow");
  assert.ok(s.run / s.plays > c.run / c.plays + 0.04, `run share ${(s.run / s.plays).toFixed(3)} vs ${(c.run / c.plays).toFixed(3)}`);
  assert.ok(s.comp / s.att < c.comp / c.att - 0.02);
  assert.ok(s.to > c.to * 1.1, `turnovers ${s.to} vs ${c.to}`);
});
