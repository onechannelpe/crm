import type { Generated, ColumnType } from "kysely";

import type {
  GeneratedId,
  IdColumn,
  SearchEnrichmentJobId,
  UserId,
} from "~/server/shared/ids";

export interface ClientSearchViewsTable {
  id: Generated<string>;
  user_id: IdColumn<UserId>;
  name: string;
  search_type: "people" | "companies" | "mixed";
  query_value: string;
  limit_value: number;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SearchEnrichmentJobsTable {
  id: GeneratedId<SearchEnrichmentJobId>;
  document_type: "dni" | "ruc";
  document_value: string;
  status: "queued" | "running" | "succeeded" | "failed";
  queue_state: "pending" | "processing" | "done" | "failed";
  requested_by_user_id: IdColumn<UserId>;
  requested_at: Date;
  completed_at: Date | null;
  lease_owner: string | null;
  lease_until: Date | null;
  attempt_count: number;
  max_attempts: number;
  available_at: Date;
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
  economic_activities_json: unknown | null;
  source: "sunat";
  fetched_at: Date;
  expires_at: Date;
  payload_json: unknown;
}

export interface SearchEnrichmentCompletionOutboxTable {
  id: Generated<string>;
  document_type: "dni" | "ruc";
  document_value: string;
  legal_name: string | null;
  address: string | null;
  district: string | null;
  department: string | null;
  fetched_at: Date;
  queue_state: "pending" | "processing" | "done" | "failed";
  attempt_count: ColumnType<number, number | undefined, number>;
  max_attempts: ColumnType<number, number | undefined, number>;
  available_at: Date;
  lease_owner: string | null;
  lease_until: Date | null;
  error_message: string | null;
  created_at: Date;
  processed_at: Date | null;
}
