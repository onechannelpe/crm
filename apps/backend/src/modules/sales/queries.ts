import { db } from "../../db/client";

export async function getChargeNote(id: number) {
	const note = await db
		.selectFrom("charge_notes")
		.where("id", "=", id)
		.selectAll()
		.executeTakeFirst();

	if (!note) return null;

	const items = await db
		.selectFrom("charge_note_items")
		.innerJoin("products", "products.id", "charge_note_items.product_id")
		.where("charge_note_id", "=", id)
		.select([
			"charge_note_items.id",
			"charge_note_items.quantity",
			"products.name",
			"products.price",
		])
		.execute();

	return { ...note, items };
}

export async function getPendingSales() {
	return await db
		.selectFrom("charge_notes")
		.where("status", "=", "Pending_Back")
		.selectAll()
		.execute();
}

export async function getRejectedSales(userId: number) {
	return await db
		.selectFrom("charge_notes")
		.where("status", "=", "Rejected")
		.where("user_id", "=", userId)
		.selectAll()
		.execute();
}

export async function getRejections(chargeNoteId: number) {
	return await db
		.selectFrom("rejection_logs")
		.where("charge_note_id", "=", chargeNoteId)
		.where("is_resolved", "=", 0)
		.selectAll()
		.execute();
}
