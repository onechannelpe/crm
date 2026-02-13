import type { Kysely } from "kysely";
import type { Database } from "~/lib/db/schema";

export function createInventoryRepo(db: Kysely<Database>) {
    return {
        findAvailable(productId: number) {
            return db
                .selectFrom("inventory_items")
                .selectAll()
                .where("product_id", "=", productId)
                .where("status", "=", "available")
                .execute();
        },

        findAllWithProduct() {
            return db
                .selectFrom("inventory_items")
                .innerJoin("products", "products.id", "inventory_items.product_id")
                .select([
                    "inventory_items.id",
                    "inventory_items.serial_number",
                    "inventory_items.status",
                    "inventory_items.created_at",
                    "products.name as productName",
                    "products.category",
                ])
                .orderBy("products.name", "asc")
                .orderBy("inventory_items.serial_number", "asc")
                .execute();
        },

        createLock(itemId: number, chargeNoteId: number, expiresAt: number) {
            return db
                .insertInto("inventory_locks")
                .values({
                    inventory_item_id: itemId,
                    charge_note_id: chargeNoteId,
                    locked_at: Date.now(),
                    expires_at: expiresAt,
                })
                .executeTakeFirstOrThrow();
        },

        releaseLock(lockId: number) {
            return db.deleteFrom("inventory_locks").where("id", "=", lockId).execute();
        },

        findExpiredLocks(now: number = Date.now()) {
            return db
                .selectFrom("inventory_locks")
                .selectAll()
                .where("expires_at", "<", now)
                .execute();
        },
    };
}
