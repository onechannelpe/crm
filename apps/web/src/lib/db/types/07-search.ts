import type { Generated, ColumnType } from "kysely";

export interface ClientSearchViewsTable {
  id: Generated<number>;
  user_id: number;
  name: string;
  search_type:
    | "dni"
    | "ruc"
    | "phone"
    | "person_name"
    | "company_name"
    | "phone_enriched";
  query_value: string;
  limit_value: number;
  is_default: number;
  created_at: number;
  updated_at: number;
}

export interface SearchEnrichmentJobsTable {
  id: Generated<number>;
  document_type: "dni" | "ruc";
  document_value: string;
  status: "queued" | "running" | "succeeded" | "failed";
  requested_by_user_id: number;
  requested_at: number;
  completed_at: number | null;
  lease_owner: string | null;
  lease_until: number | null;
  attempt_count: number;
  max_attempts: number;
  next_attempt_at: number;
  last_error: string | null;
}

export interface SearchEnrichmentOverlaysTable {
  document_type: "dni" | "ruc";
  document_value: string;
  full_name: string | null;
  legal_name: string | null;
  address: string | null;
  district: string | null;
  department: string | null;
  contributor_status: string | null;
  contributor_condition: string | null;
  economic_activities_json: string | null;
  source: "sunat";
  fetched_at: number;
  expires_at: number;
  payload_json: string;
}

export interface SearchEnrichmentCompletionOutboxTable {
  id: Generated<number>;
  document_type: "dni" | "ruc";
  document_value: string;
  legal_name: string | null;
  address: string | null;
  district: string | null;
  department: string | null;
  fetched_at: number;
  status: "queued" | "running" | "completed" | "failed";
  attempt_count: ColumnType<number, number | undefined, number>;
  max_attempts: ColumnType<number, number | undefined, number>;
  available_at: number;
  lease_owner: string | null;
  lease_until: number | null;
  error_message: string | null;
  created_at: number;
  processed_at: number | null;
}

export type Db = {
  client_search_views: ClientSearchViewsTable;
  search_enrichment_jobs: SearchEnrichmentJobsTable;
  search_enrichment_overlays: SearchEnrichmentOverlaysTable;
  search_enrichment_completion_outbox: SearchEnrichmentCompletionOutboxTable;
};
