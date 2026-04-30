import type { Generated } from "kysely";

export interface AuditLogsTable {
  id: Generated<number>;
  user_id: number;
  action: string;
  entity_type: string;
  entity_id: number;
  changes: string | null;
  created_at: number;
}

export interface AuditActionPoliciesTable {
  action: string;
  risk_level: "high" | "medium" | "low";
  is_active: number;
  is_protected: number;
  updated_by_user_id: number | null;
  created_at: number;
  updated_at: number;
}

export interface ReportExportJobsTable {
  id: Generated<number>;
  requested_by_user_id: number;
  branch_id: number;
  format: "csv" | "xlsx";
  filters_json: string;
  status: "queued" | "running" | "completed" | "failed" | "expired";
  rows_count: number | null;
  file_storage_key: string | null;
  file_sha256: string | null;
  error_message: string | null;
  requested_at: number;
  completed_at: number | null;
  expires_at: number | null;
  lease_owner: string | null;
  lease_until: number | null;
  attempt_count: number;
  max_attempts: number;
  available_at: number | null;
}

export interface ReportExportDownloadsTable {
  id: Generated<number>;
  export_job_id: number;
  downloaded_by_user_id: number;
  downloaded_at: number;
  ip_hash: string | null;
  user_agent_hash: string | null;
}
