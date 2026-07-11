import type { ColumnType, Generated } from "kysely";

import type { Json } from "~/contracts/json";
import type {
  GeneratedId,
  IdColumn,
  IntegrationJobId,
  NullableIdColumn,
  UserId,
  WorkflowLeadId,
} from "~/server/shared/ids";

export interface WorkflowIntegrationJobsTable {
  id: GeneratedId<IntegrationJobId>;
  type: "export" | "import_status" | "import_prioridad";
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  queue_state: "pending" | "processing" | "done" | "failed";
  requested_by_user_id: IdColumn<UserId>;
  file_path: string | null;
  error_message: string | null;
  rows_total: number | null;
  rows_applied: number | null;
  rows_failed: number | null;
  results_json: Json | null;
  lease_owner: string | null;
  lease_until: Date | null;
  attempt_count: ColumnType<number, number | undefined, number>;
  max_attempts: number;
  available_at: Date;
  created_at: Date;
  completed_at: Date | null;
}

export interface WorkflowIntegrationImportRowsTable {
  id: Generated<string>;
  integration_job_id: IdColumn<IntegrationJobId>;
  row_number: number;
  type: "import_status" | "import_prioridad";
  ruc: string;
  status_value: string | null;
  prioridad_value: string | null;
  state: "staged" | "applied" | "failed";
  lead_id: NullableIdColumn<WorkflowLeadId>;
  failure_reason: string | null;
  created_at: Date;
  applied_at: Date | null;
}
