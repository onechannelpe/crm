import type { PipelineAuditService } from "../../application/ports/audit-service";
import type { LeadAuditRepository } from "../../ports/lead-audit-repository";

export function createLeadAuditRepository(
  auditService: PipelineAuditService,
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
