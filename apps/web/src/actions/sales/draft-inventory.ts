"use server";

import { requirePermission } from "~/lib/auth/access/session";
import type { ActionSuccess } from "~/lib/contracts/common";
import { assertPositiveInt } from "~/lib/contracts/guards";
import { computeLockExpiry } from "~/server/inventory/domain";
import { repos } from "~/server/shared/context";

export async function lockSaleInventory(
  noteId: number,
  inventoryItemId: number,
): Promise<ActionSuccess> {
  const safeNoteId = assertPositiveInt(noteId, "noteId");
  const safeInventoryItemId = assertPositiveInt(
    inventoryItemId,
    "inventoryItemId",
  );
  const session = await requirePermission("sales:create");
  const note = await repos.chargeNotes.findById(safeNoteId);
  if (!note) throw new Error("Charge note not found");
  if (note.user_id !== session.userId) throw new Error("Forbidden");
  if (note.status !== "draft" && note.status !== "rejected") {
    throw new Error(
      "Inventory can only be selected for draft or rejected notes",
    );
  }

  const existing = await repos.inventory.findAnyLockByChargeNote(safeNoteId);
  if (existing) {
    await repos.inventory.markAvailable(existing.inventory_item_id);
    await repos.inventory.deleteByChargeNote(safeNoteId);
  }

  const reserved =
    await repos.inventory.reserveIfAvailable(safeInventoryItemId);
  if (!reserved) throw new Error("Inventory item is no longer available");

  await repos.inventory.createLock(
    safeInventoryItemId,
    safeNoteId,
    computeLockExpiry(),
  );
  return { success: true };
}
