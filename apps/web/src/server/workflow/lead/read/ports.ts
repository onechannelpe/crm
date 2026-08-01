import type { Ruc } from "~/domain/identity/document";
import type {
  LeadSourceStatus,
  RateProposal,
  RateRevision,
} from "~/server/workflow/lead/domain/rows";
import type {
  LeadCommercialScope,
  LeadState,
} from "~/server/workflow/lead/domain/state";

// Each query depends on the narrow shape it needs; the concrete write repos
// satisfy these structurally when the repo bag is passed in. Keeps read
// modules from importing write modules.

export type LeadReader = {
  findById(id: string): Promise<LeadState | undefined>;
};

export type LeadDetailReader = LeadReader & {
  findCommercialScope(leadId: string): Promise<LeadCommercialScope | undefined>;
};

export type RateProposalReader = {
  listByLeadId(leadId: string): Promise<RateProposal[]>;
};

export type RateRevisionReader = {
  listByLeadId(leadId: string): Promise<RateRevision[]>;
};

export type SourceStatusReader = {
  findByRuc(ruc: Ruc, asOf: Date): Promise<LeadSourceStatus>;
};
