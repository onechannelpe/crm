import { db } from "../client";
import type { ChargeNote, NewChargeNote, ChargeNoteItem, NewChargeNoteItem } from "../schema";

export class SalesRepository {
  static async getById(id: number): Promise<ChargeNote | null> {
    return await db
      .selectFrom("charge_notes")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst() ?? null;
  }

  static async create(note: NewChargeNote): Promise<number> {
    const result = await db
      .insertInto("charge_notes")
      .values(note)
      .executeTakeFirstOrThrow();

    return Number(result.insertId);
  }

  static async updateStatus(
    id: number,
    status: ChargeNote["status"],
  ): Promise<void> {
    await db
      .updateTable("charge_notes")
      .set({ status, updated_at: Date.now() })
      .where("id", "=", id)
      .execute();
  }

  static async addItem(item: NewChargeNoteItem): Promise<number> {
    const result = await db
      .insertInto("charge_note_items")
      .values(item)
      .executeTakeFirstOrThrow();

    return Number(result.insertId);
  }

  static async getItems(chargeNoteId: number): Promise<ChargeNoteItem[]> {
    return await db
      .selectFrom("charge_note_items")
      .selectAll()
      .where("charge_note_id", "=", chargeNoteId)
      .execute();
  }

  static async getPendingValidation(): Promise<ChargeNote[]> {
    return await db
      .selectFrom("charge_notes")
      .selectAll()
      .where("status", "=", "Pending_Back")
      .orderBy("created_at", "asc")
      .execute();
  }

  static async getRejectedByUser(userId: number): Promise<ChargeNote[]> {
    return await db
      .selectFrom("charge_notes")
      .selectAll()
      .where("user_id", "=", userId)
      .where("status", "=", "Rejected")
      .orderBy("updated_at", "desc")
      .execute();
  }
}
