import type { LeadId, UserId } from "../domain/lead-record";

export type LeadAssignmentRepositoryPort = {
  replaceActiveAssignment(input: {
    leadId: LeadId;
    toExecutiveId: UserId;
    assignedBy: UserId;
    assignedAt: number;
  }): Promise<void>;
};
