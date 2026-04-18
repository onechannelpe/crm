import type { UserId } from "~/server/shared/ids";

import type { LeadId } from "../../domain/lead-record";

export type LeadAssignmentDraft = {
  leadId: LeadId;
  executiveId: UserId;
  assignedBy: UserId;
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
