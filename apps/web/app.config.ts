import { defineConfig } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  middleware: "./src/middleware.ts",
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      holdUntilCrawlEnd: false,
    },
    server: {
      watch: {
        ignored: ["**/*.log"],
      },
      warmup: {
        clientFiles: [
          "./src/app.tsx",
          "./src/app.css",
          "./src/routes/(auth)/login.tsx",
          "./src/components/ui/button.tsx",
          "./src/components/ui/input.tsx",
          "./src/components/ui/card.tsx",
          "./src/lib/errors.ts",
          "./src/lib/utils.ts",
        ],
        ssrFiles: [
          "./src/lib/auth/cookies.ts",
          "./src/lib/auth/session-manager.ts",
          "./src/lib/auth/tokens.ts",
          "./src/server/shared/context.ts",
        ],
      },
    },
  },
});
