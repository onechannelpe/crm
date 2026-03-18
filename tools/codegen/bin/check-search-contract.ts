import {
  checkSearchContract,
  parseCanonicalContract,
  parseSourceContract,
  parseSourceManifest,
  parseSourceMapping,
  type LoadedSource,
} from "../src/search-contract/index.ts";
import { parseProjectionSpec } from "../src/search-projection/index.ts";
import { loadJson } from "../src/shared.ts";

const MANIFEST_PATH = "crates/pipeline/data/mappings/source-manifest.json";
const CANONICAL_PATH = "contracts/pipeline/canonical-contract.json";
const SOURCE_PATH = "contracts/pipeline/source-contract.json";
const PROJECTION_PATH = "contracts/engine/search-projection.json";

const [manifestRaw, canonicalRaw, sourceRaw, projectionRaw] = await Promise.all(
  [
    loadJson(MANIFEST_PATH),
    loadJson(CANONICAL_PATH),
    loadJson(SOURCE_PATH),
    loadJson(PROJECTION_PATH),
  ],
);

const manifest = parseSourceManifest(manifestRaw);
const canonical = parseCanonicalContract(canonicalRaw);
const source = parseSourceContract(sourceRaw);
const projection = parseProjectionSpec(projectionRaw);

const enabledSources = manifest.sources.filter((s) => s.enabled);

const loaded: LoadedSource[] = await Promise.all(
  enabledSources.map(async (entry) => ({
    entry,
    mapping: parseSourceMapping(await loadJson(entry.mapping_path)),
  })),
);

const result = checkSearchContract(canonical, source, projection, loaded);

if (!result.ok) {
  console.error(result.errors.join("\n"));
  process.exit(1);
}

console.log(result.summary);
