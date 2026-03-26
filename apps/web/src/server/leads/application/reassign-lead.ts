import { createAuditService } from "~/server/shared/audit";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { createPipelineRepos } from "~/server/shared/pipeline-runtime";
import { runInPipelineTransaction } from "~/server/shared/pipeline-transaction";
import { type Result, Err, Ok } from "~/server/shared/result";

import { ensureLeadCanBeReassigned } from "../domain/lead-pipeline";

export async function reassignLeadUseCase(input: {
  leadId: number;
  newExecutiveId: number;
  actorId: number;
}): Promise<Result<void, DomainError>> {
  return runInPipelineTransaction(async (trx) => {
    const repos = createPipelineRepos(trx);
    const lead = await repos.leads.findById(input.leadId);
    if (!lead) {
      return Err(domainError("not_found", "lead_not_found", "Lead not found"));
    }

    const canReassign = ensureLeadCanBeReassigned({
      lead,
      newExecutiveId: input.newExecutiveId,
    });
    if (!canReassign.ok) return canReassign;

    const newExecutive = await repos.users.findById(input.newExecutiveId);
    if (!newExecutive || !newExecutive.is_active) {
      return Err(
        domainError(
          "validation",
          "invalid_executive",
          "Target executive not found or inactive",
        ),
      );
    }

    const now = Date.now();
    await repos.leadAssignments.deactivateActiveForLead(input.leadId);
    await repos.leadAssignments.insert({
      lead_id: input.leadId,
      executive_id: input.newExecutiveId,
      assigned_by: input.actorId,
      is_active: 1,
      assigned_at: now,
    });
    await repos.leads.updateById(input.leadId, {
      executive_id: input.newExecutiveId,
      updated_at: now,
    });

    const audit = createAuditService({ auditLogs: repos.auditLogs });
    await audit.log(input.actorId, "lead_reassigned", "lead", input.leadId, {
      from: lead.executive_id,
      to: input.newExecutiveId,
    });

    return Ok(undefined);
  });
}
