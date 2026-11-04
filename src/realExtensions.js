// Real contract extensions signed during the 2026 season (data/realExtensions2026.json): the
// player keeps his current deal through this season and the new one takes over at the next league
// year, exactly like an extension you sign yourself (extensions.js applyExtensions). The new money
// is built on the game's contract schedule: a modest signing bonus spread from this season, and
// the first two new years guaranteed, which lands on the reported guarantee. A new league starts
// with them signed; a 2026 save gets each one once while it's still the 2026 regular season, if the
// player is still with that club on the deal the data knew (not released, traded or extended).
import DATA from "./data/realExtensions2026.json" with { type: "json" };
import { extensionSchedule } from "./contractSchedule.js";
import { proration } from "./bonus.js";
import { minSalary } from "./cap.js";

const r1 = (x) => Math.round((+x || 0) * 10) / 10;
const BONUS = 0.1, GTD_YRS = 2;

// The extension fields for one real deal (what p.ext holds), and what lands on this season.
export function realExtTerms(e, season = DATA.season) {
  const apy = e.total / e.yrs; // unrounded, so the years add up to the reported total
  const st = extensionSchedule(apy, e.yrs, { bonus: BONUS, gtdYrs: GTD_YRS, minSal: minSalary(season + 1) }, 1);
  const sched = st.years.map(({ base, rb, g, part, pr }) => ({ base, rb, g, ...(part != null ? { part } : {}), pr }));
  return { ext: { sal: st.years[0].hit, apy: r1(apy), yrs: e.yrs, yr: season, sb: st.sb, sched, gtd: st.gtd, total: st.total, real: e.id }, nowAdd: st.nowAdd };
}

// Sign the real extensions on these clubs. Returns log lines. A player already extended (or on a
// longer deal than the one the data knew: contract > 1) is left alone.
export function applyRealExtensions(teams, { season = DATA.season, list = DATA.extensions } = {}) {
  const out = [];
  for (const e of list) {
    const t = (teams || []).find((x) => x?.ab === e.team);
    const p = t && [...(t.roster || []), ...(t.ir || [])].find((x) => x?.name === e.name && x.pos === e.pos);
    if (!p || p.ext || (p.realExt || []).includes(e.id) || (p.contract ?? 1) !== 1) continue;
    const { ext, nowAdd } = realExtTerms(e, season);
    // the signing bonus starts counting this season, on top of his current deal
    if (nowAdd) { const sb = r1(proration(p) + nowAdd); p.salary = r1((p.salary || 0) + nowAdd); p.sb = sb; }
    p.ext = ext;
    p.realExt = [...(p.realExt || []), e.id];
    out.push(`In real life: ${e.team} extended ${e.name} (${e.pos}) through ${e.through}: ${e.yrs} years, $${e.total}M, $${e.gtd}M guaranteed. It takes over when his current deal ends.`);
  }
  return out;
}

// A loaded save: only while it's still the 2026 season and before the playoffs.
export function applyRealExtensionsToSave(d) {
  if (!d || !Array.isArray(d.teams) || d.yr !== DATA.season || (d.sp && d.sp !== "preseason" && d.sp !== "regular")) return [];
  return applyRealExtensions(d.teams);
}
