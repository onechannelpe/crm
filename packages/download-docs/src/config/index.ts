import type { FrameworkConfig } from "../core/types.ts";
import { solidjsConfig } from "./solidjs.ts";

const configs = new Map<string, FrameworkConfig>([["solidjs", solidjsConfig]]);

export function getFrameworkConfig(name: string): FrameworkConfig | undefined {
  return configs.get(name.toLowerCase());
}

export function getAllFrameworkConfigs(): FrameworkConfig[] {
  return Array.from(configs.values());
}

export function getFrameworkNames(): string[] {
  return Array.from(configs.keys());
}
