import { Kysely, PostgresDialect } from "kysely";
import { Pool, types } from "pg";

import { createLogger } from "~/lib/observability/logger";

import type { Database as DatabaseSchema } from "./types";

const logger = createLogger("db-client");

// numeric (OID 1700) defaults to a string in node-pg to preserve arbitrary
// precision. Our numeric columns are rate/fee money values that were `real`
// (float) before the Postgres move and are read into number arithmetic, so we
// parse them back to JS numbers globally. bigint/int8 is never used (counters
// are int4), so no parser is needed there.
types.setTypeParser(types.builtins.NUMERIC, Number.parseFloat);

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
