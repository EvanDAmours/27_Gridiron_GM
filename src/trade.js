// Trade values, Madden-style. A player's value climbs steeply with his rating, is weighted by
// how much his position matters (a franchise QB is worth about twice an edge rusher, a running
// back or kicker far less), fades with age (QBs age about four years slower), and gets a bump
// for a strong development trait or an X-Factor. Draft picks sit on the same scale: the #1
// overall pick is worth roughly a young 90-rated star at a premium position.

import { clubMode, fitsTeam } from "./tradeOffers.js";
import { isFaceOf } from "./faceOfFranchise.js";
import { keepChance, askingPrice } from "./offseason.js";
import { leagueCap, getCapPhase } from "./cap.js";
import { tradeDead, yearsLeft, proration } from "./bonus.js";
import { guaranteedOwed } from "./contractSchedule.js";

export const POS_MULT = { QB: 1.8, DL: 1.15, LT: 1.1, WR: 1.05, CB: 1.0, RT: 0.95, TE: 0.8, LB: 0.8, S: 0.8, C: 0.7, LG: 0.65, RG: 0.65, RB: 0.6, K: 0.2, P: 0.15 };
const DEV_MULT = { generational: 1.2, superstar: 1.1, star: 1.04 };

// Calibrated against real deadline deals (see tests/tradeMarket.test.js): a 31-year-old star
// receiver went for a 3rd (Davante Adams, 2024), a 32-year-old pass rusher for a 5th (Za'Darius
// Smith, 2024), so value falls off fast after 29.
function ageMult(age, pos) {
  const a = pos === "QB" ? age - 4 : age;
  return a <= 23 ? 1.25 : a <= 25 ? 1.15 : a <= 27 ? 1.05 : a === 28 ? 0.95 : a === 29 ? 0.8 : a === 30 ? 0.62 : a === 31 ? 0.42 : a === 32 ? 0.28 : a === 33 ? 0.2 : 0.16;
}

// His contract against what his rating earns on the open market: a star on a deal far above it
// is a burden to take on (Adams at $36M), one on a rookie deal is gold. Only deals with years
// left count (an expiring deal is a rental: see RENTAL). Players without a salary (prospects) are
// left alone. Applied when a trade is weighed (it reads this year's cap), never baked into the
// saved tradeVal, so a reload can't change anyone's value.
// On a structured deal (p.sched) the new club takes on his salaries only (his signing bonus stays
// behind as his old club's dead money), and an overpaid deal is only a burden as far as it's
// guaranteed: money they could get out of by cutting him weighs about half as much.
export function contractMult(p, ph = getCapPhase()) {
  if (p.salary == null || (p.contract ?? 0) <= 1) return 1;
  const fair = askingPrice(p);
  if (!(fair > 0)) return 1;
  const sched = p.sched?.length > 0;
  const cost = sched ? p.salary - (p.sb || 0) : p.salary;
  // overpay is measured in real money: against at least 2% of the cap, so a depth player on a near-minimum
  // deal (a few hundred thousand over his market) isn't priced like an albatross
  const over = (cost - fair) / Math.max(fair, leagueCap() * 0.02);
  const yrs = Math.min(4, p.contract) / 4;
  return Math.max(0.6, Math.min(1.15, 1 - over * 0.35 * (0.5 + yrs) * (over > 0 && sched ? 0.5 + 0.5 * gtdShare(p, ph) : 1)));
}
// The share of what he's still owed in salary (this year's and later years') that's guaranteed.
export function gtdShare(p, { sp = "regular", yr } = {}) {
  if (!p?.sched?.length) return 1;
  const yl = Math.max(1, Math.min(p.sched.length, yearsLeft(p, yr ?? p.schedYr, sp) || p.contract || 1));
  // this season's base is paid out over the season; a roster bonus already paid isn't owed any more
  const unpaid = sp === "regular" ? 0.5 : sp === "playoffs" ? 0 : 1, y0 = p.sched[0];
  const owed = y0.base * unpaid + (sp === "resign" ? y0.rb : 0) + p.sched.slice(1, yl).reduce((s, y) => s + y.base + y.rb, 0);
  if (!(owed > 0)) return 0;
  const g = guaranteedOwed(p, { sp, yl });
  const paidRb = sp !== "resign" ? y0.rb || 0 : 0;
  return Math.max(0, Math.min(1, (g.now - paidRb + g.later) / owed));
}
// What it costs his club to trade him: the dead money left behind and the part landing this year,
// and prem, what they'd want on top of his value for it. Real trades (the market tests) already
// carry the usual bonus left behind, so only a bonus beyond that counts: a club that just handed
// him a big one on a structured deal doesn't move him for his value alone.
export const DEAD_NORMAL = 0.04;
export function moveCost(p, ph = getCapPhase()) {
  const d = tradeDead(p, ph), cap = Math.max(1, leagueCap());
  const prem = p.sched?.length || p.signBonus ? Math.min(0.25, 1.5 * Math.max(0, d.total / cap - DEAD_NORMAL)) : 0;
  return { dead: d.total, deadNow: d.now, prem: +prem.toFixed(3) };
}

