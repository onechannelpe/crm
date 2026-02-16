import { getFrameworkConfig, getAllFrameworkConfigs, getFrameworkNames } from "./config/index.ts";
import { downloadDocs } from "./core/download.ts";
import { buildCompactIndex } from "./core/index-builder.ts";
import { injectDocsIndex } from "./core/agents-injector.ts";
import { ensureDocsGitignored } from "./utils/gitignore.ts";
import { getWorkspaceRoot } from "./utils/workspace.ts";
import { isErr } from "./utils/result.ts";
import type { FrameworkConfig } from "./core/types.ts";

async function main(): Promise<void> {
  process.chdir(getWorkspaceRoot());
  
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: bun run docs:download <framework> | --all | <framework1,framework2,...>");
    console.error(`Available frameworks: ${getFrameworkNames().join(", ")}`);
    process.exit(1);
  }

  const frameworks = parseFrameworks(args[0]);
  if (frameworks.length === 0) {
    console.error("No valid frameworks specified");
    process.exit(1);
  }

  await ensureDocsGitignored();

  for (const config of frameworks) {
    await processFramework(config);
  }
}

function parseFrameworks(arg: string): FrameworkConfig[] {
  if (arg === "--all") {
    return getAllFrameworkConfigs();
  }

  const names = arg.split(",").map((n) => n.trim().toLowerCase());
  const configs: FrameworkConfig[] = [];

  for (const name of names) {
    const config = getFrameworkConfig(name);
    if (!config) {
      console.warn(`Warning: Unknown framework '${name}', skipping`);
      continue;
    }
    configs.push(config);
  }

  return configs;
}

async function processFramework(config: FrameworkConfig): Promise<void> {
  console.log(`\n  Processing ${config.name}...`);

  console.log(`  Downloading from ${config.gitRepo}...`);
  const downloadResult = await downloadDocs(config.gitRepo, config.gitPaths, config.docsRoot);

  if (isErr(downloadResult)) {
    console.error(`  Download failed: ${downloadResult.error}`);
    process.exit(1);
  }

  console.log(`  Building documentation index...`);
  const indexContent = await buildCompactIndex(
    config.docsRoot,
    config.name,
    config.transform
  );

  console.log(`  Injecting into AGENTS.md...`);
  const injectResult = await injectDocsIndex(
    config.markerStart,
    config.markerEnd,
    indexContent
  );

  if (isErr(injectResult)) {
    console.error(`  Injection failed: ${injectResult.error}`);
    process.exit(1);
  }

  console.log(`  ${config.name} documentation updated successfully`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
