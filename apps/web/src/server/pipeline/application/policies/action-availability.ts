import type { Role } from "~/lib/auth/access/rbac";

import type { LeadStage } from "../../domain/lead";

export type LeadAvailableAction =
  | "log-call"
  | "add-note"
  | "complete-commercial-input"
  | "create-sale"
  | "review-lead"
  | "create-quotation"
  | "approve-for-sale"
  | "reassign-lead";
import {
  canAddLeadInteraction,
  canApproveForSale,
  canCompleteCommercialInput,
  canCreateQuotation,
  canCreateSale,
  canReassignLead,
  canReviewLead,
} from "./access";

export function resolveAvailableActions(input: {
  actorUserId: number;
  actorRole: Role;
  executiveId: number;
  stage: LeadStage;
}) {
  const actions: LeadAvailableAction[] = [];
  const ownsLead = input.executiveId === input.actorUserId;

  if (canAddLeadInteraction(input.actorRole)) {
    actions.push("log-call", "add-note");
  }
  if (
    canCompleteCommercialInput(input.actorRole) &&
    ownsLead &&
    input.stage === "NEEDS_EXECUTIVE_INPUT"
  ) {
    actions.push("complete-commercial-input");
  }
  if (
    canCreateSale(input.actorRole) &&
    ownsLead &&
    input.stage === "READY_FOR_SALE"
  ) {
    actions.push("create-sale");
  }
  if (
    canReviewLead(input.actorRole) &&
    input.stage === "PENDING_EXTERNAL_REVIEW"
  ) {
    actions.push("review-lead");
  }
  if (
    canCreateQuotation(input.actorRole) &&
    input.stage === "READY_FOR_QUOTATION"
  ) {
    actions.push("create-quotation");
  }
  if (canApproveForSale(input.actorRole) && input.stage === "QUOTED") {
    actions.push("approve-for-sale");
  }
  if (canReassignLead(input.actorRole)) {
    actions.push("reassign-lead");
  }

  return actions;
}
