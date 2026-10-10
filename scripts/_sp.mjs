import { preview } from "vite";
import { chromium } from "playwright-core";
const server = await preview({ preview: { port: 4223 }, logLevel: "silent" });
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
for (const [n, vp, q] of [["desk", { width: 1400, height: 860 }, ""], ["mob", { width: 390, height: 844 }, "?mobile"]]) {
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 2 });
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => { localStorage.setItem("gm_intro_shown", "1"); sessionStorage.setItem("gm_preview", "1"); });
  await page.goto(server.resolvedUrls.local[0] + q); await page.waitForTimeout(2500);
  await page.screenshot({ path: "/tmp/claude-0/-home-user-27-Gridiron-GM/65e241ff-18a5-599d-9c1d-13a9b4138d93/scratchpad/splash-" + n + ".png" });
  await page.waitForTimeout(2200); await page.screenshot({ path: "/tmp/claude-0/-home-user-27-Gridiron-GM/65e241ff-18a5-599d-9c1d-13a9b4138d93/scratchpad/splash-" + n + "2.png", clip: n === "desk" ? { x: 1240, y: 0, width: 160, height: 260 } : { x: 300, y: 0, width: 90, height: 130 } });
  console.log(n, errors); await page.close();
}
await browser.close(); await server.httpServer.close();
