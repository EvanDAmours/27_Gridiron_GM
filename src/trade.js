// Trade values, Madden-style. A player's value climbs steeply with his rating, is weighted by
// how much his position matters (a franchise QB is worth about twice an edge rusher, a running
// back or kicker far less), fades with age (QBs age about four years slower), and gets a bump
// for a strong development trait or an X-Factor. Draft picks sit on the same scale: the #1
// overall pick is worth roughly a young 90-rated star at a premium position.

export const POS_MULT = { QB: 1.8, DL: 1.15, LT: 1.1, WR: 1.05, CB: 1.0, RT: 0.95, TE: 0.8, LB: 0.8, S: 0.8, C: 0.7, LG: 0.65, RG: 0.65, RB: 0.6, K: 0.2, P: 0.15 };
const DEV_MULT = { generational: 1.2, superstar: 1.1, star: 1.04 };

function ageMult(age, pos) {
  const a = pos === "QB" ? age - 4 : age;
  return a <= 23 ? 1.3 : a <= 25 ? 1.2 : a <= 27 ? 1.05 : a === 28 ? 0.95 : a === 29 ? 0.85 : a === 30 ? 0.7 : a === 31 ? 0.55 : a === 32 ? 0.45 : a === 33 ? 0.35 : 0.25;
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
export const pickValue = (chart, pk) => ((chart[(!pk.ahead && pk.overall) || 16 + (pk.rd - 1) * 32] || 60) / 30) * (FUTURE_DISCOUNT[pk.ahead || 0] ?? 0.5);

// How the other club adds up the players you offer: the best counts in full, each extra one
// less (five backups don't make a star). Draft picks always count in full.
const PACKAGE = [1, 0.8, 0.65, 0.5, 0.4, 0.3];

// Would `them` accept? They price what they give up at full value plus the margin they want to
// win by, which grows for their starting QB and for stars. A QB they don't need is worth half.
export function evaluateTrade({ send = [], sendPk = [], get = [], getPk = [], them, pick }) {
  const qbs = (them?.roster || []).filter((p) => p.pos === "QB").sort((a, b) => b.ovr - a.ovr);
  const starter = qbs[0];
  const worth = (p) => {
    const v = p.tradeVal || 0;
    const stillStarter = starter && !get.some((x) => x.id === starter.id) && starter.ovr >= 80 && starter.age <= 34;
    return p.pos === "QB" && stillStarter && p.ovr <= starter.ovr + 3 ? v * 0.5 : v;
  };
  const offered = send.map(worth).sort((a, b) => b - a);
  const gv = Math.round(offered.reduce((s, v, i) => s + v * (PACKAGE[i] ?? 0.25), 0) + sendPk.reduce((s, pk) => s + pick(pk), 0));
  const rv = Math.round(get.reduce((s, p) => s + (p.tradeVal || 0), 0) + getPk.reduce((s, pk) => s + pick(pk), 0));
  let mult = 1.1, why = null;
  if (get.some((p) => p.tradeVal >= 150)) { mult = 1.25; why = "They want a big premium for a star"; }
  if (starter && starter.ovr >= 75 && get.some((p) => p.id === starter.id)) { mult = 1.35; why = "That's their franchise quarterback — they'd need to be blown away"; }
  const ask = Math.round(rv * mult);
  const both = (send.length || sendPk.length) && (get.length || getPk.length);
  const accept = !!both && gv >= ask;
  return { gv, rv, ask, accept, gap: Math.max(0, ask - gv), over: gv > ask * 1.35 + 10, nextWeight: PACKAGE[offered.length] ?? 0.25, why }; // nextWeight: how the next player you add would count
}

// A deal a little short of their price isn't always dead. How much they'll give depends on the
// moment: a rebuilding club moving a veteran, a player whose contract runs out this season (some
// return beats watching him walk), and the last hours of deadline day all loosen them up. How far
// they'll bend is set per club for each week (and each deadline hour), never per offer, so
// re-proposing the same deal or reshuffling it gets the same answer: only more value moves them.
// ctx: { mode: "rebuild" | "contend" | "middle", season: in-season?, hour: deadline hour or null, key }
export function closeCall(ev, get = [], ctx = {}) {
  if (ev.accept || !ev.gap || !ev.ask || /franchise quarterback/.test(ev.why || "")) return { ok: false };
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
