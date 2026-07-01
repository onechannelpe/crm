import type { Currency } from "~/contracts/workflow/vocabulary";
import type {
  BranchId,
  FileAssetId,
  GeneratedId,
  IdColumn,
  UserId,
  WorkflowArtifactId,
  WorkflowLeadId,
  WorkflowRateProposalId,
  WorkflowRateRevisionId,
} from "~/server/shared/ids";

// Each proposal round is stored separately; reads derive the current rate from
// the latest round for the lead.
export interface WorkflowRateProposalsTable {
  id: IdColumn<WorkflowRateProposalId>;
  lead_id: IdColumn<WorkflowLeadId>;
  round: number;
  proposed_debit_rate: number;
  proposed_credit_rate: number;
  proposed_foreign_rate: number;
  fee: number;
  payback_pricing: number;
  currency: Currency;
  proposed_by: IdColumn<UserId>;
  proposed_at: Date;
  outcome: "pending" | "accepted" | "revision_requested";
  decided_at: Date | null;
}

export interface WorkflowRateProposalPoliciesTable {
  branch_id: IdColumn<BranchId>;
  validity_days: number;
  updated_at: Date;
  updated_by_user_id: IdColumn<UserId>;
}

// Revision requests stay linked to the proposal round they reject.
export interface WorkflowRateRevisionsTable {
  id: IdColumn<WorkflowRateRevisionId>;
  lead_id: IdColumn<WorkflowLeadId>;
  proposal_id: IdColumn<WorkflowRateProposalId>;
  round: number;
  justification: string;
  requested_by: IdColumn<UserId>;
  requested_at: Date;
}

export interface WorkflowRateRevisionFilesTable {
  id: GeneratedId<WorkflowRateRevisionId>;
  lead_id: IdColumn<WorkflowLeadId>;
  revision_id: IdColumn<WorkflowRateRevisionId>;
  artifact_id: IdColumn<WorkflowArtifactId>;
  file_asset_id: IdColumn<FileAssetId>;
  uploaded_by_user_id: IdColumn<UserId>;
  created_at: Date;
}
