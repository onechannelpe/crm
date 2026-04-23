import type { LeadHistoryEventDraft } from "../domain/history";

export type LeadEventRepository = {
  append(events: LeadHistoryEventDraft[]): Promise<string[]>;
};
