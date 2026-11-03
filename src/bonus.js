// Contract structure: signing bonuses, dead money and restructures.
//
// A player's cap hit (salary) is his base salary plus his signing bonus spread evenly over the
// years of the deal (the proration, sb). The bonus is already paid, so it stays on the cap even
// after he's gone: cut or trade him and every year of proration still to come is dead money.
// Before June 1 (re-sign week, free agency, the draft) it all lands on this year's cap; after
// June 1 (the season), or with a June 1 designation in the off-season, this year's share stays
// this year and the rest moves to next year's cap.
//
// A restructure turns most of this year's base salary into bonus, spread over the years left:
// space now, a bigger cap hit in every later year, and more dead money if he's cut.
import { capFor, BASE_YEAR } from "./cap.js";
import { guaranteedOwed, restructureSched, syncSalary, advanceSchedule, extensionDead } from "./contractSchedule.js";

const r1 = (x) => Math.round((+x || 0) * 10) / 10;
export const OFFSEASON = new Set(["resign", "freeagency", "draft"]);
export const JUNE1_CUTS = 2;

// How much of a new deal is signing bonus: big deals are bonus-heavy, minimum deals aren't.
export function bonusShare(salary, cap) {
  const s = (salary || 0) / cap;
  return s >= 0.08 ? 0.4 : s >= 0.03 ? 0.3 : s >= 0.01 ? 0.15 : 0.05;
}

// His bonus proration per year: set by a restructure or trade, otherwise his deal's usual share.
export const proration = (p) => (p.sb != null ? p.sb : r1((p.salary || 0) * bonusShare(p.salary, capFor(p.cy || BASE_YEAR))));

// League years left on his deal, counting the one in force. From re-sign week on it's next
// season's league year, so a deal signed before then has one year fewer left.
export function yearsLeft(p, yr, sp) {
  const n = OFFSEASON.has(sp) && p.cy !== yr + 1 ? (p.contract || 0) - 1 : p.contract || 0;
  return Math.max(0, n);
}

// Dead money if he's released (or traded): { now, next, total }.
export function deadMoney(p, { yr, sp, june1 = false } = {}) {
  const yl = yearsLeft(p, yr, sp);
  const pr = proration(p);
  // a scheduled deal also leaves the guaranteed salary still owed (and a roster bonus already paid)
  const g = guaranteedOwed(p, { sp, yl });
  // an extension that hasn't started yet: its bonus proration and guaranteed money (later caps)
  if (p.ext) g.later = r1(g.later + extensionDead(p.ext));
  const total = r1(pr * yl + g.now + g.later);
  if (!yl || !total) return { now: 0, next: 0, total: 0 };
  if (OFFSEASON.has(sp) && !june1) return { now: total, next: 0, total };
  const now = r1(pr + g.now);
  return { now, next: r1(total - now), total };
}

// Charge dead money to a team (mutates it).
export function chargeDead(t, d) {
  if (d.now) t.deadCap = r1((t.deadCap || 0) + d.now);
  if (d.next) t.deadNext = r1((t.deadNext || 0) + d.next);
}

// A player leaving his team in a trade: the team keeps his bonus as dead money, and he arrives
// at his new club carrying only his base salary.
export function tradeAway(p, from, ctx) {
  const pr = proration(p);
  if (!pr || !from) return p;
  chargeDead(from, deadMoney(p, ctx));
  if (p.sched?.length) return syncSalary({ ...p, sb: 0, sched: p.sched.map(({ pr, ...y }) => y) });
  return { ...p, salary: r1((p.salary || 0) - pr), sb: 0 };
}

