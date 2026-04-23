import type { DomainError } from "~/server/shared/domain-error";
import type { Result } from "~/server/shared/result";

import type { LeadRecord } from "../../domain/lead-record";
import type { LeadMutationEvents } from "../../domain/lead/lead-events";
import type {
  LeadMutationIntent,
  LeadMutationPatch,
} from "../../domain/lead/lead-types";

export type LeadMutationOutcome = {
  events: LeadMutationEvents;
  historyIds: string[];
};

export type CheckedLeadMutationOutcome = {
  applied: boolean;
  events?: LeadMutationOutcome["events"];
  historyIds?: string[];
};

export type LeadAssignmentMutationInput = {
  leadId: string;
  toExecutiveId: number;
  assignedBy: number;
  assignedAt: number;
};

export type LeadMutationUow = {
  commit(input: {
    lead: LeadRecord;
    actorUserId: number;
    now: number;
    intent: LeadMutationIntent;
    assignment?: LeadAssignmentMutationInput;
  }): Promise<Result<LeadMutationOutcome, DomainError>>;
  commitChecked(input: {
    lead: LeadRecord;
    actorUserId: number;
    now: number;
    expectedUpdatedAt: number;
    intent: LeadMutationIntent;
  }): Promise<Result<CheckedLeadMutationOutcome, DomainError>>;
  derivePatch(input: {
    lead: LeadRecord;
    intent: LeadMutationIntent;
  }): Result<LeadMutationPatch, DomainError>;
};
