import { randomUUID } from "node:crypto";
import { existsSync, rmSync, writeFileSync } from "node:fs";

import type { Result } from "../utils/result.ts";
import { Ok, Err } from "../utils/result.ts";
import { ensureCleanDirectory, copyDirectory } from "./file-system.ts";
import type { SourceConfig } from "./types.ts";

const TEMP_DIR_PREFIX = ".temp-fetch-refs";

export function fetchSource(config: SourceConfig): Result<void, string> {
  const tempDir = `${TEMP_DIR_PREFIX}-${randomUUID()}`;
  ensureCleanDirectory(tempDir);

  const repoPaths = config.mounts.map((m) => m.repoPath);
  const branch = config.branch ?? "main";

  const checkoutResult = sparseCheckout(
    config.repo,
    branch,
    repoPaths,
    tempDir,
  );

  if (!checkoutResult.ok) {
    rmSync(tempDir, { recursive: true, force: true });
    return checkoutResult;
  }

  try {
    for (const mount of config.mounts) {
      const sourcePath = `${tempDir}/${mount.repoPath}`;
      if (!existsSync(sourcePath)) {
        return Err(
          `Path '${mount.repoPath}' not found in repo after sparse checkout`,
        );
      }
      ensureCleanDirectory(mount.localPath);
      copyDirectory(sourcePath, mount.localPath);
    }
    return Ok(undefined);
  } catch (err) {
    return Err(
      `Copy failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function sparseCheckout(
  repoUrl: string,
  branch: string,
  paths: string[],
  tempDir: string,
): Result<void, string> {
  const run = (args: string[], label: string): Result<void, string> => {
    const result = Bun.spawnSync(args, {
      cwd: tempDir,
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (result.exitCode !== 0) {
      return Err(`Git ${label} failed: ${result.stderr.toString().trim()}`);
    }
    return Ok(undefined);
  };

  const initResult = run(["git", "init"], "init");
  if (!initResult.ok) return initResult;

  const configResult = run(
    ["git", "config", "core.sparseCheckout", "true"],
    "config sparse-checkout",
  );
  if (!configResult.ok) return configResult;

  const remoteResult = run(
    ["git", "remote", "add", "origin", repoUrl],
    "add remote",
  );
  if (!remoteResult.ok) return remoteResult;

  writeFileSync(`${tempDir}/.git/info/sparse-checkout`, paths.join("\n"));

  const pullResult = run(
    ["git", "pull", "origin", branch, "--depth=1"],
    "pull",
  );
  if (!pullResult.ok) return pullResult;

  return Ok(undefined);
}