// What a restructure would do, or null if he can't be restructured (fewer than 2 years left, or
// a base salary already near the minimum).
export function restructurePlan(p, { yr, sp, minSal }) {
  const yl = yearsLeft(p, yr, sp);
  if (yl < 2) return null;
  if (p.sched?.length) {
    const r = restructureSched(p, { minSal, yl });
    if (!r) return null;
    return { convert: r.convert, years: r.years, addPerYr: r.addPerYr, saved: r.saved, hitNow: r.p.salary, hitLater: r1((p.sched[1] ? p.sched[1].base + p.sched[1].rb : 0) + (r.p.sb || 0)), deadIfCut: r1((r.p.sb || 0) * yl) };
  }
  const pr = proration(p);
  const convert = r1((p.salary || 0) - pr - minSal);
  if (convert < 1) return null;
  const n = Math.min(yl, 5);
  const add = r1(convert / n);
  return {
    convert, years: n, addPerYr: add, saved: r1(convert - add),
    hitNow: r1(p.salary - convert + add), hitLater: r1(p.salary + add),
    deadIfCut: r1((pr + add) * yl),
  };
}
export function restructure(p, ctx) {
  const plan = restructurePlan(p, ctx);
  if (!plan) return null;
  if (p.sched?.length) return { plan, p: restructureSched(p, { minSal: ctx.minSal, yl: yearsLeft(p, ctx.yr, ctx.sp) }).p };
  return { plan, p: { ...p, salary: plan.hitNow, sb: r1(proration(p) + plan.addPerYr), baseBack: r1((p.baseBack || 0) + plan.convert), restructures: (p.restructures || 0) + 1 } };
}

// A new deal (free agency or re-sign week) with a signing bonus: part of the first year's base
// salary is paid up front as bonus and spread over the deal (up to five years), exactly like a
// restructure on day one. This year's cap hit drops; every later year carries the proration;
// cut him and the unpaid proration is dead money. share: 0 to 0.75 of the first-year base above
// the league minimum. Deals of one year can't spread a bonus.
export const SIGN_BONUS = [0, 0.25, 0.5, 0.75];
// voidYrs: void years tacked on to spread the bonus thinner (the proration never runs past five
// years); what's left on them becomes dead money when the real deal ends.
export function signingStructure(sal, yrs, share, { minSal = 1, cap, voidYrs = 0 } = {}) {
  const convert = yrs >= 2 && share > 0 ? r1(Math.max(0, sal - minSal) * share) : 0;
  const n = Math.min(5, yrs + (convert ? voidYrs : 0));
  const vy = Math.max(0, n - yrs);
  const add = r1(convert / Math.max(1, Math.min(5, n)));
  const base = r1(sal * bonusShare(sal, cap || capFor(BASE_YEAR)));
  return { bonus: convert, years: n, voidYrs: vy, voidDead: r1(add * vy), add, hitNow: r1(sal - convert + add), hitLater: r1(sal + add), sb: r1(base + add), deadIfCutNow: r1((base + add) * yrs + add * vy) };
}
// The contract fields for a signed deal (merged over the player).
export function signedTerms(sal, yrs, share, ctx) {
  const st = signingStructure(sal, yrs, share, ctx);
  if (!st.bonus) return { salary: sal };
  return { salary: st.hitNow, sb: st.sb, baseBack: st.bonus, signBonus: st.bonus, ...(st.voidYrs ? { voidYrs: st.voidYrs, voidDead: st.voidDead } : {}) };
}

// A brand-new contract: his old bonus and restructures don't come with him.
export const freshDeal = (p) => { const { sb, baseBack, restructures, restructured, voidYrs, voidDead, inc, sched, schedYr, gtdAtSign, dealTotal, signBonus, ...rest } = p; return rest; };

// A new league year (re-sign week): last year's dead money is off the books, money pushed to
// this year arrives, and restructured base salaries come back. Mutates the teams.
export function newLeagueYear(teams, leagueYr) {
  for (const t of teams) {
    if (!t) continue;
    t.deadCap = r1(t.deadNext || 0);
    t.deadNext = 0;
    t.june1 = 0;
    // incentives earned last season count against this year's cap
    t.incCharge = r1(t.incNext || 0);
    t.incNext = 0;
    for (const list of [t.roster, t.ir, t.ps]) for (const p of list || []) {
      if (p.baseBack) { p.salary = r1((p.salary || 0) + p.baseBack); delete p.baseBack; }
      // a scheduled deal moves on to this league year's salary
      if (p.sched?.length && leagueYr != null) advanceSchedule(p, leagueYr);
    }
  }
  return teams;
}
