import {
  hasPermission,
  type Permission,
  type Role,
} from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

const LEAD_READ_PERMISSIONS: Permission[] = [
  "lead:pipeline",
  "lead:register",
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

export function requireLeadReadAccess(role: Role): Result<void, DomainError> {
  if (!canReadLead(role)) {
    return forbidden();
  }

  return Ok(undefined);
}

export function requireLeadAccess(input: {
  actorUserId: number;
  actorRole: Role;
  executiveId: number;
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
  actorUserId: number;
  actorRole: Role;
  requestedExecutiveId?: number;
}) {
  return canViewAllLeads(input.actorRole)
    ? input.requestedExecutiveId
    : input.actorUserId;
}
