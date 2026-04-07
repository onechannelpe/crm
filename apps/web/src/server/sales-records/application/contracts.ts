import type {
  SalesRecordAttemptOutcome,
  SalesRecordSource,
  SalesRecordStatus,
} from "~/server/sales-records/domain/types";

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
  leadAssignmentId: number | null;
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
  leadAssignmentId: number | null;
  client: SalesRecordClientInput;
}

interface SalesRecordFixContextClientView {
  ruc: string | null;
  companyName: string | null;
  contactName: string | null;
  dni: string | null;
  phones: string[];
}

interface SalesRecordFixContextAddressView {
  id: number;
  addressType: string;
  fullText: string;
  isPrimary: number;
}

interface SalesRecordFixContextProductView {
  id: number;
  productName: string;
  quantity: number;
}

interface SalesRecordFixContextAttemptView {
  id: number;
  outcome: SalesRecordAttemptOutcome;
  notes: string | null;
  nextAttemptAt: number | null;
  createdAt: number;
  reviewerName: string;
}

export interface SalesRecordFixContextView {
  id: number;
  status: SalesRecordStatus;
  client: SalesRecordFixContextClientView | null;
  addresses: SalesRecordFixContextAddressView[];
  products: SalesRecordFixContextProductView[];
  attempts: SalesRecordFixContextAttemptView[];
}
