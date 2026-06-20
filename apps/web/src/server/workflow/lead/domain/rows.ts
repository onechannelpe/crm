import type { Currency } from "~/contracts/workflow/vocabulary";
import type { SunatEconomicActivity } from "~/server/client-search/enrichment/sunat/contracts";

export type RateProposalOutcome = "pending" | "accepted" | "revision_requested";

export type RateProposal = {
  id: string;
  leadId: string;
  round: number;
  proposedDebitRate: number;
  proposedCreditRate: number;
  proposedForeignRate: number;
  fee: number;
  paybackPricing: number;
  currency: Currency;
  proposedBy: number;
  proposedAt: number;
  outcome: RateProposalOutcome;
  decidedAt: number | null;
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
  id: string;
  leadId: string;
  proposalId: string;
  round: number;
  justification: string;
  requestedBy: number;
  requestedAt: number;
};

export type RateRevisionFile = {
  revisionId: string;
  artifactId: string;
  fileAssetId: number;
  uploadedByUserId: number;
  createdAt: number;
};

export type SubmitReadyRevisionFile = {
  artifactId: string;
  fileAssetId: number;
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
    fetchedAt: number | null;
    district: string | null;
    department: string | null;
    contributorStatus: string | null;
    contributorCondition: string | null;
    economicActivities: SunatEconomicActivity[];
    payloadAvailable: boolean;
  };
};
