import type { Role } from "~/lib/auth/access/rbac";

import type { LeadRecord } from "../../domain/lead-record";
import type { LeadAvailableAction } from "../contracts/lead-available-action";
import {
  canAddLeadInteraction,
  canCompleteCommercialInput,
  canCreateQuotation,
  canCreateSale,
  canReassignLead,
  canReviewLead,
} from "./access";
import { requireLeadActionAccess } from "./lead-action-policy";

export function resolveAvailableActions(input: {
  actorUserId: number;
  actorRole: Role;
  lead: LeadRecord;
  negotiationRequestCount: number;
}): LeadAvailableAction[] {
  const actions: LeadAvailableAction[] = [];
  const ownsLead = input.lead.executiveId === input.actorUserId;

  if (canAddLeadInteraction(input.actorRole)) {
    actions.push("log-call", "add-note");
  }
  if (
    canCompleteCommercialInput(input.actorRole) &&
    ownsLead &&
    input.lead.stage === "NEEDS_EXECUTIVE_INPUT"
  ) {
    actions.push("complete-commercial-input");
  }
  if (
    canCreateSale(input.actorRole) &&
    ownsLead &&
    input.lead.stage === "READY_FOR_SALE"
  ) {
    actions.push("create-sale");
  }
  if (
    canReviewLead(input.actorRole) &&
    input.lead.stage === "PENDING_EXTERNAL_REVIEW"
  ) {
    actions.push("review-lead");
  }
  if (
    canCreateQuotation(input.actorRole) &&
    input.lead.stage === "READY_FOR_QUOTATION"
  ) {
    actions.push("create-quotation");
  }
  if (
    requireLeadActionAccess({
      action: "approve-for-sale",
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      lead: input.lead,
    }).ok
  ) {
    actions.push("approve-for-sale");
  }
  if (
    requireLeadActionAccess({
      action: "request-rate-negotiation",
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      lead: input.lead,
      negotiationRequestCount: input.negotiationRequestCount,
    }).ok
  ) {
    actions.push("request-rate-negotiation");
  }
  if (canReassignLead(input.actorRole)) {
    actions.push("reassign-lead");
  }

  return actions;
}
