import type { WorkflowAuditService } from "../application/ports/gateways";
import type { LeadAuditRepository } from "../application/ports/lead";

export function createLeadAuditRepository(
  auditService: WorkflowAuditService,
): LeadAuditRepository {
  return {
    async append(input) {
      await auditService.log(
        input.actorUserId,
        input.action,
        "lead",
        input.entityId,
        input.changes,
      );
    },
  };
}
