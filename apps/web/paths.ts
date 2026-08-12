// Resolve from this file so aliases do not depend on the working directory.

import { resolve } from "node:path";

export const appAlias = {
  "~": resolve(import.meta.dirname, "./src"),
} as const;

export const testAliases = {
  ...appAlias,
  "@tests": resolve(import.meta.dirname, "./tests"),
  "server-only": resolve(import.meta.dirname, "./tests/mocks/server-only.ts"),
} as const;
