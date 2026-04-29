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

  if (intent.kind === "approve_for_sale")
    return Ok({ stage: "READY_FOR_SALE" });
  if (intent.kind === "create_quotation") return Ok({ stage: "QUOTED" });
  if (intent.kind === "complete_commercial_input")
    return Ok({ stage: "READY_FOR_QUOTATION" });
  if (intent.kind === "create_sale") return Ok({ stage: "CONVERTED" });
  if (intent.kind === "create_sale_venue") {
    return intent.isFirstVenue ? Ok({ stage: "CONVERTED" }) : Ok({});
  }
  if (intent.kind === "request_rate_negotiation")
    return Ok({ stage: "READY_FOR_QUOTATION" });

  return Ok({});
}
