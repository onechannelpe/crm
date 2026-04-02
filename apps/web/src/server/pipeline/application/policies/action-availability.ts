import { hasPermission, type Role } from "~/lib/auth/access/rbac";

import type { LeadStage } from "../../domain/lead";

export type LeadAction =
  | "log-call"
  | "add-note"
  | "complete-commercial-input"
  | "create-sale"
  | "review-lead"
  | "create-quotation"
  | "approve-for-sale"
  | "reassign-lead";

export function resolveAvailableActions(input: {
  actorUserId: number;
  actorRole: Role;
  executiveId: number;
  stage: LeadStage;
}) {
  const actions: LeadAction[] = [];
  const ownsLead = input.executiveId === input.actorUserId;

  if (hasPermission(input.actorRole, "lead:pipeline")) {
    actions.push("log-call", "add-note");
  }
  if (
    hasPermission(input.actorRole, "lead:register") &&
    ownsLead &&
    input.stage === "NEEDS_EXECUTIVE_INPUT"
  ) {
    actions.push("complete-commercial-input");
  }
  if (
    hasPermission(input.actorRole, "lead:register") &&
    ownsLead &&
    input.stage === "READY_FOR_SALE"
  ) {
    actions.push("create-sale");
  }
  if (
    hasPermission(input.actorRole, "lead:review") &&
    input.stage === "PENDING_EXTERNAL_REVIEW"
  ) {
    actions.push("review-lead");
  }
  if (
    hasPermission(input.actorRole, "quotation:manage") &&
    input.stage === "READY_FOR_QUOTATION"
  ) {
    actions.push("create-quotation");
  }
  if (
    hasPermission(input.actorRole, "quotation:manage") &&
    input.stage === "QUOTED"
  ) {
    actions.push("approve-for-sale");
  }
  if (hasPermission(input.actorRole, "lead:reassign")) {
    actions.push("reassign-lead");
  }

  return actions;
}
