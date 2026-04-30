import type { Generated, ColumnType } from "kysely";

export interface WorkflowIntegrationJobsTable {
  id: Generated<string>;
  type: "export" | "import_status" | "import_prioridad";
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  requested_by_user_id: number;
  file_path: string | null;
  error_message: string | null;
  rows_total: number | null;
  rows_applied: number | null;
  rows_failed: number | null;
  results_json: string | null;
  lease_owner: string | null;
  lease_until: number | null;
  attempt_count: ColumnType<number, number | undefined, number>;
  max_attempts: number;
  available_at: number | null;
  created_at: number;
  completed_at: number | null;
}

export interface WorkflowIntegrationImportRowsTable {
  id: Generated<string>;
  integration_job_id: string;
  row_number: number;
  type: "import_status" | "import_prioridad";
  ruc: string;
  status_value: string | null;
  prioridad_value: string | null;
  state: "staged" | "applied" | "failed";
  lead_id: string | null;
  failure_reason: string | null;
  created_at: number;
  applied_at: number | null;
}

export interface WorkflowIntegrationOutboxNeedsExecutiveInputTable {
  id: Generated<string>;
  lead_id: string;
  ruc: string;
  executive_id: number;
  status: "pending" | "processing" | "completed" | "failed";
  attempt_count: ColumnType<number, number | undefined, number>;
  max_attempts: ColumnType<number, number | undefined, number>;
  available_at: number;
  lease_owner: string | null;
  lease_until: number | null;
  error_message: string | null;
  created_at: number;
  processed_at: number | null;
}

export interface WorkflowIntegrationOutboxReadyForQuotationTable {
  id: Generated<string>;
  lead_id: string;
  ruc: string;
  branch_id: number;
  status: "pending" | "processing" | "completed" | "failed";
  attempt_count: ColumnType<number, number | undefined, number>;
  max_attempts: ColumnType<number, number | undefined, number>;
  available_at: number;
  lease_owner: string | null;
  lease_until: number | null;
  error_message: string | null;
  created_at: number;
  processed_at: number | null;
}
