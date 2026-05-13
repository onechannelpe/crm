export type LeadAssignmentMutationRepository = {
  replaceActiveAssignment(input: {
    leadId: string;
    toExecutiveId: number;
    assignedBy: number;
    assignedAt: number;
  }): Promise<void>;
};
