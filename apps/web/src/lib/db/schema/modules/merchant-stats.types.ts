import type { Json } from "~/contracts/json";
import type {
  BranchId,
  GeneratedId,
  IdColumn,
  IntegrationJobId,
  MerchantAccountId,
  MerchantSaleId,
  MerchantSaleMetricId,
  MerchantSalesImportRowId,
  MerchantSalesReportId,
  NullableIdColumn,
  OrganizationId,
  UserId,
  WorkflowLeadId,
} from "~/server/shared/ids";

// Vocab kept as string unions so the intake maps raw file values onto them and
// the boundary validates. Unknown values are stored raw rather than rejected.
export type MerchantProduct = "CULQIFULL" | "CULQILINK" | "CULQIONLINE";

export type MerchantImportRowState =
  | "applied"
  | "applied_unmatched"
  | "invalid"
  | "failed";

export interface MerchantSalesReportsTable {
  id: GeneratedId<MerchantSalesReportId>;
  job_id: IdColumn<IntegrationJobId>;
  cut_date: Date;
  source_filename: string;
  uploaded_by: IdColumn<UserId>;
  rows_total: number;
  rows_matched: number;
  rows_unmatched: number;
  created_at: Date;
}

export interface MerchantSalesTable {
  id: GeneratedId<MerchantSaleId>;
  merchant_id: string;
  serial_number: string | null;
  ruc: string;
  organization_id: NullableIdColumn<OrganizationId>;
  lead_id: NullableIdColumn<WorkflowLeadId>;
  product: string;
  sold_at: Date;
  sale_month: Date;
  trade_name: string | null;
  legal_name: string | null;
  registered_seller_code: string | null;
  registered_seller_name: string | null;
  mesa: string | null;
  channel: string | null;
  subchannel: string | null;
  offer_amount: number | null;
  promotion: string | null;
  client_type: string | null;
  stock_type: string | null;
  trial_at: Date | null;
  activated_at: Date | null;
  last_transaction_at: Date | null;
  last_15d_gpv: number | null;
  last_15d_trx: number | null;
  first_seen_report_id: IdColumn<MerchantSalesReportId>;
  last_seen_report_id: IdColumn<MerchantSalesReportId>;
  created_at: Date;
  updated_at: Date;
}

export interface MerchantAccountsTable {
  id: GeneratedId<MerchantAccountId>;
  ruc: string;
  organization_id: NullableIdColumn<OrganizationId>;
  real_seller_user_id: NullableIdColumn<UserId>;
  real_seller_label: string | null;
  branch_id: NullableIdColumn<BranchId>;
  projected_gpv: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface MerchantSaleMetricsTable {
  id: GeneratedId<MerchantSaleMetricId>;
  report_id: IdColumn<MerchantSalesReportId>;
  merchant_sale_id: IdColumn<MerchantSaleId>;
  month: Date;
  month_offset: number;
  gpv: number;
  trx: number;
}

export interface MerchantSalesImportRowsTable {
  id: GeneratedId<MerchantSalesImportRowId>;
  report_id: IdColumn<MerchantSalesReportId>;
  row_number: number;
  ruc: string;
  merchant_id: string | null;
  serial_number: string | null;
  state: MerchantImportRowState;
  merchant_sale_id: NullableIdColumn<MerchantSaleId>;
  failure_reason: string | null;
  raw_row: Json;
  created_at: Date;
}
