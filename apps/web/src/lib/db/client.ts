import { Kysely, PostgresDialect } from "kysely";
import { Pool, types } from "pg";

import { createLogger } from "~/lib/observability/logger";

import type { Database as DatabaseSchema } from "./types";

const logger = createLogger("db-client");

// node-pg parses `numeric` (OID 1700) as a string to preserve arbitrary
// precision. Our numeric columns are rate/fee money values read into number
// arithmetic, so parse them back to a JS number globally.
types.setTypeParser(types.builtins.NUMERIC, Number.parseFloat);

// Same story for `int8` (OID 20). Postgres's `count(*)` always returns bigint
// regardless of the counted column's type, so every repo's `count()` aggregate
// hits this. Our counts stay well under Number.MAX_SAFE_INTEGER, so parsing
// to a JS number is safe.
types.setTypeParser(types.builtins.INT8, Number.parseInt);

// One Kysely instance per connection string. The pool is owned by the
// returned instance; callers that build throwaway databases (the test
// harness) must `destroy()` to release the pool.
export function createDb(connectionString: string): Kysely<DatabaseSchema> {
  logger.info("db_initialization_started", { url: connectionString });

  const pool = new Pool({ connectionString });

  return new Kysely<DatabaseSchema>({
    dialect: new PostgresDialect({ pool }),
  });
}
