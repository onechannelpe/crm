import type { LeadHistoryRepository } from "../../application/ports/history-repository";
import type { LeadHistoryEventDraft } from "../../domain/history";
import type { LeadEventRepository } from "../../ports/lead-event-repository";

export function createLeadEventRepository(
  history: LeadHistoryRepository,
): LeadEventRepository {
  return {
    async append(events: LeadHistoryEventDraft[]) {
      return Promise.all(events.map((event) => history.insert(event)));
    },
  };
}
