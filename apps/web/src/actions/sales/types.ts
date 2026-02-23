import type { repos } from "~/server/shared/context";

export interface CreateSaleResult {
  id: number;
}

export interface ManualSaleInput {
  ruc: string;
  orgName: string;
  dni: string;
  contactName: string;
  phoneE164: string | null;
}

export interface RejectSaleInput {
  field_id: string;
  reviewer_note: string | null;
}

export type PendingReviewNote = Awaited<
  ReturnType<typeof repos.chargeNotes.findPendingReviewWithContacts>
>[number];

export type ApprovedSaleNote = Awaited<
  ReturnType<typeof repos.chargeNotes.findApprovedWithContacts>
>[number];

export type RejectionItem = Awaited<
  ReturnType<typeof repos.rejectionLogs.findUnresolvedByChargeNote>
>[number];

export type DraftItem = Awaited<
  ReturnType<typeof repos.chargeNoteItems.findByChargeNoteWithProducts>
>[number];

export type DraftDocument = Awaited<
  ReturnType<typeof repos.documents.findByChargeNote>
>[number];

export type DraftInventoryLock = Awaited<
  ReturnType<typeof repos.inventory.findLockWithItemByChargeNote>
>;

export type AvailableProduct = Awaited<
  ReturnType<typeof repos.products.findActive>
>[number];

export type AvailableInventoryItem = Awaited<
  ReturnType<typeof repos.inventory.findAllAvailableWithProduct>
>[number];

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
