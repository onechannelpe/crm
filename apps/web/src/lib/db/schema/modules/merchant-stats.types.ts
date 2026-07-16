import type { Generated } from "kysely";

import type { Json } from "~/contracts/json";
import type {
  AttributionConfidence,
  AttributionMethod,
} from "~/contracts/merchant-stats/vocabulary";
import type {
  BranchId,
  GeneratedId,
  IdColumn,
  IntegrationJobId,
  MerchantReportId,
  MerchantSaleId,
  NullableIdColumn,
  UserId,
} from "~/server/shared/ids";

export type MerchantProduct = "CULQIFULL" | "CULQILINK" | "CULQIONLINE";

export interface MerchantReportsTable {
  id: GeneratedId<MerchantReportId>;
  job_id: IdColumn<IntegrationJobId>;
  content_sha256: string;
  cut_at: Date;
  storage_key: string;
  source_filename: string;
  uploaded_by: IdColumn<UserId>;
  rows_total: Generated<number>;
  rows_valid: Generated<number>;
  rows_rejected: Generated<number>;
  created_at: Date;
}

export interface MerchantReportRejectionsTable {
  report_id: IdColumn<MerchantReportId>;
  row_number: number;
  ruc: string | null;
  merchant_id: string | null;
  serial_number: string | null;
  reason: string;
  raw: Json;
}

export interface MerchantSalesTable {
  id: GeneratedId<MerchantSaleId>;
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
  first_seen_report_id: IdColumn<MerchantReportId>;
  last_seen_report_id: IdColumn<MerchantReportId>;
  created_at: Date;
  updated_at: Date;
}

export interface MerchantSaleGpvTable {
  sale_id: IdColumn<MerchantSaleId>;
  month_offset: number;
  sale_month: string;
  realized_month: Generated<string>;
  gpv: number;
  trx: number;
  cut_at: Date;
  report_id: IdColumn<MerchantReportId>;
}

export interface MerchantMonthlyGpvTable {
  ruc: string;
  month: string;
  gpv: number;
  trx: number;
  device_count: number;
}

export interface MerchantMonthlyAttributionTable {
  ruc: string;
  month: string;
  seller_user_id: NullableIdColumn<UserId>;
  branch_id: NullableIdColumn<BranchId>;
  method: AttributionMethod;
  confidence: AttributionConfidence;
  evidence: Json;
  resolved_by: NullableIdColumn<UserId>;
  resolved_at: Date | null;
  stamped_at: Date;
}

export interface MerchantTargetsTable {
  ruc: string;
  effective_from: string;
  projected_gpv: number | null;
  set_by: IdColumn<UserId>;
  set_at: Date;
}
