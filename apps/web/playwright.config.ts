import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";

import { defineConfig, devices } from "@playwright/test";

import { resolveBrowserDbPathForProject } from "./tests/support/db/browser-runtime";

const includeWebkit = process.env.CI === "true";
loadEnvFile(resolve(process.cwd(), "../../.env.test"));

const TEST_DB_DIR = resolve(process.cwd(), ".playwright-db");
mkdirSync(TEST_DB_DIR, { recursive: true });

interface BrowserProjectDefinition {
  name: string;
  port: number;
  deviceName: keyof typeof devices;
}

function buildProjectConfig(
  name: string,
  port: number,
  deviceName: keyof typeof devices,
) {
  return {
    name,
    use: {
      ...devices[deviceName],
      baseURL: `http://127.0.0.1:${port}`,
    },
  };
}

const projectDefinitions: BrowserProjectDefinition[] = [
  { name: "chromium", port: 4174, deviceName: "Desktop Chrome" },
  { name: "firefox", port: 4175, deviceName: "Desktop Firefox" },
  { name: "mobile-chromium", port: 4176, deviceName: "Pixel 5" },
];

if (includeWebkit) {
  projectDefinitions.push({
    name: "webkit",
    port: 4177,
    deviceName: "Desktop Safari",
  });
}

function buildWebServer(name: string, port: number, browserDbPath: string) {
  return {
    name,
    command: `bun run test:prepare && bun run test:server -- --host 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}/login`,
    cwd: ".",
    env: {
      ...process.env,
      WEB_DB_PATH: browserDbPath,
    },
    reuseExistingServer: false,
    timeout: 120_000,
  };
}

const projects = projectDefinitions.map((project) =>
  buildProjectConfig(project.name, project.port, project.deviceName),
);

const webServers = projectDefinitions.map((project) =>
  buildWebServer(
    project.name,
    project.port,
    resolveBrowserDbPathForProject(project.name),
  ),
);

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: 1,
  use: {
    trace: "retain-on-failure",
  },
  webServer: webServers,
  projects,
});
