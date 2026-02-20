import path from "node:path";

import codspeedPlugin from "@codspeed/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [codspeedPlugin()],
  test: {
    reporters: process.env.GITHUB_ACTIONS
      ? ["dot", "github-actions"]
      : ["default"],
    projects: [
      {
        test: {
          name: "default",
          globalSetup: ["./tests/setup/global-setup.ts"],
          include: ["tests/**/*.test.ts"],
          exclude: ["tests/**/*.perf.test.ts"],
          environment: "node",
          fileParallelism: true,
          alias: {
            "~": path.resolve(__dirname, "./src"),
          },
        },
      },
      {
        test: {
          name: "perf",
          globalSetup: ["./tests/setup/global-setup.ts"],
          include: ["tests/**/*.perf.test.ts"],
          environment: "node",
          fileParallelism: false,
          alias: {
            "~": path.resolve(__dirname, "./src"),
          },
        },
      },
    ],
    benchmark: {
      include: ["tests/**/*.bench.ts"],
    },
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
    },
  },
});
