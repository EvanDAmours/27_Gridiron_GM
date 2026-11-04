// Run: npx vite build --outDir node_modules/.dist2 && SP=<dir> node scripts/phone-audit.mjs
// Phone readability audit: walk every phone screen, screenshot it, and report text under 12px,
// low contrast, truncated text and sideways overflow. SP=dir for output. TAG=name for the run.
import { preview } from "vite";
import { chromium } from "playwright-core";
import fs from "node:fs";
const SP = process.env.SP || "audits", TAG = process.env.TAG || "phone";
const OUT = `${SP}/phone_${TAG}`; fs.mkdirSync(OUT, { recursive: true });
const server = await preview({ build: { outDir: "node_modules/.dist2" }, preview: { port: 4219, strictPort: false }, logLevel: "silent" });
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const errors = []; page.on("pageerror", (e) => errors.push(e.message)); page.on("dialog", (d) => d.accept());
await page.addInitScript(() => { localStorage.setItem("gm_intro_shown", "1"); sessionStorage.setItem("gm_preview", "1"); });
const clickT = async (t, w = 700, exact = false) => { const esc = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); const b = page.locator("button:visible", { hasText: exact ? new RegExp(`^\\s*${esc}\\s*$`) : t }); if (await b.count()) { await b.first().dispatchEvent("click"); await page.waitForTimeout(w); return true; } return false; };
await page.goto(server.resolvedUrls.local[0] + "?mobile"); await page.waitForTimeout(1400);
await clickT("NEW GAME", 1200); await clickT("NFC", 600); await page.locator("button", { hasText: "Giants" }).first().click(); await page.waitForTimeout(600);
await clickT("Start today", 800); await clickT("START YOUR", 4000);
for (const t of ["Skip", "Got it", "Later"]) await clickT(t, 300);

const audit = () => page.evaluate(() => {
  const lum = (c) => { const m = c.match(/[\d.]+/g); if (!m) return null; const [r, g, b, a = 1] = m.map(Number); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return { L: 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b), a, rgb: [r, g, b] }; };
  const bgOf = (el) => { let blend = null; for (let e = el; e; e = e.parentElement) { const s = getComputedStyle(e); const c = lum(s.backgroundColor); if (c && c.a > 0.5) return c; if (s.backgroundImage && s.backgroundImage !== "none") return null; } return lum("rgb(11,15,23)"); };
  const out = { small: [], contrast: [], clipped: [], overflow: document.scrollingElement.scrollWidth > innerWidth + 1 ? document.scrollingElement.scrollWidth : 0 };
  const seen = new Set();
  for (const el of document.querySelectorAll("body *")) {
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();
    if (!own || own.length < 2) continue;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height || r.bottom < 0 || r.right < 0 || r.left > innerWidth) continue;
    const s = getComputedStyle(el); if (s.visibility === "hidden" || +s.opacity < 0.2) continue;
    const fs = parseFloat(s.fontSize), key = `${own.slice(0, 40)}|${fs}`; if (seen.has(key)) continue; seen.add(key);
    const sample = own.slice(0, 50);
    if (fs < 12) out.small.push(`${fs}px "${sample}"`);
    const fg = lum(s.color), bg = bgOf(el);
    if (fg && bg) { const op = fg.a * (+s.opacity || 1); const L = op < 1 ? op * fg.L + (1 - op) * bg.L : fg.L; const cr = (Math.max(L, bg.L) + 0.05) / (Math.min(L, bg.L) + 0.05); if (cr < (fs >= 18 || (fs >= 14 && +s.fontWeight >= 700) ? 3 : 4.5)) out.contrast.push(`${cr.toFixed(1)}:1 ${fs}px ${s.color}/${bg.rgb.join(",")} "${sample}"`); }
    if ((s.textOverflow === "ellipsis" || s.overflow === "hidden") && el.scrollWidth > el.clientWidth + 1 && (s.whiteSpace === "nowrap" || el.getAttribute("role") === "tab")) out.clipped.push(`"${sample}"`);
  }
  return out;
});

