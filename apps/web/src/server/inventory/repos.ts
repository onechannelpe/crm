import type { Kysely } from "kysely";
import type { Database } from "~/lib/db/schema";

export function createInventoryRepo(db: Kysely<Database>) {
  return {
    findById(id: number) {
      return db
        .selectFrom("inventory_items")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
    },

    findAvailable(productId: number) {
      return db
        .selectFrom("inventory_items")
        .selectAll()
        .where("product_id", "=", productId)
        .where("status", "=", "available")
        .execute();
    },

    findAllAvailableWithProduct() {
      return db
        .selectFrom("inventory_items")
        .innerJoin("products", "products.id", "inventory_items.product_id")
        .select([
          "inventory_items.id",
          "inventory_items.serial_number",
          "inventory_items.status",
          "products.id as product_id",
          "products.name as product_name",
          "products.category as product_category",
        ])
        .where("inventory_items.status", "=", "available")
        .orderBy("products.name", "asc")
        .orderBy("inventory_items.serial_number", "asc")
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

    findLockByItemId(itemId: number) {
      return db
        .selectFrom("inventory_locks")
        .selectAll()
        .where("inventory_item_id", "=", itemId)
        .executeTakeFirst();
    },

    findActiveLockByChargeNote(chargeNoteId: number, now: number = Date.now()) {
      return db
        .selectFrom("inventory_locks")
        .selectAll()
        .where("charge_note_id", "=", chargeNoteId)
        .where("expires_at", ">", now)
        .executeTakeFirst();
    },

    findAnyLockByChargeNote(chargeNoteId: number) {
      return db
        .selectFrom("inventory_locks")
        .selectAll()
        .where("charge_note_id", "=", chargeNoteId)
        .executeTakeFirst();
    },

    findLockWithItemByChargeNote(chargeNoteId: number) {
      return db
        .selectFrom("inventory_locks")
        .innerJoin(
          "inventory_items",
          "inventory_items.id",
          "inventory_locks.inventory_item_id",
        )
        .select([
          "inventory_locks.id",
          "inventory_locks.inventory_item_id",
          "inventory_locks.charge_note_id",
          "inventory_locks.locked_at",
          "inventory_locks.expires_at",
          "inventory_items.serial_number",
          "inventory_items.status as inventory_status",
        ])
        .where("inventory_locks.charge_note_id", "=", chargeNoteId)
        .executeTakeFirst();
    },

    deleteByChargeNote(chargeNoteId: number) {
      return db
        .deleteFrom("inventory_locks")
        .where("charge_note_id", "=", chargeNoteId)
        .execute();
    },

    updateLockExpiry(lockId: number, expiresAt: number) {
      return db
        .updateTable("inventory_locks")
        .set({ expires_at: expiresAt })
        .where("id", "=", lockId)
        .execute();
    },

    async reserveIfAvailable(itemId: number) {
      const result = await db
        .updateTable("inventory_items")
        .set({ status: "reserved" })
        .where("id", "=", itemId)
        .where("status", "=", "available")
        .executeTakeFirst();
      return Number(result.numUpdatedRows ?? 0) > 0;
    },

    markSold(itemId: number) {
      return db
        .updateTable("inventory_items")
        .set({ status: "sold" })
        .where("id", "=", itemId)
        .execute();
    },

    markAvailable(itemId: number) {
      return db
        .updateTable("inventory_items")
        .set({ status: "available" })
        .where("id", "=", itemId)
        .execute();
    },

    releaseLock(lockId: number) {
      return db
        .deleteFrom("inventory_locks")
        .where("id", "=", lockId)
        .execute();
    },

    findExpiredLocks(now: number = Date.now()) {
      return db
        .selectFrom("inventory_locks")
        .selectAll()
        .where("expires_at", "<", now)
        .execute();
    },

    async releaseExpiredLocks(now: number = Date.now()) {
      const expired = await db
        .selectFrom("inventory_locks")
        .selectAll()
        .where("expires_at", "<", now)
        .execute();
      if (expired.length === 0) {
        return 0;
      }

      const itemIds = expired.map((lock) => lock.inventory_item_id);
      const lockIds = expired.map((lock) => lock.id);

      await db
        .updateTable("inventory_items")
        .set({ status: "available" })
        .where("id", "in", itemIds)
        .execute();
      await db
        .deleteFrom("inventory_locks")
        .where("id", "in", lockIds)
        .execute();

      return expired.length;
    },
  };
}
