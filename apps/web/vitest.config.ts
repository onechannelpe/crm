import path from "node:path";

import codspeedPlugin from "@codspeed/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [codspeedPlugin()],
  test: {
    reporters: process.env.GITHUB_ACTIONS ? ["dot", "github-actions"] : ["dot"],
    projects: [
      {
        test: {
          name: "default",
          globalSetup: ["./tests/setup/global-setup.ts"],
          include: ["tests/**/*.test.ts"],
          environment: "node",
          env: {
            WEB_DB_URL: `file:${path.resolve(
              __dirname,
              ".vitest-db/__global-test-runtime.db",
            )}`,
          },
          fileParallelism: true,
          alias: {
            "~": path.resolve(__dirname, "./src"),
          },
        },
      },
    ],
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
    },
  },
});
