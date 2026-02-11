"use server";

import { query } from "@solidjs/router";
import { db } from "~/server/db/client";
import { requireAuth, requireRole } from "~/server/auth/session";

export const getProductsQuery = query(async () => {
  "use server";
  await requireAuth();

  return await db
    .selectFrom("products")
    .where("is_active", "=", 1)
    .selectAll()
    .execute();
}, "products");

export const getChargeNoteQuery = query(async (id: number) => {
  "use server";
  const { userId, role } = await requireAuth();

  const note = await db
    .selectFrom("charge_notes")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst();

  if (!note) return null;

  if (role === "executive" && note.user_id !== userId) {
    throw new Error("Not authorized");
  }

  if (role === "back_office" && note.status !== "Pending_Back") {
    throw new Error("Not authorized");
  }

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
}, "chargeNote");

export const getPendingSalesQuery = query(async () => {
  "use server";
  await requireRole(["back_office"]);

  return await db
    .selectFrom("charge_notes")
    .where("status", "=", "Pending_Back")
    .selectAll()
    .execute();
}, "pendingSales");

export const getRejectedSalesQuery = query(async () => {
  "use server";
  const { userId } = await requireRole(["executive"]);

  return await db
    .selectFrom("charge_notes")
    .where("status", "=", "Rejected")
    .where("user_id", "=", userId)
    .selectAll()
    .execute();
}, "rejectedSales");

export const getRejectionsQuery = query(async (chargeNoteId: number) => {
  "use server";
  await requireAuth();

  return await db
    .selectFrom("rejection_logs")
    .where("charge_note_id", "=", chargeNoteId)
    .where("is_resolved", "=", 0)
    .selectAll()
    .execute();
}, "rejections");
