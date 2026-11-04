// Run: npx vite build --outDir node_modules/.dist2 && SP=<dir> node scripts/phone-audit.mjs
// Phone readability audit: walk every phone screen, screenshot it, and report text under 12px,
// low contrast, truncated text and sideways overflow. SP=dir for output. TAG=name for the run.
import { preview } from "vite";
import { chromium } from "playwright-core";
import fs from "node:fs";
const SP = process.env.SP || "audits", TAG = process.env.TAG || "phone", PASS = process.env.PASS || "main"; // PASS: main (every screen), extra (sheets, sub-tabs, pop-ups), offseason
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
if (PASS === "main") {
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
}

const close = async () => { await page.keyboard.press("Escape"); await page.waitForTimeout(300); for (const sel of ['button[aria-label="Close"]:visible', 'button[aria-label="Back"]:visible']) { const b = page.locator(sel); if (await b.count()) { await b.first().dispatchEvent("click").catch(() => {}); await page.waitForTimeout(400); } } };
const home = async () => { await close(); await clickT("Home", 900, true); };
// every row of tabs on the screen (not the bottom bar), each tab once
const walkTabs = async (prefix, max = 10) => {
  const labels = await page.evaluate(() => [...document.querySelectorAll('[role="tab"]')].filter((b) => b.offsetParent && !b.closest("nav")).map((b) => b.innerText.trim()).filter(Boolean));
  for (const l of [...new Set(labels)].slice(0, max)) { const b = page.locator('[role="tab"]:visible', { hasText: new RegExp(`^\\s*${l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`) }); if (!(await b.count())) continue; await b.first().dispatchEvent("click"); await page.waitForTimeout(700); await shoot(`${prefix}_${l}`.toLowerCase().replace(/\W+/g, "_").slice(0, 60)); }
};

if (PASS === "extra") {
  // Home's sheets
  for (const [t, name] of [["See all", "todo_all"], ["Game plan", "game_plan"], ["Injuries", "injuries"], ["Development", "development"]]) { await home(); if (await clickT(t, 1000)) await shoot(name); }
  // search, and a player card front and back
  await home(); { const s = page.locator('button[aria-label*="earch"]:visible'); if (await s.count()) { await s.first().dispatchEvent("click"); await page.waitForTimeout(600); await page.keyboard.type("Nabers"); await page.waitForTimeout(800); await shoot("search"); await page.locator("text=Malik Nabers").first().click().catch(() => {}); await page.waitForTimeout(1200); await shoot("card_front"); if (await clickT("FLIP", 1200)) { await shoot("card_back"); await walkTabs("card_back", 6); } } }
  await home(); await clickT("Scouting", 1200, true); await walkTabs("scouting");
  await home(); if (await more("Stats")) await walkTabs("stats");
  await home(); if (await more("Trade")) { await shoot("trade"); await walkTabs("trade", 4); await page.locator("text=Eagles").first().click().catch(() => {}); await page.waitForTimeout(1200); await shoot("trade_with_club"); }
  await home(); if (await more("Front Office")) { await walkTabs("front_office", 6); if (await clickT("Extend", 1200)) await shoot("extend_talk"); }
  await home(); if (await more("Coaching")) { for (const t of ["Offense", "Coaching specialties", "Team confidence"]) { if (await clickT(t, 1000)) { await shoot(`coaching_${t}`.toLowerCase().replace(/\W+/g, "_")); await close(); } } }
  // a live game: box score, call plays, then the result
  await home(); if (await clickT("Play Week 9", 2500)) { for (const t of ["Box score", "Call plays"]) { if (await clickT(t, 1200)) { await shoot(`live_${t}`.toLowerCase().replace(/\W+/g, "_")); await close(); } } if (await clickT("Finish", 1500)) { for (let i = 0; i < 20; i++) { await page.waitForTimeout(800); if (await page.evaluate(() => /FINAL|Final/.test(document.body.innerText))) break; } await shoot("game_final"); } }
}

