import { domainError, type DomainError } from "~/server/shared/domain-error";

export function inviteError(code: string, message: string): DomainError {
  switch (code) {
    case "role_not_assignable":
    case "pending_user_other_branch":
    case "cross_branch_forbidden":
      return domainError("forbidden", code, message);
    case "invalid_team":
    case "invite_invalid_or_expired":
      return domainError("validation", code, message);
    case "active_user_exists":
    case "invite_not_pending":
    case "invite_target_active":
      return domainError("conflict", code, message);
    case "invite_target_missing":
    case "invite_not_found":
      return domainError("not_found", code, message);
    default:
      return domainError("unexpected", "unexpected", message);
  }
}
