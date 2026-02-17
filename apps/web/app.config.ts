import { defineConfig } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";

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
    plugins: [tailwindcss()],
  },
});
