import { hasPermission, type Role } from "~/lib/auth/access/rbac";
import type { LeadStage } from "~/lib/db/types";

export type RecordAction =
  | "log-call"
  | "add-note"
  | "complete-commercial-input"
  | "create-sale"
  | "review-record"
  | "create-quotation"
  | "approve-for-sale"
  | "reassign-record";

export function resolveAvailableActions(input: {
  actorRole: Role;
  stage: LeadStage;
}) {
  const actions: RecordAction[] = [];

  if (hasPermission(input.actorRole, "lead:pipeline")) {
    actions.push("log-call", "add-note");
  }
  if (
    hasPermission(input.actorRole, "lead:register") &&
    input.stage === "NEEDS_EXECUTIVE_INPUT"
  ) {
    actions.push("complete-commercial-input");
  }
  if (
    hasPermission(input.actorRole, "lead:register") &&
    input.stage === "READY_FOR_SALE"
  ) {
    actions.push("create-sale");
  }
  if (
    hasPermission(input.actorRole, "lead:review") &&
    input.stage === "PENDING_EXTERNAL_REVIEW"
  ) {
    actions.push("review-record");
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
    actions.push("reassign-record");
  }

  return actions;
}
