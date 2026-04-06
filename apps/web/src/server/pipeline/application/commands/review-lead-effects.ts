import { createHistoryEvent } from "../../domain/history";
import type { Lead, LeadPriority, LeadStatus } from "../../domain/lead";
import type { PipelineAuditService } from "../ports/audit-service";
import type { LeadHistoryRepository } from "../ports/history-repository";
import type { LeadRepository } from "../ports/lead-repository";

type ReviewLeadEffectsDeps = {
  leads: LeadRepository;
  leadHistory: LeadHistoryRepository;
};

export async function persistLeadReviewTransition(input: {
  deps: ReviewLeadEffectsDeps;
  auditService: PipelineAuditService;
  lead: Lead;
  actorUserId: number;
  status: LeadStatus;
  prioridad: LeadPriority;
  reason: string;
  nextStage: Lead["stage"];
  now: number;
}) {
  await input.deps.leads.updateById(input.lead.id, {
    status: input.status,
    prioridad: input.prioridad,
    stage: input.nextStage,
    updatedAt: input.now,
  });
  await input.deps.leadHistory.insert(
    createHistoryEvent({
      leadId: input.lead.id,
      eventType: "lead_reviewed",
      actorUserId: input.actorUserId,
      payload: {
        status: input.status,
        prioridad: input.prioridad,
        reason: input.reason,
        fromStage: input.lead.stage,
        toStage: input.nextStage,
      },
      occurredAt: input.now,
    }),
  );
  await input.deps.leadHistory.insert(
    createHistoryEvent({
      leadId: input.lead.id,
      eventType: "workflow_stage_changed",
      actorUserId: input.actorUserId,
      payload: {
        from: input.lead.stage,
        to: input.nextStage,
      },
      occurredAt: input.now,
    }),
  );
  await input.auditService.log(
    input.actorUserId,
    "lead_reviewed",
    "lead",
    input.lead.id,
    {
      fromStage: input.lead.stage,
      toStage: input.nextStage,
      fromStatus: input.lead.status,
      toStatus: input.status,
      fromPrioridad: input.lead.prioridad,
      toPrioridad: input.prioridad,
      reason: input.reason,
    },
  );
}
