export type LeadAssignmentRepositoryPort = {
  replaceActiveAssignment(input: {
    leadId: number;
    toExecutiveId: number;
    assignedBy: number;
    assignedAt: number;
  }): Promise<void>;
};
