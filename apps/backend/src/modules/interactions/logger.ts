import { db } from "../../db/client";

export async function logInteraction(
  contactId: number,
  userId: number,
  outcome: string,
  notes?: string,
  durationSeconds?: number,
) {
  await db
    .insertInto("interaction_logs")
    .values({
      contact_id: contactId,
      user_id: userId,
      outcome,
      notes: notes || null,
      duration_seconds: durationSeconds || null,
      created_at: Date.now(),
    })
    .execute();
}

export async function getContactInteractions(contactId: number) {
  return await db
    .selectFrom("interaction_logs")
    .where("contact_id", "=", contactId)
    .selectAll()
    .orderBy("created_at", "desc")
    .execute();
}
