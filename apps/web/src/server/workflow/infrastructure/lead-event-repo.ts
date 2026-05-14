import type {
  LeadEventRepository,
  LeadHistoryRepository,
} from "../application/ports/lead";
import type { LeadHistoryEventDraft } from "../domain/history";

export function createLeadEventRepository(
  history: LeadHistoryRepository,
): LeadEventRepository {
  return {
    async append(events: LeadHistoryEventDraft[]) {
      return Promise.all(events.map((event) => history.insert(event)));
    },
  };
}