export function playerValue(p, dev) {
  const ovr = p.ovr || 0, age = p.age || 26;
  const pot = Math.max(p.pot || ovr, ovr);
  const eff = ovr + (age <= 25 ? (pot - ovr) * 0.4 : 0);
  const base = 100 * Math.max(0, (eff - 60) / 30) ** 3;
  const v = base * (POS_MULT[p.pos] ?? 0.8) * ageMult(age, p.pos) * (DEV_MULT[dev] || 1) * (p.xf ? 1.05 : 1);
  return Math.max(1, Math.round(v));
}

// Pick value from the draft chart (index = overall pick). Picks without a slot yet are
// valued at the middle of their round.
// Future picks (pk.ahead years after this draft) are worth less the further out they are.
export const FUTURE_DISCOUNT = [1, 0.8, 0.65, 0.55];
// PICK_SCALE sets picks against players: real deadline deals (tests/tradeMarket.test.js) show
// clubs pay for players with picks at about 1.35x what the chart alone would say.
export const PICK_SCALE = 1.35;
export const pickValue = (chart, pk) => ((chart[(!pk.ahead && pk.overall) || 16 + (pk.rd - 1) * 32] || 60) / 30) * PICK_SCALE * (FUTURE_DISCOUNT[pk.ahead || 0] ?? 0.5);

// How the other club adds up the players you offer: the best counts in full, each extra one
// less (five backups don't make a star). Draft picks always count in full.
const PACKAGE = [1, 0.8, 0.65, 0.5, 0.4, 0.3];

// What a player is worth to one club right now, as a multiple of his trade value, and why. A club
// pays for what it needs: a starter-level player at a thin spot counts for more, a backup at a
// stacked one for less. Where it is matters too: a rebuilding club wants youth and picks and
// shies away from veterans and expiring deals; a contender pays for help now.
export function fitFor(them, p, { season = false } = {}) {
  if (!them?.roster || !p) return { m: 1, why: [] };
  const mode = clubMode(them), why = [];
  let m = 1;
  if (p.pos !== "QB") { // quarterbacks are handled in evaluateTrade (their starter question)
    if (fitsTeam(them, p)) { m *= 1.1; why.push(`he'd start for them at ${p.pos}`); }
    else { m *= p.age <= 24 ? 0.9 : 0.75; why.push(`they're already set at ${p.pos}`); }
  }
  if (mode === "rebuild") {
    if (p.age <= 25) { m *= 1.15; why.push("they're rebuilding and want young players"); }
    else if (p.age >= 29) { m *= 0.75; why.push("they're rebuilding and don't want veterans"); }
  } else if (mode === "contend" && p.age >= 26 && fitsTeam(them, p)) { m *= 1.1; why.push("they're contending and he helps now"); }
  // an expiring deal in season is half a season and a head start on re-signing him: a contender
  // pays a little more for that than everyone else
  if (season && (p.contract || 0) <= 1) { m *= mode === "contend" ? 0.75 : RENTAL; why.push("his contract runs out after this season"); }
  return { m, why };
}
// Draft picks to the same club: a rebuilder prizes them, a contender in season less so.
// what an expiring veteran his club won't keep goes for in season, as a share of his value
// (any expiring deal, not just veterans: Montez Sweat at 27 went for a 2nd in 2023, Roquan Smith at
// 25 for a 2nd and a 5th in 2022); a player his club won't keep goes for less again
export const RENTAL = 0.48, RENTAL_GONE = 0.4;
const pickMult = (them, season) => { const mode = them ? clubMode(them) : "middle"; return mode === "rebuild" ? 1.15 : mode === "contend" && season ? 0.9 : 1; };

