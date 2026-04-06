import type { Lead } from "../../domain/lead";
import {
  notifyExecutiveInputRequired,
  notifyReadyForQuotation,
} from "../notifications";
import type { PipelineNotificationCenter } from "../ports/notification-center";

export async function notifyLeadReviewOutcome(input: {
  notificationCenter: PipelineNotificationCenter;
  branchId: number;
  lead: Lead;
  nextStage: Lead["stage"];
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
