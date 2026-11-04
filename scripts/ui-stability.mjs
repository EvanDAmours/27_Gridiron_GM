// UI stability check (runs before every release: ship script and CI, after the smoke test).
// Plays with the depth chart the way a player does, in the real built game, and fails if anything
// under the pointer moves while you work it:
// - desktop: open a spot's menu (SLOT, X, RB, LE, CB1) and press + and - on every player in it,
//   again and again. After every press the menu must stay where it opened (within 2px), keep its
//   title (SLOT stays SLOT), keep its rows in the same order, and stay on the field.
// - phone: open a spot's snap sheet and do the same: its rows can't reorder, and the page can't
//   scroll sideways.
// Run with `npm run ui-stability` after `npm run build` (DIST=dir to check another build).
import fs from "node:fs";
import path from "node:path";
import { preview } from "vite";
import { chromium } from "playwright-core";

const findChromium = () => {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  for (const root of [process.env.PLAYWRIGHT_BROWSERS_PATH, "/opt/pw-browsers"].filter(Boolean)) {
    if (!fs.existsSync(root)) continue;
    for (const d of fs.readdirSync(root).filter((x) => /^chromium-\d+$/.test(x)).sort().reverse()) {
      for (const dir of ["chrome-linux", "chrome-linux64"]) { const exe = path.join(root, d, dir, "chrome"); if (fs.existsSync(exe)) return exe; }
    }
  }
  return undefined;
};

const DIST = process.env.DIST || "dist";
const PRESSES = +(process.env.PRESSES || 3); // presses per button
const problems = [];
const fail = (msg) => { problems.push(msg); console.log(`  ✗ ${msg}`); };

const server = await preview({ build: { outDir: DIST }, preview: { port: 4251, strictPort: false }, logLevel: "silent" });
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ executablePath: findChromium() });

async function newFranchise(page, phone) {
  const clickT = async (t, w = 700) => { const b = page.locator("button:visible", { hasText: t }); if (await b.count()) { await b.first().dispatchEvent("click"); await page.waitForTimeout(w); return true; } return false; };
  await page.addInitScript(() => { localStorage.setItem("gm_intro_shown", "1"); sessionStorage.setItem("gm_preview", "1"); });
  await page.goto(url + (phone ? "?mobile" : "")); await page.waitForTimeout(1400);
  await clickT("NEW GAME", 1200); if (phone) await clickT("NFC", 600);
  await page.locator("button", { hasText: "Giants" }).first().click(); await page.waitForTimeout(600);
  // Start today: injuries and snap shares in play, the realistic case
  await clickT("Start today", 800); await clickT("START YOUR", 4000);
  for (const t of ["Skip", "Got it", "Later"]) await clickT(t, 300);
  return clickT;
}

// ---- desktop: the field view's spot menu
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = []; page.on("pageerror", (e) => errors.push(e.message)); page.on("dialog", (d) => d.accept());
  const clickT = await newFranchise(page, false);
  await clickT("Team", 600); await page.locator('button:text-is("Depth Chart")').first().dispatchEvent("click"); await page.waitForTimeout(1500);
  const menuState = () => page.evaluate(() => {
    const d = document.querySelector('[role="dialog"][aria-label$="menu"]');
    if (!d) return null;
    const r = d.getBoundingClientRect(), f = document.querySelector("[data-depth-field]")?.getBoundingClientRect();
    const rows = [...d.querySelectorAll('button[aria-label^="5 more snaps for "]')].map((b) => b.getAttribute("aria-label").replace("5 more snaps for ", ""));
    return { title: d.getAttribute("aria-label"), x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), rows, inField: !f || (r.left >= f.left - 1 && r.right <= f.right + 1 && r.top >= f.top - 1 && r.bottom <= f.bottom + 1) };
  });
  for (const [side, label] of [["Offense", "SLOT"], ["Offense", "X"], ["Offense", "RB"], ["Defense", "LE"], ["Defense", "CB1"]]) {
    await page.locator(`button:text-is("${side}")`).first().click(); await page.waitForTimeout(600);
    // the card whose first line is the spot's name (its text runs on into the player's name)
    const i = await page.evaluate((l) => [...document.querySelectorAll('[data-depth-field] [role="button"]')].findIndex((e) => e.innerText.split("\n")[0].trim() === l), label);
    if (i < 0) { fail(`desktop: no ${label} card on the ${side} field`); continue; }
    await page.locator('[data-depth-field] [role="button"]').nth(i).click(); await page.waitForTimeout(700);
    const s0 = await menuState();
    if (!s0) { fail(`desktop: the ${label} menu didn't open`); continue; }
    if (!s0.inField) fail(`desktop ${label}: the menu opened off the field (${s0.x},${s0.y})`);
    let presses = 0, bad = false;
    for (const who of s0.rows) for (const dir of ["more", "fewer", "more"]) for (let i = 0; i < PRESSES && !bad; i++) {
      const b = page.locator(`[role="dialog"][aria-label$="menu"] button[aria-label="5 ${dir} snaps for ${who}"]`);
      if (!(await b.count()) || (await b.first().isDisabled())) continue;
      await b.first().click(); await page.waitForTimeout(120); presses++;
      const s = await menuState();
      if (!s) { fail(`desktop ${label}: the menu closed after "5 ${dir} snaps for ${who}"`); bad = true; break; }
      if (Math.abs(s.x - s0.x) > 2 || Math.abs(s.y - s0.y) > 2) { fail(`desktop ${label}: the menu moved from ${s0.x},${s0.y} to ${s.x},${s.y} after "5 ${dir} snaps for ${who}" (press ${presses})`); bad = true; }
      if (s.title !== s0.title) { fail(`desktop ${label}: the menu changed from "${s0.title}" to "${s.title}" after "5 ${dir} snaps for ${who}"`); bad = true; }
      if (s.rows.join("|") !== s0.rows.join("|")) { fail(`desktop ${label}: the rows reordered after "5 ${dir} snaps for ${who}": ${s0.rows.join(", ")} -> ${s.rows.join(", ")}`); bad = true; }
      if (!s.inField) { fail(`desktop ${label}: the menu ran off the field after "5 ${dir} snaps for ${who}"`); bad = true; }
    }
    if (!bad) console.log(`  ✓ desktop ${label}: ${presses} presses, the menu stayed at ${s0.x},${s0.y} as "${s0.title}"`);
    await page.keyboard.press("Escape"); await page.waitForTimeout(400);
    // reset the snaps the presses set, so the next spot starts from the staff's split
    await page.reload(); await page.waitForTimeout(1500); await clickT("CONTINUE", 2500); for (const t of ["Skip", "Got it", "Later"]) await clickT(t, 300);
    await clickT("Team", 600); await page.locator('button:text-is("Depth Chart")').first().dispatchEvent("click"); await page.waitForTimeout(1200);
  }
  if (errors.length) fail(`desktop: page error: ${errors[0]}`);
  await page.close();
}

