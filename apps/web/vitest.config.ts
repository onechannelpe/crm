import path from "node:path";

import codspeedPlugin from "@codspeed/vitest-plugin";
import { defineConfig } from "vitest/config";

const alias = {
  "~": path.resolve(__dirname, "./src"),
  "@tests": path.resolve(__dirname, "./tests"),
};

function databaseProject(namespace: string) {
  return {
    globalSetup: ["./tests/setup/global-setup.ts"],
    environment: "node" as const,
    fileParallelism: true,
    env: {
      TEST_DB_NAMESPACE: namespace,
    },
  };
}

export default defineConfig({
  plugins: [codspeedPlugin()],
  test: {
    reporters: process.env.GITHUB_ACTIONS
      ? ["dot", "github-actions"]
      : ["github-actions"],
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          environment: "node",
          fileParallelism: true,
        },
      },
      {
        extends: true,
        test: {
          name: "contract",
          ...databaseProject("contract"),
          include: ["tests/contract/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          ...databaseProject("integration"),
          include: ["tests/integration/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "journey",
          ...databaseProject("journey"),
          include: ["tests/journey/**/*.test.ts"],
          fileParallelism: false,
        },
      },
    ],
  },
  resolve: { alias },
});
