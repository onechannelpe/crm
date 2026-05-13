import type { LeadHistoryEventDraft } from "../../domain/history";
import type { LeadAuditRepository } from "../ports/lead-audit-repository";
import type { LeadEventRepository } from "../ports/lead-event-repository";

export async function writeLeadEvents(input: {
  events: LeadHistoryEventDraft[];
  eventRepository: LeadEventRepository;
  auditRepository: LeadAuditRepository;
  actorUserId: number;
  auditAction: string;
  entityId: string;
  auditChanges?: Record<string, unknown>;
}) {
  const historyIds = await input.eventRepository.append(input.events);
  await input.auditRepository.append({
    actorUserId: input.actorUserId,
    action: input.auditAction,
    entityId: input.entityId,
    changes: input.auditChanges,
  });

  return historyIds;
}
