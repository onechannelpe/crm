import type { AssignmentId, BranchId, UserId } from "~/server/shared/ids";

import type {
  SalesRecordAttemptOutcome,
  SalesRecordSource,
  SalesRecordStatus,
} from "../../domain/types";

export interface SalesRecordRecord {
  id: number;
  source: SalesRecordSource;
  status: SalesRecordStatus;
  executive_user_id: UserId;
  lead_assignment_id: AssignmentId | null;
  branch_id: BranchId;
  submitted_at: number | null;
  confirmed_at: number | null;
  rejected_at: number | null;
  cancelled_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface SalesRecordClientRecord {
  sales_record_id: number;
  ruc: string | null;
  company_name: string | null;
  contact_name: string | null;
  dni: string | null;
  phones_json: string;
  engine_match_id: string | null;
  completeness_score: number;
  created_at: number;
  updated_at: number;
}

export interface SalesRecordAddressRecord {
  sales_record_id: number;
  address_type: "installation" | "billing" | "reference";
  full_text: string;
  department: string | null;
  province: string | null;
  district: string | null;
  ubigeo: string | null;
  latitude: number | null;
  longitude: number | null;
  is_primary: number;
  created_at: number;
  updated_at: number;
}

export interface SalesRecordProductLineRecord {
  sales_record_id: number;
  product_id: number;
  product_name_snapshot: string;
  category_snapshot: string;
  subtype_snapshot: string | null;
  quantity: number;
  unit_price_snapshot: number;
  created_at: number;
}

export interface SalesRecordAttemptRecord {
  sales_record_id: number;
  reviewer_user_id: UserId;
  outcome: SalesRecordAttemptOutcome;
  notes: string | null;
  next_attempt_at: number | null;
  created_at: number;
}

export interface SalesRecordAddressSnapshot {
  id: number;
  sales_record_id: number;
  address_type: string;
  full_text: string;
  department: string | null;
  province: string | null;
  district: string | null;
  ubigeo: string | null;
  latitude: number | null;
  longitude: number | null;
  is_primary: number;
  created_at: number;
  updated_at: number;
}

export interface SalesRecordProductSnapshot {
  id: number;
  sales_record_id: number;
  product_id: number;
  product_name_snapshot: string;
  category_snapshot: string;
  subtype_snapshot: string | null;
  quantity: number;
  unit_price_snapshot: number | null;
  created_at: number;
}

export interface PendingSalesRecordQueueRecord {
  id: number;
  status: SalesRecordStatus;
  created_at: number;
  updated_at: number;
  company_name: string | null;
  contact_name: string | null;
  dni: string | null;
  executive_name: string;
}

export interface ConfirmedSalesRecordQueueRecord {
  id: number;
  status: SalesRecordStatus;
  created_at: number;
  updated_at: number;
  confirmed_at: number | null;
  company_name: string | null;
  contact_name: string | null;
  dni: string | null;
  executive_name: string;
}

export interface SalesRecordAttemptDetailRecord {
  id: number;
  sales_record_id: number;
  reviewer_user_id: UserId;
  outcome: SalesRecordAttemptOutcome;
  notes: string | null;
  next_attempt_at: number | null;
  created_at: number;
  reviewer_name: string;
}

export interface SalesRecordRepository {
  create(values: Omit<SalesRecordRecord, "id">): Promise<number>;
  findById(id: number): Promise<SalesRecordRecord | undefined>;
  listPendingWithClient(scope?: {
    branchId?: BranchId;
  }): Promise<PendingSalesRecordQueueRecord[]>;
  listConfirmedWithClient(scope?: {
    branchId?: BranchId;
    executiveUserId?: UserId;
  }): Promise<ConfirmedSalesRecordQueueRecord[]>;
  updateStatus(
    id: number,
    status: SalesRecordStatus,
    patch: {
      submitted_at?: number | null;
      confirmed_at?: number | null;
      rejected_at?: number | null;
      cancelled_at?: number | null;
    },
  ): Promise<unknown>;
  touch(id: number, updatedAt: number): Promise<unknown>;
  upsertClient(values: SalesRecordClientRecord): Promise<unknown>;
  findClientByRecord(
    salesRecordId: number,
  ): Promise<SalesRecordClientRecord | undefined>;
  replaceAddresses(
    salesRecordId: number,
    addresses: SalesRecordAddressRecord[],
  ): Promise<void>;
  findAddressesByRecord(
    salesRecordId: number,
  ): Promise<SalesRecordAddressSnapshot[]>;
  replaceProducts(
    salesRecordId: number,
    products: SalesRecordProductLineRecord[],
  ): Promise<void>;
  findProductsByRecord(
    salesRecordId: number,
  ): Promise<SalesRecordProductSnapshot[]>;
  createAttempt(values: SalesRecordAttemptRecord): Promise<unknown>;
  listAttemptsByRecord(
    salesRecordId: number,
  ): Promise<SalesRecordAttemptDetailRecord[]>;
}
