"use server";

import { query } from "@solidjs/router";
import { action } from "@solidjs/router";
import { db } from "~/server/db/client";
import { requireRole } from "~/server/auth/session";

export const logInteractionAction = action(async (formData: FormData) => {
  "use server";
  const { userId } = await requireRole(["executive"]);
  const contactId = Number(formData.get("contactId"));
  const outcome = formData.get("outcome") as string;
  const notes = formData.get("notes") as string;
  const durationSeconds = formData.get("durationSeconds")
    ? Number(formData.get("durationSeconds"))
    : null;

  await db
    .insertInto("interaction_logs")
    .values({
      contact_id: contactId,
      user_id: userId,
      outcome,
      notes: notes || null,
      duration_seconds: durationSeconds,
      created_at: Date.now(),
    })
    .execute();

  return { success: true };
}, "logInteraction");

export const getContactInteractionsQuery = query(async (contactId: number) => {
  "use server";
  await requireRole(["executive"]);

  return await db
    .selectFrom("interaction_logs")
    .where("contact_id", "=", contactId)
    .selectAll()
    .orderBy("created_at", "desc")
    .execute();
}, "contactInteractions");
