import type { Generated } from "kysely";

export interface SalesRecordsTable {
  id: Generated<number>;
  source: "lead_assignment" | "manual";
  status:
    | "draft"
    | "submitted_for_confirmation"
    | "confirmed"
    | "rejected"
    | "cancelled";
  executive_user_id: number;
  lead_assignment_id: number | null;
  branch_id: number;
  submitted_at: number | null;
  confirmed_at: number | null;
  rejected_at: number | null;
  cancelled_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface SalesRecordClientTable {
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

export interface SalesRecordAddressesTable {
  id: Generated<number>;
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

export interface SalesRecordProductsTable {
  id: Generated<number>;
  sales_record_id: number;
  product_id: number;
  product_name_snapshot: string;
  category_snapshot: string;
  subtype_snapshot: string | null;
  quantity: number;
  unit_price_snapshot: number | null;
  created_at: number;
}

export interface SalesRecordAttemptsTable {
  id: Generated<number>;
  sales_record_id: number;
  reviewer_user_id: number;
  outcome:
    | "no_answer"
    | "callback_scheduled"
    | "validated"
    | "invalid_data"
    | "rejected";
  notes: string | null;
  next_attempt_at: number | null;
  created_at: number;
}

export type Db = {
  sales_records: SalesRecordsTable;
  sales_record_client: SalesRecordClientTable;
  sales_record_addresses: SalesRecordAddressesTable;
  sales_record_products: SalesRecordProductsTable;
  sales_record_attempts: SalesRecordAttemptsTable;
};
