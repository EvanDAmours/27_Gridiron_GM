// Contracts the way NFL front offices write them: a year-by-year schedule instead of one flat
// number. Each league year has a base salary and (after the first) an optional roster bonus paid
// when the league year opens in March; a signing bonus is paid up front and prorated over up to five
// years (void years spread it thinner). Each year's money is either guaranteed at signing, vests
// (becomes guaranteed) when its league year opens if he's still on the roster, or isn't guaranteed.
//
// The cap hit in a year is that year's base + roster bonus + the bonus proration. A player carries
// his schedule in p.sched (index 0 is the league year in force, p.schedYr) with p.sb the proration;
// p.salary is always this year's cap hit, so everything that sums salaries keeps working. Deals
// without a schedule (AI deals, older saves) are flat, as before.
//
// Cutting a player before a year's money vests (re-sign week, before the league year opens) costs
// nothing for that year; after it vests, or when it was guaranteed at signing, what's still owed is
// dead money, like a roster bonus already paid.
const r1 = (x) => Math.round((+x || 0) * 10) / 10;

export const SHAPES = { flat: "Flat", front: "Front-loaded", back: "Back-loaded" };
// How hard a deal is front- or back-loaded: the first year's cash against an average year
// (+0.4: 40% more in year one, tapering to 40% less in the last; negative is back-loaded).
export const TILTS = [-0.4, -0.2, 0, 0.2, 0.4];
export const BONUS_SHARES = [0, 0.1, 0.2, 0.3, 0.4];
export const ROSTER_SHARES = [0, 0.25, 0.5, 0.75];
// how much of a later year's money vests (becomes guaranteed) when its league year opens
export const VEST_PARTS = [0.5, 1];
const tiltOf = (shape) => (typeof shape === "number" ? Math.max(-0.5, Math.min(0.5, shape)) : { front: 0.35, back: -0.35 }[shape] || 0);

// cash per year (before the signing bonus is taken out), shaped: front-loaded pays more early
function weights(yrs, shape) {
  const t = tiltOf(shape);
  if (yrs <= 1 || !t) return Array(yrs).fill(1);
  return Array.from({ length: yrs }, (_, i) => 1 + t * (1 - (2 * i) / (yrs - 1)));
}
// the guaranteed share of a year's money: all of it, or (vesting years) the part that vests
export const partOf = (y) => (y.g ? y.part ?? 1 : 0);

// sal: the average a year (what the player hears), yrs: real years. opts: { shape, bonus (share of
// the total), gtdYrs (years guaranteed at signing), vest (later years vest each March), roster
// (share of each later year paid as a March roster bonus), voidYrs, minSal, opened (the league
// year is already open, so a first year that vests in March has vested: re-sign week deals aren't),
// vestPart (how much of each vesting year vests: 0.5 or all of it) }.
// Returns { years: [{ base, rb, cash, hit, g }], sb, bonus, voidYrs, voidDead, total, gtd }.
export function buildSchedule(sal, yrs, { shape = "flat", bonus = 0, gtdYrs = 0, vest = false, roster = 0, voidYrs = 0, minSal = 1, opened = false, vestPart = 1 } = {}) {
  const total = r1(sal * yrs);
  const sb0 = yrs >= 2 ? r1(total * bonus) : 0;
  const n = Math.min(5, yrs + (sb0 ? voidYrs : 0));
  const vy = Math.max(0, n - yrs);
  const pr = sb0 ? r1(sb0 / n) : 0;
  const w = weights(yrs, shape), ws = w.reduce((a, b) => a + b, 0);
  const cashTotal = total - sb0;
  let years = w.map((x, i) => {
    const cash = Math.max(minSal, r1((cashTotal * x) / ws));
    const rb = i >= 1 ? r1(cash * roster) : 0;
    const g = i < gtdYrs || (vest && opened && i === 0) ? "full" : vest ? "vest" : "";
    return { base: r1(cash - rb), rb, cash, g, ...(g && i >= gtdYrs && vestPart < 1 ? { part: vestPart } : {}) };
  });
  // rounding: the last year absorbs it so the deal adds up
  const drift = r1(cashTotal - years.reduce((s, y) => s + y.cash, 0));
  if (drift && years.length) { const L = years[years.length - 1]; L.cash = r1(L.cash + drift); L.base = r1(L.cash - L.rb); }
  years = years.map((y) => ({ ...y, hit: r1(y.cash + pr) }));
  const gtd = r1(sb0 + years.filter((y) => y.g === "full").reduce((s, y) => s + y.cash * partOf(y), 0));
  return { years, sb: pr, bonus: sb0, voidYrs: vy, voidDead: r1(pr * vy), total, gtd };
}

