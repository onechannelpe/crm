import type { Kysely } from "kysely";

import { db } from "~/lib/db/db";
import type { Database } from "~/lib/db/types";
import { createLogger } from "~/lib/observability/logger";
import type { Logger } from "~/lib/observability/logger-shared";

export interface ServerInfra {
  db: Kysely<Database>;
  now: () => Date;
  logger: Pick<Logger, "info" | "error">;
}

export function createServerInfra(
  executor: Kysely<Database> = db,
): ServerInfra {
  return {
    db: executor,
    now: () => new Date(),
    logger: createLogger("server-runtime"),
  };
}
