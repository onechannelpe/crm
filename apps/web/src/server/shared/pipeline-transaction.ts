import { db } from "~/lib/db/db";

import type { DatabaseExecutor } from "./db-executor";

export async function runInPipelineTransaction<T>(
  operation: (executor: DatabaseExecutor) => Promise<T>,
): Promise<T> {
  return db.transaction().execute((trx) => operation(trx));
}
