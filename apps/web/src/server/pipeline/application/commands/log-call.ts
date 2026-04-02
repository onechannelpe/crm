import type { Role } from "~/lib/auth/access/rbac";
import type { LeadCallOutcome } from "~/lib/db/types";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { runInPipelineTransaction } from "~/server/shared/pipeline-transaction";
import { Err, Ok, type Result } from "~/server/shared/result";

import { createHistoryEvent } from "../../domain/history";
import {
  createPipelineAuditService,
  createPipelineDeps,
} from "../../infrastructure/deps";
import { requireLeadAccess, requireLeadReadAccess } from "../policies/access";

export async function logCall(input: {
  actorUserId: number;
  actorRole: Role;
  leadId: number;
  outcome: LeadCallOutcome;
  notes?: string | null;
}): Promise<Result<{ interactionId: number }, DomainError>> {
  const canRead = requireLeadReadAccess(input.actorRole);
  if (!canRead.ok) {
    return canRead;
  }

  return runInPipelineTransaction(async ({ executor }) => {
    const deps = createPipelineDeps(executor);
    const auditService = createPipelineAuditService(deps);
    const lead = await deps.leads.findById(input.leadId);
    if (!lead) {
      return Err(domainError("not_found", "lead_not_found", "Lead not found"));
    }

    const canAccessLead = requireLeadAccess({
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      executiveId: lead.executive_id,
    });
    if (!canAccessLead.ok) {
      return canAccessLead;
    }

    const now = Date.now();
    const historyId = await deps.leadHistory.insert(
      createHistoryEvent({
        leadId: input.leadId,
        eventType: "call_logged",
        actorUserId: input.actorUserId,
        payload: { outcome: input.outcome, notes: input.notes?.trim() ?? null },
        occurredAt: now,
      }),
    );
    await auditService.log(
      input.actorUserId,
      "call_logged",
      "lead",
      input.leadId,
      { historyId, outcome: input.outcome },
    );

    return Ok({ interactionId: historyId });
  });
}
