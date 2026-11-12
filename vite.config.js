import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { join, relative } from "path";

// Offline play: after a build, list every file the game needs (code, data, logos, icons) in
// offline.json. The service worker saves them all on the first visit, so the game runs with no
// connection afterwards. The player art (renders and field sprites) is saved as it's seen instead.
function offlineList() {
  let outDir;
  return {
    name: "offline-list",
    apply: "build",
    configResolved(c) { outDir = c.build.outDir; },
    closeBundle() {
      const root = join(process.cwd(), outDir);
      const skip = /^(players|sprites|rosters)\//;
      const files = [];
      const walk = (dir) => { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) walk(p); else files.push(relative(root, p).split("\\").join("/")); } };
      walk(root);
      const list = files.filter((f) => !skip.test(f) && f !== "offline.json" && f !== "sw.js" && f !== "404.html" && !f.endsWith(".map")).sort();
      const version = String(list.filter((f) => f.startsWith("assets/")).join("|").split("").reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7));
      // the player art isn't saved up front (about 60 MB); the Offline Play panel can fetch it all on request
      const art = files.filter((f) => /^(players|sprites)\//.test(f) && f.endsWith(".webp")).sort();
      list.push("players/manifest.json");
      writeFileSync(join(root, "offline.json"), JSON.stringify({ version, files: list, art }));
    },
  };
}

// the game's version (package.json) and the day it was built, for the title page: you can tell at a
// glance whether you're on the latest update
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
const built = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" });

export default defineConfig({
  plugins: [react(), offlineList()],
  define: { "import.meta.env.VITE_APP_VERSION": JSON.stringify(pkg.version.replace(/\.0$/, "")), "import.meta.env.VITE_APP_BUILT": JSON.stringify(built) },
  base: process.env.VITE_APP_BASE_PATH || "/gridiron-gm/",
  build: {
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      // the GM game, and the arcade prototype on its own page (/arcade.html)
      input: { main: "index.html", arcade: "arcade.html" },
      output: {
        // The roster/schedule/draft data rarely changes, so it gets its own long-cached file;
        // React too. Screens you don't need on first load are split off with React.lazy.
        manualChunks(id) {
          if (id.includes('node_modules/react')) return 'vendor';
          if (id.includes('/src/data/')) return 'data';
        },
      },
    },
  },
});