// Would `them` accept? They price what they give up at full value plus the margin they want to
// win by, which grows for their starting QB and for stars. What they get is valued for their
// situation (fitFor); a QB they don't need is worth half. capRoom: their room under the cap (a
// deal that adds more salary than they can fit is off). season: in-season (expiring deals matter).
export function evaluateTrade({ send = [], sendPk = [], get = [], getPk = [], them, pick, capRoom = null, season = false }) {
  const qbs = (them?.roster || []).filter((p) => p.pos === "QB").sort((a, b) => b.ovr - a.ovr);
  const starter = qbs[0];
  const worth = (p) => {
    const v = (p.tradeVal || 0) * contractMult(p);
    const stillStarter = starter && !get.some((x) => x.id === starter.id) && starter.ovr >= 80 && starter.age <= 34;
    if (p.pos === "QB" && stillStarter && p.ovr <= starter.ovr + 3) return v * 0.5;
    return v * fitFor(them, p, { season }).m;
  };
  const notes = [...new Set(send.flatMap((p) => fitFor(them, p, { season }).why))];
  const offered = send.map(worth).sort((a, b) => b - a);
  const pm = pickMult(them, season);
  if (sendPk.length && pm !== 1) notes.push(pm > 1 ? "they're rebuilding, so picks count for more" : "they're contending, so picks count for less right now");
  const gv = Math.round(offered.reduce((s, v, i) => s + v * (PACKAGE[i] ?? 0.25), 0) + sendPk.reduce((s, pk) => s + pick(pk) * pm, 0));
  // A veteran whose deal is up after this season and whom his club won't keep (too old or too dear
  // to re-sign): it would rather get something now than lose him for nothing in March, so in season
  // it sells him at about half his value and without the usual premium.
  const rental = (p) => season && (p.contract || 0) <= 1 && !(them && isFaceOf(p, them));
  const rentRate = (p) => (keepChance(p) < 0.5 ? RENTAL_GONE : RENTAL);
  const firm = get.filter((p) => !rental(p));
  // a rebuilding club is selling: its veterans (27 and up) go for less, the older the cheaper,
  // since they won't be good anymore by the time the club is
  const selling = them && clubMode(them) === "rebuild";
  const sellOff = (p) => (selling && (p.age || 0) >= 27 ? ((p.age || 0) >= 29 ? 0.75 : 0.85) : 1);
  // the dead money each player they give up would leave behind (moveCost): they want it covered
  const mc = new Map(get.map((p) => [p.id, moveCost(p)]));
  const rv = Math.round(get.reduce((s, p) => s + (p.tradeVal || 0) * (rental(p) ? rentRate(p) : contractMult(p) * sellOff(p) * (1 + mc.get(p.id).prem)), 0) + getPk.reduce((s, pk) => s + pick(pk), 0));
  // the margin they want to come out ahead by: small for an ordinary deal (a 2nd for a solid
  // starter gets done in the real league), bigger for stars and starting quarterbacks
  let mult = 1.05, why = null;
  if (firm.length < get.length) { mult = 1.05; why = "His deal is up and they won't be keeping him — they'd rather get something now than lose him for nothing"; }
  if (firm.some((p) => p.tradeVal >= 150 && sellOff(p) === 1)) { mult = 1.15; why = "They want a big premium for a star"; }
  if (starter && starter.ovr >= 75 && firm.some((p) => p.id === starter.id)) { mult = 1.35; why = "That's their franchise quarterback — they'd need to be blown away"; }
  // the face of their franchise: only an overwhelming offer
  // (a club that's rebuilding and losing will move a veteran face for a strong offer: he'd be past
  // it by the time it's good again)
  if (them && get.some((p) => isFaceOf(p, them))) {
    if ((them.w || 0) < (them.l || 0) && get.some((p) => isFaceOf(p, them) && sellOff(p) < 1)) { mult = Math.max(mult, 1.1); why = "He's been the face of the franchise, but they're rebuilding and ready to move him for a strong offer"; }
    else { mult = Math.max(mult, 1.7); why = "He's the face of their franchise — they'd need to be blown away"; }
  }
  if (selling && !why && firm.some((p) => sellOff(p) < 1)) why = "They're rebuilding and willing to move veterans";
  // a contender doesn't hand over a starter it needs without a premium
  if ((!why || firm.length < get.length) && them && clubMode(them) === "contend" && firm.some((p) => p.pos !== "QB" && (p.tradeVal || 0) >= 40 && fitsTeam({ ...them, roster: them.roster.filter((x) => x.id !== p.id) }, p))) { mult = Math.max(mult, 1.15); why = "They're contending and he's one of their starters"; }
  const deadBig = get.filter((p) => !rental(p) && mc.get(p.id).prem >= 0.05).sort((a, b) => mc.get(b.id).dead - mc.get(a.id).dead)[0];
  if (deadBig && (!why || mult <= 1.05)) why = `Moving ${deadBig.name} leaves them $${mc.get(deadBig.id).dead.toFixed(1)}M in dead money, so they want more for him`;
  const ask = Math.round(rv * mult);
  const both = (send.length || sendPk.length) && (get.length || getPk.length);
  // salary: what they take on has to fit under their cap, counting the dead money the players they
  // send away leave behind this year (players you send arrive without their bonus proration)
  const addSal = send.reduce((s, p) => s + (p.salary || 0) - proration(p), 0) - get.reduce((s, p) => s + (p.salary || 0) - mc.get(p.id).deadNow, 0);
  const noRoom = capRoom != null && addSal > 0 && addSal > capRoom;
  if (noRoom) why = `They can't fit the extra $${addSal.toFixed(1)}M under their cap${get.some((p) => mc.get(p.id).deadNow > 0) ? ", counting the dead money the deal leaves them" : ""}`;
  const accept = !!both && gv >= ask && !noRoom;
  return { gv, rv, ask, accept, gap: Math.max(0, ask - gv), over: gv > ask * 1.35 + 10, nextWeight: PACKAGE[offered.length] ?? 0.25, why, notes, noRoom }; // nextWeight: how the next player you add would count
}

