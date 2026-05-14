import type { LeadStage } from "~/contracts/workflow";
import type { LeadAvailableAction } from "~/contracts/workflow/views";
import { hasPermission, type Role } from "~/lib/auth/access/rbac";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import { forbiddenLeadAccess } from "./lead-errors";
import type { LeadState } from "./state";

export type LeadCapability =
  | "view"
  | "interact"
  | "review"
  | "reassign"
  | "complete-scoping"
  | "create-venue"
  | "add-venue-accounts"
  | "create-quotation"
  | "approve-for-sale"
  | "request-negotiation"
  | "register"
  | "list-assignable-executives";

export type AssignableExecutivesScope =
  | { actorRole: "superuser"; actorBranchId: number }
  | {
      actorRole: "admin" | "sales_manager" | "supervisor";
      actorBranchId: number;
    };

const OWNER_REQUIRED = new Set<LeadCapability>([
  "complete-scoping",
  "create-venue",
  "add-venue-accounts",
]);

export const MAX_NEGOTIATION_ROUNDS = 3;
export const MAX_NEGOTIATION_FILES = 3;

export function resolveCapabilities(role: Role): Set<LeadCapability> {
  const caps = new Set<LeadCapability>();

  const canRead =
    hasPermission(role, "lead:work") ||
    hasPermission(role, "lead:workflow") ||
    hasPermission(role, "lead:register") ||
    hasPermission(role, "lead:commercial-input:complete") ||
    hasPermission(role, "lead:sale:create") ||
    hasPermission(role, "lead:view:all") ||
    hasPermission(role, "lead:review") ||
    hasPermission(role, "quotation:manage") ||
    hasPermission(role, "lead:reassign");

  if (canRead) caps.add("view");
  if (hasPermission(role, "lead:workflow")) caps.add("interact");
  if (hasPermission(role, "lead:review")) caps.add("review");
  if (hasPermission(role, "lead:reassign")) {
    caps.add("reassign");
    caps.add("list-assignable-executives");
  }
  if (hasPermission(role, "lead:commercial-input:complete")) {
    caps.add("complete-scoping");
    caps.add("create-venue");
    caps.add("add-venue-accounts");
    caps.add("approve-for-sale");
    caps.add("request-negotiation");
  }
  if (hasPermission(role, "lead:sale:create")) {
    caps.add("complete-scoping");
    caps.add("create-venue");
    caps.add("add-venue-accounts");
    caps.add("approve-for-sale");
  }
  if (hasPermission(role, "quotation:manage")) {
    caps.add("create-quotation");
    caps.add("approve-for-sale");
    caps.add("request-negotiation");
  }
  if (
    hasPermission(role, "lead:work") &&
    hasPermission(role, "lead:view:all")
  ) {
    caps.add("request-negotiation");
  }
  if (hasPermission(role, "lead:register")) caps.add("register");

  return caps;
}

export function canViewAllLeads(role: Role): boolean {
  return (
    hasPermission(role, "lead:view:all") ||
    hasPermission(role, "lead:review") ||
    hasPermission(role, "quotation:manage") ||
    hasPermission(role, "lead:reassign")
  );
}

export function canRevealFullTimeline(role: Role): boolean {
  return role === "sales_manager" || role === "admin" || role === "superuser";
}

export function authorizeLeadAction(
  capability: LeadCapability,
  actor: { userId: number; role: Role },
  state: { executiveId: number; stage: LeadStage },
): Result<void, DomainError> {
  const caps = resolveCapabilities(actor.role);

  if (!caps.has("view")) return forbiddenLeadAccess();

  const ownsLead = state.executiveId === actor.userId;
  if (!ownsLead && !canViewAllLeads(actor.role)) return forbiddenLeadAccess();

  if (!caps.has(capability)) return forbiddenLeadAccess();

  if (OWNER_REQUIRED.has(capability) && !ownsLead) return forbiddenLeadAccess();

  return Ok(undefined);
}

export function requireCapability(
  capability: LeadCapability,
  actor: { role: Role },
): Result<void, DomainError> {
  if (!resolveCapabilities(actor.role).has(capability))
    return forbiddenLeadAccess();
  return Ok(undefined);
}

export function resolveAvailableActions(
  actor: { userId: number; role: Role },
  state: LeadState,
  meta: { negotiationRequestCount: number },
): LeadAvailableAction[] {
  const caps = resolveCapabilities(actor.role);
  const ownsLead = state.executiveId === actor.userId;
  const canSeeAll = canViewAllLeads(actor.role);
  const actions: LeadAvailableAction[] = [];

  if (caps.has("interact")) {
    actions.push("log-call", "add-note");
  }
  if (caps.has("complete-scoping") && ownsLead && state.stage === "SCOPING") {
    actions.push("request-quotation");
  }
  if (caps.has("review") && state.stage === "QUALIFYING") {
    actions.push("review-lead");
  }
  if (caps.has("create-quotation") && state.stage === "QUOTING") {
    actions.push("create-quotation");
  }
  if (
    caps.has("approve-for-sale") &&
    (ownsLead || canSeeAll) &&
    state.stage === "QUOTED"
  ) {
    actions.push("approve-for-sale");
  }
  if (
    caps.has("complete-scoping") &&
    ownsLead &&
    state.stage === "SETUP_PLAN"
  ) {
    actions.push("start-setup-execution");
  }
  if (
    caps.has("request-negotiation") &&
    (ownsLead || canSeeAll) &&
    state.stage === "QUOTED" &&
    meta.negotiationRequestCount < MAX_NEGOTIATION_ROUNDS
  ) {
    actions.push("request-rate-negotiation");
  }
  if (caps.has("reassign")) {
    actions.push("reassign-lead");
  }

  return actions;
}

export function resolveLeadListExecutiveScope(input: {
  actorUserId: number;
  actorRole: Role;
  requestedExecutiveId?: number;
}): number | undefined {
  return canViewAllLeads(input.actorRole)
    ? input.requestedExecutiveId
    : input.actorUserId;
}

export function resolveAssignableExecutivesScope(input: {
  actorRole: Role;
  actorBranchId: number;
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
  return forbiddenLeadAccess();
}
