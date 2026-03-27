export type SalesRecordSource = "lead_assignment" | "manual";
export type SalesRecordAttemptOutcome =
  | "no_answer"
  | "callback_scheduled"
  | "validated"
  | "invalid_data"
  | "rejected";

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

export interface SalesRecordQueueItem {
  id: number;
  status: string;
  companyName: string | null;
  contactName: string | null;
  contactDni: string | null;
  executiveName: string;
  createdAt: number;
  updatedAt: number;
}

export interface SalesRecordProductOption {
  id: number;
  name: string;
  category: string;
  subtype: string | null;
  price: number;
}

export interface SalesRecordBootstrap {
  source: SalesRecordSource;
  leadAssignmentId: number | null;
  client: SalesRecordClientInput;
}

export interface SalesRecordFixContext {
  id: number;
  status: string;
  client: {
    ruc: string | null;
    companyName: string | null;
    contactName: string | null;
    dni: string | null;
    phones: string[];
  } | null;
  addresses: Array<{
    id: number;
    addressType: string;
    fullText: string;
    isPrimary: number;
  }>;
  products: Array<{
    id: number;
    productName: string;
    quantity: number;
  }>;
  attempts: Array<{
    id: number;
    outcome: SalesRecordAttemptOutcome;
    notes: string | null;
    nextAttemptAt: number | null;
    createdAt: number;
    reviewerName: string;
  }>;
}
