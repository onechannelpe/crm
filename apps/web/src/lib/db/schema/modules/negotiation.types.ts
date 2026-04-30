import type { Generated } from "kysely";

export interface WorkflowNegotiationRequestsTable {
  id: string;
  lead_id: string;
  round: number;
  justification: string;
  requested_by: number;
  requested_at: number;
}

export interface WorkflowNegotiationFilesTable {
  id: Generated<number>;
  lead_id: string;
  negotiation_request_id: string;
  artifact_id: string;
  file_asset_id: number;
  uploaded_by_user_id: number;
  created_at: number;
}
