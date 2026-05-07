import type { Component } from "solid-js";

import { parseAndValidateUpdates } from "~/lib/updates/schema";
import type { UpdateEntry } from "~/lib/updates/types";

const updateModules = import.meta.glob<{
  default: Component;
  frontmatter?: unknown;
}>("../../../content/updates/*.md", { eager: true });

const cachedUpdates = parseAndValidateUpdates(updateModules);

export function loadUpdates(): readonly UpdateEntry[] {
  return cachedUpdates;
}
