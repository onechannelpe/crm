import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import { invalidLeadInput, leadNotFound } from "../../domain/lead/lead-errors";
import type { LeadAuditRepository } from "../../ports/lead-audit-repository";
import type { LeadEventRepository } from "../../ports/lead-event-repository";
import type { LeadReadRepository } from "../../ports/lead-read-repository";
import type {
  CheckedLeadWriteRepository,
  LeadWriteRepository,
} from "../../ports/lead-write-repository";
import type { ApplyImportedReviewInput } from "../contracts/command-inputs";
import type { LeadClock } from "../services/lead-clock";
import { executeCheckedLeadMutation } from "../services/lead-mutation-orchestrator";

type ApplyImportedReviewCommandDeps = {
  leadReader: LeadReadRepository;
  leadWriter: LeadWriteRepository;
  checkedLeadWriter: CheckedLeadWriteRepository;
  eventRepository: LeadEventRepository;
  auditRepository: LeadAuditRepository;
  clock: LeadClock;
};

export async function applyImportedReviewCommand(
  deps: ApplyImportedReviewCommandDeps,
  input: ApplyImportedReviewInput,
): Promise<Result<{ applied: boolean; leadId: number }, DomainError>> {
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
  const outcome = await executeCheckedLeadMutation({
    deps,
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
