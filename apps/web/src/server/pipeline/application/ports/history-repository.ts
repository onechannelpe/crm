import type { DomainError } from "~/server/shared/domain-error";
import type { Result } from "~/server/shared/result";

import type {
  LeadHistoryEntry,
  LeadHistoryEventDraft,
} from "../../domain/history";

export type LeadHistoryRepository = {
  insert(values: LeadHistoryEventDraft): Promise<number>;
  listByLeadId(
    leadId: number,
  ): Promise<Result<LeadHistoryEntry[], DomainError>>;
};
