type EndpointMap = Record<string, string>;

type Spec = {
  version: string;
  endpoints: EndpointMap;
};

const SPEC_PATH = "contracts/engine/api.json";
const TS_OUT = "apps/web/src/server/shared/engine/contract.ts";
const VERSION_PATTERN = /^v\d+$/;
const ENDPOINT_KEY_PATTERN = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

function parseSpec(raw: unknown): Spec {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error("spec must be an object");
  }

  const root = raw as Record<string, unknown>;
  if (typeof root.version !== "string" || !VERSION_PATTERN.test(root.version)) {
    throw new Error("invalid api version");
  }

  if (
    typeof root.endpoints !== "object" ||
    root.endpoints === null ||
    Array.isArray(root.endpoints)
  ) {
    throw new Error("endpoints must be an object");
  }

  const endpointEntries = Object.entries(root.endpoints);
  if (endpointEntries.length === 0) {
    throw new Error("at least one endpoint is required");
  }

  const endpoints: EndpointMap = {};
  for (const [key, value] of endpointEntries) {
    if (!ENDPOINT_KEY_PATTERN.test(key)) {
      throw new Error(`invalid endpoint key: ${key}`);
    }
    if (typeof value !== "string") {
      throw new Error(`endpoints.${key} must be a string`);
    }
    if (!value.startsWith("/")) {
      throw new Error(`endpoint must start with /: ${key}`);
    }
    endpoints[key] = value;
  }

  return {
    version: root.version,
    endpoints,
  };
}

function renderContract(spec: Spec): string {
  const endpointLines = Object.entries(spec.endpoints).map(
    ([key, value]) => `  ${key}: "${value}",`,
  );

  return [
    "// GENERATED FILE. DO NOT EDIT.",
    `export const ENGINE_API_VERSION = "${spec.version}";`,
    "export const ENGINE_API_PREFIX = `/${ENGINE_API_VERSION}`;",
    "export const ENGINE_ENDPOINTS = {",
    ...endpointLines,
    "} as const;",
    "export function engineApiPath(endpoint: (typeof ENGINE_ENDPOINTS)[keyof typeof ENGINE_ENDPOINTS]): string {",
    "  return `${ENGINE_API_PREFIX}${endpoint}`;",
    "}",
    "",
  ].join("\n");
}

async function run(check: boolean): Promise<void> {
  const rawSpec = (await Bun.file(SPEC_PATH).json()) as unknown;
  const spec = parseSpec(rawSpec);
  const content = renderContract(spec);

  if (!check) {
    await Bun.write(TS_OUT, content);
    console.log("engine contract generated");
    return;
  }

  let existing = "";
  try {
    existing = await Bun.file(TS_OUT).text();
  } catch {
    existing = "";
  }

  if (existing.trimEnd() !== content.trimEnd()) {
    throw new Error(`${TS_OUT} is out of date`);
  }

  console.log("engine contract is up to date");
}

void run(Bun.argv.includes("--check")).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
