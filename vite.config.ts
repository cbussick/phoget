import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  // node_modules may be shared through a symlink with other projects.
  // Keep optimizer output local; dev tests override this with a temporary cache.
  cacheDir: process.env.GATHER_VITE_CACHE_DIR ?? ".cache/vite",
  plugins: [react()],
  server: { proxy: { "/api": "http://127.0.0.1:3001" } },
  build: {
    outDir: "dist/client",
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: "react", test: /node_modules\/(react|react-dom|scheduler)\// },
            { name: "validation", test: /node_modules\/zod\// },
          ],
        },
      },
    },
  },
});
