"use server";

import { action, redirect } from "@solidjs/router";
import { db } from "~/server/db/client";
import { requireRole } from "~/server/auth/session";
import { transitionStatus } from "./workflow";

export const createChargeNoteAction = action(async (formData: FormData) => {
  "use server";
  const { userId } = await requireRole(["executive"]);
  const contactId = Number(formData.get("contactId"));

  const result = await db
    .insertInto("charge_notes")
    .values({
      contact_id: contactId,
      user_id: userId,
      status: "Draft",
      created_at: Date.now(),
      updated_at: Date.now(),
    })
    .executeTakeFirstOrThrow();

  throw redirect(`/sales/${result.insertId}`);
}, "createChargeNote");

export const addItemAction = action(async (formData: FormData) => {
  "use server";
  await requireRole(["executive"]);

  const noteId = Number(formData.get("noteId"));
  const productId = Number(formData.get("productId"));
  const quantity = Number(formData.get("quantity"));

  const note = await db
    .selectFrom("charge_notes")
    .select(["status"])
    .where("id", "=", noteId)
    .executeTakeFirstOrThrow();

  if (note.status !== "Draft") {
    throw new Error("Cannot modify submitted note");
  }

  await db
    .insertInto("charge_note_items")
    .values({ charge_note_id: noteId, product_id: productId, quantity })
    .execute();

  return { success: true };
}, "addItem");

export const submitChargeNoteAction = action(async (formData: FormData) => {
  "use server";
  const { userId } = await requireRole(["executive"]);
  const noteId = Number(formData.get("noteId"));

  await transitionStatus(noteId, "Pending_Back", userId);

  throw redirect("/search");
}, "submitChargeNote");

export const approveChargeNoteAction = action(async (formData: FormData) => {
  "use server";
  const { userId } = await requireRole(["back_office"]);
  const noteId = Number(formData.get("noteId"));

  await transitionStatus(noteId, "Approved", userId);

  return { success: true };
}, "approveChargeNote");

export const rejectChargeNoteAction = action(async (formData: FormData) => {
  "use server";
  const { userId } = await requireRole(["back_office"]);
  const noteId = Number(formData.get("noteId"));
  const rejectionsJson = formData.get("rejections") as string;
  const rejections = JSON.parse(rejectionsJson);

  await transitionStatus(noteId, "Rejected", userId, rejections);

  return { success: true };
}, "rejectChargeNote");
