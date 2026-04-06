import type {
  SalesRecordAttemptOutcome,
  SalesRecordSource,
  SalesRecordStatus,
} from "~/server/sales-records/domain/types";

import type { SalesRecordClientInput } from "../../commands/types/draft-input";

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

export interface SalesRecordFixContextView {
  id: number;
  status: SalesRecordStatus;
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
