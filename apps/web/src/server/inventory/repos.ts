import type { Kysely, Selectable } from "kysely";

import type { Database } from "~/lib/db/types";

import type { InventoryItemWithProductRecord } from "./application/ports";

type InventoryItemRow = Selectable<Database["inventory_items"]>;

export function createInventoryRepo(db: Kysely<Database>) {
  return {
    findById(id: number): Promise<InventoryItemRow | undefined> {
      return db
        .selectFrom("inventory_items")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
    },

    findAvailable(productId: number): Promise<InventoryItemRow[]> {
      return db
        .selectFrom("inventory_items")
        .selectAll()
        .where("product_id", "=", productId)
        .where("status", "=", "available")
        .execute();
    },

    findAllAvailableWithProduct(): Promise<InventoryItemWithProductRecord[]> {
      return db
        .selectFrom("inventory_items")
        .innerJoin("products", "products.id", "inventory_items.product_id")
        .select([
          "inventory_items.id",
          "inventory_items.serial_number",
          "inventory_items.status",
          "inventory_items.created_at",
          "products.name as product_name",
          "products.category",
        ])
        .where("inventory_items.status", "=", "available")
        .orderBy("products.name", "asc")
        .orderBy("inventory_items.serial_number", "asc")
        .execute();
    },

    findAllWithProduct(): Promise<InventoryItemWithProductRecord[]> {
      return db
        .selectFrom("inventory_items")
        .innerJoin("products", "products.id", "inventory_items.product_id")
        .select([
          "inventory_items.id",
          "inventory_items.serial_number",
          "inventory_items.status",
          "inventory_items.created_at",
          "products.name as product_name",
          "products.category",
        ])
        .orderBy("products.name", "asc")
        .orderBy("inventory_items.serial_number", "asc")
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
  };
}
