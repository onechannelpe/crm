import type { Kysely } from "kysely";

import type { PublishedPage } from "~/contracts/merchant-stats/views";
import type { Database } from "~/lib/db/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

export async function readPublishedGpvPage<Row>(
  db: Kysely<Database>,
  readRows: (transaction: DatabaseExecutor) => Promise<Row[]>,
): Promise<PublishedPage<Row>> {
  return db
    .transaction()
    .setIsolationLevel("repeatable read")
    .execute(async (transaction) => {
      const publication = await transaction
        .selectFrom("gpv_snapshots")
        .where("state", "=", "active")
        .select("id")
        .executeTakeFirst();

      if (!publication) {
        return { publicationId: null, rows: [] };
      }

      const rows = await readRows(transaction);
      return { publicationId: publication.id, rows };
    });
}
