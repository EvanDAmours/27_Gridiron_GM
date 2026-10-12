import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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
