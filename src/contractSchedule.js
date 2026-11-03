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
export const BONUS_SHARES = [0, 0.1, 0.2, 0.3, 0.4];
export const ROSTER_SHARES = [0, 0.25, 0.5];

// cash per year (before the signing bonus is taken out), shaped: front-loaded pays more early
function weights(yrs, shape) {
  if (yrs <= 1 || shape === "flat") return Array(yrs).fill(1);
  const w = Array.from({ length: yrs }, (_, i) => 1 + 0.35 * (1 - (2 * i) / (yrs - 1)));
  return shape === "front" ? w : w.reverse();
}

// sal: the average a year (what the player hears), yrs: real years. opts: { shape, bonus (share of
// the total), gtdYrs (years guaranteed at signing), vest (later years vest each March), roster
// (share of each later year paid as a March roster bonus), voidYrs, minSal, opened (the league
// year is already open, so a first year that vests in March has vested: re-sign week deals aren't) }.
// Returns { years: [{ base, rb, cash, hit, g }], sb, bonus, voidYrs, voidDead, total, gtd }.
export function buildSchedule(sal, yrs, { shape = "flat", bonus = 0, gtdYrs = 0, vest = false, roster = 0, voidYrs = 0, minSal = 1, opened = false } = {}) {
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
    return { base: r1(cash - rb), rb, cash, g: i < gtdYrs || (vest && opened && i === 0) ? "full" : vest ? "vest" : "" };
  });
  // rounding: the last year absorbs it so the deal adds up
  const drift = r1(cashTotal - years.reduce((s, y) => s + y.cash, 0));
  if (drift && years.length) { const L = years[years.length - 1]; L.cash = r1(L.cash + drift); L.base = r1(L.cash - L.rb); }
  years = years.map((y) => ({ ...y, hit: r1(y.cash + pr) }));
  const gtd = r1(sb0 + years.filter((y) => y.g === "full").reduce((s, y) => s + y.cash, 0));
  return { years, sb: pr, bonus: sb0, voidYrs: vy, voidDead: r1(pr * vy), total, gtd };
}

// What the deal is worth to the player against a flat deal of the same average with nothing
// guaranteed: money now beats money later, and guaranteed money beats money he might never see.
// 1 = the same; a front-loaded, guaranteed deal is worth a few percent more to him.
export function valueFactor(sal, yrs, st) {
  const disc = (i) => Math.pow(0.96, i);
  const risk = (i, g) => (g === "full" ? 1 : g === "vest" ? (i === 0 ? 0.995 : 0.975) : i === 0 ? 0.985 : 0.93);
  const base = Array.from({ length: yrs }, (_, i) => sal * disc(i) * risk(i, "")).reduce((a, b) => a + b, 0);
  const v = st.bonus + st.years.reduce((s, y, i) => s + y.cash * disc(i) * risk(i, y.g), 0);
  return base ? +(v / base).toFixed(4) : 1;
}

// The fields a signed, scheduled deal puts on the player (merged over him). leagueYr: the league
// year the deal's first season counts in.
export function scheduledTerms(sal, yrs, opts, leagueYr) {
  const st = buildSchedule(sal, yrs, opts);
  return {
    salary: st.years[0].hit, sb: st.sb, sched: st.years.map(({ base, rb, g }) => ({ base, rb, g })), schedYr: leagueYr,
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
  if (!st.bonus) return { ...st, years: st.years.map((y) => ({ ...y, pr: 0, hit: y.cash })), sb: 0, nowAdd: 0 };
  const n = Math.min(5, yrs + left), pr = r1(st.bonus / n);
  const years = st.years.map((y, i) => { const p_ = left + i < n ? pr : 0; return { ...y, pr: p_, hit: r1(y.cash + p_) }; });
  return { ...st, years, sb: pr, nowAdd: pr };
}
// Dead money an extension adds if he's cut before it starts: its bonus proration still to come and
// the money guaranteed at signing.
export function extensionDead(ext) {
  if (!ext?.sched?.length) return r1((ext?.sb || 0) * (ext?.yrs || 0));
  return r1(ext.sched.reduce((s, y) => s + (y.pr ?? ext.sb ?? 0) + (y.g === "full" ? y.base + y.rb : 0), 0));
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
  let now = vested(y0, sp) ? y0.base * unpaid : 0;
  if (sp !== "resign" && y0.rb) now += y0.rb; // paid when the league year opened
  let later = 0;
  for (let i = 1; i < Math.min(yl, p.sched.length); i++) { const y = p.sched[i]; if (y.g === "full") later += y.base + y.rb; }
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
