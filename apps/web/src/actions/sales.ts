"use server";

import type { Role } from "~/lib/auth/access/rbac";
import { requirePermission } from "~/lib/auth/access/session";
import type { ActionSuccess } from "~/lib/contracts/common";
import {
  assertNonEmptyString,
  assertPositiveInt,
} from "~/lib/contracts/guards";
import { runObservedAction } from "~/lib/observability/run-observed-action";
import { computeLockExpiry } from "~/server/inventory/domain";
import { salesDocumentService, salesService } from "~/server/shared/context";
import { repos } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

type PendingReviewNote = Awaited<
  ReturnType<typeof repos.chargeNotes.findPendingReviewWithContacts>
>[number];
type RejectionItem = Awaited<
  ReturnType<typeof repos.rejectionLogs.findUnresolvedByChargeNote>
>[number];
type DraftItem = Awaited<
  ReturnType<typeof repos.chargeNoteItems.findByChargeNoteWithProducts>
>[number];
type DraftDocument = Awaited<
  ReturnType<typeof repos.documents.findByChargeNote>
>[number];
type DraftInventoryLock = Awaited<
  ReturnType<typeof repos.inventory.findLockWithItemByChargeNote>
>;
type AvailableProduct = Awaited<
  ReturnType<typeof repos.products.findActive>
>[number];
type AvailableInventoryItem = Awaited<
  ReturnType<typeof repos.inventory.findAllAvailableWithProduct>
>[number];

export interface CreateSaleResult {
  id: number;
}

export interface RejectSaleInput {
  field_id: string;
  reviewer_note: string | null;
}

export interface SaleFixContext {
  noteId: number;
  status: string;
  rejections: RejectionItem[];
}

export interface SaleDraftContext {
  noteId: number;
  status: string;
  items: DraftItem[];
  documents: DraftDocument[];
  inventoryLock: DraftInventoryLock;
  readiness: {
    hasItems: boolean;
    hasDocuments: boolean;
    hasInventoryLock: boolean;
  };
}

export async function createSale(contactId: number): Promise<CreateSaleResult> {
  const safeContactId = assertPositiveInt(contactId, "contactId");
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "sales.create",
    actor,
    input: { contactId: safeContactId },
    run: async () => {
      const session = await requirePermission("sales:create");
      actor.userId = session.userId;
      const hasLead = await repos.leadAssignments.hasActiveForContact(
        session.userId,
        safeContactId,
      );
      if (!hasLead) {
        throw new Error(
          "You can only create sales from your active assigned leads",
        );
      }

      const result = await salesService.createDraft(
        safeContactId,
        session.userId,
      );

      if (isErr(result)) throw new Error(result.error);
      return { id: result.value };
    },
  });
}

export async function submitSale(noteId: number): Promise<ActionSuccess> {
  const safeNoteId = assertPositiveInt(noteId, "noteId");
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "sales.submit",
    actor,
    input: { noteId: safeNoteId },
    run: async () => {
      const session = await requirePermission("sales:submit");
      actor.userId = session.userId;
      actor.role = session.role;
      const result = await salesService.submit(safeNoteId, session.userId);

      if (isErr(result)) throw new Error(result.error);
      return { success: true };
    },
  });
}

export async function approveSale(noteId: number): Promise<ActionSuccess> {
  const safeNoteId = assertPositiveInt(noteId, "noteId");
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "sales.approve",
    actor,
    input: { noteId: safeNoteId },
    run: async () => {
      const session = await requirePermission("sales:approve");
      actor.userId = session.userId;
      actor.role = session.role;
      const result = await salesService.approve(
        safeNoteId,
        session.userId,
        session.branchId,
        session.role === "superuser",
      );

      if (isErr(result)) throw new Error(result.error);
      return { success: true };
    },
  });
}

export async function rejectSale(
  noteId: number,
  rejections: RejectSaleInput[],
): Promise<ActionSuccess> {
  const safeNoteId = assertPositiveInt(noteId, "noteId");
  if (rejections.length === 0) {
    throw new Error("rejections must contain at least one item");
  }
  const normalizedRejections = rejections.map((item) => ({
    field_id: assertNonEmptyString(item.field_id, "rejections.field_id"),
    reviewer_note:
      item.reviewer_note === null
        ? null
        : assertNonEmptyString(item.reviewer_note, "rejections.reviewer_note"),
  }));
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "sales.reject",
    actor,
    input: {
      noteId: safeNoteId,
      rejectionsCount: normalizedRejections.length,
    },
    run: async () => {
      const session = await requirePermission("sales:approve");
      actor.userId = session.userId;
      actor.role = session.role;
      const result = await salesService.reject(
        safeNoteId,
        session.userId,
        session.branchId,
        session.role === "superuser",
        normalizedRejections,
      );

      if (isErr(result)) throw new Error(result.error);
      return { success: true };
    },
  });
}

export async function getPendingReviewNotes(): Promise<PendingReviewNote[]> {
  const session = await requirePermission("sales:review");
  if (session.role === "superuser") {
    return repos.chargeNotes.findPendingReviewWithContacts();
  }
  return repos.chargeNotes.findPendingReviewWithContactsByBranch(
    session.branchId,
  );
}

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
  return {
    noteId: note.id,
    status: note.status,
    rejections,
  };
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

export async function addSaleDocument(
  noteId: number,
  filename: string,
  mimetype: string,
  contentBytes: Uint8Array | number[],
): Promise<ActionSuccess> {
  const safeNoteId = assertPositiveInt(noteId, "noteId");
  const safeFilename = assertNonEmptyString(filename, "filename");
  const safeMimetype = assertNonEmptyString(mimetype, "mimetype");
  const safeContentBytes = Array.isArray(contentBytes)
    ? Uint8Array.from(contentBytes)
    : contentBytes instanceof Uint8Array
      ? contentBytes
      : null;
  if (!safeContentBytes || safeContentBytes.byteLength === 0) {
    throw new Error("contentBytes must be a non-empty byte array");
  }
  const session = await requirePermission("sales:create");
  const note = await repos.chargeNotes.findById(safeNoteId);
  if (!note) throw new Error("Charge note not found");
  if (note.user_id !== session.userId) throw new Error("Forbidden");
  if (note.status !== "draft" && note.status !== "rejected") {
    throw new Error("Documents can only be edited for draft or rejected notes");
  }

  const upload = await salesDocumentService.upload({
    chargeNoteId: safeNoteId,
    userId: session.userId,
    originalName: safeFilename,
    mimeType: safeMimetype,
    contentBytes: safeContentBytes,
  });
  if (isErr(upload)) throw new Error(upload.error);

  return { success: true };
}

export async function removeSaleDocument(
  noteId: number,
  documentId: number,
): Promise<ActionSuccess> {
  const safeNoteId = assertPositiveInt(noteId, "noteId");
  const safeDocumentId = assertPositiveInt(documentId, "documentId");
  const session = await requirePermission("sales:create");

  const note = await repos.chargeNotes.findById(safeNoteId);
  if (!note) throw new Error("Charge note not found");
  if (note.user_id !== session.userId) throw new Error("Forbidden");
  if (note.status !== "draft" && note.status !== "rejected") {
    throw new Error("Documents can only be edited for draft or rejected notes");
  }

  const document = await repos.documents.findById(safeDocumentId);
  if (!document || document.charge_note_id !== safeNoteId) {
    throw new Error("Document not found");
  }

  const wasDeleted = await repos.documents.markSoftDeleted(
    safeDocumentId,
    session.userId,
  );
  if (!wasDeleted) {
    throw new Error("Document is not available");
  }

  return { success: true };
}

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
