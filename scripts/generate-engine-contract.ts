type Spec = {
  version: string;
  endpoints: { search: string; health: string };
};

const SPEC_PATH = "contracts/engine-api.json";
const RUST_OUT = "apps/engine/src/api/contract.rs";
const TS_OUT = "apps/web/src/server/shared/engine/contract.ts";

async function loadSpec(): Promise<Spec> {
  const raw = await Bun.file(SPEC_PATH).text();
  const spec = JSON.parse(raw) as Spec;
  if (!/^v\d+$/.test(spec.version)) throw new Error("invalid api version");
  for (const v of Object.values(spec.endpoints)) {
    if (!v.startsWith("/")) throw new Error("endpoint must start with /");
  }
  return spec;
}

function rust(spec: Spec): string {
  return [
    "// GENERATED FILE. DO NOT EDIT.",
    `pub const API_VERSION: &str = \"${spec.version}\";`,
    `pub const API_PREFIX: &str = \"/${spec.version}\";`,
    `pub const SEARCH_ENDPOINT: &str = \"${spec.endpoints.search}\";`,
    `pub const HEALTH_ENDPOINT: &str = \"${spec.endpoints.health}\";`,
    "",
  ].join("\n");
}

function ts(spec: Spec): string {
  return [
    "// GENERATED FILE. DO NOT EDIT.",
    `export const ENGINE_API_VERSION = \"${spec.version}\";`,
    "export const ENGINE_API_PREFIX = `/${ENGINE_API_VERSION}`;",
    "export const ENGINE_ENDPOINTS = {",
    `  search: \"${spec.endpoints.search}\",`,
    `  health: \"${spec.endpoints.health}\",`,
    "} as const;",
    "export function engineApiPath(endpoint: (typeof ENGINE_ENDPOINTS)[keyof typeof ENGINE_ENDPOINTS]): string {",
    "  return `${ENGINE_API_PREFIX}${endpoint}`;",
    "}",
    "",
  ].join("\n");
}

async function writeOrCheck(
  path: string,
  content: string,
  check: boolean,
): Promise<void> {
  if (check) {
    let existing = "";
    try {
      existing = await Bun.file(path).text();
    } catch {
      existing = "";
    }
    if (existing !== content) throw new Error(`${path} is out of date`);
    return;
  }
  await Bun.write(path, content);
}

const check = Bun.argv.includes("--check");
const spec = await loadSpec();
await writeOrCheck(RUST_OUT, rust(spec), check);
await writeOrCheck(TS_OUT, ts(spec), check);
console.log(check ? "engine contract is up to date" : "engine contract generated");
