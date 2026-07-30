import type { Kysely } from "kysely";

import { db } from "~/server/platform/database/db";
import type { Database } from "~/server/platform/database/types";
import type { Logger } from "~/shared/observability/logger";
import { createLogger } from "~/shared/observability/runtime-logger";

export interface ServerInfra {
  db: Kysely<Database>;
  now: () => Date;
  logger: Pick<Logger, "info" | "error">;
}

export const infra: ServerInfra = {
  db,
  now: () => new Date(),
  logger: createLogger("server-runtime"),
};
