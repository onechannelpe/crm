import "server-only";
import type { Kysely } from "kysely";

import { db } from "~/server/platform/database/db";
import type { Database } from "~/server/platform/database/types";
import type { Logger } from "~/shared/observability/logger";
import { createLogger } from "~/shared/observability/runtime-logger";

// Resources only. Time is not a resource: it enters at the request, action,
// queue and worker edges and travels inward as a Date, so nothing composed
// here needs a clock handed to it.
export interface ServerInfrastructure {
  db: Kysely<Database>;
  logger: Pick<Logger, "info" | "error">;
}

export const serverInfrastructure: ServerInfrastructure = {
  db,
  logger: createLogger("server-runtime"),
};
