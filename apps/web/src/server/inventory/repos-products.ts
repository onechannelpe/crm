import type { Kysely } from "kysely";
import type { Database } from "~/lib/db/schema";

export function createProductsRepo(db: Kysely<Database>) {
    return {
        findById(id: number) {
            return db.selectFrom("products").selectAll().where("id", "=", id).executeTakeFirst();
        },

        findActive() {
            return db.selectFrom("products").selectAll().where("is_active", "=", 1).execute();
        },

        async create(values: { name: string; category: string; subtype?: string; price: number }) {
            const result = await db
                .insertInto("products")
                .values({ ...values, subtype: values.subtype ?? null, is_active: 1 })
                .executeTakeFirstOrThrow();
            return Number(result.insertId);
        },

        update(id: number, values: { name?: string; price?: number; is_active?: number }) {
            return db.updateTable("products").set(values).where("id", "=", id).execute();
        },
    };
}
