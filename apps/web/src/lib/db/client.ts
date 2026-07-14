import { Kysely, PostgresDialect } from "kysely";
import { Pool, TypeOverrides, types } from "pg";

import { createLogger } from "~/lib/observability/logger";

import type { Database as DatabaseSchema } from "./types";

const logger = createLogger("db-client");

function createPoolTypes(): TypeOverrides {
  const poolTypes = new TypeOverrides();

  // node-postgres returns `numeric` as string to preserve arbitrary precision.
  // This pool accepts JS floating-point precision for all `numeric` values.
  poolTypes.setTypeParser(types.builtins.NUMERIC, Number.parseFloat);

  // node-postgres returns `int8` as string because it can exceed
  // Number.MAX_SAFE_INTEGER. All `int8` values returned through this pool
  // must remain within that limit.
  poolTypes.setTypeParser(types.builtins.INT8, Number.parseInt);

  // `date` columns are pure calendar dates (no time, no zone). The default
  // parser turns them into a JS Date at local midnight, which shifts across
  // timezones. Keep the raw 'YYYY-MM-DD' string so a date is one value from
  // intake to read, matching how the merchant-stats module models it. Only
  // `date` columns use this; `timestamptz` stays a Date.
  poolTypes.setTypeParser(types.builtins.DATE, (value) => value);

  return poolTypes;
}

function connectionTarget(connectionString: string) {
  try {
    const url = new URL(connectionString);
    return {
      protocol: url.protocol.replace(":", ""),
      host: url.hostname,
      port: url.port || null,
      database: url.pathname.replace(/^\//, "") || null,
    };
  } catch {
    return {
      protocol: "unknown",
      host: "unparseable",
      port: null,
      database: null,
    };
  }
}

export function createDb(connectionString: string): Kysely<DatabaseSchema> {
  logger.info("db_initialization_started", connectionTarget(connectionString));

  const pool = new Pool({ connectionString, types: createPoolTypes() });

  return new Kysely<DatabaseSchema>({
    dialect: new PostgresDialect({ pool }),
  });
}
