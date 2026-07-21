import type { Generated, ColumnType } from "kysely";

import type { SunatEconomicActivity } from "~/server/client-search/enrichment/sunat/contracts";
import type { GeneratedId, IdColumn, UserId } from "~/server/shared/ids";
import type { CompanyRegistryRecordId } from "~/server/shared/ids";

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

export interface CompanyRegistryRecordTable {
  id: GeneratedId<CompanyRegistryRecordId>;
  document_type: "dni" | "ruc";
  document_value: string;
  full_name: string | null;
  legal_name: string | null;
  address: string | null;
  district: string | null;
  department: string | null;
  contributor_status: string | null;
  contributor_condition: string | null;
  economic_activities_json: ColumnType<
    SunatEconomicActivity[] | null,
    string | null,
    string | null
  >;
  payload_json: ColumnType<unknown, string | null, string | null>;
  source: "sunat" | "engine" | null;
  fetched_at: Date | null;
  expires_at: Date | null;
  queue_state: "pending" | "processing" | "done" | "failed";
  lease_owner: string | null;
  attempt_count: ColumnType<number, number | undefined, number>;
  max_attempts: ColumnType<number, number | undefined, number>;
  claimable_at: Date;
  completed_at: Date | null;
  error_message: string | null;
  requested_by_user_id: IdColumn<UserId> | null;
  requested_at: Date;
}
