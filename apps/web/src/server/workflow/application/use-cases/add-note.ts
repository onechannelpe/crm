import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import { invalidLeadInput } from "../../domain/lead/lead-errors";
import type { LeadReadRepository } from "../ports/lead-read-repository";
import { prepareLeadCommand } from "../command-kernel/prepare-lead-command";
import { requireFirstHistoryId } from "../command-kernel/require-history-id";
import type { AddLeadNoteInput } from "../contracts/command-inputs";
import type { LeadInteractionResult } from "../contracts/command-results";
import type { LeadMutationUow } from "../ports/lead-mutation-uow";
import type { LeadClock } from "../services/lead-clock";

type AddLeadNoteCommandDeps = {
  leadReader: LeadReadRepository;
  mutationUow: LeadMutationUow;
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
      kind: "add_note",
      body,
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
