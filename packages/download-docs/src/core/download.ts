import { existsSync } from "node:fs";
import type { Result } from "../utils/result.ts";
import { Ok, Err } from "../utils/result.ts";
import { ensureCleanDirectory, copyDirectory } from "./file-system.ts";

const TEMP_DIR = ".temp-docs-clone";

export async function downloadDocs(
  repoUrl: string,
  paths: string[],
  destination: string
): Promise<Result<void, string>> {
  ensureCleanDirectory(TEMP_DIR);

  const cloneResult = await cloneWithSparseCheckout(repoUrl, paths);
  if (!cloneResult.ok) {
    return cloneResult;
  }

  if (!existsSync(destination)) {
    return Err(`Source path not found after clone: ${destination}`);
  }

  copyDirectory(`${TEMP_DIR}/${paths[0]}`, destination);
  ensureCleanDirectory(TEMP_DIR);

  return Ok(undefined);
}

async function cloneWithSparseCheckout(
  repoUrl: string,
  paths: string[]
): Promise<Result<void, string>> {
  const initResult = Bun.spawnSync(["git", "init"], { cwd: TEMP_DIR, stdio: ["ignore", "pipe", "pipe"] });
  if (initResult.exitCode !== 0) {
    return Err(`Git init failed: ${initResult.stderr.toString()}`);
  }

  const configResult = Bun.spawnSync(
    ["git", "config", "core.sparseCheckout", "true"],
    { cwd: TEMP_DIR, stdio: ["ignore", "pipe", "pipe"] }
  );
  if (configResult.exitCode !== 0) {
    return Err(`Git config failed: ${configResult.stderr.toString()}`);
  }

  const sparseFile = `${TEMP_DIR}/.git/info/sparse-checkout`;
  await Bun.write(sparseFile, paths.join("\n"));

  const remoteResult = Bun.spawnSync(
    ["git", "remote", "add", "origin", repoUrl],
    { cwd: TEMP_DIR, stdio: ["ignore", "pipe", "pipe"] }
  );
  if (remoteResult.exitCode !== 0) {
    return Err(`Git remote add failed: ${remoteResult.stderr.toString()}`);
  }

  const pullResult = Bun.spawnSync(
    ["git", "pull", "origin", "main", "--depth=1"],
    { cwd: TEMP_DIR, stdio: ["ignore", "pipe", "pipe"] }
  );
  if (pullResult.exitCode !== 0) {
    return Err(`Git pull failed: ${pullResult.stderr.toString()}`);
  }

  return Ok(undefined);
}
