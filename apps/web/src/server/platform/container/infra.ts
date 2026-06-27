import { db } from "~/lib/db/db";
import { createLogger } from "~/lib/observability/logger";
import type { Logger } from "~/lib/observability/logger-shared";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

export interface ServerInfra {
  db: DatabaseExecutor;
  now: () => number;
  logger: Pick<Logger, "info" | "error">;
}

export function createServerInfra(
  executor: DatabaseExecutor = db,
): ServerInfra {
  return {
    db: executor,
    now: Date.now,
    logger: createLogger("server-runtime"),
  };
}
