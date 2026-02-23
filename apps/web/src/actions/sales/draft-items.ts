"use server";

import { requirePermission } from "~/lib/auth/access/session";
import type { ActionSuccess } from "~/lib/contracts/common";
import { assertPositiveInt } from "~/lib/contracts/guards";
import { repos } from "~/server/shared/context";

export async function addSaleItem(
  noteId: number,
  productId: number,
  quantity: number,
): Promise<ActionSuccess> {
  const safeNoteId = assertPositiveInt(noteId, "noteId");
  const safeProductId = assertPositiveInt(productId, "productId");
  const safeQuantity = assertPositiveInt(quantity, "quantity");
  const session = await requirePermission("sales:create");
  const note = await repos.chargeNotes.findById(safeNoteId);
  if (!note) throw new Error("Charge note not found");
  if (note.user_id !== session.userId) throw new Error("Forbidden");
  if (note.status !== "draft" && note.status !== "rejected") {
    throw new Error("Items can only be edited for draft or rejected notes");
  }

  const product = await repos.products.findById(safeProductId);
  if (!product || !product.is_active) throw new Error("Product not available");

  await repos.chargeNoteItems.create(safeNoteId, safeProductId, safeQuantity);
  return { success: true };
}
