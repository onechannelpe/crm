export type LeadAssignmentRepositoryPort = {
  replaceActiveAssignment(input: {
    leadId: string;
    toExecutiveId: number;
    assignedBy: number;
    assignedAt: number;
  }): Promise<void>;
};