// ---- phone: the spot sheet's snap rows
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errors = []; page.on("pageerror", (e) => errors.push(e.message)); page.on("dialog", (d) => d.accept());
  await newFranchise(page, true);
  await page.locator("button:visible", { hasText: /^\s*Roster\s*$/ }).first().dispatchEvent("click"); await page.waitForTimeout(1000);
  const rows = () => page.evaluate(() => ({ rows: [...document.querySelectorAll('button[aria-label^="5 more snaps for "]')].map((b) => b.getAttribute("aria-label").replace("5 more snaps for ", "")), wide: document.scrollingElement.scrollWidth > innerWidth + 1 }));
  for (const [side, title] of [["Offense", "SLOT:"], ["Offense", "RB:"], ["Defense", "LE:"]]) {
    await page.locator("button:visible", { hasText: new RegExp(`^\\s*${side}\\s*$`) }).first().dispatchEvent("click").catch(() => {}); await page.waitForTimeout(600);
    const spot = page.locator(`button[title^="${title}"]`);
    if (!(await spot.count())) { fail(`phone: no ${title} spot on the ${side} field`); continue; }
    await spot.first().click(); await page.waitForTimeout(800);
    const r0 = await rows();
    if (!r0.rows.length) { fail(`phone ${title}: the snap rows didn't show`); continue; }
    let presses = 0, bad = false;
    for (const who of r0.rows) for (const dir of ["more", "fewer"]) for (let i = 0; i < PRESSES && !bad; i++) {
      const b = page.locator(`button[aria-label="5 ${dir} snaps for ${who}"]`);
      if (!(await b.count()) || (await b.first().isDisabled())) continue;
      await b.first().click(); await page.waitForTimeout(120); presses++;
      const r = await rows();
      const same = r.rows.filter((x) => r0.rows.includes(x)).join("|") === r0.rows.filter((x) => r.rows.includes(x)).join("|");
      if (!same) { fail(`phone ${title}: the rows reordered after "5 ${dir} snaps for ${who}": ${r0.rows.join(", ")} -> ${r.rows.join(", ")}`); bad = true; }
      if (r.wide) { fail(`phone ${title}: the page scrolls sideways after "5 ${dir} snaps for ${who}"`); bad = true; }
    }
    if (!bad) console.log(`  ✓ phone ${title}: ${presses} presses, rows held their order`);
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    for (const t of ["Close", "Done"]) { const b = page.locator('button[aria-label="Close"]:visible'); if (await b.count()) await b.first().dispatchEvent("click").catch(() => {}); await page.waitForTimeout(300); }
  }
  if (errors.length) fail(`phone: page error: ${errors[0]}`);
  await page.close();
}

await browser.close();
await new Promise((r) => server.httpServer.close(r));
if (problems.length) { console.log(`UI STABILITY FAILED (${problems.length})`); process.exit(1); }
console.log("UI STABILITY PASSED");
