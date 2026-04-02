import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { LeadPriority, LeadStage, LeadStatus } from "./lead";

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

export function ensureCanCompleteCommercialInput(input: {
  stage: LeadStage;
  executiveId: number;
  actorUserId: number;
}): Result<void, DomainError> {
  if (input.stage !== "NEEDS_EXECUTIVE_INPUT") {
    return fail("invalid_stage", "Lead is not awaiting commercial input");
  }

  if (input.executiveId !== input.actorUserId) {
    return Err(
      domainError(
        "forbidden",
        "not_owner",
        "Only the assigned executive can complete commercial input",
      ),
    );
  }

  return Ok(undefined);
}

export function ensureCanCreateQuotation(
  stage: LeadStage,
): Result<void, DomainError> {
  if (stage !== "READY_FOR_QUOTATION") {
    return fail(
      "invalid_stage",
      "Lead must be ready for quotation before creating a quotation",
    );
  }

  return Ok(undefined);
}

export function ensureCanApproveForSale(
  stage: LeadStage,
): Result<void, DomainError> {
  if (stage !== "QUOTED") {
    return fail(
      "invalid_stage",
      "Lead must be quoted before it can be approved for sale",
    );
  }

  return Ok(undefined);
}

export function ensureCanCreateSale(input: {
  stage: LeadStage;
  executiveId: number;
  actorUserId: number;
  bank: string;
  cci: string | null;
}): Result<void, DomainError> {
  if (input.stage !== "READY_FOR_SALE") {
    return fail("invalid_stage", "Lead must be ready for sale");
  }

  if (input.executiveId !== input.actorUserId) {
    return Err(
      domainError(
        "forbidden",
        "not_owner",
        "Only the assigned executive can create the sale",
      ),
    );
  }

  if (input.bank.trim().toUpperCase() !== "BCP" && !input.cci?.trim()) {
    return fail(
      "missing_cci",
      "CCI is required when the selected bank is not BCP",
    );
  }

  return Ok(undefined);
}
