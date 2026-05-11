import type { Role } from "~/lib/auth/access/rbac";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";
import type { LeadStage } from "~/workflow/contracts/lead-schema";

import { canViewAllLeads, resolveLeadCapabilities } from "./lead-capabilities";
import {
  forbiddenLeadAccess,
  invalidLeadInput,
  invalidLeadStage,
} from "./lead-errors";
import type { LeadMutationIntent, LeadOperation } from "./lead-types";

export function authorizeLeadOperation(input: {
  actorUserId: number;
  actorRole: Role;
  leadExecutiveId: number;
  operation: LeadOperation;
}): Result<void, DomainError> {
  const capabilities = resolveLeadCapabilities(input.actorRole);

  if (!capabilities.canViewDetail) {
    return forbiddenLeadAccess();
  }

  const ownsLead = input.leadExecutiveId === input.actorUserId;
  if (!ownsLead && !canViewAllLeads(input.actorRole)) {
    return forbiddenLeadAccess();
  }

  if (input.operation === "reassign" && !capabilities.canReassign) {
    return forbiddenLeadAccess();
  }
  if (input.operation === "review" && !capabilities.canReview) {
    return forbiddenLeadAccess();
  }
  if (
    input.operation === "interact" &&
    (!capabilities.canAddNote || !capabilities.canLogCall)
  ) {
    return forbiddenLeadAccess();
  }
  if (
    input.operation === "list_assignable_executives" &&
    !capabilities.canListAssignableExecutives
  ) {
    return forbiddenLeadAccess();
  }

  return Ok(undefined);
}

export function validateLeadIntent(
  currentStage: LeadStage,
  intent: LeadMutationIntent,
): Result<void, DomainError> {
  if (intent.kind === "review" && currentStage !== "QUALIFYING") {
    return invalidLeadStage();
  }
  if (intent.kind === "imported_review" && currentStage !== "QUALIFYING") {
    return invalidLeadStage();
  }
  if (intent.kind === "reassign" && intent.toExecutiveId <= 0) {
    return invalidLeadInput("invalid_executive", "Invalid executive id");
  }
  if (intent.kind === "approve_for_sale" && currentStage !== "QUOTED") {
    return invalidLeadStage();
  }
  if (intent.kind === "create_quotation" && currentStage !== "QUOTING") {
    return invalidLeadStage();
  }
  if (intent.kind === "complete_scoping" && currentStage !== "SCOPING") {
    return invalidLeadStage();
  }
  if (
    intent.kind === "create_venue" &&
    currentStage !== "SCOPING" &&
    currentStage !== "QUOTING"
  ) {
    return invalidLeadStage();
  }
  if (intent.kind === "add_venue_accounts" && currentStage !== "CLOSING") {
    return invalidLeadStage();
  }

  return Ok(undefined);
}
