import { hasPermission, type Role } from "~/lib/auth/access/rbac";

import type { LeadCapabilitySet } from "./lead-types";

export function resolveLeadCapabilities(role: Role): LeadCapabilitySet {
  const canReassign = hasPermission(role, "lead:reassign");
  const canReview = hasPermission(role, "lead:review");
  const canInteract = hasPermission(role, "lead:workflow");
  const canRead =
    hasPermission(role, "lead:workflow") ||
    hasPermission(role, "lead:register") ||
    hasPermission(role, "lead:commercial-input:complete") ||
    hasPermission(role, "lead:sale:create") ||
    hasPermission(role, "lead:review") ||
    hasPermission(role, "quotation:manage") ||
    hasPermission(role, "lead:reassign");

  return {
    canReassign,
    canReview,
    canLogCall: canInteract,
    canAddNote: canInteract,
    canViewDetail: canRead,
    canListAssignableExecutives: canReassign,
  };
}

export function canViewAllLeads(role: Role): boolean {
  return (
    hasPermission(role, "lead:view:all") ||
    hasPermission(role, "lead:review") ||
    hasPermission(role, "quotation:manage") ||
    hasPermission(role, "lead:reassign")
  );
}
