import type { Component } from "solid-js";

import { parseAndValidateUpdates } from "~/features/updates/model/schema";
import type { UpdateEntry } from "~/features/updates/model/types";

const updateModules = import.meta.glob<{
  default: Component;
  frontmatter?: unknown;
}>("../../../../content/updates/*.{md,mdx}", { eager: true });

const cachedUpdates = parseAndValidateUpdates(updateModules);

export function loadUpdates(): readonly UpdateEntry[] {
  return cachedUpdates;
}
