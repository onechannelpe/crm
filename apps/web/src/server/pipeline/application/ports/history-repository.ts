import type { DomainError } from "~/server/shared/domain-error";
import type { Result } from "~/server/shared/result";

import type {
  LeadHistoryEntry,
  LeadHistoryEventDraft,
} from "../../domain/history";
import type { LeadId } from "../../domain/lead-record";

export type LeadHistoryRepository = {
  insert(values: LeadHistoryEventDraft): Promise<number>;
  listByLeadId(
    leadId: LeadId,
  ): Promise<Result<LeadHistoryEntry[], DomainError>>;
};
