import type { Kysely } from "kysely";
import type { Database } from "~/lib/db/schema";

export function createQuotaAllocationsRepo(db: Kysely<Database>) {
    return {
        findByUserAndDate(userId: number, date: string) {
            return db
                .selectFrom("quota_allocations")
                .selectAll()
                .where("user_id", "=", userId)
                .where("date", "=", date)
                .executeTakeFirst();
        },

        create(values: {
            user_id: number;
            allocated_by_user_id: number;
            date: string;
            quota_amount: number;
        }) {
            return db
                .insertInto("quota_allocations")
                .values({ ...values, used_amount: 0, created_at: Date.now() })
                .executeTakeFirstOrThrow();
        },

        incrementUsage(id: number, amount: number) {
            return db
                .updateTable("quota_allocations")
                .set((eb) => ({ used_amount: eb("used_amount", "+", amount) }))
                .where("id", "=", id)
                .execute();
        },
    };
}
