import type { Kysely } from "kysely";

import type { AuthEvent, Database, NewAuthEvent } from "~/lib/db/schema";

export function createAuthEventsRepo(db: Kysely<Database>) {
  return {
    create(values: NewAuthEvent) {
      return db.insertInto("auth_events").values(values).executeTakeFirst();
    },

    findRecentByUser(userId: number, limit: number) {
      return db
        .selectFrom("auth_events")
        .selectAll()
        .where("user_id", "=", userId)
        .orderBy("created_at", "desc")
        .limit(limit)
        .execute();
    },

    findRecentLoginRetriesByUser(userId: number, limit: number) {
      return db
        .selectFrom("auth_events")
        .selectAll()
        .where("user_id", "=", userId)
        .where("stage", "in", ["login", "challenge", "verify"])
        .where("outcome", "in", ["failure", "throttled"])
        .orderBy("created_at", "desc")
        .limit(limit)
        .execute();
    },

    countLoginRetriesSince(userId: number, since: number) {
      return db
        .selectFrom("auth_events")
        .select((eb) => eb.fn.count<number>("id").as("total"))
        .where("user_id", "=", userId)
        .where("stage", "in", ["login", "challenge", "verify"])
        .where("outcome", "in", ["failure", "throttled"])
        .where("created_at", ">=", since)
        .executeTakeFirst()
        .then((row) => Number(row?.total ?? 0));
    },

    findLastByIdentifier(
      identifierHash: string,
    ): Promise<AuthEvent | undefined> {
      return db
        .selectFrom("auth_events")
        .selectAll()
        .where("identifier_hash", "=", identifierHash)
        .orderBy("created_at", "desc")
        .executeTakeFirst();
    },

    deleteCreatedBefore(timestamp: number) {
      return db
        .deleteFrom("auth_events")
        .where("created_at", "<", timestamp)
        .executeTakeFirst()
        .then((result) => Number(result.numDeletedRows ?? 0));
    },
  };
}

export type AuthEventsRepo = ReturnType<typeof createAuthEventsRepo>;
