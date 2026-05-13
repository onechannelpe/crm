import type { LeadAssignmentRepository } from "../../application/ports/assignment-repository";
import type { LeadAssignmentMutationRepository } from "../../application/ports/lead-assignment-mutation-repository";

export function createLeadAssignmentMutationRepository(
  assignments: LeadAssignmentRepository,
): LeadAssignmentMutationRepository {
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
