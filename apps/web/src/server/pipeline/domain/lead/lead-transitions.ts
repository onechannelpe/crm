import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import type { LeadRecord } from "../lead-record";
import { isPendingReviewLeadSubject } from "../lead-subjects";
import { resolveReviewTransition } from "../workflow";
import { invalidLeadInput, invalidLeadStage } from "./lead-errors";
import type { LeadMutationIntent, LeadMutationPatch } from "./lead-types";

export function deriveLeadPatchFromIntent(input: {
  lead: LeadRecord;
  intent: LeadMutationIntent;
}): Result<LeadMutationPatch, DomainError> {
  const { lead, intent } = input;

  if (intent.kind === "reassign") {
    if (lead.executiveId === intent.toExecutiveId) {
      return invalidLeadInput(
        "same_executive",
        "Lead is already assigned to the selected executive",
      );
    }
    return Ok({ executiveId: intent.toExecutiveId });
  }

  if (intent.kind === "review") {
    if (!isPendingReviewLeadSubject(lead)) {
      return invalidLeadStage();
    }
    const nextStage = resolveReviewTransition({
      lead,
      status: intent.status,
      prioridad: intent.prioridad,
    });
    return Ok({
      status: intent.status,
      prioridad: intent.prioridad,
      stage: nextStage,
    });
  }

  if (intent.kind === "imported_review") {
    if (intent.status === null || intent.prioridad === null) {
      return Ok({ status: intent.status, prioridad: intent.prioridad });
    }

    if (!isPendingReviewLeadSubject(lead)) {
      return invalidLeadStage();
    }

    const nextStage = resolveReviewTransition({
      lead,
      status: intent.status,
      prioridad: intent.prioridad,
    });
    return Ok({
      status: intent.status,
      prioridad: intent.prioridad,
      stage: nextStage,
    });
  }

  return Ok({});
}
