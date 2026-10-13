import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readdirSync, statSync, writeFileSync } from "fs";
import { join, relative } from "path";

// Offline play: after a build, list every file the game needs (code, data, logos, icons) in
// offline.json. The service worker saves them all on the first visit, so the game runs with no
// connection afterwards. The big matchup portraits are saved as they're seen instead.
function offlineList() {
  let outDir;
  return {
    name: "offline-list",
    apply: "build",
    configResolved(c) { outDir = c.build.outDir; },
    closeBundle() {
      const root = join(process.cwd(), outDir);
      const skip = /^(matchup-portraits|sprites|rosters)\//;
      const files = [];
      const walk = (dir) => { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) walk(p); else files.push(relative(root, p).split("\\").join("/")); } };
      walk(root);
      const list = files.filter((f) => !skip.test(f) && f !== "offline.json" && f !== "sw.js" && f !== "404.html" && !f.endsWith(".map")).sort();
      const version = String(list.filter((f) => f.startsWith("assets/")).join("|").split("").reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7));
      writeFileSync(join(root, "offline.json"), JSON.stringify({ version, files: list }));
    },
  };
}

export default defineConfig({
  plugins: [react(), offlineList()],
  base: process.env.VITE_APP_BASE_PATH || "/gridiron-gm/",
  build: {
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
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
