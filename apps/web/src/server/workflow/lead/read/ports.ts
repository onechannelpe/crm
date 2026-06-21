import type { Ruc } from "~/server/shared/document";
import type {
  LeadSourceStatus,
  RateProposal,
  RateRevision,
} from "~/server/workflow/lead/domain/rows";
import type {
  LeadCommercialScope,
  LeadState,
} from "~/server/workflow/lead/domain/state";

// Consumer-defined ports for the read side. Each query depends on the narrow
// shape it needs; the concrete write repos satisfy these structurally when the
// repo bag is passed in. This keeps read modules from importing write modules.

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
  findByRuc(ruc: Ruc): Promise<LeadSourceStatus>;
};
