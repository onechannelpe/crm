import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import { invalidLeadInput, leadNotFound } from "../../domain/lead/lead-errors";
import type { ApplyImportedReviewInput } from "../contracts/command-inputs";
import type { LeadMutationUow } from "../ports/lead-mutation-uow";
import type { LeadReadRepository } from "../ports/lead-read-repository";
import type { LeadClock } from "../services/lead-clock";

type ApplyImportedReviewCommandDeps = {
  leadReader: LeadReadRepository;
  mutationUow: LeadMutationUow;
  clock: LeadClock;
};

export async function applyImportedReviewCommand(
  deps: ApplyImportedReviewCommandDeps,
  input: ApplyImportedReviewInput,
): Promise<Result<{ applied: boolean; leadId: string }, DomainError>> {
  const lead = await deps.leadReader.findById(input.leadId);
  if (!lead) {
    return leadNotFound();
  }

  if (input.type === "import_status" && input.status === undefined) {
    return invalidLeadInput("invalid_status", "Status is required");
  }
  if (input.type === "import_prioridad" && input.prioridad === undefined) {
    return invalidLeadInput("invalid_prioridad", "Prioridad is required");
  }

  const now = deps.clock.now();
  const outcome = await deps.mutationUow.commitChecked({
    lead,
    actorUserId: input.actor.userId,
    now,
    expectedUpdatedAt: input.expectedUpdatedAt,
    intent: {
      kind: "imported_review",
      type: input.type,
      status: input.status ?? null,
      prioridad: input.prioridad ?? null,
      reason: "Imported from CSV",
    },
  });
  if (!outcome.ok) {
    return outcome;
  }

  return Ok({ applied: outcome.value.applied, leadId: lead.id });
}