// A deal a little short of their price isn't always dead. How much they'll give depends on the
// moment: a rebuilding club moving a veteran, a player whose contract runs out this season (some
// return beats watching him walk), and the last hours of deadline day all loosen them up. How far
// they'll bend is set per club for each week (and each deadline hour), never per offer, so
// re-proposing the same deal or reshuffling it gets the same answer: only more value moves them.
// ctx: { mode: "rebuild" | "contend" | "middle", season: in-season?, hour: deadline hour or null, key }
export function closeCall(ev, get = [], ctx = {}) {
  if (ev.accept || ev.noRoom || !ev.gap || !ev.ask || /franchise quarterback|face of their franchise/.test(ev.why || "")) return { ok: false };
  const reasons = [];
  let tol = 0.03;
  if (ctx.mode === "rebuild" && get.some((p) => (p.age || 0) >= 27)) { tol += 0.05; reasons.push("they're rebuilding and happy to move veterans"); }
  if (ctx.season && get.some((p) => (p.contract || 0) <= 1)) { tol += 0.04; reasons.push("his deal runs out after the season, so some return beats none"); }
  if (ctx.hour != null && ctx.hour >= 5) { tol += ctx.hour >= 6 ? 0.06 : 0.03; reasons.push("the deadline is closing in"); }
  let h = 2166136261;
  for (const c of String(ctx.key || "")) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const mood = 0.5 + ((h >>> 0) / 4294967296) * 0.5; // how flexible this GM is feeling right now
  const ok = ev.gap <= ev.ask * Math.min(0.2, tol) * mood;
  return { ok, reasons };
}
