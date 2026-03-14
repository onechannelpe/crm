import { defineConfig } from "@playwright/test";

import { prepareBrowserTestEnv } from "./tests/browser/config/test-env";
import {
  buildPlaywrightProjects,
  buildPlaywrightWebServers,
} from "./tests/browser/config/topology";

prepareBrowserTestEnv();

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  use: {
    trace: "retain-on-failure",
  },
  webServer: buildPlaywrightWebServers(),
  projects: buildPlaywrightProjects(),
});
