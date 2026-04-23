export type LeadAssignmentDraft = {
  leadId: string;
  executiveId: number;
  assignedBy: number;
  isActive: boolean;
  assignedAt: number;
};

export type LeadAssignment = LeadAssignmentDraft & {
  id: string;
};

export type LeadAssignmentRepository = {
  insert(values: LeadAssignmentDraft): Promise<string>;
  deactivateActiveForLead(leadId: string): Promise<unknown>;
  findActiveByLead(leadId: string): Promise<LeadAssignment | undefined>;
};
