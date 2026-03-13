import { readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appDir = dirname(scriptDir);
const bunCacheDir = join(appDir, "..", "..", "node_modules", ".bun");
const outputDir = join(appDir, ".output", "ops");

async function resolveEsbuildModuleUrl() {
  const entries = await readdir(bunCacheDir, { withFileTypes: true });
  const candidates = entries
    .filter(
      (entry) => entry.isDirectory() && entry.name.startsWith("esbuild@"),
    )
    .map((entry) =>
      join(bunCacheDir, entry.name, "node_modules", "esbuild", "lib", "main.js"),
    )
    .filter((path) => existsSync(path))
    .sort()
    .reverse();

  const esbuildPath = candidates[0];
  if (!esbuildPath) {
    throw new Error("Could not resolve esbuild from Bun cache");
  }

  return pathToFileURL(esbuildPath).href;
}

const { build } = await import(await resolveEsbuildModuleUrl());

await rm(outputDir, { recursive: true, force: true });

await build({
  absWorkingDir: appDir,
  bundle: true,
  define: {
    "import.meta.env": "process.env",
  },
  entryPoints: [
    "src/lib/db/migrate-cli.ts",
    "src/lib/db/seed.ts",
    "src/workers/maintenance-runner.ts",
  ],
  external: [
    "@libsql/client",
    "@libsql/core",
    "@libsql/hrana-client",
    "@libsql/isomorphic-ws",
    "@libsql/linux-x64-gnu",
    "@node-rs/argon2",
    "@node-rs/argon2-linux-x64-gnu",
    "@node-rs/argon2-linux-x64-musl",
  ],
  format: "esm",
  outdir: outputDir,
  outExtension: { ".js": ".mjs" },
  platform: "node",
  sourcemap: true,
  target: "node20",
  tsconfig: join(appDir, "tsconfig.json"),
});
