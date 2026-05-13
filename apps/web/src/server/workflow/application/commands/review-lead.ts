import type { LeadCommandResult } from "~/contracts/workflow";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import { prepareLeadCommand } from "../command-kernel/prepare-lead-command";
import type { ReviewLeadInput } from "../contracts/command-inputs";
import {
  parseRequiredLeadPriority,
  parseRequiredLeadStatus,
} from "../../domain/lead-schema-parser";
import type { LeadMutationUow } from "../ports/lead-mutation-uow";
import type { LeadReadRepository } from "../ports/lead-read-repository";
import type { LeadClock } from "../services/lead-clock";

type ReviewLeadCommandDeps = {
  leadReader: LeadReadRepository;
  mutationUow: LeadMutationUow;
  clock: LeadClock;
};

export async function reviewLeadCommand(
  deps: ReviewLeadCommandDeps,
  input: ReviewLeadInput,
): Promise<Result<LeadCommandResult, DomainError>> {
  const prepared = await prepareLeadCommand({
    leadReader: deps.leadReader,
    clock: deps.clock,
    actor: input.actor,
    leadId: input.leadId,
    operation: "review",
  });
  if (!prepared.ok) {
    return prepared;
  }

  const status = parseRequiredLeadStatus(input.status);
  if (!status.ok) {
    return status;
  }

  const prioridad = parseRequiredLeadPriority(input.prioridad);
  if (!prioridad.ok) {
    return prioridad;
  }

  const outcome = await deps.mutationUow.commit({
    lead: prepared.value.lead,
    actorUserId: input.actor.userId,
    now: prepared.value.now,
    intent: {
      kind: "review",
      status: status.value,
      prioridad: prioridad.value,
      reason: input.reason,
    },
  });
  if (!outcome.ok) {
    return outcome;
  }

  return Ok({ leadId: prepared.value.lead.id });
}
