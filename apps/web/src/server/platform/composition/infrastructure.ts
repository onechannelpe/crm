import "server-only";
import type { Kysely } from "kysely";

import { db } from "~/server/platform/database/db";
import type { Database } from "~/server/platform/database/types";
import type { Logger } from "~/shared/observability/logger";
import { createLogger } from "~/shared/observability/runtime-logger";

export interface ServerInfrastructure {
  db: Kysely<Database>;
  now: () => Date;
  logger: Pick<Logger, "info" | "error">;
}

export const serverInfrastructure: ServerInfrastructure = {
  db,
  now: () => new Date(),
  logger: createLogger("server-runtime"),
};
