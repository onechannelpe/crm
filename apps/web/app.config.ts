import { defineConfig } from "@solidjs/start/config";

export default defineConfig({
  middleware: "./src/middleware.ts",
  server: {
    esbuild: {
      options: {
        target: "es2022",
      },
    },
  },
});
