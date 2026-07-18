import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

// Runs once before any worker. Provisioning imports application code that needs
// Bun builtins, so it runs as an explicit `bun` child regardless of the runtime
// Playwright chose for the runner. Everything it produces reaches the workers
// through .e2e-manifest.json, never through a shared import.
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
