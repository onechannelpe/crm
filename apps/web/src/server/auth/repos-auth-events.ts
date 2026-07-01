import type { Insertable, Kysely, Selectable } from "kysely";

import type { Database } from "~/lib/db/types";
import type { UserId } from "~/server/shared/ids";

type AuthEventRow = Selectable<Database["auth_events"]>;
type NewAuthEventRow = Insertable<Database["auth_events"]>;

export function createAuthEventsRepo(db: Kysely<Database>) {
  return {
    create(values: NewAuthEventRow) {
      return db.insertInto("auth_events").values(values).executeTakeFirst();
    },

    findRecentByUser(userId: UserId, limit: number) {
      return (
        db
          .selectFrom("auth_events")
          .selectAll()
          .where("user_id", "=", userId)
          // `id` (uuidv7, time-sortable) breaks ties deterministically when
          // several events share one `created_at` — e.g. a burst of retries
          // that land in the same millisecond — which `created_at` alone
          // cannot order.
          .orderBy("created_at", "desc")
          .orderBy("id", "desc")
          .limit(limit)
          .execute()
      );
    },

    findRecentLoginRetriesByUser(userId: UserId, limit: number) {
      return db
        .selectFrom("auth_events")
        .selectAll()
        .where("user_id", "=", userId)
        .where("stage", "in", ["login", "challenge", "verify", "recovery"])
        .where("outcome", "in", ["failure", "throttled"])
        .orderBy("created_at", "desc")
        .orderBy("id", "desc")
        .limit(limit)
        .execute();
    },

    countLoginRetriesSince(userId: UserId, since: Date) {
      return db
        .selectFrom("auth_events")
        .select((eb) => eb.fn.count<number>("id").as("total"))
        .where("user_id", "=", userId)
        .where("stage", "in", ["login", "challenge", "verify", "recovery"])
        .where("outcome", "in", ["failure", "throttled"])
        .where("created_at", ">=", since)
        .executeTakeFirst()
        .then((row) => row?.total ?? 0);
    },

    async hasRecentSuccessFromIp(
      userId: UserId,
      ipHash: string,
      since: Date,
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
        .orderBy("id", "desc")
        .executeTakeFirst();
    },

    deleteCreatedBefore(timestamp: Date) {
      return db
        .deleteFrom("auth_events")
        .where("created_at", "<", timestamp)
        .executeTakeFirst()
        .then((result) => Number(result.numDeletedRows ?? 0));
    },
  };
}

export type AuthEventsRepo = ReturnType<typeof createAuthEventsRepo>;