const report = {};
const shoot = async (name) => {
  await page.waitForTimeout(500);
  const a = await audit();
  report[name] = { small: a.small.length, contrast: a.contrast.length, clipped: a.clipped.length, overflow: a.overflow, samples: { small: a.small.slice(0, 14), contrast: a.contrast.slice(0, 10), clipped: a.clipped.slice(0, 10) } };
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log(`${name}: small ${a.small.length}, contrast ${a.contrast.length}, clipped ${a.clipped.length}${a.overflow ? `, overflow ${a.overflow}px` : ""}`);
};
const more = async (label) => { await clickT("More", 600, true); const dlg = page.locator('[role="dialog"][aria-label="More"]'); if (label === "Saves" || label === "Game Updates") await dlg.locator("button", { hasText: "Settings & help" }).first().dispatchEvent("click").catch(() => {}); await page.waitForTimeout(300); const b = dlg.locator("button", { hasText: new RegExp(`^\\s*${label}\\s*›?\\s*$`) }); if (!(await b.count())) { await dlg.locator('button[aria-label="Close"]').first().dispatchEvent("click").catch(() => {}); return false; } await b.first().dispatchEvent("click"); await page.waitForTimeout(1300); return true; };
// screens: the bottom bar, then everything in More, with their sub-tabs
await shoot("home");
await clickT("Roster", 1000, true);
for (const side of ["Offense", "Defense", "Special", "Subs"]) { if (await clickT(side, 600, true)) await shoot(`depth_${side.toLowerCase()}`); }
{ const r = page.locator("button:visible", { hasText: /^\s*Roster\s*$/ }); if (await r.count() > 1) { await r.nth(0).dispatchEvent("click"); await page.waitForTimeout(800); await shoot("roster_list"); } }
await clickT("Scouting", 1200, true); await shoot("scouting");
await clickT("Standings", 1200, true); await shoot("standings");
for (const s of ["Schedule", "Playoffs"]) if (await clickT(s, 900, true)) await shoot(s.toLowerCase());
for (const [label, subs] of [["Stats", []], ["Trade", []], ["Free Agency", []], ["Coaching", []], ["Front Office", ["Contracts", "Cap", "League"]], ["League", ["Franchise History", "Record Book", "League History", "Transactions"]], ["Legacy Hall", []], ["Saves", []], ["Game Updates", []]]) {
  if (!(await more(label))) { console.log(`(no ${label} in More)`); await page.keyboard.press("Escape"); continue; }
  await shoot(label.toLowerCase().replace(/\W+/g, "_"));
  for (const s of subs) if (await clickT(s, 900, true)) await shoot(`${label}_${s}`.toLowerCase().replace(/\W+/g, "_"));
}
// a player card and the More sheet itself
await clickT("Home", 900, true);
await clickT("More", 600, true); await shoot("more_sheet"); await page.keyboard.press("Escape"); await page.mouse.click(5, 5); await page.waitForTimeout(400);
// pop-ups: a player card, a free-agent negotiation, the weekly result
await clickT("Roster", 1000, true); { const r = page.locator("button:visible", { hasText: /^\s*Roster\s*$/ }); if (await r.count() > 1) { await r.nth(0).dispatchEvent("click"); await page.waitForTimeout(800); } }
await page.locator("text=Jameis Winston").first().click().catch(() => {}); await page.waitForTimeout(1200); await shoot("player_card");
await page.keyboard.press("Escape"); await page.waitForTimeout(400); await page.mouse.click(5, 120); await page.waitForTimeout(400);
for (const t of ["Close", "×"]) await clickT(t, 300, true);
if (await more("Free Agency")) { await page.locator("text=Josh Metellus").first().click().catch(() => {}); await page.waitForTimeout(1200); await shoot("fa_player"); for (const t of ["Negotiate", "Make an offer", "Offer"]) if (await clickT(t, 1200)) { await shoot("fa_negotiate"); break; } }
await page.goto(server.resolvedUrls.local[0] + "?mobile"); await page.waitForTimeout(1500); await clickT("CONTINUE", 2500); for (const t of ["Skip", "Got it", "Later"]) await clickT(t, 300);
if (await clickT("Play Week 9", 600)) { for (let i = 0; i < 30; i++) { await page.waitForTimeout(1000); if (await page.evaluate(() => /FINAL|Final/.test(document.body.innerText))) break; } await shoot("week_result"); }
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1));
console.log("errors", errors);
await browser.close(); server.httpServer.close();
