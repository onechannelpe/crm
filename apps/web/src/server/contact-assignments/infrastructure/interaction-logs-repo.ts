import type { Insertable, Kysely } from "kysely";

import type { OrganizationPersonId } from "~/domain/ids";
import type { Database } from "~/server/platform/database/types";

type NewInteractionLogRow = Insertable<Database["interaction_logs"]>;

export function createInteractionLogsRepo(db: Kysely<Database>) {
  return {
    create(values: NewInteractionLogRow) {
      return db
        .insertInto("interaction_logs")
        .values(values)
        .executeTakeFirstOrThrow();
    },

    findByContact(contactId: OrganizationPersonId) {
      return db
        .selectFrom("interaction_logs")
        .selectAll()
        .where("contact_id", "=", contactId)
        .orderBy("created_at", "desc")
        .execute();
    },
  };
}

export type InteractionLogsRepo = ReturnType<typeof createInteractionLogsRepo>;
