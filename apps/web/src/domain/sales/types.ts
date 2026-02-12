export type ChargeNoteStatus = "Draft" | "Pending_Back" | "Rejected" | "Approved";

export interface ChargeNote {
  id: number;
  contactId: number;
  userId: number;
  status: ChargeNoteStatus;
  execCodeReal: string | null;
  execCodeTdp: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface ChargeNoteItem {
  id: number;
  chargeNoteId: number;
  productId: number;
  quantity: number;
}

export interface Rejection {
  id: number;
  chargeNoteId: number;
  reviewerId: number;
  fieldId: string;
  reviewerNote: string;
  isResolved: boolean;
  createdAt: number;
}
