// Holiday games: Halloween, Thanksgiving and Christmas. The NFL season opens the Thursday after
// Labor Day, so each holiday falls in a known week: the games that week are the event.
//   Thanksgiving: Detroit and Dallas host (they always have), plus the night game.
//   Christmas: the best matchups of the Christmas week (three of them).
//   Halloween: one marquee night game.
// A season on the real schedule (it has dates) uses the games actually played on those days.

export const HOLIDAYS = {
  halloween: { key: "halloween", name: "Halloween Night", short: "Halloween", icon: "🎃", c1: "#f97316", c2: "#7c3aed", bg: "#1a0b2e", line: "Under the full moon, a costume-party crowd and a game nobody forgets." },
  thanksgiving: { key: "thanksgiving", name: "Thanksgiving Day", short: "Thanksgiving", icon: "🦃", c1: "#d97706", c2: "#9a3412", bg: "#2a1406", line: "Football and family: the whole country is watching." },
  christmas: { key: "christmas", name: "Christmas Day", short: "Christmas", icon: "🎄", c1: "#dc2626", c2: "#15803d", bg: "#0b2015", line: "The league's gift to everyone home for the holiday." },
};
export const holidayOf = (g) => (g?.holiday && HOLIDAYS[g.holiday]) || null;

const DAY = 86400000;
const utc = (y, m, d) => Date.UTC(y, m, d);
// Labor Day is the first Monday of September; the season kicks off that Thursday.
export function kickoff(yr) {
  const sep1 = new Date(utc(yr, 8, 1)).getUTCDay(); // 0 = Sunday
  const labor = 1 + ((8 - sep1) % 7);
  return utc(yr, 8, labor + 3);
}
// The fourth Thursday of November.
export function thanksgiving(yr) {
  const nov1 = new Date(utc(yr, 10, 1)).getUTCDay();
  return utc(yr, 10, 1 + ((4 - nov1 + 7) % 7) + 21);
}
// The week (Thursday to Wednesday) a date falls in.
export const weekOf = (date, yr) => Math.floor((date - kickoff(yr)) / DAY / 7) + 1;
export function holidayWeeks(yr) {
  return { halloween: weekOf(utc(yr, 9, 31), yr), thanksgiving: weekOf(thanksgiving(yr), yr), christmas: weekOf(utc(yr, 11, 25), yr) };
}

const strength = (t) => { const o = (t?.roster || []).map((p) => p.ovr || 0).sort((a, b) => b - a).slice(0, 22); return o.reduce((a, b) => a + b, 0) / Math.max(1, o.length); };
// the calendar day a real-schedule game is played on, in New York
const nyDay = (iso) => { const d = new Date(iso); if (isNaN(d)) return null; const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "numeric", day: "numeric" }).formatToParts(d).map((x) => [x.type, x.value])); return `${+p.month}/${+p.day}`; };

// Tag a season's holiday games (g.holiday). Returns a new schedule; unplayed Thanksgiving games
// in Detroit and Dallas are flipped so they host (with the other meeting flipped too when the two
// clubs play twice, so home games stay even). abOf(i): a club's abbreviation.
export function tagHolidays(sched, yr, teams, abOf) {
  const out = sched.map((g) => ({ ...g }));
  const wk = holidayWeeks(yr);
  const reg = (w) => out.filter((g) => g.wk === w && !g.holiday);
  const best = (list, n) => [...list].sort((a, b) => strength(teams[b.h]) + strength(teams[b.a]) - strength(teams[a.h]) - strength(teams[a.a])).slice(0, n);
  const dated = out.some((g) => g.date);
  const on = (md) => out.filter((g) => g.date && nyDay(g.date) === md);
  // Thanksgiving
  let tg = dated ? on(`11/${new Date(thanksgiving(yr)).getUTCDate()}`) : [];
  if (!tg.length) {
    const list = reg(wk.thanksgiving);
    for (const ab of ["DET", "DAL"]) {
      const g = list.find((x) => abOf(x.h) === ab || abOf(x.a) === ab);
      if (!g || tg.includes(g)) continue;
      if (abOf(g.a) === ab && !g.played) {
        const other = out.find((x) => x !== g && !x.played && x.h === g.a && x.a === g.h);
        [g.h, g.a] = [g.a, g.h];
        if (other) [other.h, other.a] = [other.a, other.h];
      }
      tg.push(g);
    }
    tg.push(...best(list.filter((g) => !tg.includes(g)), 3 - tg.length));
  }
  tg.forEach((g) => { g.holiday = "thanksgiving"; });
  // Christmas
  let xm = dated ? on("12/25") : [];
  if (!xm.length) xm = best(reg(wk.christmas), 3);
  xm.forEach((g) => { g.holiday = "christmas"; });
  // Halloween: the game on the night itself, or the week's marquee game
  let hw = dated ? on("10/31") : [];
  if (!hw.length) hw = best(reg(wk.halloween), 1);
  hw.slice(0, 1).forEach((g) => { g.holiday = "halloween"; });
  return out;
}
