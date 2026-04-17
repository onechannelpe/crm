import type { LeadId } from "../domain/lead-record";

export type LeadAssignmentRepositoryPort = {
  replaceActiveAssignment(input: {
    leadId: LeadId;
    toExecutiveId: number;
    assignedBy: number;
    assignedAt: number;
  }): Promise<void>;
};
