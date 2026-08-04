import { sql } from "kysely";

import type { DatabaseExecutor } from "~/server/platform/database/executor";

// PostgreSQL releases notifications only when this executor's transaction commits.
export function notify(
  executor: DatabaseExecutor,
  channel: string,
  payload = "",
): Promise<void> {
  return sql`select pg_notify(${channel}, ${payload})`
    .execute(executor)
    .then(() => undefined);
}
