import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import type { LeadReadRepository } from "../../ports/lead-read-repository";
import { prepareLeadCommand } from "../command-kernel/prepare-lead-command";
import { requireFirstHistoryId } from "../command-kernel/require-history-id";
import type { LogLeadCallInput } from "../contracts/command-inputs";
import type { LeadInteractionResult } from "../contracts/command-results";
import type { LeadMutationUow } from "../ports/lead-mutation-uow";
import type { LeadClock } from "../services/lead-clock";

type LogLeadCallCommandDeps = {
  leadReader: LeadReadRepository;
  mutationUow: LeadMutationUow;
  clock: LeadClock;
};

export async function logLeadCallCommand(
  deps: LogLeadCallCommandDeps,
  input: LogLeadCallInput,
): Promise<Result<LeadInteractionResult, DomainError>> {
  const prepared = await prepareLeadCommand({
    leadReader: deps.leadReader,
    clock: deps.clock,
    actor: input.actor,
    leadId: input.leadId,
    operation: "interact",
  });
  if (!prepared.ok) {
    return prepared;
  }

  const outcome = await deps.mutationUow.commit({
    lead: prepared.value.lead,
    actorUserId: input.actor.userId,
    now: prepared.value.now,
    intent: {
      kind: "log_call",
      outcome: input.outcome,
      notes: input.notes?.trim() ?? null,
    },
  });
  if (!outcome.ok) {
    return outcome;
  }

  const interactionId = requireFirstHistoryId(
    outcome.value.historyIds,
    "missing_interaction_history_id",
  );
  if (!interactionId.ok) {
    return interactionId;
  }

  return Ok({ interactionId: interactionId.value });
}
