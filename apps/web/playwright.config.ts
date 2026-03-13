import { defineConfig, devices } from "@playwright/test";

const AUTH_TEST_PORT = 4174;
const includeWebkit = process.env.CI === "true";

const projects = [
  {
    name: "chromium",
    use: {
      ...devices["Desktop Chrome"],
    },
  },
  {
    name: "firefox",
    use: {
      ...devices["Desktop Firefox"],
    },
  },
  {
    name: "mobile-chromium",
    use: {
      ...devices["Pixel 5"],
    },
  },
];

if (includeWebkit) {
  projects.push({
    name: "webkit",
    use: {
      ...devices["Desktop Safari"],
    },
  });
}

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: `http://127.0.0.1:${AUTH_TEST_PORT}`,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `bun run test:prepare && bun run test:server -- --host 127.0.0.1 --port ${AUTH_TEST_PORT}`,
    url: `http://127.0.0.1:${AUTH_TEST_PORT}/login`,
    cwd: ".",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects,
});
