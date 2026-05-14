import type { LeadHistoryEventDraft } from "../../domain/history";
import type { LeadAuditRepository, LeadEventRepository } from "../ports/lead";

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