if (PASS === "offseason") {
  // the season's actions: the big button, or behind the bar's menu (a big jump asks for a second tap)
  const act = async (label, wait = 1500) => {
    const re = label instanceof RegExp ? label : new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    let b = page.locator("button:visible", { hasText: re });
    if (!(await b.count())) { const m = page.locator('button[aria-label="More actions"]:visible'); if (await m.count()) { await m.first().dispatchEvent("click"); await page.waitForTimeout(400); } b = page.locator("button:visible", { hasText: re }); }
    if (!(await b.count())) return false;
    const box = await b.first().boundingBox(); const before = await b.first().innerText();
    await b.first().dispatchEvent("click"); await page.waitForTimeout(500);
    // a menu item that asks for a second tap shows its confirmation in the same place
    if (box) { const still = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y)?.closest("button"); return e ? e.innerText : null; }, [box.x + box.width / 2, box.y + box.height / 2]); if (still && still !== before) { await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await page.waitForTimeout(400); } }
    const again = page.locator("button:visible", { hasText: /^\s*(Yes|Yes, go to.*|Confirm)\s*$/ }); if (await again.count()) { await again.first().dispatchEvent("click"); await page.waitForTimeout(400); }
    await page.waitForTimeout(wait); return true;
  };
  const dismiss = async () => { for (let i = 0; i < 4; i++) { let hit = false; for (const t of ["READ ALL ABOUT IT", "NEXT AWARD", "WELCOME TO CANTON", "INTO THE RECORD BOOK", "Close the paper", "Continue", "CONTINUE →", "Got it", "Later", "Decide later", "Keep simming", "Back to the season", "Standard", "Meet Demands", "STAY CALM", "Let Go (coach departs)", "Play On"]) { const b = page.locator("button:visible", { hasText: t }); if (await b.count()) { await b.first().dispatchEvent("click").catch(() => {}); await page.waitForTimeout(300); hit = true; } } if (!hit) break; } };
  const adv = async (label, wait) => { for (let k = 0; k < 3; k++) { await dismiss(); await clickT("Home", 900, true); if (await act(label, wait)) return true; } return false; };
  const phase = () => page.evaluate(() => document.body.innerText.slice(0, 400).replace(/\s+/g, " "));
  // to the end of the regular season
  for (let i = 0; i < 40 && !(await page.evaluate(() => /Sim Round|Playoffs ▾|Wild Card/.test(document.body.innerText))); i++) { await dismiss(); if (!(await act("Sim All", 3000))) await act("Play Week", 2500); }
  await dismiss(); await shoot("season_end_home");
  for (let i = 0; i < 8; i++) { await dismiss(); if (!(await act(/^\s*Sim (Round|Wild Card|Divisional|Conference|Championship|the Super Bowl|Super Bowl)/, 3000))) break; }
  await dismiss(); await clickT("Home", 1200, true);
  await dismiss(); await shoot("after_playoffs");
  if (await act("→ Combine", 3000)) { await dismiss(); await shoot("combine_home"); await clickT("Scouting", 1200, true); await walkTabs("combine_scouting", 6); }
  await clickT("Home", 900, true);
  if (await adv("Finish Combine", 3000)) { await dismiss(); await shoot("resign_home"); await act("Re-sign", 1500); await shoot("resign_screen"); for (const t of ["Negotiate", "Talk", "Make an offer"]) if (await clickT(t, 1200)) { await shoot("resign_talk"); await close(); break; } }
  await clickT("Home", 900, true);
  if (await adv("Finish Re-signing", 4000)) { await dismiss(); await shoot("fa_home"); await act("Free Agency", 1500); await shoot("fa_offseason"); }
  await clickT("Home", 900, true);
  if (await adv("Finish Free Agency", 4000)) { await dismiss(); await shoot("draft_home"); await act("draft", 1500); await shoot("draft_screen"); await walkTabs("draft", 6); await clickT("Draft", 900, true);
    if (await act("Sim to my pick", 8000)) { await dismiss(); await shoot("draft_my_pick"); }
    if (await act("Sim the whole draft", 15000)) { await dismiss(); await shoot("draft_done"); } }
  await clickT("Home", 900, true);
  if (await adv("Next Season", 6000)) { await dismiss(); await shoot("preseason_home"); await clickT("Camp", 1200, true); await shoot("training_camp"); await walkTabs("camp", 6); }
  console.log("phase at end:", (await phase()).slice(0, 160));
}
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1));
console.log("errors", errors);
await browser.close(); server.httpServer.close();
