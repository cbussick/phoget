import { randomUUID } from "node:crypto";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
const randomBuildId = randomUUID();

export default defineConfig({
  // node_modules may be shared through a symlink with other projects.
  // Keep optimizer output local; dev tests override this with a temporary cache.
  cacheDir: process.env.PHOGET_VITE_CACHE_DIR ?? ".cache/vite",
  plugins: [
    react(),
    {
      name: "phoget-build-id",
      transformIndexHtml: () => [
        {
          tag: "meta",
          attrs: { name: "phoget-build-id", content: randomBuildId },
          injectTo: "head",
        },
      ],
    },
  ],
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
