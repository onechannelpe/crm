import { db } from "~/lib/db/db";
import { createLogger } from "~/lib/observability/logger";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import {
  createDefaultEngineClient,
  type EngineClient,
} from "~/server/shared/engine/client";

export interface ServerInfra {
  db: DatabaseExecutor;
  engine: EngineClient;
  now: () => number;
  logger: {
    info(message: string, meta?: unknown): void;
    error(message: string, meta?: unknown): void;
  };
}

export function createServerInfra(
  executor: DatabaseExecutor = db,
): ServerInfra {
  return {
    db: executor,
    engine: createDefaultEngineClient(),
    now: Date.now,
    logger: createLogger("server-runtime"),
  };
}
