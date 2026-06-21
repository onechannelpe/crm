import { MAX_RATE_REVISION_ROUNDS } from "~/contracts/workflow/limits";
import type { LeadAvailableAction } from "~/contracts/workflow/views";
import { type LeadStage } from "~/contracts/workflow/vocabulary";
import { hasPermission, type Role } from "~/lib/auth/access/rbac";
import { forbidden, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { LeadState } from "./state";

export type LeadCapability =
  | "view"
  | "delete"
  | "interact"
  | "reassign"
  | "edit-commercial-scope"
  | "record-rep-legal"
  | "create-venue"
  | "update-venue"
  | "add-venue-accounts"
  | "propose-rate"
  | "accept-rate"
  | "request-rate-revision"
  | "review"
  | "register"
  | "request-sunat-refresh"
  | "list-assignable-executives";

export type AssignableExecutivesScope =
  | { actorRole: "superuser"; actorBranchId: number }
  | {
      actorRole: "admin" | "sales_manager" | "supervisor";
      actorBranchId: number;
    };

const OWNER_REQUIRED = new Set<LeadCapability>([
  "edit-commercial-scope",
  "record-rep-legal",
  "create-venue",
  "update-venue",
  "add-venue-accounts",
  "accept-rate",
  "request-rate-revision",
  "request-sunat-refresh",
]);

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
    hasPermission(role, "quotation:create") ||
    hasPermission(role, "quotation:revise") ||
    hasPermission(role, "quotation:view:all") ||
    hasPermission(role, "lead:reassign");

  if (canRead) caps.add("view");
  if (hasPermission(role, "lead:delete")) caps.add("delete");
  if (hasPermission(role, "lead:workflow")) caps.add("interact");
  if (hasPermission(role, "lead:reassign")) {
    caps.add("reassign");
    caps.add("list-assignable-executives");
  }
  if (hasPermission(role, "lead:commercial-input:complete")) {
    caps.add("edit-commercial-scope");
    caps.add("record-rep-legal");
    caps.add("create-venue");
    caps.add("update-venue");
    caps.add("add-venue-accounts");
    caps.add("accept-rate");
    caps.add("request-rate-revision");
    caps.add("request-sunat-refresh");
  }
  if (hasPermission(role, "lead:sale:create")) {
    caps.add("edit-commercial-scope");
    caps.add("record-rep-legal");
    caps.add("create-venue");
    caps.add("update-venue");
    caps.add("add-venue-accounts");
    caps.add("accept-rate");
    caps.add("request-sunat-refresh");
  }
  if (
    hasPermission(role, "quotation:create") ||
    hasPermission(role, "quotation:revise")
  ) {
    caps.add("propose-rate");
  }
  if (hasPermission(role, "lead:review")) caps.add("review");
  if (hasPermission(role, "lead:register")) caps.add("register");

  return caps;
}

function canViewAllLeads(role: Role): boolean {
  return (
    hasPermission(role, "lead:view:all") ||
    hasPermission(role, "lead:review") ||
    hasPermission(role, "quotation:view:all") ||
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

  if (!caps.has("view")) return Err(forbidden());

  const ownsLead = state.executiveId === actor.userId;
  if (!ownsLead && !canViewAllLeads(actor.role)) return Err(forbidden());

  if (!caps.has(capability)) return Err(forbidden());

  if (
    (capability === "accept-rate" || capability === "request-rate-revision") &&
    actor.role !== "executive"
  ) {
    return Err(forbidden());
  }

  if (OWNER_REQUIRED.has(capability) && !ownsLead) return Err(forbidden());

  return Ok(undefined);
}

export function requireCapability(
  capability: LeadCapability,
  actor: { role: Role },
): Result<void, DomainError> {
  if (!resolveCapabilities(actor.role).has(capability)) return Err(forbidden());
  return Ok(undefined);
}

export function resolveAvailableActions(
  actor: { userId: number; role: Role },
  state: LeadState,
  meta: { hasActivePendingProposal: boolean; rateRevisionCount: number },
): LeadAvailableAction[] {
  const caps = resolveCapabilities(actor.role);
  const ownsLead = state.executiveId === actor.userId;
  const inPricing = state.stage === "PRICING";
  const actions: LeadAvailableAction[] = [];

  if (caps.has("interact")) {
    actions.push("log-call", "add-note");
  }
  if (caps.has("propose-rate") && inPricing && !meta.hasActivePendingProposal) {
    actions.push("propose-rate");
  }
  if (caps.has("propose-rate") && inPricing && meta.hasActivePendingProposal) {
    actions.push("edit-rate-proposal");
  }
  if (
    caps.has("accept-rate") &&
    ownsLead &&
    inPricing &&
    meta.hasActivePendingProposal
  ) {
    actions.push("accept-rate");
  }
  if (
    caps.has("request-rate-revision") &&
    ownsLead &&
    inPricing &&
    meta.hasActivePendingProposal &&
    meta.rateRevisionCount < MAX_RATE_REVISION_ROUNDS
  ) {
    actions.push("request-rate-revision");
  }
  if (caps.has("update-venue") && ownsLead && state.stage === "SETUP") {
    actions.push("update-venue");
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
  return Err(forbidden());
}
