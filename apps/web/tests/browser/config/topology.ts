import { devices } from "@playwright/test";

import { resolveBrowserDbPathForProject } from "../../support/db/browser-runtime";

export interface BrowserProjectDefinition {
  name: string;
  port: number;
  deviceName: keyof typeof devices;
}

export function getBrowserProjectDefinitions(): BrowserProjectDefinition[] {
  const projects: BrowserProjectDefinition[] = [
    { name: "chromium", port: 4174, deviceName: "Desktop Chrome" },
    { name: "firefox", port: 4175, deviceName: "Desktop Firefox" },
    { name: "mobile-chromium", port: 4176, deviceName: "Pixel 5" },
  ];

  if (process.env.CI === "true") {
    projects.push({
      name: "webkit",
      port: 4177,
      deviceName: "Desktop Safari",
    });
  }

  return projects;
}

export function buildPlaywrightProjects() {
  return getBrowserProjectDefinitions().map((project) => ({
    name: project.name,
    workers: 1,
    use: {
      ...devices[project.deviceName],
      baseURL: `http://127.0.0.1:${project.port}`,
    },
  }));
}

export function buildPlaywrightWebServers() {
  return getBrowserProjectDefinitions().map((project) => ({
    name: project.name,
    command: `bun run test:prepare && bun run test:server -- --host 127.0.0.1 --port ${project.port}`,
    url: `http://127.0.0.1:${project.port}/login`,
    cwd: ".",
    env: {
      ...process.env,
      WEB_DB_PATH: resolveBrowserDbPathForProject(project.name),
    },
    reuseExistingServer: false,
    timeout: 120_000,
  }));
}
