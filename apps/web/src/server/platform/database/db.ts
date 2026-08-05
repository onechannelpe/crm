import { databaseConfig } from "~/server/platform/config/env";

import { createDb } from "./client";

// LISTEN/NOTIFY uses dedicated pg connections that cannot share the Kysely
// client, so database infrastructure needs both the raw URL and `db`.
export const dbUrl = databaseConfig().url;

export const db = createDb(dbUrl);
