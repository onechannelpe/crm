import { defineConfig } from "@solidjs/start/config";
import { visualizer } from "rollup-plugin-visualizer";
import { type PluginOption } from "vite";

export default defineConfig({
  middleware: "./src/middleware.ts",
  server: {
    esbuild: {
      options: {
        target: "es2022",
      },
    },
  },
  vite: {
    plugins: [visualizer() as PluginOption],
  },
});
