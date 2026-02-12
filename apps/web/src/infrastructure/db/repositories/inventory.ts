import { db } from "../client";
import type { InventoryItem, InventoryLock, NewInventoryLock } from "../schema";

export class InventoryRepository {
  static async findAvailable(productId: number): Promise<InventoryItem | null> {
    return await db
      .selectFrom("inventory_items")
      .selectAll()
      .where("product_id", "=", productId)
      .where("status", "=", "Available")
      .limit(1)
      .executeTakeFirst() ?? null;
  }

  static async createLock(lock: NewInventoryLock): Promise<number> {
    const result = await db
      .insertInto("inventory_locks")
      .values(lock)
      .executeTakeFirstOrThrow();

    return Number(result.insertId);
  }

  static async updateStatus(
    id: number,
    status: InventoryItem["status"],
  ): Promise<void> {
    await db
      .updateTable("inventory_items")
      .set({ status })
      .where("id", "=", id)
      .execute();
  }

  static async getActiveLocks(
    chargeNoteId: number,
  ): Promise<InventoryLock[]> {
    return await db
      .selectFrom("inventory_locks")
      .selectAll()
      .where("charge_note_id", "=", chargeNoteId)
      .where("expires_at", ">", Date.now())
      .execute();
  }

  static async releaseExpiredLocks(): Promise<void> {
    const expired = await db
      .selectFrom("inventory_locks")
      .selectAll()
      .where("expires_at", "<=", Date.now())
      .execute();

    for (const lock of expired) {
      await this.updateStatus(lock.inventory_item_id, "Available");
    }

    await db
      .deleteFrom("inventory_locks")
      .where("expires_at", "<=", Date.now())
      .execute();
  }
}
