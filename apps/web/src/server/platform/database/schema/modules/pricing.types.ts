import type { Currency } from "~/contracts/workflow/vocabulary";
import type {
  BranchId,
  FileAssetId,
  GeneratedId,
  IdColumn,
  NullableIdColumn,
  UserId,
  WorkflowLeadId,
  WorkflowRateProposalId,
  WorkflowRateRevisionId,
  WorkflowRateRevisionFileId,
} from "~/domain/ids";

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

export interface WorkflowPendingQuotationPoliciesTable {
  branch_id: IdColumn<BranchId>;
  client_limit: number;
  updated_at: Date;
  updated_by_user_id: IdColumn<UserId>;
}

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
  id: GeneratedId<WorkflowRateRevisionFileId>;
  lead_id: IdColumn<WorkflowLeadId>;
  revision_id: NullableIdColumn<WorkflowRateRevisionId>;
  file_asset_id: IdColumn<FileAssetId>;
  uploaded_by_user_id: IdColumn<UserId>;
  created_at: Date;
}
