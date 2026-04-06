export type LeadAssignmentDraft = {
  leadId: number;
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
  deactivateActiveForLead(leadId: number): Promise<unknown>;
  findActiveByLead(leadId: number): Promise<LeadAssignment | undefined>;
};
