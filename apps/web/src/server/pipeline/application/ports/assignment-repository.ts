import type { LeadId } from "../../domain/lead-record";

export type LeadAssignmentDraft = {
  leadId: LeadId;
  executiveId: number;
  assignedBy: number;
  isActive: boolean;
  assignedAt: number;
};

export type LeadAssignment = LeadAssignmentDraft & {
  id: number;
};

export type LeadAssignmentRepository = {
  insert(values: LeadAssignmentDraft): Promise<number>;
  deactivateActiveForLead(leadId: LeadId): Promise<unknown>;
  findActiveByLead(leadId: LeadId): Promise<LeadAssignment | undefined>;
};
