import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

// Run provisioning in a separate process to avoid loading the app into the
// Playwright process.
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
