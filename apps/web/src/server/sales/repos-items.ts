import type { Kysely } from "kysely";
import type { Database } from "~/lib/db/schema";

export function createChargeNoteItemsRepo(db: Kysely<Database>) {
  return {
    create(chargeNoteId: number, productId: number, quantity: number) {
      return db
        .insertInto("charge_note_items")
        .values({
          charge_note_id: chargeNoteId,
          product_id: productId,
          quantity,
        })
        .executeTakeFirstOrThrow();
    },

    findByChargeNote(chargeNoteId: number) {
      return db
        .selectFrom("charge_note_items")
        .selectAll()
        .where("charge_note_id", "=", chargeNoteId)
        .execute();
    },

    findByChargeNoteWithProducts(chargeNoteId: number) {
      return db
        .selectFrom("charge_note_items")
        .innerJoin("products", "products.id", "charge_note_items.product_id")
        .select([
          "charge_note_items.id",
          "charge_note_items.charge_note_id",
          "charge_note_items.product_id",
          "charge_note_items.quantity",
          "products.name as product_name",
          "products.category as product_category",
        ])
        .where("charge_note_items.charge_note_id", "=", chargeNoteId)
        .execute();
    },

    async countByChargeNote(chargeNoteId: number) {
      const row = await db
        .selectFrom("charge_note_items")
        .select(db.fn.countAll().as("count"))
        .where("charge_note_id", "=", chargeNoteId)
        .executeTakeFirst();
      return Number(row?.count ?? 0);
    },
  };
}
