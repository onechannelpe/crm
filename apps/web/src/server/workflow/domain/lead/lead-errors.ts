import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, type Result } from "~/server/shared/result";

export function forbiddenLeadAccess(): Result<never, DomainError> {
  return Err(domainError("forbidden", null, "Access denied"));
}

export function leadNotFound(): Result<never, DomainError> {
  return Err(domainError("not_found", "lead_not_found", "Lead not found"));
}

export function invalidLeadStage(): Result<never, DomainError> {
  return Err(
    domainError(
      "validation",
      "invalid_stage",
      "Lead is not in the required stage",
    ),
  );
}

export function invalidLeadInput(
  code: string,
  message: string,
): Result<never, DomainError> {
  return Err(domainError("validation", code, message));
}
