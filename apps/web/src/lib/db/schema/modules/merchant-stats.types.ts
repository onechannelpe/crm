import type { ColumnType, Generated } from "kysely";

import type { Json } from "~/contracts/json";
import type {
  BranchId,
  FileAssetId,
  GeneratedId,
  GpvSnapshotId,
  GpvSnapshotIssueId,
  GpvSnapshotJobId,
  GpvSnapshotPlacementId,
  IdColumn,
  MerchantMonthCreditAdjustmentId,
  NullableIdColumn,
  OrganizationId,
  UserId,
} from "~/server/shared/ids";

export type MerchantProduct = "CULQIFULL" | "CULQILINK" | "CULQIONLINE";
export type GpvSnapshotState =
  | "queued"
  | "processing"
  | "needs_review"
  | "ready"
  | "active"
  | "superseded"
  | "rejected"
  | "failed";
export type GpvSnapshotIssueSeverity = "warning" | "blocking";
export type GpvSnapshotIssueStatus = "open" | "resolved";
export type GpvSnapshotIssueResolution =
  | "accept_candidate"
  | "keep_previous"
  | "exclude_candidate"
  | "reject_snapshot";

export interface GpvSnapshotsTable {
  id: GeneratedId<GpvSnapshotId>;
  file_asset_id: IdColumn<FileAssetId>;
  cut_at: Date;
  revision: number;
  state: Generated<GpvSnapshotState>;
  uploaded_at: Date;
  activated_by: NullableIdColumn<UserId>;
  activated_at: Date | null;
}

export interface GpvSnapshotJobsTable {
  id: GeneratedId<GpvSnapshotJobId>;
  snapshot_id: IdColumn<GpvSnapshotId>;
  queue_state: Generated<"pending" | "processing" | "done" | "failed">;
  rows_total: number | null;
  rows_applied: number | null;
  rows_failed: number | null;
  results_json: Json | null;
  error_message: string | null;
  lease_owner: string | null;
  attempt_count: ColumnType<number, number | undefined, number>;
  max_attempts: number;
  claimable_at: Date;
  created_at: Date;
  completed_at: Date | null;
}

export interface MerchantGpvDatasetTable {
  id: "default";
  updated_at: Date;
}

export interface GpvSnapshotPlacementsTable {
  id: GeneratedId<GpvSnapshotPlacementId>;
  snapshot_id: IdColumn<GpvSnapshotId>;
  row_number: number;
  placement_key: string;
  merchant_id: string;
  product: string;
  serial_number: string | null;
  ruc: string;
  sold_at: string;
  sale_month: string;
  trade_name: string | null;
  legal_name: string | null;
  culqi_user_code: string | null;
  culqi_user_name: string | null;
  mesa: string | null;
  channel: string | null;
  subchannel: string | null;
  offer_amount: number | null;
  promotion: string | null;
  client_type: string | null;
  stock_type: string | null;
  trial_at: string | null;
  activated_at: string | null;
  last_transaction_at: string | null;
  m0_plus_15d_gpv: number | null;
  m0_plus_15d_trx: number | null;
  raw: Json;
}

export interface GpvSnapshotObservationsTable {
  snapshot_id: IdColumn<GpvSnapshotId>;
  placement_id: IdColumn<GpvSnapshotPlacementId>;
  month_offset: number;
  sale_month: string;
  realized_month: Generated<string>;
  gpv: number;
  trx: number;
}

export interface GpvSnapshotIssuesTable {
  id: GeneratedId<GpvSnapshotIssueId>;
  snapshot_id: IdColumn<GpvSnapshotId>;
  issue_key: string;
  issue_type: string;
  entity_key: string | null;
  severity: GpvSnapshotIssueSeverity;
  status: Generated<GpvSnapshotIssueStatus>;
  detail: string;
  previous_value: Json | null;
  candidate_value: Json | null;
  resolution: GpvSnapshotIssueResolution | null;
  resolved_by: NullableIdColumn<UserId>;
  resolved_at: Date | null;
  created_at: Date;
}

export interface MerchantMonthCreditsTable {
  ruc: string;
  month: string;
  organization_id: IdColumn<OrganizationId>;
  seller_user_id: IdColumn<UserId>;
  branch_id: NullableIdColumn<BranchId>;
  first_snapshot_id: IdColumn<GpvSnapshotId>;
  credited_at: Date;
}

export interface MerchantMonthCreditAdjustmentsTable {
  id: GeneratedId<MerchantMonthCreditAdjustmentId>;
  ruc: string;
  month: string;
  seller_user_id: NullableIdColumn<UserId>;
  branch_id: NullableIdColumn<BranchId>;
  reason: string;
  adjusted_by: IdColumn<UserId>;
  adjusted_at: Date;
}

export interface MerchantGpvTargetsTable {
  organization_id: IdColumn<OrganizationId>;
  effective_from: string;
  monthly_target_gpv: number | null;
  set_by: IdColumn<UserId>;
  set_at: Date;
}

export interface MerchantSalesView {
  id: IdColumn<GpvSnapshotPlacementId>;
  merchant_id: string;
  product: string;
  serial_number: string | null;
  ruc: string;
  sold_at: string;
  sale_month: string;
  trade_name: string | null;
  legal_name: string | null;
  culqi_user_code: string | null;
  culqi_user_name: string | null;
  mesa: string | null;
  channel: string | null;
  subchannel: string | null;
  offer_amount: number | null;
  promotion: string | null;
  client_type: string | null;
  stock_type: string | null;
  trial_at: string | null;
  activated_at: string | null;
  last_transaction_at: string | null;
  m0_plus_15d_gpv: number | null;
  m0_plus_15d_trx: number | null;
}

export interface MerchantSaleGpvView {
  sale_id: IdColumn<GpvSnapshotPlacementId>;
  month_offset: number;
  sale_month: string;
  realized_month: string;
  gpv: number;
  trx: number;
}

export interface MerchantMonthlyGpvView {
  ruc: string;
  month: string;
  gpv: number;
  trx: number;
  device_count: number;
}

export interface MerchantMonthCreditView {
  ruc: string;
  month: string;
  organization_id: IdColumn<OrganizationId>;
  seller_user_id: NullableIdColumn<UserId>;
  branch_id: NullableIdColumn<BranchId>;
  method: "crm_owner" | "manual";
  confidence: "exact" | "none";
  evidence: Json;
  derived_at: Date;
  resolved_by: NullableIdColumn<UserId>;
  resolved_at: Date | null;
}
