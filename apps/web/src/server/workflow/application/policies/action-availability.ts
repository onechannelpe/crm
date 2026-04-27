import type { Role } from "~/lib/auth/access/rbac";
import type { LeadStage } from "~/workflow/contracts/lead-schema";

import type { LeadAvailableAction } from "../contracts/lead-available-action";
import {
  canAddLeadInteraction,
  canApproveForSale,
  canCompleteCommercialInput,
  canCreateQuotation,
  canCreateSale,
  canReassignLead,
  canRequestRateNegotiation,
  canReviewLead,
} from "./access";

export function resolveAvailableActions(input: {
  actorUserId: number;
  actorRole: Role;
  executiveId: number;
  stage: LeadStage;
}): LeadAvailableAction[] {
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
  if (
    canRequestRateNegotiation(input.actorRole) &&
    ownsLead &&
    input.stage === "QUOTED"
  ) {
    actions.push("request-rate-negotiation");
  }
  if (canReassignLead(input.actorRole)) {
    actions.push("reassign-lead");
  }

  return actions;
}
