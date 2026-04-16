import type { DomainError } from "~/server/shared/domain-error";
import type { Result } from "~/server/shared/result";

import type { LeadReadRepository } from "../../ports/lead-read-repository";
import type { LeadUserScopeRepository } from "../../ports/lead-user-scope-repository";
import type {
  AddLeadNoteInput,
  ApplyImportedReviewInput,
  LogLeadCallInput,
  ReassignLeadInput,
  RegisterLeadInput,
  ReviewLeadInput,
} from "../contracts/command-inputs";
import type {
  LeadCommandResult,
  LeadInteractionResult,
} from "../contracts/command-results";
import type { RegisterLeadDeps } from "../deps/register-lead";
import type { PipelineAuditService } from "../ports/audit-service";
import type { PipelineEngineGateway } from "../ports/engine-gateway";
import type { LeadEnrichmentQueue } from "../ports/enrichment-queue";
import type { LeadMutationUow } from "../ports/lead-mutation-uow";
import type { PipelineNotificationCenter } from "../ports/notification-center";
import type { LeadClock } from "../services/lead-clock";
import { addLeadNoteCommand } from "./add-note";
import { applyImportedReviewCommand } from "./apply-imported-review";
import { logLeadCallCommand } from "./log-call";
import { reassignLeadCommand } from "./reassign-lead";
import { registerLeadCommand } from "./register-lead";
import { reviewLeadCommand } from "./review-lead";

export type PipelineCommandApiDeps = {
  leadReader: LeadReadRepository;
  mutationUow: LeadMutationUow;
  users: LeadUserScopeRepository;
  notificationCenter: PipelineNotificationCenter;
  clock: LeadClock;
  registerLead: RegisterLeadDeps;
  auditService: PipelineAuditService;
  engineGateway: PipelineEngineGateway;
  leadEnrichmentQueue: LeadEnrichmentQueue;
};

export type PipelineCommandApi = {
  registerLead(
    input: RegisterLeadInput,
  ): Promise<Result<LeadCommandResult, DomainError>>;
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
    registerLead: (input) => registerLeadCommand(deps, input),
    reassignLead: (input) => reassignLeadCommand(deps, input),
    reviewLead: (input) => reviewLeadCommand(deps, input),
    addLeadNote: (input) => addLeadNoteCommand(deps, input),
    logLeadCall: (input) => logLeadCallCommand(deps, input),
    applyImportedReview: (input) =>
      applyImportedReviewCommand(
        {
          leadReader: deps.leadReader,
          mutationUow: deps.mutationUow,
          clock: deps.clock,
        },
        input,
      ),
  };
}
