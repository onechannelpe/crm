import type { WorkflowAuditService } from "../../application/ports/audit-service";
import type { LeadAuditRepository } from "../../application/ports/lead-audit-repository";

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
