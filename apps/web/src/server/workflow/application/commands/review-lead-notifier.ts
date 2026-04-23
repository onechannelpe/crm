import type { LeadStage } from "~/workflow/contracts/lead-schema";

import type { PendingReviewLeadSubject } from "../../domain/lead-subjects";
import {
  notifyExecutiveInputRequired,
  notifyReadyForQuotation,
} from "../notifications";
import type { WorkflowNotificationCenter } from "../ports/notification-center";

export async function notifyLeadReviewOutcome(input: {
  notificationCenter: WorkflowNotificationCenter;
  branchId: number;
  lead: PendingReviewLeadSubject;
  nextStage: LeadStage;
}) {
  if (input.nextStage === "NEEDS_EXECUTIVE_INPUT") {
    await notifyExecutiveInputRequired({
      center: input.notificationCenter,
      executiveId: input.lead.executiveId,
      leadId: input.lead.id,
      ruc: input.lead.ruc,
    });
    return;
  }

  if (input.nextStage === "READY_FOR_QUOTATION") {
    await notifyReadyForQuotation({
      center: input.notificationCenter,
      branchId: input.branchId,
      leadId: input.lead.id,
      ruc: input.lead.ruc,
    });
  }
}
