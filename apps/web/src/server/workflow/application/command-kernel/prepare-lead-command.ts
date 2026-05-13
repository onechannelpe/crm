import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import type { LeadReadRepository } from "../../application/ports/lead-read-repository";
import type { LeadRecord } from "../../domain/lead-record";
import { leadNotFound } from "../../domain/lead/lead-errors";
import { authorizeLeadOperation } from "../../domain/lead/lead-policies";
import type { LeadOperation } from "../../domain/lead/lead-types";
import type { ActorContext } from "../contracts/actor-context";
import type { LeadClock } from "../services/lead-clock";

export type PreparedLeadCommand = {
  lead: LeadRecord;
  now: number;
};

export async function prepareLeadCommand(input: {
  leadReader: LeadReadRepository;
  clock: LeadClock;
  actor: ActorContext;
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
