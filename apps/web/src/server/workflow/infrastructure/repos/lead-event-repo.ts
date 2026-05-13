import type { LeadHistoryRepository } from "../../application/ports/history-repository";
import type { LeadEventRepository } from "../../application/ports/lead-event-repository";
import type { LeadHistoryEventDraft } from "../../domain/history";

export function createLeadEventRepository(
  history: LeadHistoryRepository,
): LeadEventRepository {
  return {
    async append(events: LeadHistoryEventDraft[]) {
      return Promise.all(events.map((event) => history.insert(event)));
    },
  };
}
