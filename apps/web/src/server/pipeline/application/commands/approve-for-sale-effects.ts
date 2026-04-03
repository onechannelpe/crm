import { createHistoryEvent } from "../../domain/history";
import type { Lead } from "../../domain/lead";
import type { ApproveForSaleDeps } from "../deps/quotations";
import { notifyReadyForSale } from "../notifications";
import type { PipelineAuditService } from "../ports/audit-service";
import type { PipelineNotificationCenter } from "../ports/notification-center";

export async function persistLeadSaleApproval(input: {
  deps: ApproveForSaleDeps;
  auditService: PipelineAuditService;
  notificationCenter: PipelineNotificationCenter;
  lead: Lead;
  actorUserId: number;
  now: number;
}) {
  await input.deps.leads.updateById(input.lead.id, {
    stage: "READY_FOR_SALE",
    updatedAt: input.now,
  });
  await input.deps.leadHistory.insert(
    createHistoryEvent({
      leadId: input.lead.id,
      eventType: "sale_approved",
      actorUserId: input.actorUserId,
      payload: null,
      occurredAt: input.now,
    }),
  );
  await input.deps.leadHistory.insert(
    createHistoryEvent({
      leadId: input.lead.id,
      eventType: "workflow_stage_changed",
      actorUserId: input.actorUserId,
      payload: { from: input.lead.stage, to: "READY_FOR_SALE" },
      occurredAt: input.now,
    }),
  );
  await input.auditService.log(
    input.actorUserId,
    "sale_approved",
    "lead",
    input.lead.id,
    { from: input.lead.stage, to: "READY_FOR_SALE" },
  );
  await notifyReadyForSale({
    center: input.notificationCenter,
    executiveId: input.lead.executiveId,
    leadId: input.lead.id,
    ruc: input.lead.ruc,
  });
}
