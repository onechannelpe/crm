import { Kysely, PostgresDialect } from "kysely";
import { Pool, types } from "pg";

import { createLogger } from "~/lib/observability/logger";

import type { Database as DatabaseSchema } from "./types";

const logger = createLogger("db-client");

// numeric (OID 1700) defaults to a string in node-pg to preserve arbitrary
// precision. Our numeric columns are rate/fee money values that were `real`
// (float) before the Postgres move and are read into number arithmetic, so we
// parse them back to JS numbers globally.
types.setTypeParser(types.builtins.NUMERIC, Number.parseFloat);

// int8/bigint (OID 20) also defaults to a string, for the same
// arbitrary-precision reason — and Postgres's `count(*)` always returns
// bigint regardless of the counted column's type, so every repo's
// `count()` aggregate hits this. Our counts stay well under
// Number.MAX_SAFE_INTEGER, so parsing to a JS number is safe.
types.setTypeParser(types.builtins.INT8, Number.parseInt);

// One Kysely instance per connection string. The pool is owned by the returned
// instance; callers that build throwaway databases (the test harness) must
// `destroy()` to release the pool. `timestamptz` comes back as a JS `Date`,
// `uuid` as a string, `numeric`/`int4` as a number — see the schema conventions.
export function createDb(connectionString: string): Kysely<DatabaseSchema> {
  logger.info("db_initialization_started", { url: connectionString });

  const pool = new Pool({ connectionString });

  return new Kysely<DatabaseSchema>({
    dialect: new PostgresDialect({ pool }),
  });
}
