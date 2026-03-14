import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";

const ENV_PATH = resolve(process.cwd(), "../../.env.test");
const TEST_DB_DIR = resolve(process.cwd(), ".playwright-db");

export function prepareBrowserTestEnv(): void {
  loadEnvFile(ENV_PATH);
  mkdirSync(TEST_DB_DIR, { recursive: true });
}

export function getBrowserTestDbDir(): string {
  return TEST_DB_DIR;
}
