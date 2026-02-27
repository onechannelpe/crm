import {
  getSourceConfig,
  getAllSourceConfigs,
  getSourceNames,
} from "./config/index.ts";
import { fetchSource } from "./core/fetch.ts";
import { buildCompactIndex } from "./core/index-builder.ts";
import { injectIndex } from "./core/agents-injector.ts";
import type { SourceConfig } from "./core/types.ts";
import { ensureRefsGitignored } from "./utils/gitignore.ts";
import { isErr } from "./utils/result.ts";
import { getWorkspaceRoot } from "./utils/workspace.ts";

async function main(): Promise<void> {
  process.chdir(getWorkspaceRoot());

  const args = process.argv.slice(2);
  const sources = args.length === 0 ? getAllSourceConfigs() : parseSources(args[0]);

  if (sources.length === 0) {
    console.error("No valid sources specified");
    console.error(`Available sources: ${getSourceNames().join(", ")}`);
    process.exit(1);
  }

  await ensureRefsGitignored();

  for (const config of sources) {
    // oxlint-disable-next-line no-await-in-loop -- sequential for deterministic logs
    await processSource(config);
  }
}

function parseSources(arg: string): SourceConfig[] {
  if (arg === "--all") return getAllSourceConfigs();

  const names = arg.split(",").map((n) => n.trim().toLowerCase());
  const configs: SourceConfig[] = [];

  for (const name of names) {
    const config = getSourceConfig(name);
    if (!config) {
      console.warn(`Warning: unknown source '${name}', skipping`);
      continue;
    }
    configs.push(config);
  }

  return configs;
}

async function processSource(config: SourceConfig): Promise<void> {
  console.log(`\n  Fetching ${config.name}...`);
  console.log(`  Repo: ${config.repo}`);
  config.mounts.forEach((m) =>
    console.log(`    ${m.repoPath} → ${m.localPath}`),
  );

  const fetchResult = await fetchSource(config);
  if (isErr(fetchResult)) {
    console.error(`  Fetch failed: ${fetchResult.error}`);
    process.exit(1);
  }

  if (config.index) {
    const { markerStart, markerEnd, filter } = config.index;
    const firstMount = config.mounts[0];

    console.log(`  Building index from ${firstMount.localPath}...`);
    const indexContent = await buildCompactIndex(
      firstMount.localPath,
      config.name,
      filter,
    );

    console.log(`  Injecting index into AGENTS.md...`);
    const injectResult = await injectIndex(markerStart, markerEnd, indexContent);
    if (isErr(injectResult)) {
      console.error(`  Injection failed: ${injectResult.error}`);
      process.exit(1);
    }
  }

  console.log(`  ${config.name} updated`);
}

main().catch((error: unknown) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
