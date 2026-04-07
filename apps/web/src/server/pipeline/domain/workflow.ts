import type {
  LeadPriority,
  LeadStage,
  LeadStatus,
} from "~/pipeline/contracts/lead-schema";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

function fail(code: string, message: string): Result<never, DomainError> {
  return Err(domainError("validation", code, message));
}

export function resolveReviewTransition(input: {
  currentStage: LeadStage;
  status: LeadStatus;
  prioridad: LeadPriority;
}): Result<LeadStage, DomainError> {
  if (input.currentStage !== "PENDING_EXTERNAL_REVIEW") {
    return fail(
      "invalid_stage",
      "Lead must be pending external review before it can be reviewed",
    );
  }

  if (input.status === "CARTERIZADO" || input.status === "STOCK") {
    return Ok("REJECTED_BY_STATUS");
  }

  if (input.prioridad === "SIN RESULTADO") {
    return Ok("NEEDS_EXECUTIVE_INPUT");
  }

  return Ok("READY_FOR_QUOTATION");
}
