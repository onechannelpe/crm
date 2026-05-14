import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/types";

import type { LeadRecord } from "../../domain/lead-record";
import { leadNotFound } from "../../domain/lead/lead-errors";
import { authorizeLeadOperation } from "../../domain/lead/lead-policies";
import type { LeadOperation } from "../../domain/lead/lead-types";
import type { LeadReadRepository } from "../ports/lead";
import type { LeadClock } from "../services/lead-clock";

export type PreparedLeadCommand = {
  lead: LeadRecord;
  now: number;
};

export async function prepareLeadCommand(input: {
  leadReader: LeadReadRepository;
  clock: LeadClock;
  actor: WorkflowActor;
  leadId: string;
  operation: LeadOperation;
}): Promise<Result<PreparedLeadCommand, DomainError>> {
  const lead = await input.leadReader.findById(input.leadId);
  if (!lead) {
    return leadNotFound();
  }

  const canOperate = authorizeLeadOperation({
    actorUserId: input.actor.userId,
    actorRole: input.actor.role,
    leadExecutiveId: lead.executiveId,
    operation: input.operation,
  });
  if (!canOperate.ok) {
    return canOperate;
  }

  return Ok({
    lead,
    now: input.clock.now(),
  });
}
