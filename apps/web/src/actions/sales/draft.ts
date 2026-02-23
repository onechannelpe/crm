"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { assertPositiveInt } from "~/lib/contracts/guards";
import { repos } from "~/server/shared/context";

import type {
  AvailableInventoryItem,
  AvailableProduct,
  SaleDraftContext,
  SaleFixContext,
} from "./types";

export async function getSaleFixContext(
  noteId: number,
): Promise<SaleFixContext> {
  const safeNoteId = assertPositiveInt(noteId, "noteId");
  const session = await requirePermission("sales:submit");
  const note = await repos.chargeNotes.findById(safeNoteId);
  if (!note) throw new Error("Charge note not found");
  if (note.user_id !== session.userId) throw new Error("Forbidden");

  const rejections =
    await repos.rejectionLogs.findUnresolvedByChargeNote(safeNoteId);
  return { noteId: note.id, status: note.status, rejections };
}

export async function getSaleDraftContext(
  noteId: number,
): Promise<SaleDraftContext> {
  const safeNoteId = assertPositiveInt(noteId, "noteId");
  const session = await requirePermission("sales:create");
  const note = await repos.chargeNotes.findById(safeNoteId);
  if (!note) throw new Error("Charge note not found");
  if (note.user_id !== session.userId) throw new Error("Forbidden");

  const [items, documents, inventoryLock] = await Promise.all([
    repos.chargeNoteItems.findByChargeNoteWithProducts(safeNoteId),
    repos.documents.findByChargeNote(safeNoteId),
    repos.inventory.findLockWithItemByChargeNote(safeNoteId),
  ]);

  return {
    noteId: safeNoteId,
    status: note.status,
    items,
    documents,
    inventoryLock,
    readiness: {
      hasItems: items.length > 0,
      hasDocuments: documents.length > 0,
      hasInventoryLock:
        !!inventoryLock && inventoryLock.expires_at > Date.now(),
    },
  };
}

export async function getAvailableProducts(): Promise<AvailableProduct[]> {
  await requirePermission("sales:create");
  return repos.products.findActive();
}

export async function getAvailableInventory(): Promise<
  AvailableInventoryItem[]
> {
  await requirePermission("sales:create");
  return repos.inventory.findAllAvailableWithProduct();
}
