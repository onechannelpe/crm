import type { Insertable, Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import { type ContactId } from "~/server/shared/ids";

type NewInteractionLogRow = Insertable<Database["interaction_logs"]>;

export function createInteractionLogsRepo(db: Kysely<Database>) {
  return {
    create(values: NewInteractionLogRow) {
      return db
        .insertInto("interaction_logs")
        .values(values)
        .executeTakeFirstOrThrow();
    },

    findByContact(contactId: ContactId) {
      return db
        .selectFrom("interaction_logs")
        .selectAll()
        .where("contact_id", "=", contactId)
        .orderBy("created_at", "desc")
        .execute();
    },
  };
}
