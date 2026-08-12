import { databaseConfig } from "~/server/platform/config/env";

import { createDb } from "./client";

// LISTEN/NOTIFY needs dedicated pg connections, so infrastructure exposes both
// the raw URL and Kysely client. Resolve both lazily to avoid env reads on import.
export function dbUrl(): string {
  return databaseConfig().url;
}

export const db = createDb(dbUrl);
