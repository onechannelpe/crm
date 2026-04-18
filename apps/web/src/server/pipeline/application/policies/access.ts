import {
  hasPermission,
  type Permission,
  type Role,
} from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import type { BranchId, UserId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { AssignableExecutivesScope } from "../../ports/lead-user-scope-repository";

const LEAD_READ_PERMISSIONS: Permission[] = [
  "lead:pipeline",
  "lead:register",
  "lead:commercial-input:complete",
  "lead:sale:create",
  "lead:review",
  "quotation:manage",
  "lead:reassign",
];

function forbidden(): Result<never, DomainError> {
  return Err(domainError("forbidden", "forbidden", "Access denied"));
}

export function canReadLead(role: Role) {
  return LEAD_READ_PERMISSIONS.some((permission) =>
    hasPermission(role, permission),
  );
}

export function canViewAllLeads(role: Role) {
  return (
    hasPermission(role, "lead:view:all") ||
    hasPermission(role, "lead:review") ||
    hasPermission(role, "quotation:manage") ||
    hasPermission(role, "lead:reassign")
  );
}

export function canRevealFullTimeline(role: Role) {
  return role === "sales_manager" || role === "admin" || role === "superuser";
}

export function canViewAllSales(role: Role) {
  return role !== "executive";
}

export function canAddLeadInteraction(role: Role) {
  return hasPermission(role, "lead:pipeline");
}

export function canRegisterLead(role: Role) {
  return hasPermission(role, "lead:register");
}

export function canCompleteCommercialInput(role: Role) {
  return hasPermission(role, "lead:commercial-input:complete");
}

export function canCreateSale(role: Role) {
  return hasPermission(role, "lead:sale:create");
}

export function canReviewLead(role: Role) {
  return hasPermission(role, "lead:review");
}

export function canCreateQuotation(role: Role) {
  return hasPermission(role, "quotation:manage");
}

export function canApproveForSale(role: Role) {
  return hasPermission(role, "quotation:manage");
}

export function canReassignLead(role: Role) {
  return hasPermission(role, "lead:reassign");
}

export function resolveAssignableExecutivesScope(input: {
  actorRole: Role;
  actorBranchId: BranchId;
}): Result<AssignableExecutivesScope, DomainError> {
  if (input.actorRole === "superuser") {
    return Ok({ actorRole: "superuser", actorBranchId: input.actorBranchId });
  }
  if (
    input.actorRole === "admin" ||
    input.actorRole === "sales_manager" ||
    input.actorRole === "supervisor"
  ) {
    return Ok({
      actorRole: input.actorRole,
      actorBranchId: input.actorBranchId,
    });
  }

  return forbidden();
}

export function requirePipelineActionAccess(
  role: Role,
  canRunAction: (role: Role) => boolean,
): Result<void, DomainError> {
  if (!canRunAction(role)) {
    return forbidden();
  }

  return Ok(undefined);
}

export function requireLeadReadAccess(role: Role): Result<void, DomainError> {
  if (!canReadLead(role)) {
    return forbidden();
  }

  return Ok(undefined);
}

export function requireLeadAccess(input: {
  actorUserId: UserId;
  actorRole: Role;
  executiveId: UserId;
}): Result<void, DomainError> {
  const canRead = requireLeadReadAccess(input.actorRole);
  if (!canRead.ok) {
    return canRead;
  }

  if (
    !canViewAllLeads(input.actorRole) &&
    input.executiveId !== input.actorUserId
  ) {
    return forbidden();
  }

  return Ok(undefined);
}

export function resolveLeadListExecutiveScope(input: {
  actorUserId: UserId;
  actorRole: Role;
  requestedExecutiveId?: UserId;
}) {
  return canViewAllLeads(input.actorRole)
    ? input.requestedExecutiveId
    : input.actorUserId;
}
