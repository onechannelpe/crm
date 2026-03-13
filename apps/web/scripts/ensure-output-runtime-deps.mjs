import { existsSync, lstatSync } from "node:fs";
import { mkdir, readdir, symlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appDir = dirname(scriptDir);
const outputNodeModulesDir = join(appDir, ".output", "server", "node_modules");
const bunCacheNodeModulesDir = join(
  appDir,
  "..",
  "..",
  "node_modules",
  ".bun",
  "node_modules",
);

async function ensureSymlink(sourcePath, targetPath) {
  if (existsSync(targetPath) || !existsSync(sourcePath)) return;

  await mkdir(dirname(targetPath), { recursive: true });
  const type = lstatSync(sourcePath).isDirectory() ? "dir" : "file";
  try {
    await symlink(sourcePath, targetPath, type);
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !("code" in error) ||
      error.code !== "EEXIST"
    ) {
      throw error;
    }
  }
}

async function ensureFile(filePath, contents) {
  if (existsSync(filePath)) return;

  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, contents);
}

async function linkUnscopedPackages() {
  const entries = await readdir(bunCacheNodeModulesDir, {
    withFileTypes: true,
  });
  for (const entry of entries) {
    if (
      (!entry.isDirectory() && !entry.isSymbolicLink()) ||
      entry.name.startsWith("@")
    ) {
      continue;
    }

    await ensureSymlink(
      join(bunCacheNodeModulesDir, entry.name),
      join(outputNodeModulesDir, entry.name),
    );
  }
}

async function linkScopedPackages() {
  const scopeEntries = await readdir(bunCacheNodeModulesDir, {
    withFileTypes: true,
  });

  for (const scopeEntry of scopeEntries) {
    if (
      (!scopeEntry.isDirectory() && !scopeEntry.isSymbolicLink()) ||
      !scopeEntry.name.startsWith("@")
    ) {
      continue;
    }

    const scopeDir = join(bunCacheNodeModulesDir, scopeEntry.name);
    const packageEntries = await readdir(scopeDir, { withFileTypes: true });

    for (const packageEntry of packageEntries) {
      if (!packageEntry.isDirectory() && !packageEntry.isSymbolicLink()) {
        continue;
      }

      await ensureSymlink(
        join(scopeDir, packageEntry.name),
        join(outputNodeModulesDir, scopeEntry.name, packageEntry.name),
      );
    }
  }
}

if (existsSync(bunCacheNodeModulesDir)) {
  await linkUnscopedPackages();
  await linkScopedPackages();
}

await ensureFile(
  join(outputNodeModulesDir, "solid-refresh", "dist", "solid-refresh.mjs"),
  "export default {};\n",
);
