export const SALES_RECORD_SOURCES = ["lead_assignment", "manual"] as const;
export const SALES_RECORD_STATUSES = [
  "draft",
  "submitted_for_confirmation",
  "confirmed",
  "rejected",
  "cancelled",
] as const;
export const SALES_RECORD_ATTEMPT_OUTCOMES = [
  "no_answer",
  "callback_scheduled",
  "validated",
  "invalid_data",
  "rejected",
] as const;

import type { AssignmentId } from "~/server/shared/ids";

export type SalesRecordSource = (typeof SALES_RECORD_SOURCES)[number];
export type SalesRecordStatus = (typeof SALES_RECORD_STATUSES)[number];
export type SalesRecordAttemptOutcome =
  (typeof SALES_RECORD_ATTEMPT_OUTCOMES)[number];

export interface SalesRecordClientInput {
  ruc: string | null;
  companyName: string | null;
  contactName: string | null;
  dni: string | null;
  phones: string[];
  engineMatchId: string | null;
  completenessScore: number;
}

export interface SalesRecordAddressInput {
  addressType: "installation" | "billing" | "reference";
  fullText: string;
  department: string | null;
  province: string | null;
  district: string | null;
  ubigeo: string | null;
  latitude: number | null;
  longitude: number | null;
  isPrimary: boolean;
}

export interface SalesRecordProductInput {
  productId: number;
  quantity: number;
}

export interface CreateSalesRecordDraftInput {
  source: SalesRecordSource;
  leadAssignmentId: AssignmentId | null;
  client: SalesRecordClientInput;
  addresses: SalesRecordAddressInput[];
  products: SalesRecordProductInput[];
}

export interface UpdateSalesRecordDraftInput {
  client: SalesRecordClientInput;
  addresses: SalesRecordAddressInput[];
  products: SalesRecordProductInput[];
}

export interface RegisterSalesRecordAttemptInput {
  recordId: number;
  outcome: SalesRecordAttemptOutcome;
  notes: string | null;
  nextAttemptAt: number | null;
}

export type SalesRecordDraftCreatedResult = {
  id: number;
};

export type SalesRecordMutationResult = {
  success: true;
};

export interface SalesRecordQueueItemView {
  id: number;
  status: SalesRecordStatus;
  companyName: string | null;
  contactName: string | null;
  contactDni: string | null;
  executiveName: string;
  createdAt: number;
  updatedAt: number;
}

export interface SalesRecordProductOptionView {
  id: number;
  name: string;
  category: string;
  subtype: string | null;
  price: number;
}

export interface SalesRecordBootstrapView {
  source: SalesRecordSource;
  leadAssignmentId: AssignmentId | null;
  client: SalesRecordClientInput;
}

interface ContextClient {
  ruc: string | null;
  companyName: string | null;
  contactName: string | null;
  dni: string | null;
  phones: string[];
}

interface ContextAddress {
  id: number;
  addressType: string;
  fullText: string;
  isPrimary: number;
}

interface ContextProduct {
  id: number;
  productName: string;
  quantity: number;
}

interface ContextAttempt {
  id: number;
  outcome: SalesRecordAttemptOutcome;
  notes: string | null;
  nextAttemptAt: number | null;
  createdAt: number;
  reviewerName: string;
}

export interface SalesRecordEditContextView {
  id: number;
  status: SalesRecordStatus;
  client: ContextClient | null;
  addresses: ContextAddress[];
  products: ContextProduct[];
  attempts: ContextAttempt[];
}