// What the deal is worth to the player against a flat deal of the same average with nothing
// guaranteed: money now beats money later, and guaranteed money beats money he might never see.
// 1 = the same; a front-loaded, guaranteed deal is worth a few percent more to him.
export function valueFactor(sal, yrs, st) {
  const disc = (i) => Math.pow(0.96, i);
  const risk0 = (i, g) => (g === "full" ? 1 : g === "vest" ? (i === 0 ? 0.995 : 0.975) : i === 0 ? 0.985 : 0.93);
  // a year only partly guaranteed: that part at the guaranteed weight, the rest at none
  const risk = (i, y) => partOf(y) * risk0(i, y.g) + (1 - partOf(y)) * risk0(i, "");
  const base = Array.from({ length: yrs }, (_, i) => sal * disc(i) * risk0(i, "")).reduce((a, b) => a + b, 0);
  const v = st.bonus + st.years.reduce((s, y, i) => s + y.cash * disc(i) * risk(i, y), 0);
  return base ? +(v / base).toFixed(4) : 1;
}

// The fields a signed, scheduled deal puts on the player (merged over him). leagueYr: the league
// year the deal's first season counts in.
export function scheduledTerms(sal, yrs, opts, leagueYr) {
  const st = buildSchedule(sal, yrs, opts);
  return {
    salary: st.years[0].hit, sb: st.sb, sched: st.years.map(({ base, rb, g, part }) => ({ base, rb, g, ...(part != null ? { part } : {}) })), schedYr: leagueYr,
    ...(st.bonus ? { signBonus: st.bonus } : {}), ...(st.voidYrs ? { voidYrs: st.voidYrs, voidDead: st.voidDead } : {}),
    gtdAtSign: st.gtd, dealTotal: st.total,
  };
}

// His cap hit k league years from the one in force (scheduled deals only; null past the end).
export function schedHit(p, k) {
  const y = p.sched?.[k];
  return y ? yearHit(y, p.sb) : null;
}
// One year's cap hit: base + roster bonus + bonus proration (a year can carry its own proration:
// an extension's bonus is spread over the old deal's years too, so its later years may carry none).
export const yearHit = (y, sb = 0) => r1(y.base + y.rb + (y.pr ?? sb ?? 0));

// An extension: the new deal's years (they start when his current deal ends, oldLeft league years
// from now counting this one), its signing bonus prorated from this season over the old deal's
// years left and the new ones, five at most. Returns the schedule plus nowAdd: the proration that
// lands on this season (and on any old year still to come).
export function extensionSchedule(sal, yrs, opts, oldLeft = 1) {
  const st = buildSchedule(sal, yrs, { ...opts, voidYrs: 0, opened: false });
  const left = Math.max(1, oldLeft);
  if (!st.bonus) return { ...st, years: st.years.map((y) => ({ ...y, pr: 0, hit: y.cash })), sb: 0, nowAdd: 0, voidYrs: 0, voidDead: 0 };
  // void years tacked on after the new ones spread the bonus thinner (still five years at most)
  const n = Math.min(5, yrs + left + (opts.voidYrs || 0)), pr = r1(st.bonus / n);
  const vy = Math.max(0, n - yrs - left);
  const years = st.years.map((y, i) => { const p_ = left + i < n ? pr : 0; return { ...y, pr: p_, hit: r1(y.cash + p_) }; });
  return { ...st, years, sb: pr, nowAdd: pr, voidYrs: vy, voidDead: r1(pr * vy) };
}
// Dead money an extension adds if he's cut before it starts: its bonus proration still to come and
// the money guaranteed at signing.
export function extensionDead(ext) {
  if (!ext?.sched?.length) return r1((ext?.sb || 0) * (ext?.yrs || 0));
  return r1((ext.voidDead || 0) + ext.sched.reduce((s, y) => s + (y.pr ?? ext.sb ?? 0) + (y.g === "full" ? (y.base + y.rb) * partOf(y) : 0), 0));
}
// Recompute his current cap hit after the schedule or proration changed.
export const syncSalary = (p) => { if (p.sched?.length) p.salary = schedHit(p, 0); return p; };

// A new league year opens: move every scheduled deal on to it (drop the year just finished).
export function advanceSchedule(p, leagueYr) {
  if (!p?.sched?.length || p.schedYr == null) return p;
  while (p.schedYr < leagueYr && p.sched.length) { p.sched = p.sched.slice(1); p.schedYr++; }
  if (p.sched.length) syncSalary(p);
  return p;
}

// Is a year's money guaranteed now? sp: the phase (money that vests does so when the league year
// opens, i.e. once re-sign week is over).
const vested = (y, sp) => y.g === "full" || (y.g === "vest" && sp !== "resign");

