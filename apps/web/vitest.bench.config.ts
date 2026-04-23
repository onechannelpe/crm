import path from "node:path";

import codspeedPlugin from "@codspeed/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [codspeedPlugin()],
  test: {
    globalSetup: ["./tests/setup/global-setup.ts"],
    benchmark: {
      include: ["tests/**/*.bench.ts"],
    },
    runner: "./tests/bench/runner.ts",
    environment: "node",
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
      bun: path.resolve(__dirname, "./tests/mocks/bun.ts"),
    },
  },
});
