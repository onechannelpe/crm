import type { LeadId } from "~/server/pipeline/domain/lead-record";
import type { DomainError } from "~/server/shared/domain-error";
import type { UserId } from "~/server/shared/ids";
import type { Result } from "~/server/shared/result";

import type { LeadRecord } from "../../domain/lead-record";
import type { LeadMutationEvents } from "../../domain/lead/lead-events";
import type {
  LeadMutationIntent,
  LeadMutationPatch,
} from "../../domain/lead/lead-types";

export type LeadMutationOutcome = {
  events: LeadMutationEvents;
  historyIds: number[];
};

export type CheckedLeadMutationOutcome = {
  applied: boolean;
  events?: LeadMutationOutcome["events"];
  historyIds?: number[];
};

export type LeadAssignmentMutationInput = {
  leadId: LeadId;
  toExecutiveId: UserId;
  assignedBy: UserId;
  assignedAt: number;
};

export type LeadMutationUow = {
  commit(input: {
    lead: LeadRecord;
    actorUserId: UserId;
    now: number;
    intent: LeadMutationIntent;
    assignment?: LeadAssignmentMutationInput;
  }): Promise<Result<LeadMutationOutcome, DomainError>>;
  commitChecked(input: {
    lead: LeadRecord;
    actorUserId: UserId;
    now: number;
    expectedUpdatedAt: number;
    intent: LeadMutationIntent;
  }): Promise<Result<CheckedLeadMutationOutcome, DomainError>>;
  derivePatch(input: {
    lead: LeadRecord;
    intent: LeadMutationIntent;
  }): Result<LeadMutationPatch, DomainError>;
};
