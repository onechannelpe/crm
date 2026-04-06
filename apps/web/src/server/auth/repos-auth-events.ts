import type { Insertable, Kysely, Selectable } from "kysely";

import type { Database } from "~/lib/db/types";

type AuthEventRow = Selectable<Database["auth_events"]>;
type NewAuthEventRow = Insertable<Database["auth_events"]>;

export function createAuthEventsRepo(db: Kysely<Database>) {
  return {
    create(values: NewAuthEventRow) {
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
        .where("stage", "in", ["login", "challenge", "verify", "recovery"])
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
        .where("stage", "in", ["login", "challenge", "verify", "recovery"])
        .where("outcome", "in", ["failure", "throttled"])
        .where("created_at", ">=", since)
        .executeTakeFirst()
        .then((row) => Number(row?.total ?? 0));
    },

    async hasRecentSuccessFromIp(
      userId: number,
      ipHash: string,
      since: number,
    ): Promise<boolean> {
      const row = await db
        .selectFrom("auth_events")
        .select("id")
        .where("user_id", "=", userId)
        .where("stage", "in", ["login", "verify", "recovery"])
        .where("outcome", "=", "success")
        .where("ip_hash", "=", ipHash)
        .where("created_at", ">=", since)
        .limit(1)
        .executeTakeFirst();
      return Boolean(row);
    },

    findLastByIdentifier(
      identifierHash: string,
    ): Promise<AuthEventRow | undefined> {
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
