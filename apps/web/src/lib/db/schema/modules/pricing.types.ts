import type { Generated } from "kysely";

import type { Moneda } from "~/contracts/workflow/vocabulary";

// Each proposal round is stored separately; reads derive the current rate from
// the latest round for the lead.
export interface WorkflowRateProposalsTable {
  id: string;
  lead_id: string;
  round: number;
  tarifa_debito: number;
  tarifa_credito: number;
  tarifa_foraneo: number;
  fee: number;
  payback_pricing: number;
  moneda: Moneda;
  proposed_by: number;
  proposed_at: number;
  outcome: "pending" | "accepted" | "revision_requested";
  decided_at: number | null;
}

// Revision requests stay linked to the proposal round they reject.
export interface WorkflowRateRevisionsTable {
  id: string;
  lead_id: string;
  proposal_id: string;
  round: number;
  justification: string;
  requested_by: number;
  requested_at: number;
}

export interface WorkflowRateRevisionFilesTable {
  id: Generated<number>;
  lead_id: string;
  revision_id: string;
  artifact_id: string;
  file_asset_id: number;
  uploaded_by_user_id: number;
  created_at: number;
}
