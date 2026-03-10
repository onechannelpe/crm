import type { SourceConfig } from "../core/types.ts";
import { solidjsConfig } from "./solidjs.ts";
import { twentyFrontConfig } from "./twenty-front.ts";
import { twentyUiConfig } from "./twenty-ui.ts";
import { twentyWebsiteConfig } from "./twenty-website.ts";

const registry = new Map<string, SourceConfig>([
  ["solidjs", solidjsConfig],
  ["twenty-front", twentyFrontConfig],
  ["twenty-ui", twentyUiConfig],
  ["twenty-website", twentyWebsiteConfig],
]);

export function getSourceConfig(name: string): SourceConfig | undefined {
  return registry.get(name.toLowerCase());
}

export function getAllSourceConfigs(): SourceConfig[] {
  return Array.from(registry.values());
}

export function getSourceNames(): string[] {
  return Array.from(registry.keys());
}
