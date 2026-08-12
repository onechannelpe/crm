import { Kysely, PostgresDialect } from "kysely";
import { Pool, TypeOverrides, types } from "pg";

import { createLogger } from "~/shared/observability/runtime-logger";

import type { Database as DatabaseSchema } from "./types";

const logger = createLogger("db-client");

function createPoolTypes(): TypeOverrides {
  const poolTypes = new TypeOverrides();

  // Accept floating-point precision for `numeric` columns.
  poolTypes.setTypeParser(types.builtins.NUMERIC, Number.parseFloat);

  // `int8` values returned here must remain within Number.MAX_SAFE_INTEGER.
  poolTypes.setTypeParser(types.builtins.INT8, Number.parseInt);

  // Keep calendar dates timezone-neutral as `YYYY-MM-DD` strings.
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

// Resolve configuration lazily so importing database code does not require it.
export function createDb(
  resolveConnectionString: () => string,
): Kysely<DatabaseSchema> {
  return new Kysely<DatabaseSchema>({
    dialect: new PostgresDialect({
      pool: async () => {
        const connectionString = resolveConnectionString();

        logger.info(
          "db_initialization_started",
          connectionTarget(connectionString),
        );

        return new Pool({
          connectionString,
          types: createPoolTypes(),
        });
      },
    }),
  });
}
