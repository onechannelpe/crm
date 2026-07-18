import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

// Runs once before any worker. Provisioning builds the app and migrates + seeds
// the template database: heavy, one-time work kept in its own `bun` child so the
// long-lived Playwright runner never loads the app's module graph or its
// import-time side effects. Everything it produces reaches the workers through
// .e2e-manifest.json, the only channel Playwright gives from global setup to
// worker processes.
export default function globalSetup(): void {
  const result = spawnSync(
    "bun",
    ["run", resolve(process.cwd(), "tools/e2e/prepare.ts")],
    { cwd: process.cwd(), stdio: "inherit", env: process.env },
  );
  if (result.status !== 0) {
    throw new Error(`e2e provisioning failed (exit ${result.status})`);
  }
}
