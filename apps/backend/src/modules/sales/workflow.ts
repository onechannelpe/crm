import { db } from "../../db/client";

type ChargeNoteStatus = "Draft" | "Pending_Back" | "Rejected" | "Approved";

interface Rejection {
	fieldId: string;
	note: string;
}

export async function transitionStatus(
	noteId: number,
	toStatus: ChargeNoteStatus,
	actorId: number,
	rejections?: Rejection[],
) {
	return await db.transaction().execute(async (trx) => {
		const current = await trx
			.selectFrom("charge_notes")
			.where("id", "=", noteId)
			.select("status")
			.executeTakeFirst();

		if (!current) throw new Error("Charge note not found");

		await trx
			.updateTable("charge_notes")
			.set({ status: toStatus, updated_at: Date.now() })
			.where("id", "=", noteId)
			.execute();

		await trx
			.insertInto("stage_history")
			.values({
				entity_type: "ChargeNote",
				entity_id: noteId,
				from_status: current.status,
				to_status: toStatus,
				actor_id: actorId,
				created_at: Date.now(),
			})
			.execute();

		if (toStatus === "Rejected" && rejections) {
			for (const rej of rejections) {
				await trx
					.insertInto("rejection_logs")
					.values({
						charge_note_id: noteId,
						reviewer_id: actorId,
						field_id: rej.fieldId,
						reviewer_note: rej.note,
						is_resolved: 0,
						created_at: Date.now(),
					})
					.execute();
			}
		}
	});
}
