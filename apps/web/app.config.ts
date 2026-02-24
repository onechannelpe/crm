import { solidStart } from "@solidjs/start/config";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    solidStart({
      middleware: "./src/middleware.ts",
    }),
    visualizer(),
  ],
  esbuild: {
    target: "es2022",
  },
});
