import type { DomainError } from "~/server/shared/domain-error";
import type { Result } from "~/server/shared/result";

import type {
  LeadHistoryEntry,
  LeadHistoryEventDraft,
} from "../../domain/history";

export type LeadHistoryRepository = {
  insert(values: LeadHistoryEventDraft): Promise<string>;
  listByLeadId(
    leadId: string,
  ): Promise<Result<LeadHistoryEntry[], DomainError>>;
};
