import type {
  SalesRecordAttemptOutcome,
  SalesRecordSource,
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
