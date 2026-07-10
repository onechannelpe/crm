import type { Currency } from "~/contracts/workflow/vocabulary";
import type { SunatEconomicActivity } from "~/server/client-search/enrichment/sunat/contracts";
import type {
  FileAssetId,
  UserId,
  WorkflowLeadId,
  WorkflowRateProposalId,
  WorkflowRateRevisionId,
  WorkflowRateRevisionFileId,
} from "~/server/shared/ids";

export type RateProposalOutcome = "pending" | "accepted" | "revision_requested";

export type RateProposal = {
  id: WorkflowRateProposalId;
  leadId: WorkflowLeadId;
  round: number;
  proposedDebitRate: number;
  proposedCreditRate: number;
  proposedForeignRate: number;
  fee: number;
  paybackPricing: number;
  currency: Currency;
  proposedBy: UserId;
  proposedAt: Date;
  outcome: RateProposalOutcome;
  decidedAt: Date | null;
};

export type RateProposalNumbers = {
  proposedDebitRate: number;
  proposedCreditRate: number;
  proposedForeignRate: number;
  fee: number;
  paybackPricing: number;
  currency: Currency;
};

export type RateRevision = {
  id: WorkflowRateRevisionId;
  leadId: WorkflowLeadId;
  proposalId: WorkflowRateProposalId;
  round: number;
  justification: string;
  requestedBy: UserId;
  requestedAt: Date;
};

export type RateRevisionFile = {
  id: WorkflowRateRevisionFileId;
  revisionId: WorkflowRateRevisionId;
  fileAssetId: FileAssetId;
  uploadedByUserId: UserId;
  createdAt: Date;
};

export type SubmitReadyRevisionFile = {
  fileId: WorkflowRateRevisionFileId;
  fileAssetId: FileAssetId;
};

export type SunatSourceStatus =
  | "idle"
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "stale";

export type LeadSourceStatus = {
  sunat: {
    status: SunatSourceStatus;
    fetchedAt: Date | null;
    district: string | null;
    department: string | null;
    contributorStatus: string | null;
    contributorCondition: string | null;
    economicActivities: SunatEconomicActivity[];
    payloadAvailable: boolean;
  };
};
