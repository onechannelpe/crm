import type { EngineApiSpec } from "./parse.ts";

export function renderEngineApiContract(spec: EngineApiSpec): string {
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
    "export function engineApiPath(",
    "  endpoint: (typeof ENGINE_ENDPOINTS)[keyof typeof ENGINE_ENDPOINTS],",
    "): string {",
    "  return `${ENGINE_API_PREFIX}${endpoint}`;",
    "}",
    "",
  ].join("\n");
}