// Guaranteed money still owed if he's cut now, split into this cap year and later ones:
// { now, later }. A roster bonus already paid counts as dead money too. yl: years left on his deal.
export function guaranteedOwed(p, { sp, yl }) {
  if (!p?.sched?.length || !yl) return { now: 0, later: 0 };
  const y0 = p.sched[0];
  // how much of this season's base is still unpaid (it's paid out over the season)
  const unpaid = sp === "regular" ? 0.5 : sp === "playoffs" ? 0 : 1;
  let now = vested(y0, sp) ? y0.base * unpaid * partOf(y0) : 0;
  if (sp !== "resign" && y0.rb) now += y0.rb; // paid when the league year opened
  let later = 0;
  for (let i = 1; i < Math.min(yl, p.sched.length); i++) { const y = p.sched[i]; if (y.g === "full") later += (y.base + y.rb) * partOf(y); }
  return { now: r1(now), later: r1(later) };
}

// A restructure on a scheduled deal: this year's base above the minimum turns into bonus, spread
// over the years left (up to five). Returns the new player, or null.
export function restructureSched(p, { minSal, yl }) {
  if (!p?.sched?.length || yl < 2) return null;
  const convert = r1(p.sched[0].base - minSal);
  if (convert < 1) return null;
  const n = Math.min(yl, 5), add = r1(convert / n);
  // years that carry their own proration (an extension's) take the new bonus share too
  const sched = p.sched.map((y, i) => ({ ...y, ...(i === 0 ? { base: r1(minSal) } : {}), ...(y.pr != null ? { pr: r1(y.pr + (i < n ? add : 0)) } : {}) }));
  const q = { ...p, sched, sb: r1((p.sb || 0) + add), restructures: (p.restructures || 0) + 1 };
  return { convert, years: n, addPerYr: add, saved: r1(convert - add), p: syncSalary(q) };
}

// How an AI club structures a deal, the way NFL front offices do by tier: a star gets a big
// signing bonus, two guaranteed years and the rest vesting in March; a solid starter a smaller
// bonus and one guaranteed year; depth players a plain deal. Some clubs lean their deals a little
// front or back. Returns the player fields (scheduledTerms), or a flat deal for one-year and
// minimum contracts. cy: the league year the deal starts.
export function aiTerms(sal, yrs, cy, { cap = 300, minSal = 1, rand = Math.random } = {}) {
  const share = sal / Math.max(1, cap);
  if (yrs < 2 || share < 0.012) return { salary: sal };
  const star = share >= 0.06, starter = share >= 0.025;
  const opts = {
    bonus: star ? 0.3 : starter ? 0.2 : 0.1,
    gtdYrs: star ? 2 : starter ? 1 : 0,
    vest: starter, vestPart: star || rand() < 0.5 ? 1 : 0.5,
    roster: rand() < 0.3 ? 0.25 : 0,
    shape: TILTS[1 + Math.floor(rand() * 3)], // a light back-load, flat, or a light front-load
    minSal, opened: true,
  };
  return scheduledTerms(sal, Math.min(yrs, 5), opts, cy);
}

// A drafted rookie's deal, the way the rookie wage scale writes them: four years at his slot's
// total (sal: the slot's yearly average, cap.js rookieSalary), with no negotiating. Most of the
// money comes as a signing bonus up front (about two thirds at #1, under half at the end of round
// 1, a third in round 2, a fifth in round 3, a token one after), and the base salaries start low
// and climb each year, so his cap hit grows as the bonus spreads over the four years. First-round
// deals are guaranteed in full; early second-rounders get their first two years guaranteed, later
// ones the first; after that only the bonus is guaranteed (cutting him costs just what's left of it).
// overall: the pick. leagueYr: his first league year. Returns the player fields (scheduledTerms).
export function rookieShare(overall) {
  return overall <= 32 ? 0.66 - (0.19 * (overall - 1)) / 31 : overall <= 64 ? 0.42 - (0.12 * (overall - 33)) / 31 : overall <= 100 ? 0.22 : overall <= 140 ? 0.12 : 0.06;
}
export const rookieGtdYrs = (overall) => (overall <= 32 ? 4 : overall <= 48 ? 2 : overall <= 64 ? 1 : 0);
export function rookieTerms(sal, overall, leagueYr, { minSal = 1 } = {}) {
  const t = scheduledTerms(sal, 4, { shape: -0.5, bonus: rookieShare(overall), gtdYrs: rookieGtdYrs(overall), minSal }, leagueYr);
  // no year below the league minimum (the schedule's rounding lands on the last year)
  t.sched = t.sched.map((y) => (y.base + y.rb < minSal ? { ...y, base: r1(minSal - y.rb) } : y));
  t.salary = schedHit(t, 0);
  t.dealTotal = r1((t.signBonus || 0) + t.sched.reduce((s, y) => s + y.base + y.rb, 0));
  t.gtdAtSign = r1((t.signBonus || 0) + t.sched.reduce((s, y) => s + (y.g === "full" ? (y.base + y.rb) * partOf(y) : 0), 0));
  return { ...t, rookieDeal: true };
}
