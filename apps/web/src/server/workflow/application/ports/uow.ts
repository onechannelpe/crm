import type { DomainError } from "~/server/shared/domain-error";
import type { Result } from "~/server/shared/result";
import type { LeadEvent } from "~/server/workflow/domain/lead/events";
import type { LeadState } from "~/server/workflow/domain/lead/state";

export type CommitInput = {
  next: LeadState;
  events: LeadEvent[];
  idempotencyKey: string;
  assignment?: {
    toExecutiveId: number;
    assignedBy: number;
    at: number;
  };
};

export type CommitResult = {
  eventIds: string[];
  wasIdempotent: boolean;
};

export interface LeadUnitOfWork {
  commit(input: CommitInput): Promise<Result<CommitResult, DomainError>>;
}
