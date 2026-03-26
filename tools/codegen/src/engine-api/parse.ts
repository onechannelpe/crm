import { asObject, asString } from "../shared.ts";

export type EndpointMap = Record<string, string>;

export type EngineApiSpec = {
  version: string;
  endpoints: EndpointMap;
};

const VERSION_PATTERN = /^v\d+$/;
const ENDPOINT_KEY_RE = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

export function parseEngineApiSpec(raw: unknown): EngineApiSpec {
  const root = asObject(raw, "engine api spec");
  const version = asString(root["version"], "version");

  if (!VERSION_PATTERN.test(version)) {
    throw new Error(`version must match /^v\\d+$/, got: ${version}`);
  }

  const endpointsRaw = asObject(root["endpoints"], "endpoints");
  const entries = Object.entries(endpointsRaw);

  if (entries.length === 0) {
    throw new Error("endpoints must contain at least one entry");
  }

  const endpoints: EndpointMap = {};
  for (const [key, value] of entries) {
    if (!ENDPOINT_KEY_RE.test(key)) {
      throw new Error(`invalid endpoint key: ${key}`);
    }
    const path = asString(value, `endpoints.${key}`);
    if (!path.startsWith("/")) {
      throw new Error(`endpoint path must start with /: ${key} = ${path}`);
    }
    endpoints[key] = path;
  }

  return { version, endpoints };
}
