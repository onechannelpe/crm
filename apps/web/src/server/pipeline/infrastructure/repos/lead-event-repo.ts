import type { LeadHistoryRepository } from "../../application/ports/history-repository";
import type { LeadHistoryEventDraft } from "../../domain/history";
import type { LeadEventRepository } from "../../ports/lead-event-repository";

export function createLeadEventRepository(
  history: LeadHistoryRepository,
): LeadEventRepository {
  return {
    async append(events: LeadHistoryEventDraft[]) {
      const ids: number[] = [];
      for (const event of events) {
        ids.push(await history.insert(event));
      }
      return ids;
    },
  };
}
