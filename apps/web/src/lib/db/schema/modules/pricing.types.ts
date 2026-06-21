import type { Generated } from "kysely";

import type { Currency } from "~/contracts/workflow/vocabulary";

// Each proposal round is stored separately; reads derive the current rate from
// the latest round for the lead.
export interface WorkflowRateProposalsTable {
  id: string;
  lead_id: string;
  round: number;
  proposed_debit_rate: number;
  proposed_credit_rate: number;
  proposed_foreign_rate: number;
  fee: number;
  payback_pricing: number;
  currency: Currency;
  proposed_by: number;
  proposed_at: number;
  outcome: "pending" | "accepted" | "revision_requested";
  decided_at: number | null;
}

export interface WorkflowRateProposalPoliciesTable {
  branch_id: number;
  validity_days: number;
  updated_at: number;
  updated_by_user_id: number;
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
