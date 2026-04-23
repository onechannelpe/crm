import type { LeadAssignmentRepository } from "../../application/ports/assignment-repository";
import type { LeadAssignmentRepositoryPort } from "../../ports/lead-assignment-repository";

export function createLeadAssignmentRepositoryPort(
  assignments: LeadAssignmentRepository,
): LeadAssignmentRepositoryPort {
  return {
    async replaceActiveAssignment(input) {
      await assignments.deactivateActiveForLead(input.leadId);
      await assignments.insert({
        leadId: input.leadId,
        executiveId: input.toExecutiveId,
        assignedBy: input.assignedBy,
        isActive: true,
        assignedAt: input.assignedAt,
      });
    },
  };
}
