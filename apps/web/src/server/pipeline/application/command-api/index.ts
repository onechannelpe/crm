import type { DomainError } from "~/server/shared/domain-error";
import { domainError } from "~/server/shared/domain-error";
import { Err, type Result } from "~/server/shared/result";

import type { LeadAssignmentRepositoryPort } from "../../ports/lead-assignment-repository";
import type { LeadAuditRepository } from "../../ports/lead-audit-repository";
import type { LeadEventRepository } from "../../ports/lead-event-repository";
import type { LeadReadRepository } from "../../ports/lead-read-repository";
import type { LeadUserScopeRepository } from "../../ports/lead-user-scope-repository";
import type {
  CheckedLeadWriteRepository,
  LeadWriteRepository,
} from "../../ports/lead-write-repository";
import type {
  AddLeadNoteInput,
  ApplyImportedReviewInput,
  LogLeadCallInput,
  ReassignLeadInput,
  ReviewLeadInput,
} from "../contracts/command-inputs";
import type {
  LeadCommandResult,
  LeadInteractionResult,
} from "../contracts/command-results";
import type { PipelineNotificationCenter } from "../ports/notification-center";
import type { LeadClock } from "../services/lead-clock";
import { addLeadNoteCommand } from "./add-note";
import { applyImportedReviewCommand } from "./apply-imported-review";
import { logLeadCallCommand } from "./log-call";
import { reassignLeadCommand } from "./reassign-lead";
import { reviewLeadCommand } from "./review-lead";

export type PipelineCommandApiDeps = {
  leadReader: LeadReadRepository;
  leadWriter: LeadWriteRepository;
  checkedLeadWriter?: CheckedLeadWriteRepository;
  eventRepository: LeadEventRepository;
  auditRepository: LeadAuditRepository;
  leadAssignments: LeadAssignmentRepositoryPort;
  users: LeadUserScopeRepository;
  notificationCenter: PipelineNotificationCenter;
  clock: LeadClock;
};

export type PipelineCommandApi = {
  reassignLead(
    input: ReassignLeadInput,
  ): Promise<Result<LeadCommandResult, DomainError>>;
  reviewLead(
    input: ReviewLeadInput,
  ): Promise<Result<LeadCommandResult, DomainError>>;
  addLeadNote(
    input: AddLeadNoteInput,
  ): Promise<Result<LeadInteractionResult, DomainError>>;
  logLeadCall(
    input: LogLeadCallInput,
  ): Promise<Result<LeadInteractionResult, DomainError>>;
  applyImportedReview(
    input: ApplyImportedReviewInput,
  ): Promise<Result<{ applied: boolean; leadId: number }, DomainError>>;
};

export function createPipelineCommandApi(
  deps: PipelineCommandApiDeps,
): PipelineCommandApi {
  return {
    reassignLead: (input) => reassignLeadCommand(deps, input),
    reviewLead: (input) => reviewLeadCommand(deps, input),
    addLeadNote: (input) => addLeadNoteCommand(deps, input),
    logLeadCall: (input) => logLeadCallCommand(deps, input),
    applyImportedReview: (input) => {
      if (!deps.checkedLeadWriter) {
        return Promise.resolve(
          Err(
            domainError(
              "unexpected",
              "missing_checked_writer",
              "Checked lead writer is required for imported reviews",
            ),
          ),
        );
      }
      return applyImportedReviewCommand(
        {
          leadReader: deps.leadReader,
          leadWriter: deps.leadWriter,
          checkedLeadWriter: deps.checkedLeadWriter,
          eventRepository: deps.eventRepository,
          auditRepository: deps.auditRepository,
          clock: deps.clock,
        },
        input,
      );
    },
  };
}
