import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "@playwright/test";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const extensionOutputPath = path.resolve(
  currentDirectory,
  ".output/chrome-mv3",
);

export default defineConfig({
  testDir: "./tests/integration",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  use: {
    trace: "retain-on-failure",
  },
  metadata: {
    extensionOutputPath,
  },
});
