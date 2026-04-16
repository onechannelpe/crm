import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import { leadNotFound, invalidLeadInput } from "../../domain/lead/lead-errors";
import { authorizeLeadOperation } from "../../domain/lead/lead-policies";
import type { LeadAuditRepository } from "../../ports/lead-audit-repository";
import type { LeadEventRepository } from "../../ports/lead-event-repository";
import type { LeadReadRepository } from "../../ports/lead-read-repository";
import type { LeadWriteRepository } from "../../ports/lead-write-repository";
import type { AddLeadNoteInput } from "../contracts/command-inputs";
import type { LeadInteractionResult } from "../contracts/command-results";
import type { LeadClock } from "../services/lead-clock";
import { executeLeadMutation } from "../services/lead-mutation-orchestrator";

type AddLeadNoteCommandDeps = {
  leadReader: LeadReadRepository;
  leadWriter: LeadWriteRepository;
  eventRepository: LeadEventRepository;
  auditRepository: LeadAuditRepository;
  clock: LeadClock;
};

export async function addLeadNoteCommand(
  deps: AddLeadNoteCommandDeps,
  input: AddLeadNoteInput,
): Promise<Result<LeadInteractionResult, DomainError>> {
  const body = input.body.trim();
  if (!body) {
    return invalidLeadInput("note_required", "Note body is required");
  }

  const lead = await deps.leadReader.findById(input.leadId);
  if (!lead) {
    return leadNotFound();
  }

  const canOperate = authorizeLeadOperation({
    actorUserId: input.actor.userId,
    actorRole: input.actor.role,
    leadExecutiveId: lead.executiveId,
    operation: "interact",
  });
  if (!canOperate.ok) {
    return canOperate;
  }

  const now = deps.clock.now();
  const outcome = await executeLeadMutation({
    deps,
    lead,
    actorUserId: input.actor.userId,
    now,
    intent: {
      kind: "add_note",
      body,
    },
  });
  if (!outcome.ok) {
    return outcome;
  }

  const interactionId = outcome.value.historyIds[0] ?? now;
  return Ok({ interactionId });
}
